"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PortfolioItem } from "@/app/types/showtell";

interface PortfolioGridProps {
  childId: string;
  courseId?: string;
}

/**
 * Portfolio 그리드 컴포넌트
 * 주차별 완성 카드 표시
 */
export default function PortfolioGrid({ childId, courseId = "show_tell_12w" }: PortfolioGridProps) {
  const router = useRouter();
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPortfolio = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("📂 Portfolio 로드 중...");

        const response = await fetch(`/api/showtell/portfolio/complete-week?child_id=${childId}&course_id=${courseId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Portfolio 로드 실패");
        }

        console.log(`✅ Portfolio 로드 완료: ${result.data.total_weeks_completed}개`);
        setPortfolioItems(result.data.portfolio_items);

      } catch (err: unknown) {
        const error = err as Error;
        console.error("❌ Portfolio 로드 오류:", error);
        setError(error.message || "Portfolio 로드 중 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    };

    loadPortfolio();
  }, [childId, courseId]);

  const handleCardClick = (portfolio_id: string, week: number) => {
    router.push(`/showtell/portfolio/${portfolio_id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Portfolio 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl text-center">
        ❌ {error}
      </div>
    );
  }

  if (portfolioItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📂</div>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          아직 완성한 주차가 없어요
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Show & Tell 코스를 시작해보세요!
        </p>
        <button
          onClick={() => router.push("/showtell/week/1/day1")}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-105"
        >
          Week 1 시작하기 🚀
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          내 Portfolio ({portfolioItems.length}/12)
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {portfolioItems.length === 12 ? "🎊 12주 완주!" : `진행 중: ${portfolioItems.length}주 완료`}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {portfolioItems.map((item: PortfolioItem, index: number) => (
          <motion.div
            key={item.portfolio_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleCardClick(item.portfolio_id, item.week)}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-xl"
          >
            {/* 카드 헤더 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Week {item.week}</span>
                <span className="text-2xl">🎭</span>
              </div>
              <h3 className="text-lg font-bold line-clamp-2">
                {item.title}
              </h3>
            </div>

            {/* 카드 바디 */}
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {item.description}
              </p>

              {/* 통계 */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <span>📝</span>
                  <span>{item.word_count} words</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🎤</span>
                  <span>Final</span>
                </div>
              </div>

              {/* 완료 날짜 */}
              <div className="text-xs text-gray-400 dark:text-gray-600">
                {new Date(item.completed_at).toLocaleDateString("ko-KR")} 완료
              </div>
            </div>

            {/* 카드 푸터 */}
            <div className="px-4 pb-4">
              <button
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2 rounded-lg transition-all"
              >
                자세히 보기 →
              </button>
            </div>
          </motion.div>
        ))}

        {/* 다음 주차 시작 카드 (12주 미만일 때만) */}
        {portfolioItems.length < 12 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: portfolioItems.length * 0.1 }}
            onClick={() => router.push(`/showtell/week/${portfolioItems.length + 1}`)}
            className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-xl border-2 border-dashed border-gray-300 dark:border-gray-600"
          >
            <div className="flex flex-col items-center justify-center h-full min-h-[280px] p-6 text-center">
              <div className="text-6xl mb-4">➕</div>
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                Week {portfolioItems.length + 1}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                다음 주차 시작하기
              </p>
              <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all">
                시작하기 🚀
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

