import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// API 키 가져오기
async function getAPIKeys() {
  try {
    if (!db) {
      console.warn("Firestore가 초기화되지 않았습니다.");
      return {
        googleVision: process.env.GOOGLE_VISION_API_KEY || "",
      };
    }

    const docRef = doc(db, "admin_settings", "api_keys");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        googleVision: data.googleVision || process.env.GOOGLE_VISION_API_KEY || "",
      };
    }
    
    return {
      googleVision: process.env.GOOGLE_VISION_API_KEY || "",
    };
  } catch (error) {
    console.error("API 키 로드 실패:", error);
    return {
      googleVision: process.env.GOOGLE_VISION_API_KEY || "",
    };
  }
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
      const errorData = await response.json();
      throw new Error(`Google Vision API 오류: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const textAnnotations = data.responses[0]?.textAnnotations;
    
    if (textAnnotations && textAnnotations.length > 0) {
      return textAnnotations[0].description || "";
    }
    
    return "";
  } catch (error: any) {
    console.error("Google Vision OCR 오류:", error);
    throw new Error(`OCR 처리 실패: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== OCR API 호출 ===");
    
    const formData = await request.formData();
    const image = formData.get("image") as File;

    console.log("이미지:", image?.name, image?.size);

    if (!image) {
      return NextResponse.json(
        { success: false, error: "이미지를 제공해주세요." },
        { status: 400 }
      );
    }

    // API 키 가져오기
    const apiKeys = await getAPIKeys();
    
    // 이미지를 Buffer로 변환
    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    // OCR 처리 (Google Vision API 사용)
    if (apiKeys.googleVision) {
      try {
        console.log("Google Vision API로 OCR 시작...");
        extractedText = await extractTextWithGoogleVision(imageBuffer, apiKeys.googleVision);
        console.log("✅ OCR 성공:", extractedText?.substring(0, 100) + "...");
      } catch (ocrError: any) {
        console.error("❌ OCR 오류:", ocrError);
        return NextResponse.json(
          { success: false, error: `OCR 처리 실패: ${ocrError.message}` },
          { status: 500 }
        );
      }
    } else {
      console.error("❌ Google Vision API 키가 없습니다");
      return NextResponse.json(
        { 
          success: false, 
          error: "Google Vision API 키가 설정되지 않았습니다. 관리자 페이지에서 API 키를 설정해주세요." 
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
  } catch (error: any) {
    console.error("OCR API 오류:", error);
    return NextResponse.json(
      { success: false, error: error.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}


