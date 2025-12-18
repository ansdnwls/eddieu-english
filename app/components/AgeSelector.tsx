"use client";

import { motion } from "framer-motion";

interface AgeSelectorProps {
  age: number;
  onAgeChange: (age: number) => void;
}

export default function AgeSelector({ age, onAgeChange }: AgeSelectorProps) {
  const ages = [6, 7, 8, 9, 10, 11, 12, 13];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full"
    >
      <label className="block text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        아이의 나이를 선택해주세요
      </label>
      <div className="grid grid-cols-4 gap-3">
        {ages.map((ageOption) => (
          <button
            key={ageOption}
            onClick={() => onAgeChange(ageOption)}
            className={`py-3 px-4 rounded-xl font-semibold transition-all ${
              age === ageOption
                ? "bg-blue-500 text-white shadow-lg scale-105"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700"
            }`}
          >
            {ageOption}세
          </button>
        ))}
      </div>
    </motion.div>
  );
}

