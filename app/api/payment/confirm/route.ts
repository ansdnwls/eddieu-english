import { NextRequest, NextResponse } from "next/server";
import { PaymentConfirmRequest, PaymentInfo, Subscription, PromotionCode, PromotionUsage } from "@/app/types";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from "firebase/firestore";

// Buffer 사용을 위해 Node.js 런타임 지정
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentKey, orderId, amount, userId, promoCode, originalAmount }: PaymentConfirmRequest & {
      userId?: string;
      promoCode?: string;
      originalAmount?: number;
    } = body;

    // 입력 검증
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 프로모션 코드 검증 및 처리
    let appliedPromotion: PromotionCode | null = null;
    let promotionUsageData: Partial<PromotionUsage> | null = null;

    if (promoCode && db) {
      try {
        const firestoreDb = db as NonNullable<typeof db>;
        const promotionsQuery = query(
          collection(firestoreDb, "promotions"),
          where("code", "==", promoCode.toUpperCase()),
          where("isActive", "==", true)
        );
        const promoSnapshot = await getDocs(promotionsQuery);

        if (!promoSnapshot.empty) {
          const promoData = promoSnapshot.docs[0].data() as PromotionCode;
          const promoId = promoSnapshot.docs[0].id;
          appliedPromotion = { ...promoData, id: promoId };

          // 유효기간 및 사용횟수 재확인
          const now = new Date();
          const validFrom = new Date(appliedPromotion.validFrom);
          const validUntil = new Date(appliedPromotion.validUntil);

          if (now >= validFrom && now <= validUntil) {
            if (appliedPromotion.maxUsage === 0 || appliedPromotion.currentUsage < appliedPromotion.maxUsage) {
              // 프로모션 사용 정보 준비
              promotionUsageData = {
                promotionId: promoId,
                promotionCode: appliedPromotion.code,
                userId: userId || "unknown",
                originalAmount: originalAmount || amount,
                discountAmount: (originalAmount || amount) - amount,
                finalAmount: amount,
                discountType: appliedPromotion.type,
                periodExtension: appliedPromotion.type === "period" ? appliedPromotion.discountValue : undefined,
                usedAt: new Date().toISOString(),
                orderId,
              };

              console.log("🎁 프로모션 적용:", {
                code: appliedPromotion.code,
                type: appliedPromotion.type,
                discount: appliedPromotion.discountValue,
              });
            } else {
              console.log("⚠️ 프로모션 사용 횟수 초과");
              appliedPromotion = null;
            }
          } else {
            console.log("⚠️ 프로모션 유효기간 외");
            appliedPromotion = null;
          }
        }
      } catch (error) {
        console.error("❌ 프로모션 검증 실패:", error);
      }
    }

    // 토스페이먼츠 시크릿 키 (환경변수에서 가져오기)
    const secretKey = process.env.TOSS_SECRET_KEY || "test_sk_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
    const encodedSecretKey = Buffer.from(`${secretKey}:`).toString("base64");

    console.log("💳 결제 승인 요청:", { orderId, amount });

    // 토스페이먼츠 결제 승인 API 호출
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const paymentData: PaymentInfo = await response.json();

    if (!response.ok) {
      console.error("❌ 토스페이먼츠 API 오류:", paymentData);
      return NextResponse.json(
        {
          success: false,
          error: paymentData.failReason || "결제 승인에 실패했습니다.",
        },
        { status: response.status }
      );
    }

    console.log("✅ 결제 승인 완료:", {
      orderId: paymentData.orderId,
      status: paymentData.status,
      amount: paymentData.totalAmount,
    });

    // 결제 완료 후 처리 로직
    if (userId && db && paymentData.status === "DONE") {
      try {
        const firestoreDb = db as NonNullable<typeof db>;

        // 1. 결제 내역 저장 (프로모션 정보 포함)
        await setDoc(doc(firestoreDb, "payments", paymentData.orderId), {
          userId,
          paymentKey: paymentData.paymentKey,
          orderId: paymentData.orderId,
          orderName: paymentData.orderName,
          method: paymentData.method,
          totalAmount: paymentData.totalAmount,
          status: paymentData.status,
          approvedAt: paymentData.approvedAt,
          createdAt: new Date().toISOString(),
          promoCode: appliedPromotion?.code,
          originalAmount: originalAmount,
          discountAmount: appliedPromotion ? (originalAmount || paymentData.totalAmount) - paymentData.totalAmount : 0,
        });

        // 2. 프로모션 사용 기록 저장 및 사용 횟수 증가
        if (appliedPromotion && promotionUsageData) {
          // 프로모션 사용 기록 저장
          const userDoc = await getDoc(doc(firestoreDb, "users", userId));
          const userEmail = userDoc.exists() ? userDoc.data().email : "unknown";
          
          await addDoc(collection(firestoreDb, "promotionUsages"), {
            ...promotionUsageData,
            userEmail,
            planName: paymentData.orderName,
            paymentKey: paymentData.paymentKey,
          });

          // 프로모션 사용 횟수 증가
          await updateDoc(doc(firestoreDb, "promotions", appliedPromotion.id), {
            currentUsage: appliedPromotion.currentUsage + 1,
            updatedAt: new Date().toISOString(),
          });

          console.log("✅ 프로모션 사용 기록 저장 완료");
        }

        // 2. 구독 플랜인지 확인 (orderId에 plan_ 접두사가 있으면 구독)
        const isSubscription = paymentData.orderId.startsWith("plan_");
        
        if (isSubscription) {
          // Firestore에서 요금제 정보 조회
          let planName = "베이직";
          let planId = "basic";
          
          try {
            const firestoreDb = db as NonNullable<typeof db>;
            const plansQuery = query(
              collection(firestoreDb, "pricingPlans"),
              where("orderId", "==", paymentData.orderId)
            );
            const plansSnapshot = await getDocs(plansQuery);
            
            if (!plansSnapshot.empty) {
              // 관리자에서 생성한 요금제 정보 사용
              const planData = plansSnapshot.docs[0].data();
              planName = planData.name || "베이직";
              // planId는 name을 기반으로 생성 (소문자, 공백 제거)
              planId = (planData.name || "basic").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
              console.log("✅ 요금제 정보 조회 성공:", { planName, planId, orderId: paymentData.orderId });
            } else {
              // 요금제를 찾지 못한 경우 가격 기준으로 fallback
              console.warn("⚠️ 요금제 정보를 찾지 못함, 가격 기준으로 판단:", paymentData.orderId);
              if (paymentData.totalAmount >= 19900) {
                planName = "프리미엄";
                planId = "premium";
              }
            }
          } catch (planError) {
            console.error("❌ 요금제 정보 조회 오류:", planError);
            // 오류 발생 시 가격 기준으로 fallback
            if (paymentData.totalAmount >= 19900) {
              planName = "프리미엄";
              planId = "premium";
            }
          }

          // 빌링키 발급 (구독 결제용)
          try {
            const customerKey = userId;
            const billingKeyResponse = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
              method: "POST",
              headers: {
                Authorization: `Basic ${encodedSecretKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                customerKey,
                authKey: paymentData.paymentKey, // 첫 결제의 paymentKey를 authKey로 사용
              }),
            });

            const billingData = await billingKeyResponse.json();

            if (billingKeyResponse.ok && billingData.billingKey) {
              // 구독 정보 저장
              const nextBillingDate = new Date();
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
              
              // 프로모션 기간 연장 적용
              if (appliedPromotion && appliedPromotion.type === "period") {
                nextBillingDate.setDate(nextBillingDate.getDate() + appliedPromotion.discountValue);
                console.log(`🎁 프로모션 기간 연장 적용: +${appliedPromotion.discountValue}일`);
              }

              const subscription: Subscription = {
                id: `sub_${Date.now()}`,
                userId,
                planId,
                planName,
                billingKey: billingData.billingKey,
                status: "active",
                startDate: new Date().toISOString(),
                nextBillingDate: nextBillingDate.toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              await setDoc(doc(firestoreDb, "subscriptions", subscription.id), subscription);
              
              // 사용자 문서에 구독 정보 업데이트
              await setDoc(
                doc(firestoreDb, "users", userId),
                {
                  subscriptionId: subscription.id,
                  subscriptionPlan: planId,
                  subscriptionStatus: "active",
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );

              console.log("✅ 구독 정보 저장 완료:", subscription.id);
            } else {
              console.warn("⚠️ 빌링키 발급 실패 (일회성 결제로 처리):", billingData);
            }
          } catch (billingError) {
            console.error("❌ 빌링키 발급 오류:", billingError);
            // 빌링키 발급 실패해도 일회성 결제는 성공한 것으로 처리
          }
        }

        console.log("✅ 결제 내역 저장 완료");
      } catch (firestoreError) {
        console.error("❌ Firestore 저장 오류:", firestoreError);
        // Firestore 저장 실패해도 결제는 성공한 것으로 처리
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentKey: paymentData.paymentKey,
        orderId: paymentData.orderId,
        orderName: paymentData.orderName,
        method: paymentData.method,
        totalAmount: paymentData.totalAmount,
        status: paymentData.status,
        approvedAt: paymentData.approvedAt,
        isSubscription: paymentData.orderId.startsWith("plan_"),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 결제 승인 API 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

