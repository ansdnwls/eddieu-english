"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Script } from "@/app/types/showtell";
import Day3Rehearsal from "@/app/showtell/components/Day3Rehearsal";
import Day3Judge from "@/app/showtell/components/Day3Judge";

interface Day3PageProps {
  params: Promise<{
    week: string;
  }>;
}

/**
 * Day 3 메인 페이지
 * Rehearsal → Judge Q&A → Portfolio 생성
 */
export default function Day3Page({ params }: Day3PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const week = parseInt(resolvedParams.week);

  // URL에서 submission_id 가져오기 (Day 2에서 전달)
  const submissionId = searchParams.get("submissionId");

  const [step, setStep] = useState<"rehearsal" | "judge" | "portfolio">("rehearsal");
  const [script, setScript] = useState<Script | null>(null);
  const [rehearsalId, setRehearsalId] = useState<string | null>(null);
  const [judgeSessionId, setJudgeSessionId] = useState<string | null>(null);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Mock child_id (실제로는 AuthContext에서 가져옴)
  const childId = "child_demo_001";

  useEffect(() => {
    if (!submissionId) {
      alert("잘못된 접근입니다. Day 2를 먼저 완료해주세요.");
      router.push(`/showtell/week/${week}/day2`);
      return;
    }

    // Script 로드
    const loadScript = async () => {
      try {
        const response = await fetch(`/api/showtell/submissions/${submissionId}/script`);
        const result = await response.json();

        if (result.success) {
          setScript(result.data);
        } else {
          setError("Script를 불러올 수 없습니다.");
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error("❌ Script 로드 오류:", error);
        setError("Script 로드 중 오류가 발생했습니다.");
      }
    };

    loadScript();
  }, [submissionId, week, router]);

  const handleRehearsalComplete = (rehearsal_id: string) => {
    console.log("✅ Rehearsal 완료:", rehearsal_id);
    setRehearsalId(rehearsal_id);
    setStep("judge");
  };

  const handleJudgeComplete = async (judge_session_id: string) => {
    console.log("✅ Judge 완료:", judge_session_id);
    setJudgeSessionId(judge_session_id);
    setStep("portfolio");

    // Portfolio 자동 생성
    await createPortfolio(judge_session_id);
  };

  const createPortfolio = async (judge_session_id: string) => {
    if (!submissionId || !script || !rehearsalId) {
      setError("필수 데이터가 없습니다.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("📂 Portfolio 생성 중...");

      // Portfolio API 호출
      const response = await fetch("/api/showtell/portfolio/complete-week", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          child_id: childId,
          week,
          submission_id: submissionId,
          script_id: script.script_id,
          rehearsal_session_id: rehearsalId,
          judge_session_id,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Portfolio 생성 실패");
      }

      console.log("✅ Portfolio 생성 완료:", result.data.portfolio_id);
      setPortfolioId(result.data.portfolio_id);

      alert(`🎉 Week ${week} 완료! Portfolio가 생성되었습니다!`);

    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ Portfolio 생성 오류:", error);
      setError(error.message || "Portfolio 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!submissionId || !script) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
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
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Week {week} - Day 3 🎭
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Rehearsal + Judge Q&A
          </p>
        </motion.div>

        {/* 진행 단계 표시 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex justify-center gap-4">
            <div className={`
              px-6 py-3 rounded-full font-semibold
              ${step === "rehearsal" ? "bg-blue-500 text-white" : rehearsalId ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}
            `}>
              1. Rehearsal
            </div>
            <div className={`
              px-6 py-3 rounded-full font-semibold
              ${step === "judge" ? "bg-blue-500 text-white" : judgeSessionId ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}
            `}>
              2. Judge Q&A
            </div>
            <div className={`
              px-6 py-3 rounded-full font-semibold
              ${step === "portfolio" ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}
            `}>
              3. Portfolio
            </div>
          </div>
        </motion.div>

        {/* 오류 메시지 */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 max-w-4xl mx-auto bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl"
          >
            ❌ {error}
          </motion.div>
        )}

        {/* Step 1: Rehearsal */}
        {step === "rehearsal" && (
          <div className="flex justify-center">
            <Day3Rehearsal
              script={script}
              childId={childId}
              onRehearsalComplete={handleRehearsalComplete}
            />
          </div>
        )}

        {/* Step 2: Judge */}
        {step === "judge" && (
          <div className="flex justify-center">
            <Day3Judge
              script={script}
              childId={childId}
              week={week}
              onJudgeComplete={handleJudgeComplete}
            />
          </div>
        )}

        {/* Step 3: Portfolio */}
        {step === "portfolio" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center"
          >
            <div className="text-8xl mb-6">🎉</div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Week {week} 완료!
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              정말 잘했어요! Portfolio가 생성되었습니다!<br />
              Day 1, 2, 3 모두 완료했어요! 🌟
            </p>

            {loading && (
              <div className="mb-6">
                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Portfolio 생성 중...</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push(`/showtell`)}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-105"
              >
                📂 Portfolio 보러가기
              </button>

              <button
                onClick={() => router.push(`/showtell/week/${week + 1}/day1`)}
                disabled={week >= 12}
                className={`
                  px-8 py-4 
                  bg-gradient-to-r from-green-500 to-blue-500 
                  text-white font-bold text-lg 
                  rounded-xl shadow-lg 
                  transition-all
                  ${week >= 12 ? "opacity-50 cursor-not-allowed" : "hover:scale-105 hover:shadow-xl"}
                `}
              >
                {week < 12 ? `다음 주차 시작하기 (Week ${week + 1}) →` : "🎊 12주 완료!"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

