"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, getDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import AdminLayout from "../layout";

interface User {
  id: string;
  email: string;
  createdAt?: string;
  lastLogin?: string;
  childInfo?: any;
  diaryCount?: number;
  subscriptionPlan?: string;
}

interface UserStats {
  totalUsers: number;
  freeUsers: number;
  paidUsers: number;
  basicUsers: number;
  premiumUsers: number;
  todayNewUsers: number;
  todayWithdrawals: number;
  dailyRegistrations: { date: string; count: number }[];
  dailyWithdrawals: { date: string; count: number }[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    freeUsers: 0,
    paidUsers: 0,
    basicUsers: 0,
    premiumUsers: 0,
    todayNewUsers: 0,
    todayWithdrawals: 0,
    dailyRegistrations: [],
    dailyWithdrawals: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"stats" | "users" | "children">("stats");

  useEffect(() => {
    const loadUsersAndStats = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        console.log("📊 사용자 및 통계 데이터 로딩 중...");

        // 오늘 날짜 (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        // 최근 30일 날짜 배열 생성
        const last30Days: string[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          last30Days.push(date.toISOString().split("T")[0]);
        }

        // 1. users 컬렉션 로드
        let usersSnapshot;
        try {
          usersSnapshot = await getDocs(collection(db, "users"));
        } catch (error) {
          console.log("⚠️ users 컬렉션 없음, children만 사용");
          usersSnapshot = { docs: [], forEach: () => {} } as any;
        }

        // 2. children 컬렉션 로드
        const childrenSnapshot = await getDocs(collection(db, "children"));
        
        // 3. 탈퇴 요청 로드
        let withdrawalsSnapshot;
        try {
          withdrawalsSnapshot = await getDocs(collection(db, "withdrawalRequests"));
        } catch (error) {
          console.log("⚠️ withdrawalRequests 컬렉션 없음");
          withdrawalsSnapshot = { docs: [] } as any;
        }

        // 4. 구독 정보 로드
        let subscriptionsSnapshot;
        try {
          subscriptionsSnapshot = await getDocs(collection(db, "subscriptions"));
        } catch (error) {
          console.log("⚠️ subscriptions 컬렉션 없음");
          subscriptionsSnapshot = { docs: [] } as any;
        }

        // 구독 정보를 Map으로 변환 (userId -> plan)
        const subscriptionMap = new Map<string, string>();
        subscriptionsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.userId && data.planId) {
            subscriptionMap.set(data.userId, data.planId);
          }
        });

