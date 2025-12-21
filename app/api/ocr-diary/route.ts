import { NextRequest, NextResponse } from "next/server";
import { logGoogleApiCall, maskSensitiveInfo } from "@/app/utils/apiLogger";

// Buffer 사용을 위해 Node.js 런타임 지정
export const runtime = "nodejs";

// API 키 가져오기 (환경변수만 사용)
function getAPIKeys() {
  return {
    googleVision: process.env.GOOGLE_VISION_API_KEY || "",
  };
}

// API 키 검증 및 에러 반환
function validateAPIKey(key: string | undefined, keyName: string): string {
  if (!key || key.trim().length === 0) {
    throw new Error(`${keyName}가 설정되지 않았습니다. Vercel 환경변수에서 ${keyName}를 설정해주세요.`);
  }
  return key;
}

// Google Vision API로 OCR 처리
async function extractTextWithGoogleVision(imageBuffer: Buffer, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Google Vision API 키가 설정되지 않았습니다.");
  }

  try {
    const base64Image = imageBuffer.toString("base64");
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: "TEXT_DETECTION",
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // 핵심 정보만 추려서 출력 (전체 JSON.stringify는 로그/응답 폭발 위험)
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
      throw new Error(`Google Vision API 오류: ${errorMessage}`);
    }

    const data = await response.json();
    const textAnnotations = data.responses[0]?.textAnnotations;
    
    if (textAnnotations && textAnnotations.length > 0) {
      return textAnnotations[0].description || "";
    }
    
    return "";
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ OCR 처리 실패");
    throw new Error("OCR 처리 실패");
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== OCR API 호출 ===");
    
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const userId = (formData.get("userId") as string) || undefined;
    
    // userId가 optional이므로 안전하게 처리
    const safeUserId = userId ?? "anonymous";

    console.log("이미지:", image?.name, image?.size);

    if (!image) {
      return NextResponse.json(
        { success: false, error: "이미지를 제공해주세요." },
        { status: 400 }
      );
    }

    // 이미지를 Buffer로 변환
    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // API 키 가져오기 및 검증
    const apiKeys = getAPIKeys();
    let googleVisionKey: string;
    try {
      googleVisionKey = validateAPIKey(apiKeys.googleVision, "GOOGLE_VISION_API_KEY");
    } catch (keyError: unknown) {
      const error = keyError as Error;
      console.error("❌ API 키 검증 실패:", maskSensitiveInfo(error.message));
      logGoogleApiCall(safeUserId, "error", error.message).catch((logError) => {
        console.warn("⚠️ 로그 저장 실패 (무시됨):", logError);
      });
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    // OCR 처리 (Google Vision API 사용)
    let extractedText = "";
    try {
      console.log("📸 Google Vision API로 OCR 시작...");
      extractedText = await extractTextWithGoogleVision(imageBuffer, googleVisionKey);
      // 개인정보/민감 텍스트 노출 방지: 성공만 출력
      console.log("✅ OCR 성공");
      
      // API 호출 로그 저장 (비동기, 실패해도 API 응답에는 영향 없음)
      logGoogleApiCall(safeUserId, "success").catch((logError) => {
        console.warn("⚠️ 로그 저장 실패 (무시됨):", logError);
      });
    } catch (ocrError: unknown) {
      const error = ocrError as Error;
      const errorMessage = error.message || "OCR 처리 중 오류가 발생했습니다.";
      console.error("❌ OCR 처리 실패");
      
      // API 호출 실패 로그 저장 (비동기, 실패해도 API 응답에는 영향 없음)
      logGoogleApiCall(safeUserId, "error", errorMessage).catch((logError) => {
        console.warn("⚠️ 로그 저장 실패 (무시됨):", logError);
      });
      
      // 사용자에게는 안전한 메시지만 노출 (내부 에러 메시지 숨김)
      return NextResponse.json(
        { 
          success: false, 
          error: "이미지에서 텍스트를 추출하는데 실패했습니다." 
        },
        { status: 500 }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "텍스트를 추출할 수 없습니다. 사진이 선명한지 확인해주세요." 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: extractedText,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ OCR API 오류");
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}


