"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Script, RehearsalSession, RehearsalFeedback } from "@/app/types/showtell";

interface Day3RehearsalProps {
  script: Script;
  childId: string;
  onRehearsalComplete: (rehearsalId: string) => void;
}

/**
 * Day 3 - Rehearsal 컴포넌트
 * 1차 녹음 → 피드백 → 2차 녹음 (최종 발표)
 */
export default function Day3Rehearsal({ script, childId, onRehearsalComplete }: Day3RehearsalProps) {
  const [step, setStep] = useState<"attempt1" | "feedback" | "attempt2" | "complete">("attempt1");
  const [rehearsalId, setRehearsalId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<RehearsalFeedback | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Rehearsal 세션 생성
  const createRehearsalSession = async (): Promise<string> => {
    const response = await fetch("/api/showtell/rehearsals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script_id: script.script_id,
        child_id: childId,
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Rehearsal 세션 생성 실패");
    }

    return result.data.rehearsal_id;
  };

  // 녹음 시작
  const handleStartRecording = async () => {
    // 첫 녹음이면 세션 생성
    if (!rehearsalId) {
      try {
        const newRehearsalId = await createRehearsalSession();
        setRehearsalId(newRehearsalId);
        console.log("✅ Rehearsal 세션 생성:", newRehearsalId);
      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message);
        return;
      }
    }

    setIsRecording(true);
    setError(null);
    audioChunksRef.current = [];

    try {
      // 브라우저 환경 확인
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        throw new Error("브라우저 환경이 아닙니다.");
      }

      // MediaDevices API 지원 확인
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "이 브라우저는 마이크 녹음을 지원하지 않습니다. " +
          "Chrome, Edge, Firefox, Safari 최신 버전을 사용하거나 HTTPS 환경에서 접속해주세요."
        );
      }

      console.log("🎙️ 마이크 권한 요청 중...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      console.log("✅ 마이크 권한 허용됨");
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleSaveRecording(audioBlob);
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      console.log("🎙️ 녹음 시작");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 녹음 시작 오류:", error);
      
      // 사용자 친화적 에러 메시지
      let errorMessage = "마이크 권한이 필요합니다.";
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage = "🎤 마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "🎤 마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.";
      } else if (error.name === "NotSupportedError") {
        errorMessage = "🔒 HTTPS 환경에서만 마이크 녹음이 가능합니다. localhost 또는 HTTPS 사이트에서 접속해주세요.";
      } else if (error.message.includes("지원하지 않습니다")) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setIsRecording(false);
    }
  };

  // 녹음 중지
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log("⏹️ 녹음 중지");
    }
  };

  // 녹음 저장
  const handleSaveRecording = async (audioBlob: Blob) => {
    setLoading(true);
    setError(null);

    try {
      console.log("💾 녹음 저장 중...");

      // Mock: 실제로는 Firebase Storage에 업로드
      const storage_url = `https://storage.googleapis.com/showtell/rehearsal/${Date.now()}.webm`;
      const duration_sec = 10; // Mock duration

      // Audio Record 저장
      const audioResponse = await fetch("/api/showtell/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          related_type: step === "attempt1" ? "rehearsal1" : "rehearsal2",
          related_id: rehearsalId,
          duration_sec,
          storage_url,
        }),
      });

      const audioResult = await audioResponse.json();
      if (!audioResult.success) {
        throw new Error(audioResult.error || "녹음 저장 실패");
      }

      const audio_id = audioResult.data.audio_id;
      console.log("✅ Audio 저장 완료:", audio_id);

      // Attempt 업로드
      const attemptEndpoint = step === "attempt1" ? "attempt1" : "attempt2";
      const attemptResponse = await fetch(`/api/showtell/rehearsals/${rehearsalId}/${attemptEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_id }),
      });

      const attemptResult = await attemptResponse.json();
      if (!attemptResult.success) {
        throw new Error(attemptResult.error || "Attempt 저장 실패");
      }

      console.log(`✅ ${attemptEndpoint} 저장 완료`);

      if (step === "attempt1") {
        // 피드백 요청
        await requestFeedback();
      } else {
        // Attempt2 완료 → Rehearsal 완료
        setStep("complete");
        onRehearsalComplete(rehearsalId!);
      }

    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 녹음 저장 오류:", error);
      setError(error.message || "녹음 저장 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  // 피드백 요청
  const requestFeedback = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🤖 피드백 요청 중...");

      const feedbackResponse = await fetch(`/api/showtell/rehearsals/${rehearsalId}/feedback`, {
        method: "POST",
      });

      const feedbackResult = await feedbackResponse.json();
      if (!feedbackResult.success) {
        throw new Error(feedbackResult.error || "피드백 생성 실패");
      }

      console.log("✅ 피드백 생성 완료");
      setFeedback(feedbackResult.data);
      setStep("feedback");

    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 피드백 요청 오류:", error);
      setError(error.message || "피드백 생성 중 오류가 발생했습니다");
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
          🎭 Rehearsal (리허설)
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-2">
          발표 연습을 해봐요! 1차 → 피드백 → 2차 녹음
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            🎤 <strong>녹음을 시작하면 브라우저에서 마이크 권한을 요청합니다.</strong><br/>
            팝업이 나타나면 <strong className="text-blue-900 dark:text-blue-100">"허용"</strong>을 클릭해주세요!
          </p>
        </div>
      </div>

      {/* 대본 표시 */}
      <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200 mb-3">
          📝 발표 대본
        </h3>
        <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
          {script.script_30s}
        </p>
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

      {/* Step 1: Attempt 1 */}
      {step === "attempt1" && (
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            1️⃣ 첫 번째 발표 녹음
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            대본을 보면서 발표해보세요!
          </p>

          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              disabled={loading}
              className={`px-12 py-4 bg-red-500 hover:bg-red-600 text-white font-bold text-xl rounded-xl shadow-lg transition-all ${loading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
            >
              🎙️ 녹음 시작
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="px-12 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xl rounded-xl shadow-lg transition-all hover:scale-105 animate-pulse"
            >
              ⏹️ 녹음 중지
            </button>
          )}
        </div>
      )}

      {/* Step 2: Feedback */}
      {step === "feedback" && feedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
            💬 선생님의 피드백
          </h3>

          {/* 칭찬 */}
          <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border-l-4 border-green-500">
            <h4 className="text-lg font-bold text-green-900 dark:text-green-200 mb-2">
              👏 칭찬
            </h4>
            <p className="text-gray-800 dark:text-gray-200">
              {feedback.praise}
            </p>
          </div>

          {/* 팁 1 */}
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-l-4 border-blue-500">
            <h4 className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-2">
              💡 팁 1
            </h4>
            <p className="text-gray-800 dark:text-gray-200">
              {feedback.tip1}
            </p>
          </div>

          {/* 팁 2 */}
          <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-l-4 border-purple-500">
            <h4 className="text-lg font-bold text-purple-900 dark:text-purple-200 mb-2">
              💡 팁 2
            </h4>
            <p className="text-gray-800 dark:text-gray-200">
              {feedback.tip2}
            </p>
          </div>

          {/* 개선 문장 */}
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-l-4 border-yellow-500">
            <h4 className="text-lg font-bold text-yellow-900 dark:text-yellow-200 mb-2">
              ✨ 이렇게 말해보세요!
            </h4>
            <p className="text-gray-800 dark:text-gray-200 font-semibold">
              {feedback.improved_sentence}
            </p>
          </div>

          {/* 다음 단계 버튼 */}
          <div className="text-center pt-4">
            <button
              onClick={() => setStep("attempt2")}
              className="px-12 py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold text-xl rounded-xl shadow-lg transition-all hover:scale-105"
            >
              ✅ 피드백 확인 완료! 2차 녹음하기 →
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Attempt 2 */}
      {step === "attempt2" && (
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            2️⃣ 두 번째 발표 녹음 (최종본)
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            피드백을 반영해서 다시 발표해보세요!
          </p>

          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              disabled={loading}
              className={`px-12 py-4 bg-red-500 hover:bg-red-600 text-white font-bold text-xl rounded-xl shadow-lg transition-all ${loading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
            >
              🎙️ 최종 녹음 시작
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="px-12 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xl rounded-xl shadow-lg transition-all hover:scale-105 animate-pulse"
            >
              ⏹️ 녹음 중지
            </button>
          )}
        </div>
      )}

      {/* Step 4: Complete */}
      {step === "complete" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-green-50 dark:bg-green-900/20 rounded-2xl"
        >
          <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
            🎉 리허설 완료!
          </h3>
          <p className="text-xl text-gray-700 dark:text-gray-300">
            정말 잘했어요! 이제 Judge Q&A로 넘어갈 수 있어요!
          </p>
        </motion.div>
      )}

      {loading && (
        <div className="mt-6 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">처리 중...</p>
        </div>
      )}
    </motion.div>
  );
}

