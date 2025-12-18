"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  const getErrorMessage = (): string => {
    if (errorMessage) {
      return errorMessage;
    }
    
    switch (errorCode) {
      case "USER_CANCEL":
        return "결제가 취소되었습니다.";
      case "INVALID_CARD":
        return "유효하지 않은 카드 정보입니다.";
      case "INSUFFICIENT_FUNDS":
        return "잔액이 부족합니다.";
      default:
        return "결제 중 오류가 발생했습니다.";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
      >
        <div className="text-5xl mb-4">😢</div>
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
          결제에 실패했습니다
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {getErrorMessage()}
        </p>
        
        {errorCode && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              오류 코드
            </div>
            <div className="text-lg font-semibold text-gray-800 dark:text-white">
              {errorCode}
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <Link
            href="/payment"
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all text-center"
          >
            다시 시도하기
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all text-center"
          >
            대시보드로 가기
          </Link>
        </div>
      </motion.div>
    </div>
  );
}


