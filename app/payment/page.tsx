"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { PaymentWidgetInstance, loadPaymentWidget } from "@tosspayments/payment-widget-sdk";
import Link from "next/link";

interface PaymentPageProps {}

function PaymentPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [paymentWidget, setPaymentWidget] = useState<PaymentWidgetInstance | null>(null);
  const [paymentMethodsWidget, setPaymentMethodsWidget] = useState<ReturnType<PaymentWidgetInstance["renderPaymentMethods"]> | null>(null);
  const [agreementWidget, setAgreementWidget] = useState<ReturnType<PaymentWidgetInstance["renderAgreement"]> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  
  const amount = Number(searchParams.get("amount")) || 10000;
  const orderName = searchParams.get("orderName") || "아이 영어일기 AI 첨삭 서비스";
  const orderId = searchParams.get("orderId") || `order_${Date.now()}`;
  
  const paymentMethodsWidgetRef = useRef<HTMLDivElement>(null);
  const agreementWidgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializePaymentWidget = async () => {
      try {
        setLoading(true);
        setError(null);

        // 토스페이먼츠 클라이언트 키 (환경변수에서 가져오기)
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
        const customerKey = user?.uid || `customer_${Date.now()}`;

        console.log("💳 결제 위젯 초기화 시작...");

        const widget = await loadPaymentWidget(clientKey, customerKey);
        setPaymentWidget(widget);

        // 결제 수단 위젯 렌더링
        if (paymentMethodsWidgetRef.current) {
          const methodsWidget = widget.renderPaymentMethods(
            paymentMethodsWidgetRef.current as any,
            { value: amount },
            { variantKey: "DEFAULT" }
          );
          setPaymentMethodsWidget(methodsWidget);
        }

        // 이용약관 위젯 렌더링
        if (agreementWidgetRef.current) {
          const agreeWidget = widget.renderAgreement(
            agreementWidgetRef.current as any,
            { variantKey: "AGREEMENT" }
          );
          setAgreementWidget(agreeWidget);
        }

        console.log("✅ 결제 위젯 초기화 완료");
      } catch (err: unknown) {
        const error = err as Error;
        console.error("❌ 결제 위젯 초기화 오류:", error);
        setError(error.message || "결제 위젯을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      initializePaymentWidget();
    }

    // cleanup
    return () => {
      if (paymentMethodsWidget && typeof (paymentMethodsWidget as any).destroy === 'function') {
        (paymentMethodsWidget as any).destroy();
      }
      if (agreementWidget && typeof (agreementWidget as any).destroy === 'function') {
        (agreementWidget as any).destroy();
      }
    };
  }, [user, amount]);

  const handlePayment = async () => {
    if (!paymentWidget || !user) {
      setError("결제 위젯이 준비되지 않았습니다.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log("💳 결제 요청 시작...", { orderId, orderName, amount });

      // 결제 위젯에서 결제 정보 가져오기
      const paymentData = await paymentWidget.requestPayment({
        orderId,
        orderName,
        successUrl: `${window.location.origin}/payment/success?orderId=${orderId}`,
        failUrl: `${window.location.origin}/payment/fail?orderId=${orderId}`,
        customerEmail: user.email || "",
        customerName: user.displayName || "고객",
      });

      console.log("✅ 결제 요청 완료:", paymentData);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 결제 요청 오류:", error);
      
      // 사용자가 결제를 취소한 경우는 에러로 표시하지 않음
      if (error.message.includes("사용자가 결제를 취소했습니다") || error.message.includes("canceled")) {
        setError(null);
        return;
      }
      
      setError(error.message || "결제 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AuthGuard redirectTo="/login">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between"
            >
              <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                <span className="text-4xl">✨</span>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                    아이 영어일기 AI 첨삭
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI 선생님이 따뜻하게 영어 일기를 첨삭해줘요
                  </p>
                </div>
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
              >
                ← 돌아가기
              </Link>
            </motion.div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">💳</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                결제하기
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                안전하고 간편한 결제를 진행해주세요
              </p>
            </div>

            {/* 결제 정보 */}
            <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-600 dark:text-gray-400">주문명</span>
                <span className="font-semibold text-gray-800 dark:text-white">{orderName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">결제 금액</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {amount.toLocaleString()}원
                </span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">결제 위젯을 불러오는 중...</p>
              </div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg"
              >
                {error}
              </motion.div>
            ) : (
              <>
                {/* 결제 수단 위젯 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    결제 수단 선택
                  </h3>
                  <div ref={paymentMethodsWidgetRef} className="min-h-[300px]"></div>
                </div>

                {/* 이용약관 위젯 */}
                <div className="mb-6">
                  <div ref={agreementWidgetRef} className="min-h-[100px]"></div>
                </div>

                {/* 결제 버튼 */}
                <button
                  onClick={handlePayment}
                  disabled={processing || !paymentWidget}
                  className={`
                    w-full
                    bg-gradient-to-r from-blue-500 to-purple-500
                    text-white font-bold
                    py-4 px-8
                    rounded-lg shadow-lg
                    transition-all
                    ${processing || !paymentWidget
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:scale-105 hover:shadow-xl"
                    }
                  `}
                >
                  {processing ? "결제 처리 중..." : `${amount.toLocaleString()}원 결제하기`}
                </button>
              </>
            )}

            {/* 안내 사항 */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                💡 결제 안내
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• 결제는 토스페이먼츠를 통해 안전하게 처리됩니다.</li>
                <li>• 카드, 계좌이체, 가상계좌 등 다양한 결제 수단을 이용하실 수 있습니다.</li>
                <li>• 결제 완료 후 자동으로 서비스가 활성화됩니다.</li>
                <li>• 환불 및 취소는 고객센터를 통해 신청하실 수 있습니다.</li>
              </ul>
            </div>
          </motion.div>
        </main>
      </div>
    </AuthGuard>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">결제 페이지 로딩 중...</p>
        </div>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}