        // users 컬렉션의 구독 정보도 Map에 추가
        usersSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.subscriptionPlan) {
            subscriptionMap.set(doc.id, data.subscriptionPlan);
          }
        });

        // 통계 초기화
        const dailyRegistrationsMap = new Map<string, number>();
        const dailyWithdrawalsMap = new Map<string, number>();
        last30Days.forEach((date) => {
          dailyRegistrationsMap.set(date, 0);
          dailyWithdrawalsMap.set(date, 0);
        });

        let totalUsers = 0;
        let freeUsers = 0;
        let paidUsers = 0;
        let basicUsers = 0;
        let premiumUsers = 0;
        let todayNewUsers = 0;
        let todayWithdrawals = 0;

        const userList: User[] = [];

        // 일기 데이터 로드
        const diariesSnapshot = await getDocs(collection(db, "diaries"));
        const allDiaries = diariesSnapshot.docs.map((doc) => ({
          id: doc.id,
          userId: doc.data().userId,
        }));

        // children 컬렉션 처리
        for (const childDoc of childrenSnapshot.docs) {
          const childData = childDoc.data();
          const userId = childDoc.id;
          totalUsers++;

          // 구독 정보 확인
          const plan = subscriptionMap.get(userId) || childData.subscriptionPlan || "free";
          
          if (plan === "free") {
            freeUsers++;
          } else {
            paidUsers++;
            if (plan === "basic") basicUsers++;
            else if (plan === "premium") premiumUsers++;
          }

          // 가입일 처리
          let createdAt: string | undefined;
          if (childData.createdAt) {
            createdAt = childData.createdAt;
            const createdDate = new Date(createdAt);
            createdDate.setHours(0, 0, 0, 0);
            const dateStr = createdDate.toISOString().split("T")[0];
            
            if (dailyRegistrationsMap.has(dateStr)) {
              dailyRegistrationsMap.set(dateStr, (dailyRegistrationsMap.get(dateStr) || 0) + 1);
            }

            // 오늘 가입자 확인
            if (createdDate.getTime() >= todayTimestamp) {
              todayNewUsers++;
            }
          }

          // 일기 수 계산
          const userDiaries = allDiaries.filter((d) => d.userId === userId);

          // 이메일 정보 가져오기
          let userEmail = childData.email || null;
          if (!userEmail && childData.parentId) {
            try {
              const parentRef = doc(db, "parents", childData.parentId);
              const parentSnap = await getDoc(parentRef);
              if (parentSnap.exists()) {
                userEmail = parentSnap.data().email || null;
              }
            } catch (err) {
              console.log("⚠️ Could not fetch parent email:", err);
            }
          }

          userList.push({
            id: userId,
            email: userEmail || `UID: ${userId.substring(0, 8)}...`,
            createdAt,
            lastLogin: childData.lastLogin,
            childInfo: childData,
            diaryCount: userDiaries.length,
            subscriptionPlan: plan,
          });
        }

        // users 컬렉션 처리 (children에 없는 경우)
        usersSnapshot.docs.forEach((userDoc) => {
          const userData = userDoc.data();
          const userId = userDoc.id;

          // children에 이미 있으면 스킵
          if (userList.find((u) => u.id === userId)) return;

          totalUsers++;
          const plan = userData.subscriptionPlan || "free";
          
          if (plan === "free") {
            freeUsers++;
          } else {
            paidUsers++;
            if (plan === "basic") basicUsers++;
            else if (plan === "premium") premiumUsers++;
          }

          if (userData.createdAt) {
            const createdDate = new Date(userData.createdAt);
            createdDate.setHours(0, 0, 0, 0);
            const dateStr = createdDate.toISOString().split("T")[0];
            
            if (dailyRegistrationsMap.has(dateStr)) {
              dailyRegistrationsMap.set(dateStr, (dailyRegistrationsMap.get(dateStr) || 0) + 1);
            }

            if (createdDate.getTime() >= todayTimestamp) {
              todayNewUsers++;
            }
          }

          userList.push({
            id: userId,
            email: userData.email || `UID: ${userId.substring(0, 8)}...`,
            createdAt: userData.createdAt,
            lastLogin: userData.lastLogin,
            subscriptionPlan: plan,
            diaryCount: 0,
          });
        });

        // 탈퇴 요청 처리
        withdrawalsSnapshot.docs.forEach((withdrawalDoc) => {
          const withdrawalData = withdrawalDoc.data();
          if (withdrawalData.withdrawnAt) {
            const withdrawalDate = new Date(withdrawalData.withdrawnAt);
            withdrawalDate.setHours(0, 0, 0, 0);
            const dateStr = withdrawalDate.toISOString().split("T")[0];
            
            if (dailyWithdrawalsMap.has(dateStr)) {
              dailyWithdrawalsMap.set(dateStr, (dailyWithdrawalsMap.get(dateStr) || 0) + 1);
            }

            if (withdrawalDate.getTime() >= todayTimestamp) {
              todayWithdrawals++;
            }
          }
        });

        // 통계 데이터 변환
        const dailyRegistrations = last30Days.map((date) => ({
          date,
          count: dailyRegistrationsMap.get(date) || 0,
        }));

        const dailyWithdrawals = last30Days.map((date) => ({
          date,
          count: dailyWithdrawalsMap.get(date) || 0,
        }));

        setUsers(userList);
        setStats({
          totalUsers,
          freeUsers,
          paidUsers,
          basicUsers,
          premiumUsers,
          todayNewUsers,
          todayWithdrawals,
          dailyRegistrations,
          dailyWithdrawals,
        });

        console.log("✅ 사용자 및 통계 데이터 로딩 완료:", {
          totalUsers,
          freeUsers,
          paidUsers,
          todayNewUsers,
          todayWithdrawals,
        });
      } catch (error) {
        console.error("❌ 데이터 로딩 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsersAndStats();
  }, []);

  const handleBlockUser = async (userId: string) => {
    if (!confirm("정말 이 사용자를 차단하시겠습니까?")) return;

    try {
      // Firestore에 차단 정보 저장
      await updateDoc(doc(db, "children", userId), {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 그래프 최대값 계산
  const maxRegistrations = Math.max(...stats.dailyRegistrations.map((d) => d.count), 1);
  const maxWithdrawals = Math.max(...stats.dailyWithdrawals.map((d) => d.count), 1);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          👨‍👩‍👧 유저/아이 관리
        </h1>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSelectedTab("stats")}
          className={`px-4 py-2 font-semibold transition-all ${
            selectedTab === "stats"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          📊 통계
        </button>
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

      {/* 통계 탭 */}
      {selectedTab === "stats" && (
        <div className="space-y-6">
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white"
            >
              <div className="text-sm opacity-90 mb-2">총 사용자수</div>
              <div className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-6 text-white"
            >
              <div className="text-sm opacity-90 mb-2">무료</div>
              <div className="text-3xl font-bold">{stats.freeUsers.toLocaleString()}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white"
            >
              <div className="text-sm opacity-90 mb-2">유료</div>
              <div className="text-3xl font-bold">{stats.paidUsers.toLocaleString()}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl shadow-lg p-6 text-white"
            >
              <div className="text-sm opacity-90 mb-2">베이직</div>
              <div className="text-3xl font-bold">{stats.basicUsers.toLocaleString()}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white"
            >
              <div className="text-sm opacity-90 mb-2">프리미엄</div>
              <div className="text-3xl font-bold">{stats.premiumUsers.toLocaleString()}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white"
            >
              <div className="text-sm opacity-90 mb-2">금일 신규</div>
              <div className="text-3xl font-bold">{stats.todayNewUsers.toLocaleString()}</div>
            </motion.div>
          </div>

          {/* 날짜별 등록현황 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              📈 날짜별 등록현황 (최근 30일)
            </h2>
            <div className="space-y-2">
              {stats.dailyRegistrations.map((day, index) => {
                const date = new Date(day.date);
                const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
                const percentage = maxRegistrations > 0 ? (day.count / maxRegistrations) * 100 : 0;
                
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right">
                      {dateLabel}
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        {day.count > 0 && (
                          <span className="text-xs text-white font-bold">{day.count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* 날짜별 탈퇴현황 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              📉 날짜별 탈퇴현황 (최근 30일)
            </h2>
            <div className="space-y-2">
              {stats.dailyWithdrawals.map((day, index) => {
                const date = new Date(day.date);
                const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
                const percentage = maxWithdrawals > 0 ? (day.count / maxWithdrawals) * 100 : 0;
                
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right">
                      {dateLabel}
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        {day.count > 0 && (
                          <span className="text-xs text-white font-bold">{day.count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

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
                      요금제
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
                  {users.map((user) => {
                    const planLabel = user.subscriptionPlan === "basic" ? "베이직" 
                      : user.subscriptionPlan === "premium" ? "프리미엄" 
                      : "무료";
                    const planColor = user.subscriptionPlan === "basic" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : user.subscriptionPlan === "premium" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("ko-KR")
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${planColor}`}>
                            {planLabel}
                          </span>
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
                    );
                  })}
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
      </div>
    </AdminLayout>
  );
}





