"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "./layout";
import { motion } from "framer-motion";

interface DashboardStats {
  totalUsers: number;
  totalChildren: number;
  todayDiaries: number;
  todayCorrections: number;
  levelDistribution: Record<string, number>;
  recentActivity: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const firestoreDb = db as NonNullable<typeof db>;
    
    console.log("📊 Setting up real-time listeners for admin dashboard...");
    setLoading(true);

    // 통계 계산 함수
    const calculateStats = async (
      childrenSnapshot: any,
      diariesSnapshot: any
    ) => {
      try {
        // 총 사용자 수
        const totalUsers = childrenSnapshot.size;
        const totalChildren = childrenSnapshot.size;

        // 오늘 날짜
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 모든 일기 데이터
        const allDiaries = diariesSnapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 오늘 작성된 일기 수
        const todayDiaries = allDiaries.filter((diary: any) => {
          if (!diary.createdAt) return false;
          const diaryDate = new Date(diary.createdAt);
          return diaryDate >= today;
        }).length;

        // 레벨 분포
        const levelDistribution: Record<string, number> = {};
        allDiaries.forEach((diary: any) => {
          const level = diary.englishLevel || "Lv.1";
          levelDistribution[level] = (levelDistribution[level] || 0) + 1;
        });

        // 최근 활동 (최근 일기 5개)
        const recentActivity = allDiaries
          .sort((a: any, b: any) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 5);

        setStats({
          totalUsers,
          totalChildren,
          todayDiaries,
          todayCorrections: todayDiaries, // AI 첨삭 수 = 일기 수
          levelDistribution,
          recentActivity,
        });
        
        setLoading(false);
        console.log("✅ Stats updated:", {
          totalUsers,
          todayDiaries,
          recentActivity: recentActivity.length,
        });
      } catch (error) {
        console.error("❌ Error calculating stats:", error);
        setLoading(false);
      }
    };

    // children 컬렉션 실시간 리스너
    const unsubscribeChildren = onSnapshot(
      collection(firestoreDb, "children"),
      async (childrenSnapshot) => {
        console.log("🔄 Children collection updated");
        // diaries도 함께 로드
        const diariesSnapshot = await getDocs(collection(firestoreDb, "diaries"));
        await calculateStats(childrenSnapshot, diariesSnapshot);
      },
      (error) => {
        console.error("❌ Error in children listener:", error);
        setLoading(false);
      }
    );

    // diaries 컬렉션 실시간 리스너
    const unsubscribeDiaries = onSnapshot(
      collection(firestoreDb, "diaries"),
      async (diariesSnapshot) => {
        console.log("🔄 Diaries collection updated");
        // children도 함께 로드
        const childrenSnapshot = await getDocs(collection(firestoreDb, "children"));
        await calculateStats(childrenSnapshot, diariesSnapshot);
      },
      (error) => {
        console.error("❌ Error in diaries listener:", error);
        setLoading(false);
      }
    );

    // 클린업 함수
    return () => {
      console.log("🧹 Cleaning up real-time listeners");
      unsubscribeChildren();
      unsubscribeDiaries();
    };
  }, [db]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">통계를 불러오는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          📊 관리자 대시보드
        </h1>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="text-3xl mb-2">👨‍👩‍👧</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {stats?.totalUsers || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              총 사용자 수
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="text-3xl mb-2">📅</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              {stats?.todayDiaries || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              오늘 작성된 일기
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="text-3xl mb-2">🤖</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {stats?.todayCorrections || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              오늘 AI 첨삭 수
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
              {stats?.recentActivity?.length || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              최근 활동
            </div>
          </motion.div>
        </div>

        {/* 레벨 분포 */}
        {stats?.levelDistribution && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              🏅 레벨 분포
            </h2>
            <div className="grid grid-cols-5 gap-4">
              {["Lv.1", "Lv.2", "Lv.3", "Lv.4", "Lv.5"].map((level) => {
                const count = stats.levelDistribution[level] || 0;
                const total = Object.values(stats.levelDistribution).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                
                return (
                  <div key={level} className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                      {count}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {level}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 최근 활동 */}
        {stats?.recentActivity && stats.recentActivity.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              💬 최근 활동
            </h2>
            <div className="space-y-3">
              {stats.recentActivity.map((activity: any, index) => (
                <div
                  key={activity.id || index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {new Date(activity.createdAt).toLocaleString("ko-KR")}
                    </div>
                    <div className="text-gray-800 dark:text-gray-200 line-clamp-1">
                      {activity.originalText || "일기 작성"}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                      {activity.englishLevel || "Lv.1"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}





