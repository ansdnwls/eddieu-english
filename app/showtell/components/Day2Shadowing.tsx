"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Script, AudioRecord } from "@/app/types/showtell";

interface Day2ShadowingProps {
  script: Script;
  childId: string;
  onShadowingComplete: (audioIds: string[]) => void;
}

/**
 * Day 2 - TTS + Shadowing 컴포넌트
 * TTS로 대본을 듣고, 따라 말하기 녹음을 합니다. (3문장만)
 */
export default function Day2Shadowing({ script, childId, onShadowingComplete }: Day2ShadowingProps) {
  const [currentSentence, setCurrentSentence] = useState<number>(0);
  const [isPlayingTTS, setIsPlayingTTS] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordings, setRecordings] = useState<{ [sentenceIndex: number]: string }>({}); // { 0: audio_id, 1: audio_id, 2: audio_id }
  const [feedback, setFeedback] = useState<{ [sentenceIndex: number]: string }>({}); // { 0: "Great!", 1: "Good!" }
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false); // AI 평가 중
  const [error, setError] = useState<string | null>(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 컴포넌트 언마운트 시 오디오 정리
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  // 대본을 문장으로 분리 (AI가 선택한 3문장 사용, 없으면 기본 방식)
  const sentences = script.shadowing_sentences && script.shadowing_sentences.length === 3
    ? script.shadowing_sentences
    : script.script_30s
        .split(/[.!?]+/)
        .filter((s: string) => s.trim().length > 0)
        .map((s: string) => s.trim() + ".")
        .slice(0, 3); // Fallback: 앞 3문장

  // TTS 재생 (ElevenLabs API 사용)
  const handlePlayTTS = async (sentence: string, index: number) => {
    setIsPlayingTTS(true);
    setError(null);
    setCurrentSentence(index);

    try {
      console.log("🎤 ElevenLabs TTS 요청:", sentence);

      // 기존 오디오 정리
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      // ElevenLabs API 호출
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sentence,
          voiceOption: "rachel_us", // 어린이 친화적 음성
          speed: 0.85, // 어린이용 느린 속도 (ElevenLabs API 레벨)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "음성 생성 실패");
      }

      // MP3 파일을 Blob으로 받기
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      audioUrlRef.current = audioUrl;

      // 오디오 재생
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // 브라우저 재생 속도는 1.0으로 설정 (이미 ElevenLabs에서 0.85로 생성됨)
      audio.playbackRate = 1.0;

      audio.onended = () => {
        console.log("✅ TTS 재생 완료");
        setIsPlayingTTS(false);
      };

      audio.onerror = () => {
        console.error("❌ 오디오 재생 오류");
        setError("음성 재생 중 오류가 발생했습니다.");
        setIsPlayingTTS(false);
      };

      await audio.play();
      console.log("🔊 TTS 재생 시작 (ElevenLabs)");

    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ TTS 오류:", error);
      setError(error.message || "음성 생성 중 오류가 발생했습니다");
      setIsPlayingTTS(false);
    }
  };

  // 녹음 시작
  const handleStartRecording = async () => {
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

  // 녹음 저장 + AI 피드백
  const handleSaveRecording = async (audioBlob: Blob) => {
    try {
      console.log("💾 녹음 저장 중...");

      // Mock: 실제로는 Firebase Storage에 업로드
      const storage_url = `https://storage.googleapis.com/showtell/audio/${Date.now()}.webm`;
      const duration_sec = 5; // Mock duration

      const response = await fetch("/api/showtell/audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          child_id: childId,
          related_type: "shadowing",
          related_id: script.script_id,
          duration_sec,
          storage_url,
          attempt_number: currentSentence + 1,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "녹음 저장 실패");
      }

      console.log("✅ 녹음 저장 완료:", result.data);

      const audio_id = result.data.audio_id;

      // AI 피드백 평가 (Mock)
      setIsEvaluating(true);
      const feedbackText = await evaluatePronunciation(sentences[currentSentence]);
      setIsEvaluating(false);

      // 현재 문장 완료 처리
      const newRecordings = { ...recordings, [currentSentence]: audio_id };
      const newFeedback = { ...feedback, [currentSentence]: feedbackText };
      setRecordings(newRecordings);
      setFeedback(newFeedback);

      // 완료된 문장 수 확인
      const completedCount = Object.keys(newRecordings).length;

      if (completedCount >= 3) {
        // 3문장 모두 완료 - 배열로 변환
        const audioIds = [
          newRecordings[0] || "",
          newRecordings[1] || "",
          newRecordings[2] || ""
        ];
        onShadowingComplete(audioIds);
      } else {
        // 다음 문장으로 자동 이동
        setTimeout(() => {
          setCurrentSentence((prev) => {
            const nextIndex = prev + 1;
            return nextIndex < 3 ? nextIndex : prev;
          });
        }, 2000); // 2초 후 자동 이동
      }

    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 녹음 저장 오류:", error);
      setError(error.message || "녹음 저장 중 오류가 발생했습니다");
      setIsEvaluating(false);
    }
  };

  /**
   * AI 발음 평가 (Mock)
   * 실제로는 Speech-to-Text + 발음 분석 API 사용
   */
  const evaluatePronunciation = async (sentence: string): Promise<string> => {
    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock 피드백 (실제로는 AI API 호출)
    const feedbackOptions = [
      "🎉 Perfect! 완벽한 발음이에요!",
      "👍 Great job! 정말 잘했어요!",
      "💪 Good! 조금만 더 크게 말해보세요!",
      "✨ Nice! 발음이 또렷해요!",
      "🌟 Excellent! 속도가 딱 좋아요!",
    ];
    return feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
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
          🎧 Shadowing (따라말하기)
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-2">
          TTS로 문장을 듣고, 똑같이 따라 말해보세요! (3문장만)
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            🎤 <strong>녹음을 시작하면 브라우저에서 마이크 권한을 요청합니다.</strong><br/>
            팝업이 나타나면 <strong className="text-blue-900 dark:text-blue-100">"허용"</strong>을 클릭해주세요!
          </p>
        </div>
      </div>

      {/* 진행 상황 */}
      <div className="mb-8">
        <div className="flex justify-center gap-4">
          {[0, 1, 2].map((index: number) => (
            <div
              key={index}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                ${recordings[index]
                  ? "bg-green-500 text-white" 
                  : currentSentence === index 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                }
              `}
            >
              {recordings[index] ? "✓" : index + 1}
            </div>
          ))}
        </div>
        <p className="text-center mt-2 text-gray-600 dark:text-gray-400">
          {Object.keys(recordings).length} / 3 문장 완료
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

      {/* AI 평가 중 */}
      {isEvaluating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 bg-blue-100 dark:bg-blue-900/30 border border-blue-400 text-blue-700 dark:text-blue-300 px-6 py-4 rounded-xl text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>🤖 AI가 발음을 평가하는 중...</span>
          </div>
        </motion.div>
      )}

      {/* 이전 문장 피드백 표시 */}
      {feedback[currentSentence - 1] && !recordings[currentSentence] && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600 px-6 py-4 rounded-xl"
        >
          <p className="text-lg font-bold text-green-800 dark:text-green-200 text-center">
            {feedback[currentSentence - 1]}
          </p>
        </motion.div>
      )}

      {/* 현재 문장 */}
      {Object.keys(recordings).length < 3 && (
        <motion.div
          key={currentSentence}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl"
        >
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">
              문장 {currentSentence + 1}
            </span>
          </div>
          <p className="text-2xl text-gray-900 dark:text-white font-semibold text-center">
            {sentences[currentSentence]}
          </p>
        </motion.div>
      )}

      {/* 버튼들 */}
      {Object.keys(recordings).length < 3 && !recordings[currentSentence] && (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => handlePlayTTS(sentences[currentSentence], currentSentence)}
            disabled={isPlayingTTS || isRecording || isEvaluating}
            className={`
              px-8 py-4 
              bg-blue-500 hover:bg-blue-600 
              text-white font-bold text-lg 
              rounded-xl shadow-lg 
              transition-all
              ${(isPlayingTTS || isRecording || isEvaluating) ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
            `}
          >
            {isPlayingTTS ? "🔊 재생 중..." : "🔊 원어민 음성 듣기"}
          </button>

          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              disabled={isPlayingTTS || isEvaluating}
              className={`
                px-8 py-4 
                bg-red-500 hover:bg-red-600 
                text-white font-bold text-lg 
                rounded-xl shadow-lg 
                transition-all
                ${(isPlayingTTS || isEvaluating) ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
              `}
            >
              🎙️ 녹음 시작
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-105 animate-pulse"
            >
              ⏹️ 녹음 중지
            </button>
          )}
        </div>
      )}

      {/* 현재 문장 완료 대기 중 (다음 문장으로 자동 이동 전) */}
      {recordings[currentSentence] && Object.keys(recordings).length < 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl"
        >
          <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
            {feedback[currentSentence]}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            🔄 곧 다음 문장으로 넘어갑니다...
          </p>
        </motion.div>
      )}

      {/* 완료 메시지 */}
      {Object.keys(recordings).length >= 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-green-50 dark:bg-green-900/20 rounded-2xl"
        >
          <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
            🎉 Shadowing 완료!
          </h3>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-4">
            정말 잘했어요! 3문장을 모두 완벽하게 녹음했어요!
          </p>
          
          {/* 전체 피드백 요약 */}
          <div className="mt-6 space-y-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg text-left"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {sentences[index]}
                  </p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">
                    {feedback[index]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-lg text-gray-600 dark:text-gray-400 mt-6">
            이제 Day 3으로 넘어갈 수 있어요! 🚀
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

