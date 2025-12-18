"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      // 대시보드로 이동 (대시보드에서 관리자 체크 후 자동 리디렉션)
      router.push("/dashboard");
    } catch (err: any) {
      let errorMessage = "로그인 중 오류가 발생했습니다.";
      
      if (err.code === "auth/invalid-credential") {
        errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
      } else if (err.code === "auth/user-not-found") {
        errorMessage = "등록되지 않은 이메일입니다.";
      } else if (err.code === "auth/invalid-api-key" || err.code === "auth/api-key-not-valid") {
        errorMessage = "Firebase 설정 오류: .env.local 파일에 올바른 Firebase 설정을 추가해주세요.";
      } else if (err.message && err.message.includes("Firebase가 설정되지 않았습니다")) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      // 대시보드로 이동 (대시보드에서 관리자 체크 후 자동 리디렉션)
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      let errorMessage = "구글 로그인 중 오류가 발생했습니다.";
      
      if (error.code === "auth/popup-closed-by-user") {
        // 사용자가 팝업을 닫은 경우는 에러로 표시하지 않음
        setGoogleLoading(false);
        return;
      } else if (error.code === "auth/unauthorized-domain") {
        errorMessage = error.message || "현재 도메인이 Firebase에 등록되지 않았습니다. Firebase Console에서 도메인을 추가해주세요.";
      } else if (error.code === "auth/invalid-api-key" || error.code === "auth/api-key-not-valid") {
        errorMessage = "Firebase 설정 오류: .env.local 파일에 올바른 Firebase 설정을 추가해주세요.";
      } else if (error.message && error.message.includes("Firebase가 설정되지 않았습니다")) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setGoogleLoading(false);
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
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            로그인
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            아이 영어일기 AI 첨삭 서비스에 오신 것을 환영해요!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className={`w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all ${
              loading || googleLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-105 hover:shadow-xl"
            }`}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                또는
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className={`mt-6 w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 px-6 rounded-lg shadow-md transition-all ${
              loading || googleLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-50 dark:hover:bg-gray-600 hover:shadow-lg"
            }`}
          >
            {googleLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                <span>구글 로그인 중...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>구글로 로그인</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            계정이 없으신가요?{" "}
            <Link
              href="/signup"
              className="text-blue-500 hover:text-blue-600 font-semibold"
            >
              회원가입
            </Link>
          </p>
        </div>

        {/* 테스트 계정 정보 */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            🧪 테스트 계정 (개발용)
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <div>
              <strong>일반 계정:</strong> test@example.com / test123456
            </div>
            <div>
              <strong>관리자:</strong> admin@example.com / admin123456
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail("test@example.com");
                setPassword("test123456");
              }}
              className="mt-2 text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-all"
            >
              일반 계정 자동 입력
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("admin@example.com");
                setPassword("admin123456");
              }}
              className="mt-2 ml-2 text-xs bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded transition-all"
            >
              관리자 계정 자동 입력
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

