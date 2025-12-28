"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface PremiumFeatureLockProps {
  featureName: string;
  description?: string;
}

export default function PremiumFeatureLock({ 
  featureName, 
  description = "이 기능을 사용하려면 유료 구독이 필요합니다." 
}: PremiumFeatureLockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-8 text-white text-center shadow-xl"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="text-6xl mb-4"
      >
        🔒
      </motion.div>
      <h3 className="text-2xl font-bold mb-2">{featureName}는 유료 기능입니다</h3>
      <p className="mb-6 opacity-90 text-lg">
        {description}
      </p>
      <Link href="/pricing">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white text-purple-600 font-bold px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors shadow-lg text-lg"
        >
          구독하러 가기 →
        </motion.button>
      </Link>
      <p className="mt-4 text-sm opacity-75">
        💡 유료 구독 시 모든 프리미엄 기능을 무제한으로 이용하실 수 있습니다
      </p>
    </motion.div>
  );
}











