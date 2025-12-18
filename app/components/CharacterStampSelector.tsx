"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CharacterStamp, CharacterStampInfo } from "@/app/types";

const CHARACTER_STAMPS: CharacterStampInfo[] = [
  { emoji: "🦁", name: "사자", description: "용감하고 씩씩한" },
  { emoji: "🐰", name: "토끼", description: "귀엽고 상냥한" },
  { emoji: "🐻", name: "곰", description: "든든하고 다정한" },
  { emoji: "🦊", name: "여우", description: "영리하고 재치있는" },
  { emoji: "🐼", name: "판다", description: "사랑스럽고 친근한" },
  { emoji: "🐯", name: "호랑이", description: "당당하고 멋진" },
  { emoji: "🐨", name: "코알라", description: "느긋하고 차분한" },
  { emoji: "🐸", name: "개구리", description: "발랄하고 재밌는" },
  { emoji: "🐷", name: "돼지", description: "복스럽고 행복한" },
  { emoji: "🐥", name: "병아리", description: "앙증맞고 사랑스러운" },
];

interface CharacterStampSelectorProps {
  selectedStamp: CharacterStamp | null;
  onSelect: (stamp: CharacterStamp) => void;
}

export default function CharacterStampSelector({
  selectedStamp,
  onSelect,
}: CharacterStampSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        나의 캐릭터 도장 선택하기 ✨
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        펜팔 친구가 편지를 받으면 이 도장이 찍혀요!
      </p>

      <div className="grid grid-cols-5 gap-3">
        {CHARACTER_STAMPS.map((stamp) => (
          <motion.button
            key={stamp.emoji}
            type="button"
            onClick={() => onSelect(stamp.emoji)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative p-4 rounded-xl border-2 transition-all
              ${
                selectedStamp === stamp.emoji
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
              }
            `}
          >
            <div className="text-4xl mb-2">{stamp.emoji}</div>
            <div className="text-xs font-semibold text-gray-800 dark:text-white">
              {stamp.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stamp.description}
            </div>

            {selectedStamp === stamp.emoji && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
              >
                ✓
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {selectedStamp && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center gap-3">
            <div className="text-5xl">{selectedStamp}</div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">
                선택한 캐릭터 도장
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {CHARACTER_STAMPS.find((s) => s.emoji === selectedStamp)?.name} -{" "}
                {CHARACTER_STAMPS.find((s) => s.emoji === selectedStamp)?.description}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// 도장 표시 컴포넌트 (미션 페이지에서 사용)
export function StampDisplay({ stamp, size = "md" }: { stamp: CharacterStamp; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "text-2xl w-8 h-8",
    md: "text-4xl w-12 h-12",
    lg: "text-6xl w-16 h-16",
  };

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", duration: 0.6 }}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        bg-gradient-to-br from-yellow-100 to-orange-100 
        dark:from-yellow-900/30 dark:to-orange-900/30
        rounded-full shadow-lg border-2 border-yellow-300 dark:border-yellow-700
      `}
      title="인증 완료!"
    >
      {stamp}
    </motion.div>
  );
}

