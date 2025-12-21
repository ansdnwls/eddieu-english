import { maskSensitiveInfo } from "@/app/utils/apiLogger";
import { openAIResponseSchema, OpenAIResponse } from "./schemas";
import { z } from "zod";

/**
 * API 키 가져오기 및 검증
 */
function getOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY || "";
  if (!key || key.trim().length === 0) {
    throw new Error("서버 설정 오류: OPENAI_API_KEY가 없습니다.");
  }
  return key;
}

/**
 * OpenAI API 호출 (JSON 응답 보장)
 * JSON 파싱 실패 시 1회 재시도 또는 안전한 fallback
 */
async function callOpenAIWithRetry(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  originalText: string, // fallback을 위한 원본 텍스트
  model: string = "gpt-4o-mini",
  maxRetries: number = 1
): Promise<OpenAIResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // 핵심 정보만 추려서 출력 (전체 JSON.stringify는 로그/응답 폭발 위험)
        const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
        throw new Error(`OpenAI API 오류: ${errorMessage}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "{}";

      // JSON 파싱 시도
      let parsed: unknown;
      try {
        // 마크다운 코드 블록 제거
        const cleanContent = content
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        parsed = JSON.parse(cleanContent);
      } catch (parseError) {
        // 파싱 실패 시 재시도 (마지막 시도가 아니면)
        if (attempt < maxRetries) {
          console.warn(`⚠️ JSON 파싱 실패, 재시도 중... (시도 ${attempt + 1}/${maxRetries + 1})`);
          lastError = new Error("JSON 파싱 실패");
          continue;
        }
        
        // 마지막 시도에서도 실패하면 fallback
        console.error("❌ JSON 파싱 실패, fallback 응답 사용");
        return createFallbackResponse(originalText);
      }

      // Zod 스키마로 검증 (safeParse 사용 - 명시적 에러 처리)
      const validationResult = openAIResponseSchema.safeParse(parsed);
      
      if (!validationResult.success) {
        console.warn("⚠️ 스키마 검증 실패, 재시도 중...", validationResult.error.errors[0]?.message);
        if (attempt < maxRetries) {
          lastError = validationResult.error;
          continue;
        }
        // 검증 실패 시에도 fallback
        return createFallbackResponse(originalText);
      }
      
      return validationResult.data;
    } catch (error: unknown) {
      const err = error as Error;
      lastError = err;
      if (attempt < maxRetries) {
        console.warn(`⚠️ API 호출 실패, 재시도 중... (시도 ${attempt + 1}/${maxRetries + 1})`);
        continue;
      }
      throw err;
    }
  }

  // 모든 재시도 실패
  throw lastError || new Error("OpenAI API 호출 실패");
}

/**
 * Fallback 응답 생성 (JSON 파싱 실패 시)
 * 깨진 JSON을 사용자에게 보여주지 않고, 원본 텍스트 기반으로 최소 UX 보장
 */
function createFallbackResponse(originalText: string): OpenAIResponse {
  return {
    correctedText: originalText, // 원본 텍스트 그대로 (깨진 JSON 대신)
    feedback: "일부 결과를 가져오지 못했어요. 다시 시도해주시거나 관리자에게 문의해주세요.",
    corrections: [],
    sentenceExpansion: "다음에 더 자세히 써보면 좋을 것 같아요!",
    expansionExample: originalText, // 원본 텍스트 사용
    cheerUp: "잘하고 있어요! 계속 연습해봐요! 💪",
    extractedWords: [],
  };
}

/**
 * 부모 계정용 프롬프트 생성
 */
function createParentPrompts(originalText: string): { system: string; user: string } {
  const systemPrompt = `당신은 성인 학습자를 위한 전문적인 영어 작문 코치입니다.

[당신의 역할]
- 성인의 영어 작문을 첨삭하고 발전시키는 전문 코치
- 실용적이고 세련된 표현을 제안하는 멘토
- 비즈니스 및 일상 영어 모두 능숙한 전문가

[중요한 원칙]
1. 문법적 정확성과 자연스러운 표현에 초점
2. 더 세련되고 고급스러운 단어/표현 제안
3. 문맥에 맞는 관용구나 숙어 추천
4. 글의 흐름과 논리성 개선
5. 전문적이면서도 친근한 톤 유지

[응답 형식]
반드시 JSON 형식으로만 응답하세요:
{
  "correctedText": "교정된 전체 텍스트",
  "feedback": "전체적인 피드백 (한국어, 격려와 구체적인 개선점 포함)",
  "corrections": [
    {
      "original": "원본 표현",
      "corrected": "교정된 표현",
      "explanation": "교정 이유 (한국어)"
    }
  ],
  "sentenceExpansion": "문장 확장 제안 (한국어 질문 형태)",
  "expansionExample": "확장 예시 문장",
  "cheerUp": "격려 메시지 (한국어)",
  "extractedWords": [
    {
      "word": "단어",
      "meaning": "의미",
      "level": "레벨",
      "example": "예문"
    }
  ],
  "sentenceBySentence": [
    {
      "original": "원본 문장",
      "corrected": "교정된 문장",
      "explanation": "교정 설명 (한국어)",
      "alternatives": ["대안 표현1", "대안 표현2"]
    }
  ]
}`;

  const userPrompt = `다음 영어 작문을 첨삭해주세요:

원본 텍스트:
${originalText}

요청사항:
1. 문법 오류를 수정하고 자연스러운 표현으로 개선
2. 더 세련되고 고급스러운 단어/표현 제안
3. 문맥에 맞는 관용구나 숙어 추천
4. 글의 흐름과 논리성 개선
5. 격려와 구체적인 개선점을 포함한 피드백 제공

JSON 형식으로만 응답해주세요.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * 아이 계정용 프롬프트 생성
 */
function createChildPrompts(
  originalText: string,
  age: string,
  englishLevel: string
): { system: string; user: string } {
  const systemPrompt = `당신은 ${age}살 어린이를 위한 따뜻하고 친절한 영어 선생님입니다.

[당신의 역할]
- 아이의 영어 일기를 첨삭하고 격려하는 선생님
- 실수를 지적하기보다는 성장을 응원하는 따뜻한 멘토

[중요한 원칙]
1. 항상 긍정적이고 구체적인 칭찬으로 시작
2. 교정은 레벨에 맞게 선택 (너무 많으면 위축됨)
3. 설명은 ${age}살이 이해할 수 있는 쉬운 말로
4. 격려와 응원을 많이 포함

[응답 형식]
반드시 JSON 형식으로만 응답하세요:
{
  "correctedText": "교정된 전체 텍스트",
  "feedback": "전체적인 피드백 (한국어, 매우 긍정적이고 격려하는 톤)",
  "corrections": [
    {
      "original": "원본 표현",
      "corrected": "교정된 표현",
      "explanation": "교정 이유 (한국어, ${age}살이 이해할 수 있는 쉬운 말)"
    }
  ],
  "sentenceExpansion": "문장 확장 제안 (한국어 질문 형태, 친근하게)",
  "expansionExample": "확장 예시 문장",
  "cheerUp": "격려 메시지 (한국어, 매우 긍정적)",
  "extractedWords": [
    {
      "word": "단어",
      "meaning": "의미",
      "level": "레벨",
      "example": "예문"
    }
  ],
  "sentenceBySentence": [
    {
      "original": "원본 문장",
      "corrected": "교정된 문장",
      "explanation": "교정 설명 (한국어, ${age}살이 이해할 수 있는 쉬운 말)",
      "alternatives": ["대안 표현1", "대안 표현2"]
    }
  ]
}`;

  const userPrompt = `다음 영어 일기를 첨삭해주세요:

원본 텍스트:
${originalText}

영어 레벨: ${englishLevel}
나이: ${age}살

요청사항:
1. 문법 오류를 수정하되, ${age}살 아이가 이해할 수 있도록 쉽게 설명
2. 긍정적인 피드백과 격려를 많이 포함
3. 레벨에 맞는 교정만 수행 (너무 많으면 위축됨)
4. 다음에 더 잘 쓸 수 있도록 구체적인 제안

JSON 형식으로만 응답해주세요.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * 일기 첨삭 (OpenAI API 호출)
 * 반드시 JSON 응답을 반환하도록 보장
 */
export async function correctDiaryWithOpenAI(
  originalText: string,
  age: string,
  englishLevel: string,
  isParent: boolean = false
): Promise<OpenAIResponse> {
  const apiKey = getOpenAIApiKey();

  try {
    let prompts: { system: string; user: string };
    let model = "gpt-4o-mini";

    if (isParent) {
      prompts = createParentPrompts(originalText);
      model = "gpt-4o-mini"; // 부모용도 동일 모델 사용
    } else {
      prompts = createChildPrompts(originalText, age, englishLevel);
    }

    console.log("🤖 GPT API 호출 시작...");
    const result = await callOpenAIWithRetry(
      prompts.system,
      prompts.user,
      apiKey,
      originalText, // fallback을 위한 원본 텍스트 전달
      model
    );
    console.log("✅ GPT API 호출 성공");

    return result;
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ OpenAI API 오류:", maskSensitiveInfo(err.message));
    throw new Error(`첨삭 처리 실패: ${err.message}`);
  }
}

