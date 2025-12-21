import { NextRequest, NextResponse } from "next/server";
import { logGptApiCall, maskSensitiveInfo } from "@/app/utils/apiLogger";
import { parseDiaryRequest, formatZodError } from "@/lib/diary/parseDiaryRequest";
import { extractTextFromImage } from "@/lib/diary/ocr";
import { correctDiaryWithOpenAI } from "@/lib/diary/correctDiaryWithOpenAI";
import { z } from "zod";

// Buffer 사용을 위해 Node.js 런타임 지정
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. 요청 파싱 및 검증
    let parsedRequest;
    try {
      parsedRequest = await parseDiaryRequest(request);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: formatZodError(error),
          },
          { status: 422 }
        );
      }
      const err = error as Error;
      console.error("❌ 요청 파싱 오류:", err.message);
      return NextResponse.json(
        {
          success: false,
          error: "요청을 처리할 수 없습니다.",
        },
        { status: 400 }
      );
    }

    const { rawText, imageFile, metadata } = parsedRequest;
    const { age, englishLevel, isParent, userId } = metadata;
    
    // userId가 optional이므로 안전하게 처리
    const safeUserId = userId ?? "anonymous";

    // 2. OCR 처리 (이미지가 있는 경우)
    let originalText = rawText;
    if (imageFile && !rawText) {
      try {
        originalText = await extractTextFromImage(imageFile);
      } catch (ocrError: unknown) {
        const error = ocrError as Error;
        console.error("❌ OCR 처리 실패");
        await logGptApiCall(safeUserId, "error", error.message);
        return NextResponse.json(
          {
            success: false,
            error: "이미지에서 텍스트를 추출하는데 실패했습니다.",
          },
          { status: 500 }
        );
      }
    }

    // 텍스트 검증
    if (!originalText || originalText.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "일기 내용이 없습니다.",
        },
        { status: 400 }
      );
    }

    // 3. OpenAI API 호출로 첨삭
    let correctionResult;
    try {
      correctionResult = await correctDiaryWithOpenAI(
        originalText,
        age,
        englishLevel,
        isParent
      );
      
      // API 호출 로그 저장
      await logGptApiCall(safeUserId, "success");
    } catch (gptError: unknown) {
      const error = gptError as Error;
      const errorMessage = error.message || "알 수 없는 오류가 발생했습니다.";
      console.error("❌ GPT 오류:", maskSensitiveInfo(errorMessage));
      
      // API 호출 실패 로그 저장 (내부 로그용 - 상세 정보 포함)
      await logGptApiCall(safeUserId, "error", errorMessage);
      
      // 사용자에게는 안전한 메시지만 노출 (내부 에러 메시지 숨김)
      let userFriendlyError = "AI 첨삭 처리 중 오류가 발생했습니다.";
      if (error.message?.includes("API key") || error.message?.includes("401") || error.message?.includes("invalid")) {
        userFriendlyError = "OpenAI API 키가 유효하지 않습니다. 관리자에게 문의해주세요.";
      } else if (error.message?.includes("rate limit") || error.message?.includes("429")) {
        userFriendlyError = "API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.";
      }
      // 기타 오류는 일반적인 메시지만 반환 (내부 메시지 노출하지 않음)
      
      return NextResponse.json(
        {
          success: false,
          error: userFriendlyError,
        },
        { status: 500 }
      );
    }

    // 4. 결과 반환
    return NextResponse.json({
      success: true,
      data: {
        originalText: originalText,
        correctedText: correctionResult.correctedText,
        feedback: correctionResult.feedback,
        corrections: correctionResult.corrections || [],
        sentenceExpansion: correctionResult.sentenceExpansion || "다음에 더 자세히 써보면 좋을 것 같아요!",
        expansionExample: correctionResult.expansionExample || correctionResult.correctedText,
        cheerUp: correctionResult.cheerUp || "잘하고 있어요! 계속 연습해봐요! 💪",
        extractedWords: correctionResult.extractedWords || [],
        sentenceByStence: correctionResult.sentenceByStence || correctionResult.sentenceBySentence || [],
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 서버 오류:", maskSensitiveInfo(err.message));
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
