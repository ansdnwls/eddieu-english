"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, orderBy, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PromotionCode } from "@/app/types";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: "영구" | "월" | "년";
  description: string;
  features: string[];
  buttonText: string;
  popular: boolean;
  color: "gray" | "blue" | "purple";
  orderId: string;
  isActive: boolean;
}

export default function PricingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromotionCode | null>(null);
  const [promoError, setPromoError] = useState("");
  const [checkingPromo, setCheckingPromo] = useState(false);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const firestoreDb = db as NonNullable<typeof db>;

    // 실시간 리스너 설정
    // Note: 필터링만 하고 클라이언트에서 정렬 (인덱스 불필요)
    const unsubscribe = onSnapshot(
      query(
        collection(firestoreDb, "pricingPlans"),
        where("isActive", "==", true)
      ),
      (snapshot) => {
        const plansList = (snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as PricingPlan[])
          .sort((a, b) => a.price - b.price); // 클라이언트에서 가격순 정렬

        // 무료 플랜이 없으면 기본 무료 플랜 추가
        if (plansList.length === 0 || plansList[0].price > 0) {
          const freePlan: PricingPlan = {
            id: "free",
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
            popular: false,
            color: "gray",
            orderId: "plan_free",
            isActive: true,
          };
          
          // 유료 플랜 예시 (관리자 페이지에서 설정 가능):
          // features: [
          //   "일기 첨삭 무제한",
          //   "TTS 음성 듣기 (원어민 발음)",
          //   "발음 녹음 연습",
          //   "GPT 대화하기",
          //   "월별 성장 리포트",
          //   "상세 분석 리포트",
          //   "단어장 무제한",
          // ]
          setPlans([freePlan, ...plansList]);
        } else {
          setPlans(plansList);
        }

        setLoading(false);
      },
      (error) => {
        console.error("Error loading pricing plans:", error);
        // 오류 시 기본 플랜 사용
        setPlans([
          {
            id: "free",
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
            popular: false,
            color: "gray",
            orderId: "plan_free",
            isActive: true,
          },
        ]);
        
        // 참고: 유료 플랜은 관리자 페이지(/admin/pricing)에서 설정하세요.
        // 유료 플랜 features 예시:
        // - 일기 첨삭 무제한
        // - TTS 음성 듣기 (원어민 발음)
        // - 발음 녹음 연습
        // - GPT 대화하기
        // - 월별 성장 리포트
        // - 상세 분석 리포트
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  // 프로모션 코드 검증
  const checkPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError("프로모션 코드를 입력해주세요.");
      return;
    }

    setCheckingPromo(true);
    setPromoError("");
    setAppliedPromo(null);

    try {
      if (!db) throw new Error("데이터베이스 연결 실패");

      const firestoreDb = db as NonNullable<typeof db>;
      const promotionsRef = collection(firestoreDb, "promotions");
      const q = query(
        promotionsRef,
        where("code", "==", promoCode.toUpperCase()),
        where("isActive", "==", true)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setPromoError("유효하지 않은 프로모션 코드입니다.");
        return;
      }

      const promoData = snapshot.docs[0].data() as PromotionCode;
      const promo = { ...promoData, id: snapshot.docs[0].id };

      // 유효 기간 확인
      const now = new Date();
      const validFrom = new Date(promo.validFrom);
      const validUntil = new Date(promo.validUntil);

      if (now < validFrom) {
        setPromoError("아직 사용할 수 없는 프로모션 코드입니다.");
        return;
      }

      if (now > validUntil) {
        setPromoError("만료된 프로모션 코드입니다.");
        return;
      }

      // 사용 횟수 확인
      if (promo.maxUsage > 0 && promo.currentUsage >= promo.maxUsage) {
        setPromoError("사용 횟수가 초과된 프로모션 코드입니다.");
        return;
      }

      setAppliedPromo(promo);
      
      // 프로모션 코드를 localStorage에 저장 (결제 시 사용)
      localStorage.setItem("appliedPromoCode", promoCode.toUpperCase());
      localStorage.setItem("appliedPromoData", JSON.stringify(promo));
      
      alert(`✅ 프로모션 코드가 적용되었습니다!\n${getPromoDiscountText(promo)}`);
    } catch (error) {
      console.error("❌ 프로모션 코드 검증 실패:", error);
      setPromoError("프로모션 코드 확인 중 오류가 발생했습니다.");
    } finally {
      setCheckingPromo(false);
    }
  };

  const getPromoDiscountText = (promo: PromotionCode) => {
    if (promo.type === "percentage") return `${promo.discountValue}% 할인`;
    if (promo.type === "fixed") return `${promo.discountValue.toLocaleString()}원 할인`;
    return `${promo.discountValue}일 무료 연장`;
  };

  const calculateDiscountedPrice = (originalPrice: number, promo: PromotionCode | null) => {
    if (!promo || originalPrice === 0) return originalPrice;
    
    if (promo.type === "percentage") {
      return Math.floor(originalPrice * (1 - promo.discountValue / 100));
    }
    if (promo.type === "fixed") {
      return Math.max(0, originalPrice - promo.discountValue);
    }
    return originalPrice; // period 타입은 가격 변경 없음
  };

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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <Image 
                  src="/icon-192x192.png?v=2" 
                  alt="EddieU AI 로고" 
                  width={40} 
                  height={40}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EddieU AI
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">요금제를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          /* 요금제 카드 */
          <>
            {/* 프로모션 코드 입력 섹션 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-2xl mx-auto mb-12"
            >
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🎫</span>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    프로모션 코드가 있으신가요?
                  </h3>
                </div>
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="프로모션 코드 입력"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 font-mono"
                    disabled={checkingPromo || !!appliedPromo}
                  />
                  <button
                    onClick={checkPromoCode}
                    disabled={checkingPromo || !!appliedPromo}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      appliedPromo
                        ? "bg-green-500 text-white cursor-default"
                        : checkingPromo
                        ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-wait"
                        : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 shadow-lg"
                    }`}
                  >
                    {appliedPromo ? "✓ 적용됨" : checkingPromo ? "확인 중..." : "적용"}
                  </button>
                </div>

                {promoError && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    ❌ {promoError}
                  </p>
                )}

                {appliedPromo && (
                  <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      ✅ {appliedPromo.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getPromoDiscountText(appliedPromo)}
                      {appliedPromo.type === "period" && " (결제 후 자동 적용)"}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {plans.map((plan, index) => {
                const discountedPrice = calculateDiscountedPrice(plan.price, appliedPromo);
                const hasDiscount = appliedPromo && plan.price > 0 && appliedPromo.type !== "period";
                
                // 버튼 링크 생성 (할인 적용)
                const finalPrice = discountedPrice;
                const buttonLink = plan.price === 0
                  ? (user ? "/dashboard" : "/signup")
                  : `/payment?amount=${finalPrice}&originalAmount=${plan.price}&orderName=${encodeURIComponent(plan.name)} 플랜&orderId=${plan.orderId}${appliedPromo ? `&promoCode=${appliedPromo.code}` : ""}`;

                return (
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
                
                {hasDiscount ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-3xl line-through text-gray-400 dark:text-gray-600">
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-red-500 font-semibold">
                        {getPromoDiscountText(appliedPromo!)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                        {discountedPrice.toLocaleString()}
                      </span>
                      <span className="text-2xl text-gray-600 dark:text-gray-400">원</span>
                      <span className="text-gray-600 dark:text-gray-400">/{plan.period}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">
                      {plan.price === 0 ? "무료" : plan.price.toLocaleString()}
                    </span>
                    {plan.price > 0 && (
                      <>
                        <span className="text-2xl text-gray-600 dark:text-gray-400">원</span>
                        <span className="text-gray-600 dark:text-gray-400">/{plan.period}</span>
                      </>
                    )}
                  </div>
                )}
                
                {appliedPromo && appliedPromo.type === "period" && plan.price > 0 && (
                  <div className="mt-3 text-sm text-purple-600 dark:text-purple-400 font-semibold">
                    🎁 +{appliedPromo.discountValue}일 무료 연장
                  </div>
                )}
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
                href={buttonLink}
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
            );
          })}
        </div>
        </>
      )}

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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/icon-192x192.png?v=2" 
                    alt="EddieU AI 로고" 
                    width={32} 
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EddieU AI
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
              © 2024 EddieU AI. Made with ❤️ for kids learning English.
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


