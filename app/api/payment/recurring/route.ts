import { NextRequest, NextResponse } from "next/server";
import { RecurringPaymentRequest, RecurringPaymentResponse } from "@/app/types";

// Buffer 사용을 위해 Node.js 런타임 지정
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billingKey, customerKey, orderId, orderName, amount }: RecurringPaymentRequest = body;

    // 입력 검증
    if (!billingKey || !customerKey || !orderId || !orderName || !amount) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 토스페이먼츠 시크릿 키
    const secretKey = process.env.TOSS_SECRET_KEY || "test_sk_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
    const encodedSecretKey = Buffer.from(`${secretKey}:`).toString("base64");

    console.log("💳 정기 결제 요청:", { orderId, amount, customerKey });

    // 토스페이먼츠 정기 결제 API 호출
    const response = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey,
        authKey: billingKey,
        amount,
        orderId,
        orderName,
      }),
    });

    const paymentData: RecurringPaymentResponse = await response.json();

    if (!response.ok) {
      console.error("❌ 정기 결제 오류:", paymentData);
      return NextResponse.json(
        {
          success: false,
          error: paymentData.error || "정기 결제에 실패했습니다.",
        },
        { status: response.status }
      );
    }

    console.log("✅ 정기 결제 완료:", {
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      status: paymentData.status,
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentKey: paymentData.paymentKey,
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        status: paymentData.status,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 정기 결제 API 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}





