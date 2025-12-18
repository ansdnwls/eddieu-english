"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "../layout";
import { motion } from "framer-motion";

export default function AIPage() {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "diaries"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        const snapshot = await getDocs(q);
        const diaryList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setDiaries(diaryList);
        setStats({
          total: diaryList.length,
          success: diaryList.filter((d) => d.correctedText).length,
          failed: diaryList.filter((d) => !d.correctedText).length,
        });
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
          🤖 AI 피드백 모니터링
        </h1>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center"
          >
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {stats.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              총 첨삭 수
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center"
          >
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              {stats.success}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              성공
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center"
          >
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
              {stats.failed}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              실패
            </div>
          </motion.div>
        </div>

        {/* 최근 첨삭 내역 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            최근 GPT 호출 내역
          </h2>
          <div className="space-y-3">
            {diaries.slice(0, 10).map((diary, index) => (
              <div
                key={diary.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {new Date(diary.createdAt).toLocaleString("ko-KR")}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      diary.correctedText
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {diary.correctedText ? "성공" : "실패"}
                  </span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {diary.originalText}
                </div>
                {diary.feedback && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                    피드백: {diary.feedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}





