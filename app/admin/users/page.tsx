"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, doc, updateDoc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "../layout";
import { motion, AnimatePresence } from "framer-motion";

interface User {
  id: string;
  parentId: string;
  email: string;
  childName: string;
  age: number;
  englishLevel: string;
  createdAt?: string;
  diaryCount: number;
  subscriptionPlan: "free" | "basic" | "premium";
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "plan">("date");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      console.log("📊 Loading users from Firestore...");
      
      // children 컬렉션에서 모든 아이 정보 로드
      const childrenSnapshot = await getDocs(collection(db, "children"));
      console.log("👥 Total children documents:", childrenSnapshot.size);
      
      // 모든 일기 한 번에 로드
      const diariesSnapshot = await getDocs(collection(db, "diaries"));
      const allDiaries = diariesSnapshot.docs.map(doc => ({
        id: doc.id,
        userId: doc.data().userId,
      }));
      
      console.log("📝 Total diaries:", allDiaries.length);

      const userList: User[] = [];

      for (const childDoc of childrenSnapshot.docs) {
        const childData = childDoc.data();
        
        // 해당 아이의 일기 수 계산
        const userDiaries = allDiaries.filter(d => d.userId === childDoc.id);
        
        // 이메일 정보 가져오기
        let userEmail = childData.email || "";
        
        if (!userEmail && childData.parentId) {
          try {
            const parentRef = doc(db, "parents", childData.parentId);
            const parentSnap = await getDoc(parentRef);
            if (parentSnap.exists()) {
              userEmail = parentSnap.data().email || "";
            }
          } catch (err) {
            console.log("⚠️ Could not fetch parent email:", err);
          }
        }

        // 구독 플랜 정보 가져오기
        let subscriptionPlan: "free" | "basic" | "premium" = "free";
        if (childData.parentId) {
          try {
            const userDocRef = doc(db, "users", childData.parentId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              subscriptionPlan = userData.subscriptionPlan || "free";
            }
          } catch (err) {
            console.log("⚠️ Could not fetch subscription plan:", err);
          }
        }

        userList.push({
          id: childDoc.id,
          parentId: childData.parentId,
          email: userEmail || `UID: ${childDoc.id.substring(0, 8)}...`,
          childName: childData.childName || "-",
          age: childData.age || 0,
          englishLevel: childData.englishLevel || "Lv.1",
          createdAt: childData.createdAt,
          diaryCount: userDiaries.length,
          subscriptionPlan,
        });
      }

      console.log("✅ Loaded users:", userList.length);
      setUsers(userList);
    } catch (error) {
      console.error("❌ Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  // 정렬된 사용자 목록
  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === "plan") {
      const planOrder = { premium: 0, basic: 1, free: 2 };
      return planOrder[a.subscriptionPlan] - planOrder[b.subscriptionPlan];
    } else {
      // 날짜순 (최신순)
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
  });

  // 사용자 선택/해제
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  // 메시지 발송
  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    if (selectedUsers.size === 0) {
      alert("메시지를 받을 사용자를 선택해주세요.");
      return;
    }

    setSendingMessage(true);
    try {
      if (!db) throw new Error("Firestore not initialized");

      // 선택된 사용자들에게 메시지 저장
      const promises = Array.from(selectedUsers).map(async (userId) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        // messages 컬렉션에 저장 (parentId 기준)
        await addDoc(collection(db, "messages"), {
          userId: user.parentId, // 부모 ID로 저장
          childId: userId, // 아이 ID
          title: messageTitle,
          content: messageContent,
          type: "admin",
          isRead: false,
          createdAt: serverTimestamp(),
        });
      });

      await Promise.all(promises);
      
      alert(`✅ ${selectedUsers.size}명에게 메시지를 발송했습니다.`);
      setShowMessageModal(false);
      setMessageTitle("");
      setMessageContent("");
      setSelectedUsers(new Set());
    } catch (error) {
      console.error("❌ 메시지 발송 실패:", error);
      alert("메시지 발송 중 오류가 발생했습니다.");
    } finally {
      setSendingMessage(false);
    }
  };

  // 플랜 아이콘 및 색상
  const getPlanBadge = (plan: "free" | "basic" | "premium") => {
    switch (plan) {
      case "premium":
        return (
          <span className="px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full border border-purple-300 dark:border-purple-700">
            💎 프리미엄
          </span>
        );
      case "basic":
        return (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-300 dark:border-blue-700">
            💙 베이직
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-full border border-gray-300 dark:border-gray-600">
            🆓 무료
          </span>
        );
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            👨‍👩‍👧 유저/아이 관리
          </h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            총 {users.length}명
          </div>
        </div>

        {/* 필터 및 액션 */}
        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              정렬:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "plan")}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">가입일순</option>
              <option value="plan">플랜별</option>
            </select>
          </div>

          <div className="flex-1"></div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedUsers.size}명 선택
            </span>
            <button
              onClick={() => setShowMessageModal(true)}
              disabled={selectedUsers.size === 0}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                selectedUsers.size === 0
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-105 shadow-lg"
              }`}
            >
              💌 메시지 발송
            </button>
          </div>
        </div>

        {/* 사용자 목록 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    아이 이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    나이
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    레벨
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    플랜
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    일기 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    가입일
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      selectedUsers.has(user.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                  >
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.childName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {user.age}세
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                        {user.englishLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPlanBadge(user.subscriptionPlan)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {user.diaryCount}개
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* 메시지 발송 모달 */}
      <AnimatePresence>
        {showMessageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowMessageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                💌 메시지 발송
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                선택된 {selectedUsers.size}명에게 메시지를 발송합니다.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                    placeholder="메시지 제목을 입력하세요"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    내용 *
                  </label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="메시지 내용을 입력하세요"
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageTitle.trim() || !messageContent.trim()}
                  className={`flex-1 px-4 py-3 font-bold rounded-lg transition-all ${
                    sendingMessage || !messageTitle.trim() || !messageContent.trim()
                      ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-105 shadow-lg"
                  }`}
                >
                  {sendingMessage ? "발송 중..." : "발송하기"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}





