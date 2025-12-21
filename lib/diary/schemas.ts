import { z } from "zod";

// 요청 스키마 - JSON 요청
export const jsonRequestSchema = z.object({
  originalText: z.string().min(1, "일기 내용을 제공해주세요."),
  age: z.union([z.string(), z.number()]).transform((val) => String(val)).pipe(z.string().min(1)),
  englishLevel: z.string().optional().default("Lv.1"),
  isParent: z.boolean().optional().default(false),
  userId: z.string().optional(),
});

// 요청 스키마 - FormData 요청
// 주의: image는 z.any()로 받고, parse 단계에서 File 검증 수행
// (환경에 따라 z.instanceof(File)이 불안정할 수 있음)
export const formDataRequestSchema = z.object({
  image: z.any(), // parse 단계에서 File 검증 수행
  age: z.string().min(1, "나이를 제공해주세요."),
  englishLevel: z.string().optional().default("Lv.1"),
  isParent: z.boolean().optional().default(false),
  userId: z.string().optional(),
});

// 내부 표준 형태 (파싱 후)
export interface ParsedDiaryRequest {
  rawText: string;
  imageFile?: File;
  metadata: {
    age: string;
    englishLevel: string;
    isParent: boolean;
    userId?: string;
  };
}

// OpenAI 응답 스키마
export const correctionSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  explanation: z.string(),
  alternatives: z.array(z.string()).optional(),
});

export const extractedWordSchema = z.object({
  word: z.string(),
  meaning: z.string(),
  level: z.string(),
  example: z.string(),
});

export const sentenceBySentenceSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  explanation: z.string(),
  alternatives: z.array(z.string()).optional(),
});

export const openAIResponseSchema = z.object({
  correctedText: z.string(),
  feedback: z.string(),
  corrections: z.array(correctionSchema).default([]),
  sentenceExpansion: z.string().optional(),
  expansionExample: z.string().optional(),
  cheerUp: z.string().optional(),
  extractedWords: z.array(extractedWordSchema).default([]),
  sentenceBySentence: z.array(sentenceBySentenceSchema).optional(),
  sentenceByStence: z.array(sentenceBySentenceSchema).optional(), // 오타 필드도 허용
  betterVocabulary: z.array(z.any()).optional(),
});

// API 응답 스키마
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    originalText: z.string(),
    correctedText: z.string(),
    feedback: z.string(),
    corrections: z.array(correctionSchema).default([]),
    sentenceExpansion: z.string().optional(),
    expansionExample: z.string().optional(),
    cheerUp: z.string().optional(),
    extractedWords: z.array(extractedWordSchema).default([]),
    sentenceByStence: z.array(sentenceBySentenceSchema).optional(),
  }).optional(),
  error: z.string().optional(),
});

export type JsonRequestInput = z.infer<typeof jsonRequestSchema>;
export type FormDataRequestInput = z.infer<typeof formDataRequestSchema>;
export type OpenAIResponse = z.infer<typeof openAIResponseSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;

