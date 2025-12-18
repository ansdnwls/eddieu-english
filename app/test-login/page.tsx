"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

// 테스트 계정 정보
const TEST_ACCOUNTS = [
  {
    email: "test@example.com",
    password: "test123456",
    name: "테스트 계정",
    description: "일반 테스트 계정",
  },
  {
    email: "admin@example.com",
    password: "admin123456",
    name: "관리자 계정",
    description: "관리자 테스트 계정",
  },
];

export default function TestLoginPage() {
  const [selectedAccount, setSelectedAccount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const router = useRouter();

  const handleQuickLogin = async (account: typeof TEST_ACCOUNTS[0]) => {
    setError("");
    setLoading(true);

    try {
      await signIn(account.email, account.password);
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError(
          "계정이 존재하지 않습니다. 먼저 회원가입 페이지에서 계정을 생성해주세요."
        );
      } else if (err.code === "auth/invalid-credential") {
        setError("비밀번호가 올바르지 않습니다.");
      } else {
        setError("로그인 중 오류가 발생했습니다: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🧪</div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            테스트 계정 로그인
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            빠른 테스트를 위한 계정 선택
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {TEST_ACCOUNTS.map((account, index) => (
            <motion.button
              key={index}
              onClick={() => handleQuickLogin(account)}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedAccount === index
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="font-semibold text-gray-800 dark:text-white">
                {account.name}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {account.description}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {account.email}
              </div>
            </motion.button>
          ))}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm mb-4"
          >
            {error}
          </motion.div>
        )}

        {loading && (
          <div className="text-center text-gray-600 dark:text-gray-400">
            로그인 중...
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <strong>참고:</strong> 계정이 없으면 먼저 회원가입을 해주세요.
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/signup")}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              회원가입
            </button>
            <button
              onClick={() => router.push("/login")}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
            >
              일반 로그인
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>💡 팁:</strong> 테스트 계정을 자동으로 생성하려면:
            <br />
            <code className="text-xs mt-2 block bg-gray-100 dark:bg-gray-800 p-2 rounded">
              node scripts/create-test-account.js
            </code>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

