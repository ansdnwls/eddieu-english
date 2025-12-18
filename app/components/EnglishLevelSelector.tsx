"use client";

import { ENGLISH_LEVELS, EnglishLevel } from "@/app/types";

interface EnglishLevelSelectorProps {
  selectedLevel: EnglishLevel | "";
  onLevelChange: (level: EnglishLevel) => void;
}

export default function EnglishLevelSelector({
  selectedLevel,
  onLevelChange,
}: EnglishLevelSelectorProps) {
  return (
    <div className="space-y-3">
      {ENGLISH_LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          onClick={() => onLevelChange(level.value)}
          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
            selectedLevel === level.value
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md"
              : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedLevel === level.value
                  ? "border-blue-500 bg-blue-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {selectedLevel === level.value && (
                <div className="w-2 h-2 rounded-full bg-white"></div>
              )}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-800 dark:text-white mb-1">
                {level.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {level.description}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}





