"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const promoCode = searchParams.get("promoCode");
  const originalAmount = searchParams.get("originalAmount");

  useEffect(() => {
    const confirmPayment = async () => {
      if (!paymentKey || !orderId || !amount) {
        setError("결제 정보가 올바르지 않습니다.");
        setLoading(false);
        return;
      }

      try {
        console.log("✅ 결제 승인 요청:", { paymentKey, orderId, amount });

        const response = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
            userId: user?.uid, // 구독 결제를 위해 userId 전달
            promoCode: promoCode || undefined, // 프로모션 코드 전달
            originalAmount: originalAmount ? Number(originalAmount) : undefined, // 원래 금액 전달
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log("✅ 결제 승인 완료:", result.data);
        } else {
          throw new Error(result.error || "결제 승인 중 오류가 발생했습니다.");
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error("❌ 결제 승인 오류:", error);
        setError(error.message || "결제 승인 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    confirmPayment();
  }, [paymentKey, orderId, amount]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
      >
        {loading ? (
          <>
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              결제 확인 중...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              잠시만 기다려주세요
            </p>
          </>
        ) : error ? (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
              결제 실패
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <Link
              href="/payment"
              className="inline-block px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all"
            >
              다시 시도하기
            </Link>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              결제가 완료되었습니다!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              서비스를 이용하실 수 있습니다
            </p>
            {amount && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  결제 금액
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Number(amount).toLocaleString()}원
                </div>
              </div>
            )}
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all text-center"
              >
                대시보드로 가기
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-900/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">결제 확인 중...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

