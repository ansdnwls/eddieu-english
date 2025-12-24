import { NextRequest, NextResponse } from "next/server";

// API 키 테스트 엔드포인트
export async function GET(request: NextRequest) {
  try {
    // API 키 가져오기 (환경 변수에서만 가져오기 - 서버 사이드)
    const apiKeys = {
      openai: process.env.OPENAI_API_KEY || "",
      googleVision: process.env.GOOGLE_VISION_API_KEY || "",
      tts: process.env.TTS_API_KEY || "",
      elevenlabs: process.env.ELEVENLABS_API_KEY || "",
    };

    const results: any = {
      openai: { configured: false, tested: false, error: null },
      googleVision: { configured: false, tested: false, error: null },
      tts: { configured: false, tested: false, error: null },
      elevenlabs: { configured: false, tested: false, error: null },
    };

    // OpenAI API 테스트
    if (apiKeys.openai) {
      results.openai.configured = true;
      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: {
            Authorization: `Bearer ${apiKeys.openai}`,
          },
        });
        if (response.ok) {
          results.openai.tested = true;
        } else {
          const errorData = await response.json();
          results.openai.error = errorData.error?.message || "API 키가 유효하지 않습니다.";
        }
      } catch (error: any) {
        results.openai.error = error.message;
      }
    }

    // Google Vision API 테스트
    if (apiKeys.googleVision) {
      results.googleVision.configured = true;
      try {
        // 간단한 테스트 요청 (빈 이미지로 테스트)
        const testImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
        const response = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${apiKeys.googleVision}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requests: [
                {
                  image: {
                    content: testImage.toString("base64"),
                  },
                  features: [{ type: "TEXT_DETECTION" }],
                },
              ],
            }),
          }
        );
        if (response.ok) {
          results.googleVision.tested = true;
        } else {
          const errorData = await response.json();
          results.googleVision.error = errorData.error?.message || "API 키가 유효하지 않습니다.";
        }
      } catch (error: any) {
        results.googleVision.error = error.message;
      }
    }

    // ElevenLabs API 테스트
    if (apiKeys.elevenlabs) {
      results.elevenlabs.configured = true;
      try {
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: {
            "xi-api-key": apiKeys.elevenlabs,
          },
        });
        if (response.ok) {
          results.elevenlabs.tested = true;
        } else {
          const errorData = await response.json().catch(() => ({}));
          results.elevenlabs.error = errorData.error?.message || "API 키가 유효하지 않습니다.";
        }
      } catch (error: any) {
        results.elevenlabs.error = error.message;
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("API 키 테스트 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}



