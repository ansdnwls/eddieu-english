"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PortfolioItem, WritingSubmission, Script, RehearsalSession, JudgeSession, AudioRecord } from "@/app/types/showtell";

interface PortfolioDetailPageProps {
  params: Promise<{
    portfolio_id: string;
  }>;
}

/**
 * Portfolio 상세 페이지
 * - 스크립트, 오디오, 질문 로그 확인 가능
 */
export default function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { portfolio_id } = resolvedParams;

  const [portfolio, setPortfolio] = useState<PortfolioItem | null>(null);
  const [submission, setSubmission] = useState<WritingSubmission | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [rehearsal, setRehearsal] = useState<RehearsalSession | null>(null);
  const [judge, setJudge] = useState<JudgeSession | null>(null);
  const [audioRecords, setAudioRecords] = useState<Record<string, AudioRecord>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPortfolioDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("📂 Portfolio 상세 로드 중...");

        const response = await fetch(`/api/showtell/portfolio/${portfolio_id}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Portfolio 로드 실패");
        }

        console.log("✅ Portfolio 상세 로드 완료");

        setPortfolio(result.data.portfolio);
        setSubmission(result.data.submission);
        setScript(result.data.script);
        setRehearsal(result.data.rehearsal);
        setJudge(result.data.judge);
        setAudioRecords(result.data.audioRecords);

      } catch (err: unknown) {
        const error = err as Error;
        console.error("❌ Portfolio 상세 로드 오류:", error);
        setError(error.message || "Portfolio 로드 중 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    };

    loadPortfolioDetail();
  }, [portfolio_id]);

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

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl text-center">
          <p className="text-xl font-bold mb-2">⚠️ Portfolio를 불러올 수 없습니다</p>
          <p>{error || "Portfolio를 찾을 수 없습니다."}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
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
            ← Portfolio로 돌아가기
          </button>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                {portfolio.title}
              </h1>
              <span className="text-2xl">🎭</span>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
              {portfolio.description}
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div>📅 Week {portfolio.week}</div>
              <div>📝 {portfolio.word_count} words</div>
              <div>✅ {new Date(portfolio.completed_at).toLocaleDateString("ko-KR")} 완료</div>
            </div>
          </div>
        </motion.div>

        {/* Day 1: Writing */}
        {submission && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              📝 Day 1: Writing
            </h2>
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
                원본 작문
              </h3>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {submission.cleaned_text}
              </p>
            </div>
          </motion.div>
        )}

        {/* Day 2: Script */}
        {script && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              🎬 Day 2: Presentation Script
            </h2>
            <div className="space-y-4">
              {/* 30초 대본 */}
              <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-200 mb-2">
                  ⚡ 30초 대본
                </h3>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {script.script_30s}
                </p>
              </div>

              {/* Keywords */}
              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-3">
                  🔑 핵심 단어
                </h3>
                <div className="flex flex-wrap gap-3">
                  {script.keywords.map((keyword: string, index: number) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-green-200 dark:bg-green-700 text-green-900 dark:text-green-100 font-semibold rounded-lg"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Day 3: Rehearsal */}
        {rehearsal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              🎭 Day 3: Rehearsal
            </h2>

            {rehearsal.feedback && (
              <div className="space-y-4">
                {/* 피드백 */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">👏 칭찬</h4>
                  <p className="text-gray-800 dark:text-gray-200">{rehearsal.feedback.praise}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">💡 팁 1</h4>
                  <p className="text-gray-800 dark:text-gray-200">{rehearsal.feedback.tip1}</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">💡 팁 2</h4>
                  <p className="text-gray-800 dark:text-gray-200">{rehearsal.feedback.tip2}</p>
                </div>
              </div>
            )}

            {/* 최종 녹음 */}
            {audioRecords.attempt2 && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  🎤 최종 발표 녹음
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Duration: {audioRecords.attempt2.duration_sec}초
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {audioRecords.attempt2.storage_url}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Day 3: Judge Q&A */}
        {judge && judge.answers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              👨‍⚖️ Day 3: Judge Q&A
            </h2>

            <div className="space-y-6">
              {judge.answers.map((answer, index) => (
                <div key={index} className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Q{index + 1}: {answer.question_text}
                  </h4>
                  <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-800 dark:text-gray-200">
                      💬 {answer.answer_text}
                    </p>
                  </div>
                  
                  {answer.feedback && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400">👏</span>
                        <p className="text-gray-700 dark:text-gray-300">{answer.feedback.praise}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400">✏️</span>
                        <p className="text-gray-700 dark:text-gray-300">{answer.feedback.correction}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 dark:text-purple-400">✨</span>
                        <p className="text-gray-700 dark:text-gray-300">{answer.feedback.better_expression}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

