"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Script, JudgeSession, JudgeQuestion, JudgeAnswer } from "@/app/types/showtell";

interface Day3JudgeProps {
  script: Script;
  childId: string;
  week: number;
  onJudgeComplete: (judgeSessionId: string) => void;
}

/**
 * Day 3 - Judge Q&A 컴포넌트
 * 5개 질문에 순차적으로 답변 + 즉시 피드백
 */
export default function Day3Judge({ script, childId, week, onJudgeComplete }: Day3JudgeProps) {
  const [judgeSessionId, setJudgeSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<JudgeQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [answerText, setAnswerText] = useState<string>("");
  const [lastAnswer, setLastAnswer] = useState<JudgeAnswer | null>(null);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<boolean>(false);

  // Judge Session 생성 + 첫 질문 가져오기
  useEffect(() => {
    const initJudgeSession = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log("🎯 Judge Session 생성 중...");

        // content_pack에서 question_set_id 가져오기
        const contentResponse = await fetch(`/api/showtell/content?week=${week}`);
        const contentResult = await contentResponse.json();

        if (!contentResult.success) {
          throw new Error("콘텐츠 로드 실패");
        }

        const question_set_id = contentResult.data.content_pack.json.day3.judge.question_bank_ref;

        // Judge Session 생성
        const sessionResponse = await fetch("/api/showtell/judge-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            child_id: childId,
            script_id: script.script_id,
            question_set_id,
            n_questions: 5,
          }),
        });

        const sessionResult = await sessionResponse.json();

        if (!sessionResult.success) {
          throw new Error(sessionResult.error || "Judge Session 생성 실패");
        }

        setJudgeSessionId(sessionResult.data.judge_session_id);
        setTotalQuestions(sessionResult.data.total_questions);

        console.log("✅ Judge Session 생성 완료:", sessionResult.data.judge_session_id);

        // 첫 질문 가져오기
        await fetchNextQuestion(sessionResult.data.judge_session_id);

      } catch (err: unknown) {
        const error = err as Error;
        console.error("❌ Judge Session 초기화 오류:", error);
        setError(error.message || "초기화 중 오류가 발생했습니다");
      } finally {
        setLoading(false);
      }
    };

    initJudgeSession();
  }, [script, childId, week]);

  // 다음 질문 가져오기
  const fetchNextQuestion = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/showtell/judge-sessions/${sessionId}/next-question`, {
        method: "POST",
      });

      const result = await response.json();

      if (!result.success) {
        if (result.completed) {
          setCompleted(true);
          onJudgeComplete(sessionId);
          return;
        }
        throw new Error(result.error || "질문 가져오기 실패");
      }

      setCurrentQuestion(result.data.question);
      setQuestionIndex(result.data.question_index);
      setShowFeedback(false);
      setAnswerText("");

      console.log(`✅ 질문 ${result.data.question_index + 1}/${result.data.total_questions}: ${result.data.question.text}`);

    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 질문 가져오기 오류:", error);
      setError(error.message || "질문 가져오기 중 오류가 발생했습니다");
    }
  };

  // 답변 제출
  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) {
      setError("답변을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("💬 답변 제출:", answerText);

      const response = await fetch(`/api/showtell/judge-sessions/${judgeSessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer_text: answerText }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "답변 제출 실패");
      }

      console.log("✅ 답변 제출 완료 + 피드백 받음");

      setLastAnswer(result.data.answer);
      setShowFeedback(true);

      // 5문항 완료 시
      if (result.data.completed) {
        setCompleted(true);
        onJudgeComplete(judgeSessionId!);
      }

    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 답변 제출 오류:", error);
      setError(error.message || "답변 제출 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  // 다음 질문으로
  const handleNextQuestion = () => {
    if (judgeSessionId) {
      fetchNextQuestion(judgeSessionId);
    }
  };

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center"
      >
        <div className="text-8xl mb-6">🎉</div>
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Judge Q&A 완료!
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          5개 질문에 모두 답변했어요! Day 3 완료!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl"
    >
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          👨‍⚖️ Judge Q&A
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          질문에 답변하고 즉시 피드백을 받아보세요!
        </p>
        <div className="mt-4">
          <span className="text-2xl font-bold text-blue-500">
            {questionIndex + 1} / {totalQuestions}
          </span>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl"
        >
          ❌ {error}
        </motion.div>
      )}

      {/* 현재 질문 */}
      {currentQuestion && !showFeedback && (
        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Question {questionIndex + 1}:
            </h3>
            <p className="text-xl text-gray-800 dark:text-gray-200">
              {currentQuestion.text}
            </p>
          </div>

          {/* 답변 입력 */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              💬 Your Answer:
            </label>
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 제출 버튼 */}
          <div className="text-center">
            <button
              onClick={handleSubmitAnswer}
              disabled={loading || !answerText.trim()}
              className={`px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-xl rounded-xl shadow-lg transition-all ${loading || !answerText.trim() ? "opacity-50 cursor-not-allowed" : "hover:scale-105 hover:shadow-xl"}`}
            >
              {loading ? "제출 중... ⏳" : "답변 제출하기 ✅"}
            </button>
          </div>
        </div>
      )}

      {/* 피드백 */}
      {showFeedback && lastAnswer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
            💬 피드백
          </h3>

          {/* 칭찬 */}
          <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border-l-4 border-green-500">
            <h4 className="text-lg font-bold text-green-900 dark:text-green-200 mb-2">
              👏 칭찬
            </h4>
            <p className="text-gray-800 dark:text-gray-200">
              {lastAnswer.feedback.praise}
            </p>
          </div>

          {/* 교정 */}
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-l-4 border-blue-500">
            <h4 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-2">
              ✏️ 교정
            </h4>
            <p className="text-gray-800 dark:text-gray-200">
              {lastAnswer.feedback.correction}
            </p>
          </div>

          {/* 더 좋은 표현 */}
          <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-l-4 border-purple-500">
            <h4 className="text-lg font-bold text-purple-900 dark:text-purple-200 mb-2">
              ✨ 더 좋은 표현
            </h4>
            <p className="text-gray-800 dark:text-gray-200 font-semibold">
              {lastAnswer.feedback.better_expression}
            </p>
          </div>

          {/* 다음 질문 버튼 */}
          <div className="text-center pt-4">
            <button
              onClick={handleNextQuestion}
              className="px-12 py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold text-xl rounded-xl shadow-lg transition-all hover:scale-105"
            >
              {questionIndex + 1 < totalQuestions ? "다음 질문 →" : "Q&A 완료! ✅"}
            </button>
          </div>
        </motion.div>
      )}

      {loading && !showFeedback && (
        <div className="mt-6 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">처리 중...</p>
        </div>
      )}
    </motion.div>
  );
}




