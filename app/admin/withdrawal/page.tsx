"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "../layout";
import { motion } from "framer-motion";

interface WithdrawalRecord {
  id: string;
  userId: string;
  userEmail: string;
  childName: string;
  reason: string;
  detail: string;
  childrenCount?: number;
  diariesCount?: number;
  withdrawnAt: string;
  createdAt: string;
}

export default function WithdrawalManagementPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
    today: 0,
  });

  const reasonLabels: Record<string, string> = {
    "not_useful": "서비스가 유용하지 않음",
    "too_expensive": "가격이 비쌈",
    "technical_issues": "기술적 문제",
    "found_alternative": "다른 서비스 발견",
    "privacy_concerns": "개인정보 우려",
    "child_lost_interest": "아이가 흥미를 잃음",
    "other": "기타",
  };

  useEffect(() => {
    const loadWithdrawals = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "withdrawalRequests"),
          orderBy("withdrawnAt", "desc"),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const withdrawalList: WithdrawalRecord[] = [];
        
        snapshot.docs.forEach((doc) => {
          withdrawalList.push({
            id: doc.id,
            ...doc.data(),
          } as WithdrawalRecord);
        });

        setWithdrawals(withdrawalList);
        
        // 통계 계산
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayCount = withdrawalList.filter(w => new Date(w.withdrawnAt) >= todayStart).length;
        const weekCount = withdrawalList.filter(w => new Date(w.withdrawnAt) >= weekAgo).length;
        const monthCount = withdrawalList.filter(w => new Date(w.withdrawnAt) >= monthStart).length;

        setStats({
          total: withdrawalList.length,
          thisMonth: monthCount,
          thisWeek: weekCount,
          today: todayCount,
        });
      } catch (error) {
        console.error("Error loading withdrawals:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWithdrawals();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("이 탈퇴 기록을 삭제하시겠습니까?")) {
      return;
    }

    try {
      if (!db) return;
      await deleteDoc(doc(db, "withdrawalRequests", id));
      setWithdrawals(withdrawals.filter(w => w.id !== id));
      alert("✅ 탈퇴 기록이 삭제되었습니다.");
    } catch (error) {
      console.error("Error deleting withdrawal:", error);
      alert("❌ 삭제 중 오류가 발생했습니다.");
    }
  };

  // 사유별 통계
  const reasonStats = withdrawals.reduce((acc, w) => {
    acc[w.reason] = (acc[w.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            💔 회원 탈퇴 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            탈퇴한 회원의 사유를 분석하여 서비스를 개선하세요
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400">탈퇴 데이터 로딩 중...</p>
          </div>
        ) : (
          <>
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <div className="text-3xl mb-2">📊</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">총 탈퇴 수</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <div className="text-3xl mb-2">📅</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.thisMonth}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">이번 달</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <div className="text-3xl mb-2">📆</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.thisWeek}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">이번 주</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <div className="text-3xl mb-2">⏰</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.today}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">오늘</div>
              </motion.div>
            </div>

            {/* 사유별 통계 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                탈퇴 사유 통계
              </h2>
              <div className="space-y-3">
                {Object.entries(reasonStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => {
                    const percentage = ((count / stats.total) * 100).toFixed(1);
                    return (
                      <div key={reason} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {reasonLabels[reason] || reason}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {count}명 ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>

            {/* 탈퇴 목록 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  탈퇴 기록 목록
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        탈퇴일시
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        이메일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        사유
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        상세 내용
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        통계
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          탈퇴 기록이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(withdrawal.withdrawnAt).toLocaleString('ko-KR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {withdrawal.userEmail}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              {reasonLabels[withdrawal.reason] || withdrawal.reason}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {withdrawal.detail || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            👶 {withdrawal.childrenCount || 0}명<br />
                            📝 {withdrawal.diariesCount || 0}개
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handleDelete(withdrawal.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}



