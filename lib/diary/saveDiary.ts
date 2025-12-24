import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { CorrectionResult, EnglishLevel, DiaryStats } from "@/app/types";

/**
 * 단어 수 카운팅
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  
  // 구두점 제거 후 공백으로 분리, 빈 문자열 필터링
  return text
    .replace(/[.,!?;:()\[\]{}'"]/g, ' ') // 구두점을 공백으로 변환
    .split(/\s+/) // 공백으로 분리
    .filter(word => word.length > 0) // 빈 문자열 제거
    .length;
}

/**
 * 문장 수 카운팅
 */
export function countSentences(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
}

/**
 * 고유 단어 수 카운팅
 */
export function countUniqueWords(text: string): number {
  if (!text || !text.trim()) return 0;
  const words = text
    .toLowerCase()
    .replace(/[.,!?;:()\[\]{}'"]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
  return new Set(words).size;
}

/**
 * 일기 통계 계산
 */
export function calculateDiaryStats(originalText: string, corrections: CorrectionResult["corrections"]): DiaryStats {
  const wordCount = countWords(originalText);
  const sentenceCount = countSentences(originalText);
  const uniqueWordsCount = countUniqueWords(originalText);

  return {
    wordCount,
    sentenceCount,
    averageSentenceLength: sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0,
    correctionCount: corrections?.length || 0,
    uniqueWords: uniqueWordsCount,
  };
}

/**
 * 일기 저장 인터페이스
 */
export interface SaveDiaryParams {
  userId: string;
  childId?: string; // 아이 ID (다중 아이 지원)
  originalText: string;
  correctionData: CorrectionResult;
  englishLevel: EnglishLevel;
  accountType: "child" | "parent";
}

/**
 * Firestore에 일기 저장
 * Firebase 초기화가 안 된 경우도 안전하게 처리
 */
export async function saveDiary(params: SaveDiaryParams): Promise<void> {
  const { userId, childId, originalText, correctionData, englishLevel, accountType } = params;

  // Firebase 초기화 확인
  if (!db) {
    throw new Error("Firebase가 초기화되지 않았습니다.");
  }
  
  // TypeScript 타입 좁히기: throw 후에도 타입이 좁혀지지 않을 수 있으므로 별도 변수에 할당
  const firestoreDb = db as NonNullable<typeof db>;

  try {
    const stats = calculateDiaryStats(originalText, correctionData.corrections);

    const diaryEntry = {
      userId,
      childId: childId || null, // 아이 ID 추가 (부모 모드는 null)
      originalText,
      correctedText: correctionData.correctedText,
      feedback: correctionData.feedback,
      encouragement: correctionData.encouragement || correctionData.cheerUp || "잘하고 있어요! 계속 연습해봐요! 💪",
      corrections: correctionData.corrections || [],
      extractedWords: correctionData.extractedWords || [],
      englishLevel,
      accountType,
      contentType: "diary" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats,
    };

    await addDoc(collection(firestoreDb, "diaries"), diaryEntry);
    console.log("✅ 일기가 저장되었습니다! (childId:", childId || "부모", ")");
  } catch (error) {
    const err = error as Error;
    console.error("❌ 일기 저장 중 오류:", err);
    throw new Error(`일기 저장 실패: ${err.message}`);
  }
}

