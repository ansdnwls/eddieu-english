"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { motion } from "framer-motion";

/**
 * Writing Ladder 메인 페이지 (Level 0: 문장 4주)
 * - Portfolio 목록 표시
 * - 4주 진행 상황 대시보드
 */
export default function WritingLadderMainPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Mock child_id (실제로는 AuthContext 또는 user profile에서 가져옴)
  const childId = user?.uid || "child_demo_001";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50 dark:from-gray-900 dark:via-teal-900/20 dark:to-blue-900/20">
        {/* 헤더 */}
        <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                📝 Writing Ladder
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Level 0: 문장 쓰기 (4주 코스)
              </p>
            </div>
            <button
              onClick={() => router.push("/courses")}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← 코스 목록으로
            </button>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-7xl mx-auto px-4 py-12">
          {/* 환영 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-3xl font-bold mb-3">
              문장 쓰기부터 시작해요! 🌱
            </h2>
            <p className="text-lg mb-6">
              Writing Ladder Level 0에 오신 것을 환영합니다!<br />
              4주 동안 4가지 패턴으로 영어 문장 만들기를 배워요.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl mb-2">👍</div>
                <h3 className="font-semibold mb-1">Week 1: I like...</h3>
                <p className="text-sm opacity-90">좋아하는 것들</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl mb-2">💪</div>
                <h3 className="font-semibold mb-1">Week 2: I can...</h3>
                <p className="text-sm opacity-90">할 수 있는 것들</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl mb-2">🎁</div>
                <h3 className="font-semibold mb-1">Week 3: I have...</h3>
                <p className="text-sm opacity-90">가지고 있는 것들</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl mb-2">✨</div>
                <h3 className="font-semibold mb-1">Week 4: I want...</h3>
                <p className="text-sm opacity-90">원하는 것들</p>
              </div>
            </div>
          </motion.div>

          {/* 주차별 카드 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
          >
            {[1, 2, 3, 4].map((week, index) => {
              const weekData = [
                { emoji: "👍", title: "I like...", subtitle: "좋아하는 것들", color: "from-pink-400 to-rose-400" },
                { emoji: "💪", title: "I can...", subtitle: "할 수 있는 것들", color: "from-blue-400 to-indigo-400" },
                { emoji: "🎁", title: "I have...", subtitle: "가지고 있는 것들", color: "from-purple-400 to-violet-400" },
                { emoji: "✨", title: "I want...", subtitle: "원하는 것들", color: "from-orange-400 to-amber-400" },
              ][index];

              return (
                <motion.div
                  key={week}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 2) }}
                  whileHover={{ scale: 1.03 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
                >
                  <div className={`h-32 bg-gradient-to-r ${weekData.color} flex items-center justify-center text-6xl`}>
                    {weekData.emoji}
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Week {week}: {weekData.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {weekData.subtitle}
                    </p>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        <span>Day 1: 문장 쓰기 + 교정</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        <span>Day 2: 발표 대본 + 따라말하기</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        <span>Day 3: 리허설 + Q&A</span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/writingladder/week/${week}/day1`)}
                      className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                    >
                      Week {week} 시작하기
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* 도움말 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              💡 이용 가이드
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <h3 className="font-semibold mb-1">Day 1: 문장 쓰기 + 교정</h3>
                  <p className="text-sm">
                    주제에 맞는 간단한 문장 3-5개를 써보세요. AI가 교정해드려요!
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <h3 className="font-semibold mb-1">Day 2: 발표 대본 + 따라말하기</h3>
                  <p className="text-sm">
                    AI가 15초 발표 대본을 만들어줘요. TTS로 듣고 따라 말해보세요!
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <h3 className="font-semibold mb-1">Day 3: 리허설 + Q&A</h3>
                  <p className="text-sm">
                    발표를 녹음하고, 피드백 받고, 다시 녹음하세요. 그다음 Judge의 질문 5개에 답변해요!
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="font-semibold mb-1">포트폴리오 완성!</h3>
                  <p className="text-sm">
                    Week를 완료하면 자동으로 포트폴리오 카드가 만들어져요.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </AuthGuard>
  );
}


