"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Script } from "@/app/types/showtell";

interface Day2ScriptCoachProps {
  submissionId: string;
  onScriptGenerated: (script: Script) => void;
}

/**
 * Day 2 - Script Coach 컴포넌트
 * AI가 30초/60초 발표 대본을 생성합니다.
 */
export default function Day2ScriptCoach({ submissionId, onScriptGenerated }: Day2ScriptCoachProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<Script | null>(null);

  const handleGenerateScript = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("📝 Script 생성 요청:", submissionId);

      const response = await fetch(`/api/showtell/submissions/${submissionId}/script`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Script 생성 실패");
      }

      console.log("✅ Script 생성 완료:", result.data);
      setScript(result.data);
      onScriptGenerated(result.data);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ Script 생성 오류:", error);
      setError(error.message || "Script 생성 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl"
    >
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📝 Script Coach
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          AI가 여러분의 글을 30초/60초 발표 대본으로 만들어줍니다!
        </p>
      </div>

      {!script && (
        <div className="text-center">
          <button
            onClick={handleGenerateScript}
            disabled={loading}
            className={`
              px-12 py-4 
              bg-gradient-to-r from-purple-500 to-pink-500 
              text-white font-bold text-xl 
              rounded-xl shadow-lg 
              transition-all
              ${loading 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:scale-105 hover:shadow-xl"
              }
            `}
          >
            {loading ? "대본 생성 중... ⏳" : "발표 대본 만들기 🚀"}
          </button>
        </div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl"
        >
          ❌ {error}
        </motion.div>
      )}

      {script && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 space-y-6"
        >
          {/* 30초 대본 */}
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200 mb-3">
              ⚡ 30초 대본 (3-4문장)
            </h3>
            <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed whitespace-pre-wrap">
              {script.script_30s}
            </p>
          </div>

          {/* 60초 대본 */}
          {script.script_60s && (
            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-200 mb-3">
                ⏱️ 60초 대본 (6-8문장)
              </h3>
              <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed whitespace-pre-wrap">
                {script.script_60s}
              </p>
            </div>
          )}

          {/* 핵심 단어 */}
          <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <h3 className="text-xl font-bold text-green-900 dark:text-green-200 mb-3">
              🔑 핵심 단어 (Keywords)
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

          {/* 쉬운 표현 */}
          {script.simplified_sentences && script.simplified_sentences.length > 0 && (
            <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
              <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-200 mb-3">
                💡 쉽게 바꾸면?
              </h3>
              <div className="space-y-2">
                {script.simplified_sentences.map((sentence: string, index: number) => (
                  <p key={index} className="text-gray-800 dark:text-gray-200">
                    {sentence}
                  </p>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}




