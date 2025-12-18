"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function PricingPage() {
  const { user } = useAuth();

  const plans = [
    {
      name: "무료",
      price: 0,
      period: "영구",
      description: "기본 기능을 무료로 이용하세요",
      features: [
        "일기 첨삭 5회/월",
        "기본 AI 피드백",
        "단어장 기능",
        "기본 통계",
      ],
      buttonText: "지금 시작하기",
      buttonLink: user ? "/dashboard" : "/signup",
      popular: false,
      color: "gray",
    },
    {
      name: "베이직",
      price: 9900,
      period: "월",
      description: "개인 학습자에게 적합한 플랜",
      features: [
        "일기 첨삭 무제한",
        "상세 AI 피드백",
        "단어장 + 발음 연습",
        "상세 통계 및 리포트",
        "월간 성장 리포트",
      ],
      buttonText: "구독하기",
      buttonLink: "/payment?amount=9900&orderName=베이직 플랜&orderId=plan_basic",
      popular: true,
      color: "blue",
    },
    {
      name: "프리미엄",
      price: 19900,
      period: "월",
      description: "전문적인 학습 관리가 필요한 경우",
      features: [
        "일기 첨삭 무제한",
        "프리미엄 AI 피드백",
        "단어장 + 발음 연습 + TTS",
        "상세 통계 및 리포트",
        "월간 성장 리포트",
        "우선 고객 지원",
        "펜팔 기능",
      ],
      buttonText: "구독하기",
      buttonLink: "/payment?amount=19900&orderName=프리미엄 플랜&orderId=plan_premium",
      popular: false,
      color: "purple",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between h-16"
          >
            <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  DiaryAI
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  영어일기 AI 첨삭 플랫폼
                </p>
              </div>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/pricing"
                className="px-3 sm:px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 transition-colors rounded-lg bg-blue-50 dark:bg-blue-900/30"
              >
                요금제
              </Link>
              <Link
                href="/board"
                className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                게시판
              </Link>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    대시보드
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 sm:px-6 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                  >
                    시작하기
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* 헤더 섹션 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            간단하고 투명한 요금제
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            아이의 영어 실력 향상을 위한 최적의 플랜을 선택하세요
          </p>
        </motion.div>

        {/* 요금제 카드 */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 border-2 ${
                plan.popular
                  ? "border-blue-500 dark:border-blue-500 scale-105"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    인기 플랜
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">
                    {plan.price === 0 ? "무료" : plan.price.toLocaleString()}
                  </span>
                  {plan.price > 0 && (
                    <>
                      <span className="text-2xl text-gray-600 dark:text-gray-400">
                        원
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        /{plan.period}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.buttonLink}
                className={`block w-full text-center py-3 px-6 rounded-lg font-semibold transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105"
                    : plan.color === "gray"
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
                    : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                }`}
              >
                {plan.buttonText}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* FAQ 섹션 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 md:p-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            자주 묻는 질문
          </h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                결제는 어떻게 하나요?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                토스페이먼츠를 통해 안전하게 결제할 수 있습니다. 카드, 계좌이체,
                가상계좌 등 다양한 결제 수단을 이용하실 수 있습니다.
              </p>
            </div>
            <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                언제든지 해지할 수 있나요?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                네, 언제든지 해지할 수 있습니다. 해지 시 다음 결제 주기부터
                적용되며, 남은 기간 동안은 계속 이용하실 수 있습니다.
              </p>
            </div>
            <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                무료 플랜에서도 모든 기능을 사용할 수 있나요?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                무료 플랜에서는 기본 기능을 제한적으로 사용할 수 있습니다.
                무제한 첨삭과 고급 기능을 원하시면 유료 플랜을 이용해주세요.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                환불 정책은 어떻게 되나요?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                구독 후 7일 이내에 환불 요청 시 전액 환불해드립니다. 그 이후에는
                사용한 기간에 비례하여 환불됩니다.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA 섹션 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">
              더 궁금한 점이 있으신가요?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              고객센터로 문의해주시면 친절하게 안내해드리겠습니다.
            </p>
            <Link
              href="/board"
              className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-all hover:scale-105"
            >
              문의하기
            </Link>
          </div>
        </motion.div>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">✨</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  DiaryAI
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
                AI 기술로 아이들의 영어 일기를 첨삭하고 학습을 도와주는 교육
                플랫폼입니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                서비스
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/board"
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    게시판
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    대시보드
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vocabulary"
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    단어장
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                회사
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    이용약관
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    개인정보처리방침
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    문의하기
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2024 DiaryAI. Made with ❤️ for kids learning English.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Powered by OpenAI GPT-4
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


