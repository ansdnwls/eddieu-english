"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Script } from "@/app/types/showtell";
import Day2ScriptCoach from "@/app/showtell/components/Day2ScriptCoach";
import Day2Shadowing from "@/app/showtell/components/Day2Shadowing";

interface Day2PageProps {
  params: Promise<{
    week: string;
  }>;
}

/**
 * Day 2 메인 페이지
 * Script Coach → TTS + Shadowing 순서로 진행
 */
export default function Day2Page({ params }: Day2PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const week = parseInt(resolvedParams.week);

  // URL에서 submission_id 가져오기 (Day 1에서 전달)
  const submissionId = searchParams.get("submissionId");

  const [step, setStep] = useState<"script" | "shadowing" | "complete">("script");
  const [script, setScript] = useState<Script | null>(null);
  const [shadowingAudioIds, setShadowingAudioIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Mock child_id (실제로는 AuthContext에서 가져옴)
  const childId = "child_demo_001";

  useEffect(() => {
    if (!submissionId) {
      alert("잘못된 접근입니다. Day 1을 먼저 완료해주세요.");
      router.push(`/showtell/week/${week}/day1`);
    }
  }, [submissionId, week, router]);

  const handleScriptGenerated = (generatedScript: Script) => {
    console.log("✅ Script 생성 완료:", generatedScript);
    setScript(generatedScript);
    setStep("shadowing");
  };

  const handleShadowingComplete = async (audioIds: string[]) => {
    console.log("✅ Shadowing 완료:", audioIds);
    setShadowingAudioIds(audioIds);
    
    // Day 2 완료 처리
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/showtell/submissions/${submissionId}/complete-day2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Day 2 완료 처리 실패");
      }

      console.log("✅ Day 2 완료 처리 성공");
      setStep("complete");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ Day 2 완료 처리 오류:", error);
      setError(error.message || "완료 처리 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDay3 = () => {
    router.push(`/showtell/week/${week}/day3?submissionId=${submissionId}`);
  };

  if (!submissionId) {
    return null;
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
            Week {week} - Day 2 📝
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Script Coach + TTS + Shadowing
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
              ${step === "script" ? "bg-blue-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}
            `}>
              1. Script Coach
            </div>
            <div className={`
              px-6 py-3 rounded-full font-semibold
              ${step === "shadowing" ? "bg-blue-500 text-white" : step === "complete" ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}
            `}>
              2. Shadowing
            </div>
            <div className={`
              px-6 py-3 rounded-full font-semibold
              ${step === "complete" ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}
            `}>
              3. Complete
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

        {/* Step 1: Script Coach */}
        {step === "script" && (
          <div className="flex justify-center">
            <Day2ScriptCoach
              submissionId={submissionId}
              onScriptGenerated={handleScriptGenerated}
            />
          </div>
        )}

        {/* Step 2: Shadowing */}
        {step === "shadowing" && script && (
          <div className="flex justify-center">
            <Day2Shadowing
              script={script}
              childId={childId}
              onShadowingComplete={handleShadowingComplete}
            />
          </div>
        )}

        {/* Step 3: Complete */}
        {step === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center"
          >
            <div className="text-8xl mb-6">🎉</div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Day 2 완료!
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              발표 대본도 만들고, 따라 말하기도 완료했어요!<br />
              이제 Day 3에서 리허설과 Q&A를 진행해볼까요?
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push(`/showtell/week/${week}/day1?submissionId=${submissionId}`)}
                className="px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-105"
              >
                ← Day 1 다시 보기
              </button>

              <button
                onClick={handleGoToDay3}
                disabled={loading}
                className={`
                  px-12 py-4 
                  bg-gradient-to-r from-green-500 to-blue-500 
                  text-white font-bold text-xl 
                  rounded-xl shadow-lg 
                  transition-all
                  ${loading ? "opacity-50 cursor-not-allowed" : "hover:scale-105 hover:shadow-xl"}
                `}
              >
                {loading ? "처리 중... ⏳" : "Day 3 시작하기 🚀"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

