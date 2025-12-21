import { maskSensitiveInfo } from "@/app/utils/apiLogger";

/**
 * API 키 가져오기 (환경변수만 사용)
 */
function getGoogleVisionApiKey(): string {
  const key = process.env.GOOGLE_VISION_API_KEY || "";
  if (!key || key.trim().length === 0) {
    throw new Error("서버 설정 오류: GOOGLE_VISION_API_KEY가 없습니다.");
  }
  return key;
}

/**
 * 이미지 파일에서 텍스트를 추출 (Google Vision API 사용)
 */
export async function extractTextFromImage(imageFile: File): Promise<string> {
  try {
    const apiKey = getGoogleVisionApiKey();
    
    // 이미지를 Buffer로 변환
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const base64Image = imageBuffer.toString("base64");

    console.log("📸 Google Vision API로 OCR 시작...");

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
      const safeErrorMessage = `Google Vision API 오류: ${errorMessage}`;
      console.error("❌ OCR 오류:", maskSensitiveInfo(safeErrorMessage));
      throw new Error(`이미지에서 텍스트를 추출하는데 실패했습니다: ${errorMessage}`);
    }

    const data = await response.json();
    const textAnnotations = data.responses[0]?.textAnnotations;
    
    if (textAnnotations && textAnnotations.length > 0) {
      const extractedText = textAnnotations[0].description || "";
      // 개인정보/민감 텍스트 노출 방지: 성공만 출력
      console.log("✅ OCR 성공");
      return extractedText;
    }
    
    throw new Error("이미지에서 텍스트를 찾을 수 없습니다.");
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ OCR 처리 실패");
    throw new Error("OCR 처리 실패");
  }
}

