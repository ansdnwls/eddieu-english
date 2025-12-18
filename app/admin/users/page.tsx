"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, getDoc, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "../layout";
import { motion } from "framer-motion";

interface User {
  id: string;
  email: string;
  createdAt?: string;
  lastLogin?: string;
  childInfo?: any;
  diaryCount?: number;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  childName: string;
  reason: string;
  detail: string;
  withdrawnAt: string;
  createdAt: string;
}

interface UserStats {
  totalUsers: number;
  newUsersToday: number;
  basicNewUsers: number;
  basicTotalUsers: number;
  premiumNewUsers: number;
  premiumTotalUsers: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"users" | "children" | "withdrawals">("users");
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    newUsersToday: 0,
    basicNewUsers: 0,
    basicTotalUsers: 0,
    premiumNewUsers: 0,
    premiumTotalUsers: 0,
  });

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const firestoreDb = db as NonNullable<typeof db>;

    console.log("📊 Setting up real-time listener for users...");
    setLoading(true);

    // 실시간 리스너 설정
    const unsubscribeChildren = onSnapshot(
      collection(firestoreDb, "children"),
      async (childrenSnapshot) => {
        try {
          console.log("🔄 Children collection updated, reloading users...");
          console.log("👥 Total children documents:", childrenSnapshot.size);
          
          const userList: User[] = [];

          // 먼저 모든 일기를 한 번만 로드
          const diariesSnapshot = await getDocs(collection(firestoreDb, "diaries"));
          const allDiaries = diariesSnapshot.docs.map(doc => ({
            id: doc.id,
            userId: doc.data().userId,
          }));
          
          console.log("📝 Total diaries:", allDiaries.length);

          for (const childDoc of childrenSnapshot.docs) {
            const childData = childDoc.data();
            
            console.log("👤 User data:", {
              id: childDoc.id,
              childName: childData.childName,
              email: childData.email,
              parentId: childData.parentId,
            });
            
            // 해당 사용자의 일기 수 계산 (최적화)
            const userDiaries = allDiaries.filter(
              (d) => d.userId === childDoc.id
            );

            // 이메일 정보 가져오기
            // 1. childData에 이메일이 있으면 사용
            // 2. 없으면 parentId로 부모 정보에서 가져오기 시도
            let userEmail = childData.email || null;
            
            if (!userEmail && childData.parentId) {
              try {
                const parentRef = doc(firestoreDb, "parents", childData.parentId);
                const parentSnap = await getDoc(parentRef);
                if (parentSnap.exists()) {
                  userEmail = parentSnap.data().email || null;
                }
              } catch (err) {
                console.log("⚠️ Could not fetch parent email:", err);
              }
            }

            userList.push({
              id: childDoc.id,
              email: userEmail || `UID: ${childDoc.id.substring(0, 8)}...`,
              createdAt: childData.createdAt,
              lastLogin: childData.lastLogin,
              childInfo: childData,
              diaryCount: userDiaries.length,
            });
          }

          console.log("✅ Loaded users:", userList.length);
          setUsers(userList);
        } catch (error) {
          console.error("❌ Error loading users:", error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("❌ Error in real-time listener:", error);
        setLoading(false);
      }
    );

    // 클린업 함수
    return () => {
      console.log("🧹 Cleaning up real-time listener");
      unsubscribeChildren();
    };
  }, [db]);


  const handleBlockUser = async (userId: string) => {
    if (!confirm("정말 이 사용자를 차단하시겠습니까?")) return;
    
    if (!db) {
      alert("데이터베이스 연결 오류");
      return;
    }

    const firestoreDb = db as NonNullable<typeof db>;

    try {
      // Firestore에 차단 정보 저장
      await updateDoc(doc(firestoreDb, "children", userId), {
        blocked: true,
        blockedAt: new Date().toISOString(),
      });
      
      alert("사용자가 차단되었습니다.");
      // 목록 새로고침
      window.location.reload();
    } catch (error) {
      console.error("Error blocking user:", error);
      alert("차단 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          👨‍👩‍👧 유저/아이 관리
        </h1>

        {/* 통계 표 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            📊 사용자 통계
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {userStats.totalUsers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                총 인원수
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                {userStats.newUsersToday}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                신규 유입
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {userStats.basicNewUsers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                베이직 신규
              </div>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                {userStats.basicTotalUsers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                베이직 총인원
              </div>
            </div>
            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-pink-600 dark:text-pink-400 mb-1">
                {userStats.premiumNewUsers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                프리미엄 신규
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                {userStats.premiumTotalUsers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                프리미엄 총인원
              </div>
            </div>
          </div>
        </motion.div>

        {/* 탭 */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedTab("users")}
            className={`px-4 py-2 font-semibold transition-all ${
              selectedTab === "users"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            유저 목록
          </button>
          <button
            onClick={() => setSelectedTab("children")}
            className={`px-4 py-2 font-semibold transition-all ${
              selectedTab === "children"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            아이 목록
          </button>
        </div>

        {/* 유저 목록 */}
        {selectedTab === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      일기 수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("ko-KR")
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.diaryCount || 0}개
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleBlockUser(user.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          차단
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* 아이 목록 */}
        {selectedTab === "children" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      나이
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      레벨
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      일기 수
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users
                    .filter((user) => user.childInfo)
                    .map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {user.childInfo?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.childInfo?.age || "-"}세
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                            {user.childInfo?.englishLevel || "Lv.1"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.diaryCount || 0}개
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* 회원탈퇴 요청 */}
        {selectedTab === "withdrawals" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      탈퇴일시
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      사용자 정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      탈퇴 사유
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      상세 사유
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {withdrawalRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        탈퇴 이력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    withdrawalRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(request.withdrawnAt).toLocaleString("ko-KR")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-gray-900 dark:text-gray-100 font-medium">
                            {request.childName || "이름 없음"}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400 text-xs">
                            {request.userEmail}
                          </div>
                          <div className="text-gray-400 dark:text-gray-500 text-xs">
                            ID: {request.userId.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-gray-900 dark:text-gray-100 font-medium">
                            {request.reason}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {request.detail ? (
                            <div className="text-gray-600 dark:text-gray-400 max-w-md">
                              {request.detail}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}





