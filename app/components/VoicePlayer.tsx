"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { VoiceOption } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { checkUserSubscription, SubscriptionStatus } from "@/lib/subscription/checkSubscription";

interface VoicePlayerProps {
  text: string;
  defaultVoice?: VoiceOption;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
}

// 음성 옵션 표시 이름
const VOICE_DISPLAY_NAMES: Record<VoiceOption, string> = {
  rachel_us: "🇺🇸 Rachel (여성, 미국)",
  domi_us: "🇺🇸 Domi (여성, 미국)",
  elli_us: "🇺🇸 Elli (여성, 미국)",
  antoni_us: "🇺🇸 Antoni (남성, 미국)",
  josh_us: "🇺🇸 Josh (남성, 미국)",
  adam_us: "🇺🇸 Adam (남성, 미국)",
  sam_us: "🇺🇸 Sam (남성, 미국)",
  bella_uk: "🇬🇧 Bella (여성, 영국)",
  arnold_uk: "🇬🇧 Arnold (남성, 영국)",
  default: "🎯 기본 (Rachel)",
};

export default function VoicePlayer({
  text,
  defaultVoice = "default",
  onPlayStart,
  onPlayEnd,
}: VoicePlayerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(defaultVoice);
  const [speed, setSpeed] = useState<number>(0.9); // 기본 속도
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // 구독 상태 확인
  useEffect(() => {
    if (user) {
      checkUserSubscription(user.uid).then(setSubscriptionStatus);
    }
  }, [user]);

  // 오디오 정리
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ElevenLabs API로 음성 생성 및 재생
  const handlePlay = async () => {
    if (!text || text.trim().length === 0) {
      setError("재생할 텍스트가 없습니다.");
      return;
    }

    // 구독 체크
    if (!subscriptionStatus?.isActive) {
      const confirmUpgrade = confirm(
        "🔒 TTS 음성 듣기 기능은 유료 구독 후 이용 가능합니다.\n\n" +
        "구독 페이지로 이동하시겠습니까?"
      );
      if (confirmUpgrade) {
        router.push("/pricing");
      }
      return;
    }

    setIsLoading(true);
    setIsPlaying(true);
    setError(null);
    onPlayStart?.();

    try {
      console.log("🎤 ElevenLabs 음성 생성 시작...");
      console.log("텍스트:", text.substring(0, 50) + "...");
      console.log("음성 옵션:", selectedVoice);

      // 이전 오디오 정리
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      // API 호출
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          voiceOption: selectedVoice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: 음성 생성 실패`
        );
      }

      // MP3 파일을 Blob으로 받기
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      audioUrlRef.current = audioUrl;

      // 오디오 재생
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // 속도 조정
      audio.playbackRate = speed;

      audio.onended = () => {
        console.log("✅ 음성 재생 완료");
        setIsPlaying(false);
        setIsLoading(false);
        onPlayEnd?.();
      };

      audio.onerror = (event) => {
        console.error("❌ 오디오 재생 오류:", event);
        setError("오디오 재생 중 오류가 발생했습니다.");
        setIsPlaying(false);
        setIsLoading(false);
        onPlayEnd?.();
      };

      await audio.play();
      console.log("✅ 음성 재생 시작");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 음성 생성/재생 오류:", error);
      setError(error.message || "음성 생성 중 오류가 발생했습니다.");
      setIsPlaying(false);
      setIsLoading(false);
      onPlayEnd?.();
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsLoading(false);
    onPlayEnd?.();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h4 className="font-semibold text-gray-800 dark:text-white text-lg">
          🔊 원어민 발음 들어보기
        </h4>
        
        <div className="flex gap-2 flex-wrap items-center">
          {/* 음성 선택 */}
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as VoiceOption)}
            disabled={isPlaying || isLoading}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Object.entries(VOICE_DISPLAY_NAMES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          
          {/* 속도 조정 */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
            <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">속도:</label>
            <input
              type="range"
              min="0.5"
              max="1.2"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-20"
              disabled={isPlaying || isLoading}
            />
            <span className="text-xs text-gray-700 dark:text-gray-300 w-10 text-right">
              {speed.toFixed(2)}x
            </span>
          </div>
        </div>
      </div>

      {/* 텍스트 표시 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-700">
        <p className="text-xl font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
          {text}
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* 재생 버튼 */}
      <div className="flex gap-3">
        {!isPlaying && !isLoading ? (
          <button
            onClick={handlePlay}
            disabled={!text || text.trim().length === 0}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            <span className="text-xl">🔊</span>
            <span>들어보기</span>
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>생성 중...</span>
              </>
            ) : (
              <>
                <span>⏹️</span>
                <span>정지</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 안내 메시지 */}
      {!isPlaying && !isLoading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
            💡 여러 원어민 음성을 선택해서 들어볼 수 있어요!<br />
            각 음성마다 발음 스타일이 달라요.
          </p>
        </div>
      )}
    </div>
  );
}


