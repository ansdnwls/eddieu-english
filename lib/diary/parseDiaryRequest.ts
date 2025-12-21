import { NextRequest } from "next/server";
import { jsonRequestSchema, formDataRequestSchema, ParsedDiaryRequest } from "./schemas";
import { z } from "zod";

/**
 * 요청을 파싱하여 내부 표준 형태로 변환
 * JSON 요청과 multipart/form-data 요청을 모두 처리
 */
export async function parseDiaryRequest(
  request: NextRequest
): Promise<ParsedDiaryRequest> {
  const contentType = request.headers.get("content-type") || "";
  const isJsonRequest = contentType.includes("application/json");

  if (isJsonRequest) {
    // JSON 요청 처리
    const body = await request.json();
    
    // Zod 검증 (safeParse 사용 - 명시적 에러 처리)
    const result = jsonRequestSchema.safeParse(body);
    
    if (!result.success) {
      throw result.error;
    }
    
    return {
      rawText: result.data.originalText,
      metadata: {
        age: result.data.age,
        englishLevel: result.data.englishLevel,
        isParent: result.data.isParent,
        userId: result.data.userId,
      },
    };
  } else {
    // FormData 요청 처리
    const formData = await request.formData();
    
    // FormData에서 직접 추출
    const image = formData.get("image") as File | null;
    const age = formData.get("age");
    const englishLevel = formData.get("englishLevel") as string | null;
    const isParent = formData.get("isParent");
    const userId = formData.get("userId") as string | null;
    
    // 이미지 필수 검증 (parse 단계에서 강하게 검사)
    // 스키마에서는 z.any()로 받고, 여기서만 File 검증 수행
    if (!image || !(image instanceof File)) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["image"],
          message: "이미지 파일을 제공해주세요.",
        },
      ]);
    }
    
    // 기본값 처리 (age는 숫자로 보내는 케이스도 고려하여 String()으로 통일)
    const processedData = {
      image, // 이미 File로 검증됨
      age: String(age ?? ""), // null/undefined도 안전하게 처리
      englishLevel: englishLevel || "Lv.1",
      isParent: isParent === "true" || isParent === true,
      userId: userId || undefined,
    };
    
    // Zod 검증 (safeParse 사용 - 명시적 에러 처리)
    // image는 이미 File로 검증되었으므로 스키마에서는 z.any()로 받음
    const result = formDataRequestSchema.safeParse(processedData);
    
    if (!result.success) {
      throw result.error;
    }
    
    return {
      rawText: "", // OCR로 추출해야 함
      imageFile: result.data.image as File, // 이미 File로 검증되었으므로 타입 단언
      metadata: {
        age: result.data.age,
        englishLevel: result.data.englishLevel,
        isParent: result.data.isParent,
        userId: result.data.userId,
      },
    };
  }
}

/**
 * Zod 검증 오류를 한국어 메시지로 변환
 */
export function formatZodError(error: z.ZodError): string {
  const firstError = error.errors[0];
  if (firstError) {
    return firstError.message || "입력 데이터가 올바르지 않습니다.";
  }
  return "입력 데이터 검증에 실패했습니다.";
}

