import { NextRequest, NextResponse } from "next/server";
import { PaymentConfirmRequest, PaymentInfo, Subscription } from "@/app/types";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentKey, orderId, amount }: PaymentConfirmRequest = body;

    // 입력 검증
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
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
    const requestBody = await request.json();
    const userId = requestBody.userId; // 클라이언트에서 전달받은 userId
    
    if (userId && db && paymentData.status === "DONE") {
      try {
        // 1. 결제 내역 저장
        await setDoc(doc(db, "payments", paymentData.orderId), {
          userId,
          paymentKey: paymentData.paymentKey,
          orderId: paymentData.orderId,
          orderName: paymentData.orderName,
          method: paymentData.method,
          totalAmount: paymentData.totalAmount,
          status: paymentData.status,
          approvedAt: paymentData.approvedAt,
          createdAt: new Date().toISOString(),
        });

        // 2. 구독 플랜인지 확인 (orderId에 plan_ 접두사가 있으면 구독)
        const isSubscription = paymentData.orderId.startsWith("plan_");
        
        if (isSubscription) {
          // 구독 플랜 결정
          let planName = "베이직";
          let planId = "basic";
          if (paymentData.totalAmount >= 19900) {
            planName = "프리미엄";
            planId = "premium";
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

              await setDoc(doc(db, "subscriptions", subscription.id), subscription);
              
              // 사용자 문서에 구독 정보 업데이트
              await setDoc(
                doc(db, "users", userId),
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

