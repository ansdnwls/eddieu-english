// API 호출 로그 저장 유틸리티

import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ApiType = "gpt" | "openai" | "voice" | "tts" | "google" | "vision";

interface ApiLogData {
  type: ApiType;
  userId?: string;
  endpoint?: string;
  status: "success" | "error";
  errorMessage?: string;
  timestamp: string;
}

/**
 * 민감정보(API 키 등)를 마스킹하는 함수
 * 앞 3글자만 보여주고 나머지는 ***로 마스킹
 */
export function maskSensitiveInfo(text: string | undefined | null): string {
  if (!text) return "";
  
  // API 키 패턴 마스킹 (sk-로 시작하는 OpenAI 키 등)
  const apiKeyPattern = /(sk-[a-zA-Z0-9]{20,})/g;
  const masked = text.replace(apiKeyPattern, (match) => {
    // 앞 3글자만 보여주고 나머지는 ***
    return match.substring(0, 3) + "***";
  });
  
  // 일반적인 키 패턴도 마스킹 (api_key: value 형태)
  const genericKeyPattern = /(api[_-]?key|apikey|secret|token)\s*[:=]\s*([a-zA-Z0-9_-]{20,})/gi;
  const masked2 = masked.replace(genericKeyPattern, (match, key, value) => {
    // 값의 앞 3글자만 보여주고 나머지는 ***
    return `${key}: ${value.substring(0, 3)}***`;
  });
  
  // 환경변수 값 패턴 마스킹 (OPENAI_API_KEY=value 형태)
  const envVarPattern = /([A-Z_]+)\s*=\s*([a-zA-Z0-9_-]{20,})/g;
  const masked3 = masked2.replace(envVarPattern, (match, key, value) => {
    return `${key}=${value.substring(0, 3)}***`;
  });
  
  return masked3;
}

/**
 * API 호출 로그를 Firestore에 저장
 * 서버 사이드에서는 Firestore 클라이언트 SDK가 제대로 작동하지 않을 수 있으므로
 * 실패해도 조용히 처리합니다.
 */
export async function logApiCall(data: ApiLogData): Promise<void> {
  // 서버 사이드에서는 Firestore 클라이언트 SDK가 제한적으로 작동할 수 있음
  if (typeof window === "undefined") {
    // 서버 사이드에서는 로그 저장을 시도하지 않음 (조용히 무시)
    // 필요시 Firebase Admin SDK를 사용해야 함
    return;
  }

  if (!db) {
    // 클라이언트 사이드에서도 db가 없으면 무시
    return;
  }

  try {
    // 에러 메시지에서 민감정보 마스킹
    const safeData: ApiLogData = {
      ...data,
      errorMessage: data.errorMessage ? maskSensitiveInfo(data.errorMessage) : undefined,
      timestamp: new Date().toISOString(),
    };

    await addDoc(collection(db, "apiLogs"), safeData);
    
    // 콘솔 로그에도 마스킹 적용
    const maskedErrorMessage = data.errorMessage ? maskSensitiveInfo(data.errorMessage) : undefined;
    console.log(`✅ API 로그 저장 완료: ${data.type}`, {
      ...safeData,
      errorMessage: maskedErrorMessage,
    });
  } catch (error) {
    // 로그 저장 실패는 조용히 무시 (API 응답에는 영향 없음)
    // 개발 환경에서만 경고 메시지 출력
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ API 로그 저장 실패 (무시됨):", error);
    }
  }
}

/**
 * GPT API 호출 로그
 */
export async function logGptApiCall(
  userId: string | undefined,
  status: "success" | "error",
  errorMessage?: string
): Promise<void> {
  await logApiCall({
    type: "gpt",
    userId,
    status,
    errorMessage,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 음성 API 호출 로그
 */
export async function logVoiceApiCall(
  userId: string | undefined,
  status: "success" | "error",
  errorMessage?: string
): Promise<void> {
  await logApiCall({
    type: "voice",
    userId,
    status,
    errorMessage,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Google Vision API 호출 로그
 */
export async function logGoogleApiCall(
  userId: string | undefined,
  status: "success" | "error",
  errorMessage?: string
): Promise<void> {
  await logApiCall({
    type: "google",
    userId,
    status,
    errorMessage,
    timestamp: new Date().toISOString(),
  });
}


