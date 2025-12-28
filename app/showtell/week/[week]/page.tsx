"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShowTellWeekProgress, ShowTellContentPack } from "@/app/types/showtell";

interface WeekHomePageProps {
  params: Promise<{
    week: string;
  }>;
}

/**
 * Week Home 페이지 (Week 진입점)
 * - Topic 표시
 * - Day 1, 2, 3 버튼 (완료 체크 표시)
 * - 강제 동선: Day 순차 진행
 */
export default function WeekHomePage({ params }: WeekHomePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const week = parseInt(resolvedParams.week);

  const [contentPack, setContentPack] = useState<ShowTellContentPack | null>(null);
  const [weekProgress, setWeekProgress] = useState<ShowTellWeekProgress | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Mock child_id (실제로는 AuthContext에서 가져옴)
  const childId = "child_demo_001";

  useEffect(() => {
    const loadWeekData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Content Pack 로드
        const contentResponse = await fetch(`/api/showtell/content?week=${week}`);
        const contentResult = await contentResponse.json();

        if (!contentResult.success) {
          throw new Error(contentResult.error || "콘텐츠 로드 실패");
        }

        setContentPack(contentResult.data.content_pack);

        // Week Progress 로드
        const progressResponse = await fetch(`/api/showtell/progress?child_id=${childId}&week=${week}`);
        const progressResult = await progressResponse.json();

        if (!progressResult.success) {
          throw new Error(progressResult.error || "진행 상태 로드 실패");
        }

        setWeekProgress(progressResult.data);

        console.log("✅ Week 데이터 로드 완료");
        console.log("Progress:", progressResult.data);

      } catch (err: unknown) {
        const error = err as Error;
        console.error("❌ Week 데이터 로드 오류:", error);
        setError(error.message || "데이터 로드 중 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    };

    if (week >= 1 && week <= 12) {
      loadWeekData();
    } else {
      setError("잘못된 주차입니다. (1~12)");
      setLoading(false);
    }
  }, [week, childId]);

  const handleDayClick = (day: 1 | 2 | 3) => {
    if (!weekProgress) return;

    // Day 1: 항상 접근 가능
    if (day === 1) {
      router.push(`/showtell/week/${week}/day1`);
      return;
    }

    // Day 2: Day 1 완료해야 접근 가능
    if (day === 2) {
      if (!weekProgress.day1_completed) {
        alert("⚠️ Day 1을 먼저 완료해주세요!");
        return;
      }
      router.push(`/showtell/week/${week}/day2?submissionId=${weekProgress.day1_submission_id}`);
      return;
    }

    // Day 3: Day 2 완료해야 접근 가능
    if (day === 3) {
      if (!weekProgress.day2_completed) {
        alert("⚠️ Day 2를 먼저 완료해주세요!");
        return;
      }
      router.push(`/showtell/week/${week}/day3?submissionId=${weekProgress.day1_submission_id}`);
      return;
    }
  };

  const handleNextWeek = () => {
    if (week < 12) {
      router.push(`/showtell/week/${week + 1}`);
    } else {
      router.push("/showtell");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !contentPack || !weekProgress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl text-center">
          <p className="text-xl font-bold mb-2">⚠️ 오류</p>
          <p>{error || "Week 데이터를 불러올 수 없습니다."}</p>
          <button
            onClick={() => router.push("/showtell")}
            className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg"
          >
            ← 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // CTA 활성화 상태
  const day1Enabled = true; // 항상 가능
  const day2Enabled = weekProgress.day1_completed;
  const day3Enabled = weekProgress.day2_completed;
  const nextWeekEnabled = weekProgress.portfolio_completed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push("/showtell")}
            className="mb-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Show & Tell 홈으로
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Week {week}
                </h1>
                <h2 className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {contentPack.json.title}
                </h2>
              </div>
              <div className="text-6xl">🎭</div>
            </div>

            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
              {contentPack.json.description}
            </p>

            {/* 진행 상태 */}
            <div className="flex items-center gap-4 text-sm">
              <div className={`px-4 py-2 rounded-full font-semibold ${
                weekProgress.day1_completed 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {weekProgress.day1_completed ? "✅" : "⏳"} Day 1
              </div>
              <div className={`px-4 py-2 rounded-full font-semibold ${
                weekProgress.day2_completed 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {weekProgress.day2_completed ? "✅" : "⏳"} Day 2
              </div>
              <div className={`px-4 py-2 rounded-full font-semibold ${
                weekProgress.day3_completed 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {weekProgress.day3_completed ? "✅" : "⏳"} Day 3
              </div>
              {weekProgress.portfolio_completed && (
                <div className="px-4 py-2 rounded-full font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  🎉 완료!
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Day 버튼들 */}
        <div className="space-y-6">
          {/* Day 1 */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => handleDayClick(1)}
            disabled={!day1Enabled}
            className={`
              w-full p-8 rounded-2xl shadow-xl text-left transition-all
              ${day1Enabled 
                ? "bg-white dark:bg-gray-800 hover:scale-102 hover:shadow-2xl cursor-pointer" 
                : "bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed"
              }
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                  weekProgress.day1_completed 
                    ? "bg-green-500 text-white" 
                    : "bg-blue-500 text-white"
                }`}>
                  {weekProgress.day1_completed ? "✅" : "1"}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Day 1: Write + Fix
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    영어 글쓰기 + AI 교정
                  </p>
                </div>
              </div>
              <div className="text-4xl">📝</div>
            </div>

            {weekProgress.day1_completed ? (
              <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                ✅ 완료! 다시 보기 →
              </div>
            ) : (
              <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold">
                시작하기 →
              </div>
            )}
          </motion.button>

          {/* Day 2 */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => handleDayClick(2)}
            disabled={!day2Enabled}
            className={`
              w-full p-8 rounded-2xl shadow-xl text-left transition-all
              ${day2Enabled 
                ? "bg-white dark:bg-gray-800 hover:scale-102 hover:shadow-2xl cursor-pointer" 
                : "bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed"
              }
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                  weekProgress.day2_completed 
                    ? "bg-green-500 text-white" 
                    : day2Enabled 
                      ? "bg-purple-500 text-white" 
                      : "bg-gray-400 text-white"
                }`}>
                  {weekProgress.day2_completed ? "✅" : "2"}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Day 2: Script + Shadowing
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    발표 대본 + 따라말하기
                  </p>
                </div>
              </div>
              <div className="text-4xl">🎬</div>
            </div>

            {!day2Enabled && (
              <div className="text-sm text-gray-500 dark:text-gray-500">
                🔒 Day 1을 먼저 완료해주세요
              </div>
            )}
            {day2Enabled && weekProgress.day2_completed && (
              <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                ✅ 완료! 다시 보기 →
              </div>
            )}
            {day2Enabled && !weekProgress.day2_completed && (
              <div className="text-sm text-purple-600 dark:text-purple-400 font-semibold">
                시작하기 →
              </div>
            )}
          </motion.button>

          {/* Day 3 */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => handleDayClick(3)}
            disabled={!day3Enabled}
            className={`
              w-full p-8 rounded-2xl shadow-xl text-left transition-all
              ${day3Enabled 
                ? "bg-white dark:bg-gray-800 hover:scale-102 hover:shadow-2xl cursor-pointer" 
                : "bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed"
              }
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                  weekProgress.day3_completed 
                    ? "bg-green-500 text-white" 
                    : day3Enabled 
                      ? "bg-pink-500 text-white" 
                      : "bg-gray-400 text-white"
                }`}>
                  {weekProgress.day3_completed ? "✅" : "3"}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Day 3: Rehearsal + Judge
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    리허설 + Q&A
                  </p>
                </div>
              </div>
              <div className="text-4xl">🎭</div>
            </div>

            {!day3Enabled && (
              <div className="text-sm text-gray-500 dark:text-gray-500">
                🔒 Day 2를 먼저 완료해주세요
              </div>
            )}
            {day3Enabled && weekProgress.day3_completed && (
              <div className="text-sm text-green-600 dark:text-green-400 font-semibold">
                ✅ 완료! 다시 보기 →
              </div>
            )}
            {day3Enabled && !weekProgress.day3_completed && (
              <div className="text-sm text-pink-600 dark:text-pink-400 font-semibold">
                시작하기 →
              </div>
            )}
          </motion.button>
        </div>

        {/* 다음 주차 버튼 (Portfolio 완료 시) */}
        {nextWeekEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-xl text-white text-center"
          >
            <h3 className="text-3xl font-bold mb-4">
              🎉 Week {week} 완료!
            </h3>
            <p className="text-lg mb-6">
              정말 잘했어요! Portfolio가 생성되었습니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push(`/showtell/portfolio/portfolio_${childId}_week${week}`)}
                className="px-8 py-4 bg-white text-purple-600 font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-105"
              >
                📂 Portfolio 보기
              </button>
              {week < 12 && (
                <button
                  onClick={handleNextWeek}
                  className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-105"
                >
                  다음 주차 시작하기 (Week {week + 1}) →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

