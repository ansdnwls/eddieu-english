import { NextRequest, NextResponse } from "next/server";
import { BillingKeyRequest, BillingKeyResponse } from "@/app/types";

// Buffer 사용을 위해 Node.js 런타임 지정
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerKey, authKey }: BillingKeyRequest = body;

    // 입력 검증
    if (!customerKey || !authKey) {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 토스페이먼츠 시크릿 키
    const secretKey = process.env.TOSS_SECRET_KEY || "test_sk_D5GePWvyJnrK0W0k6q8gLzN97Eoq";
    const encodedSecretKey = Buffer.from(`${secretKey}:`).toString("base64");

    console.log("🔑 빌링키 발급 요청:", { customerKey });

    // 토스페이먼츠 빌링키 발급 API 호출
    const response = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey,
        authKey,
      }),
    });

    const billingData: BillingKeyResponse = await response.json();

    if (!response.ok) {
      console.error("❌ 빌링키 발급 오류:", billingData);
      return NextResponse.json(
        {
          success: false,
          error: billingData.error || "빌링키 발급에 실패했습니다.",
        },
        { status: response.status }
      );
    }

    console.log("✅ 빌링키 발급 완료:", {
      billingKey: billingData.billingKey,
      customerKey: billingData.customerKey,
    });

    return NextResponse.json({
      success: true,
      data: {
        billingKey: billingData.billingKey,
        customerKey: billingData.customerKey,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 빌링키 발급 API 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}





