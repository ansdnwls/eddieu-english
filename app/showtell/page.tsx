"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { motion } from "framer-motion";
import PortfolioGrid from "./components/PortfolioGrid";

/**
 * Show & Tell 메인 페이지
 * - Portfolio 목록 표시
 * - 12주 진행 상황 대시보드
 */
export default function ShowTellMainPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Mock child_id (실제로는 AuthContext 또는 user profile에서 가져옴)
  const childId = user?.uid || "child_demo_001";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🎭 Show & Tell
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                12주 영어 발표 코스
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← 대시보드로
            </button>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-7xl mx-auto px-4 py-12">
          {/* 환영 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-3xl font-bold mb-3">
              안녕하세요! 👋
            </h2>
            <p className="text-lg mb-6">
              Show & Tell 코스에 오신 것을 환영합니다!<br />
              12주 동안 매주 새로운 주제로 영어 발표를 연습해보세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl mb-2">📝</div>
                <h3 className="font-semibold mb-1">Day 1: Write + Fix</h3>
                <p className="text-sm opacity-90">영어 글쓰기 + AI 교정</p>
              </div>
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl mb-2">🎬</div>
                <h3 className="font-semibold mb-1">Day 2: Script + Shadowing</h3>
                <p className="text-sm opacity-90">발표 대본 + 따라말하기</p>
              </div>
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl mb-2">🎭</div>
                <h3 className="font-semibold mb-1">Day 3: Rehearsal + Judge</h3>
                <p className="text-sm opacity-90">리허설 + Q&A</p>
              </div>
            </div>
          </motion.div>

          {/* Portfolio 그리드 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PortfolioGrid childId={childId} courseId="show_tell_12w" />
          </motion.div>

          {/* 도움말 섹션 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              💡 이용 가이드
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <h4 className="font-semibold mb-1">주차 선택</h4>
                  <p className="text-sm">완성한 Portfolio 카드를 클릭하여 다시 보거나, "다음 주차 시작하기" 카드를 클릭하여 새로운 주제를 시작하세요.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <h4 className="font-semibold mb-1">3일 루틴</h4>
                  <p className="text-sm">각 주차는 Day 1, 2, 3 순서로 진행됩니다. 하루에 하나씩 완료하는 것을 추천합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <h4 className="font-semibold mb-1">Portfolio</h4>
                  <p className="text-sm">각 주차 완료 시 자동으로 Portfolio 카드가 생성됩니다. 여기서 스크립트, 녹음, Q&A 내용을 다시 볼 수 있어요!</p>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </AuthGuard>
  );
}





