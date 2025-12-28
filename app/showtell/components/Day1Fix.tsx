"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CorrectionResult } from "@/app/types/showtell";

interface Day1FixProps {
  submissionId: string;
  onComplete: () => void;
}

export default function Day1Fix({ submissionId, onComplete }: Day1FixProps) {
  const [correction, setCorrection] = useState<CorrectionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState<"minimal" | "native">("minimal");
  const [correctionLevel, setCorrectionLevel] = useState<"minimal" | "detailed">("minimal");
  const [hasCorrectionRun, setHasCorrectionRun] = useState<boolean>(false);

  // 교정 실행 함수
  const runCorrection = async (level: "minimal" | "detailed") => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔧 교정 요청:", { submissionId, level });

      const response = await fetch(`/api/showtell/submissions/${submissionId}/correct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correction_level: level,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCorrection(result.data);
        setHasCorrectionRun(true);
        console.log(`✅ 교정 완료 (${level}): ${result.data.upgrades?.length || 0}개 수정`);
      } else {
        throw new Error(result.error || "Correction failed");
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 교정 오류:", error);
      setError("교정 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 레벨 변경 시 재실행
  const handleLevelChange = (level: "minimal" | "detailed") => {
    setCorrectionLevel(level);
    runCorrection(level);
  };

  // 초기 로드 (minimal 모드로 자동 실행)
  useEffect(() => {
    if (!hasCorrectionRun) {
      runCorrection("minimal");
    }
  }, [submissionId, hasCorrectionRun]);

  // 로딩 중
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-[500px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-6xl mb-4"
        >
          🤖
        </motion.div>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          AI가 교정 중입니다...
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          잠시만 기다려주세요!
        </p>
      </div>
    );
  }

  // 에러
  if (error || !correction) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-400 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl text-center">
          <p className="text-xl font-bold mb-2">⚠️ 교정 실패</p>
          <p>{error || "교정 결과를 불러올 수 없습니다."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 rounded-2xl p-6 shadow-lg text-center"
      >
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          교정이 완료되었어요!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {correction.upgrades?.length || 0}개의 중요한 부분을 고쳐드렸어요
        </p>
      </motion.div>

      {/* 교정 레벨 선택 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800"
      >
        <p className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
          <span>🎯</span>
          <span>교정 수준 선택:</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => handleLevelChange("minimal")}
            disabled={isLoading}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all text-sm ${
              correctionLevel === "minimal"
                ? "bg-blue-500 text-white shadow-lg ring-2 ring-blue-300"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="text-lg mb-1">✏️</div>
            <div>최소 교정</div>
            <div className="text-xs opacity-75">(1-2개만 고쳐요)</div>
          </button>
          <button
            onClick={() => handleLevelChange("detailed")}
            disabled={isLoading}
            className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all text-sm ${
              correctionLevel === "detailed"
                ? "bg-purple-500 text-white shadow-lg ring-2 ring-purple-300"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="text-lg mb-1">📝</div>
            <div>상세 교정</div>
            <div className="text-xs opacity-75">(3-5개 자세히)</div>
          </button>
        </div>
        <p className="text-xs text-purple-700 dark:text-purple-400 mt-2 text-center">
          💡 레벨을 바꾸면 다시 교정해드려요!
        </p>
      </motion.div>

      {/* 격려 메시지 */}
      {correction.encouragement && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4"
        >
          <p className="text-yellow-800 dark:text-yellow-300 font-semibold">
            💪 {correction.encouragement}
          </p>
        </motion.div>
      )}

      {/* 교정 내용 토글 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4"
      >
        <button
          onClick={() => setShowComparison("minimal")}
          className={`flex-1 py-3 rounded-xl font-bold transition-all ${
            showComparison === "minimal"
              ? "bg-blue-500 text-white shadow-lg"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          ✏️ 최소 수정본
        </button>
        <button
          onClick={() => setShowComparison("native")}
          className={`flex-1 py-3 rounded-xl font-bold transition-all ${
            showComparison === "native"
              ? "bg-purple-500 text-white shadow-lg"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          ✨ 원어민 수준 재작성
        </button>
      </motion.div>

      {/* 교정 결과 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={showComparison}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 border-gray-200 dark:border-gray-700"
        >
          <p className="text-lg text-gray-800 dark:text-white leading-relaxed whitespace-pre-wrap">
            {showComparison === "minimal" ? correction.minimal_fix_text : correction.native_rewrite_text}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* 업그레이드 제안 */}
      {correction.upgrades && correction.upgrades.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            🔍 고친 부분 ({correction.upgrades.length}개):
          </h3>
          {correction.upgrades.map((upgrade, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-5 border-l-4 border-blue-500"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  Before
                </div>
                <p className="flex-1 text-gray-700 dark:text-gray-300 line-through">
                  {upgrade.original}
                </p>
              </div>
              <div className="flex items-start gap-3 mb-3">
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  After
                </div>
                <p className="flex-1 text-gray-900 dark:text-white font-semibold">
                  {upgrade.suggestion}
                </p>
              </div>
              <div className="pl-[90px]">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  💡 {upgrade.explanation}
                </p>
                {upgrade.example && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 italic">
                    예시: {upgrade.example}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* 전체 피드백 */}
      {correction.overall_feedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-5 border-2 border-purple-300 dark:border-purple-700"
        >
          <h3 className="text-lg font-bold text-purple-800 dark:text-purple-300 mb-2">
            👨‍🏫 선생님의 코멘트:
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            {correction.overall_feedback}
          </p>
        </motion.div>
      )}

      {/* 다음 단계 버튼 */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={onComplete}
        className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-5 rounded-xl shadow-lg transition-all text-lg"
      >
        ✅ Day 1 완료! 발표 만들기 →
      </motion.button>
    </div>
  );
}

