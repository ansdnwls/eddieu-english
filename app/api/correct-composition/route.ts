import { NextRequest, NextResponse } from "next/server";
import { maskSensitiveInfo } from "@/app/utils/apiLogger";

// API 키 가져오기 (환경변수만 사용)
function getAPIKeys() {
  return {
    openai: process.env.OPENAI_API_KEY || "",
  };
}

// API 키 검증 및 에러 반환
function validateAPIKey(key: string | undefined, keyName: string): string {
  if (!key || key.trim().length === 0) {
    throw new Error(`${keyName}가 설정되지 않았습니다. Vercel 환경변수에서 ${keyName}를 설정해주세요.`);
  }
  return key;
}

// OpenAI API로 영어작문 첨삭 처리
async function correctCompositionWithOpenAI(
  originalText: string,
  age: string,
  englishLevel: string,
  apiKey: string,
  compositionType: "letter" | "essay" | "other"
): Promise<any> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 설정되지 않았습니다.");
  }

  try {
    // 작문 타입별 설명
    const typeDescription = {
      letter: "편지",
      essay: "에세이",
      other: "영어 작문"
    };

    const systemPrompt = `당신은 영어문법과 작문 전문 원어민 선생님입니다.

[당신의 역할]
- 학습자의 영어 작문을 첨삭하고 발전시키는 전문 교육자
- 영어문법, 작문, 표현에 대한 깊은 지식을 가진 원어민 선생님
- 같은 의미를 다양한 방식으로 표현할 수 있도록 안내하는 멘토
- 일기에 한정하지 않고 편지, 에세이, 이메일 등 모든 영어 작문 첨삭

[중요한 원칙]
1. 문법적 정확성과 자연스러운 표현에 초점
2. 레벨에 맞게 다양한 표현 방법 제시
3. 같은 말도 여러 가지 방식으로 표현할 수 있음을 안내
4. 문맥에 맞는 관용구, 숙어, 표현 제안
5. 글의 흐름과 논리성 개선
6. 전문적이면서도 따뜻하고 격려하는 톤 유지

[레벨별 접근 방식]
- Lv.1-2: 기본 문법과 단순한 대체 표현 제시
- Lv.3-4: 중급 표현과 2-3가지 다양한 표현 방법 제시
- Lv.5: 고급 표현, 관용구, 여러 스타일의 표현 방법 제시

[응답 형식]
반드시 아래 JSON 형식으로만 응답하세요.
{
  "correctedText": "첨삭된 영어 작문 전문 (구두점 포함)",
  "feedback": "전문적인 피드백 (한국어)",
  "corrections": [
    {
      "original": "원본 표현",
      "corrected": "수정된 표현",
      "explanation": "왜 고쳤는지 설명 (한국어)",
      "alternatives": ["대체 표현 1", "대체 표현 2"]
    }
  ],
  "sentenceExpansion": "작문을 확장할 수 있는 질문이나 제안 (한국어)",
  "expansionExample": "확장된 작문 예시 (영어, 더 풍부하고 다양한 표현)",
  "cheerUp": "격려 메시지 (한국어)",
  "extractedWords": [
    {
      "word": "영어 단어/표현",
      "meaning": "한국어 뜻",
      "level": "초급/중급/고급",
      "example": "예문"
    }
  ],
  "alternativeExpressions": [
    {
      "original": "원래 표현",
      "alternatives": [
        {
          "expression": "대체 표현",
          "level": "레벨 (기본/격식/비격식/문학적 등)",
          "explanation": "어떤 상황에 적합한지 설명",
          "example": "예문 (영어로)"
        }
      ]
    }
  ],
  "sentenceByStence": [
    {
      "original": "원본 문장",
      "corrected": "교정된 문장 (구두점 포함)",
      "explanation": "교정 설명 (한국어)",
      "alternatives": ["대체 문장 1", "대체 문장 2"]
    }
  ]
}`;

    const userPrompt = `아래 영어 ${typeDescription[compositionType]}을 첨삭해주세요.

[원본 작문]
${originalText}

[학습자 정보]
- 나이: ${age}세
- 영어 레벨: ${englishLevel}
- 작문 유형: ${typeDescription[compositionType]}

[중요: 구두점, 관사, 전치사 교정]
- ⚠️ 학습자는 쉼표(,), 마침표(.)를 빼먹을 수 있습니다
- 문장 끝에 마침표가 없어도 문장으로 인식하고 교정하세요
- 관사(a, an, the)와 전치사(in, on, at, with, to 등)도 자주 빼먹는 부분입니다
- 구두점, 관사, 전치사 누락 시 반드시 교정하고 자상하게 설명하세요

[중요: 다양한 표현 학습]
학습자가 같은 의미를 여러 가지 방식으로 표현할 수 있도록 안내해주세요:
- 각 문장마다 2-3가지 대체 표현 제시
- 레벨에 맞는 다양한 어휘와 구문 제안
- 격식/비격식, 문어/구어, 직접적/간접적 표현 등 다양한 스타일 소개
- 관용구, 숙어, 자연스러운 원어민 표현 추천

[첨삭 가이드]
1. correctedText: 문법/철자/구두점 교정, 더 자연스러운 표현으로 개선

2. feedback: 전문적인 피드백 (3-4문장)
   - 잘 쓴 부분 구체적으로 언급
   - 개선할 점 제안 (구두점 포함)
   - 글의 전반적인 평가
   - 다양한 표현 방법의 중요성 강조

3. corrections: 중요한 교정 3-5개 (레벨에 맞게, 구두점/관사/전치사 포함)
   - 각 교정마다 2-3가지 대체 표현 제시
   - 왜 이렇게 고쳤는지 설명
   - 다른 방식으로도 표현할 수 있음을 안내
   - 구두점 누락 시: "문장 끝에는 마침표를 붙여야 합니다."
   - 관사 누락 시: "명사 앞에 'a', 'an', 'the'를 붙이면 더 자연스럽습니다."
   - 전치사 누락 시: "장소를 말할 때는 'to', 'in', 'on' 등을 사용합니다."

4. sentenceExpansion: 작문을 더 풍부하게 만들 수 있는 질문/제안
   - 예: "이 경험을 더 생생하게 표현하려면 어떻게 할 수 있을까요?"
   - 예: "감정을 표현하는 다른 방법들을 시도해보세요."

5. expansionExample: 확장된 작문 예시 (영어)
   - 레벨에 맞는 더 풍부하고 다양한 표현
   - 여러 가지 표현 기법 적용

6. cheerUp: 격려 메시지
   - 레벨에 맞는 구체적인 학습 방향 제시
   - 다양한 표현 학습의 중요성 강조

7. extractedWords: 작문에서 좋은 단어/표현 3-5개

8. alternativeExpressions: 같은 의미의 다양한 표현 방법
   - 원본 표현 → 여러 가지 대체 표현
   - 각 표현의 레벨과 사용 상황 설명
   - **반드시 각 대체 표현마다 예문 포함**
   - 예시:
     * "I think" → 
       - "I believe" (격식), 예문: "I believe this is the right approach."
       - "In my opinion" (공식), 예문: "In my opinion, we should proceed carefully."
       - "It seems to me" (부드러운), 예문: "It seems to me that you're right."
     * "very good" → 
       - "excellent" (강조), 예문: "Your work is excellent!"
       - "outstanding" (공식), 예문: "She delivered an outstanding performance."
       - "fantastic" (비격식), 예문: "That's fantastic news!"

9. sentenceByStence: 문장별 교정 (배열)
   - ⚠️ 학습자가 구두점(쉼표, 마침표)을 빼먹었어도 문장으로 인식하고 교정하세요
   - original: 원본 문장 (구두점이 없어도 그대로 표시)
   - corrected: 교정된 문장 (구두점 반드시 포함)
   - explanation: 교정 설명 (한국어, 매우 자상하게)
     * 구두점 누락 시: "문장 끝에는 마침표(.)를 붙여야 합니다."
     * 관사 누락 시: "명사 앞에 'a', 'an', 'the'를 붙이면 더 자연스럽습니다. 'a'는 하나의 것, 'the'는 특정한 것을 가리킵니다."
     * 전치사 누락 시: "장소를 말할 때는 'in', 'on', 'at'을 사용합니다. 'in the park', 'on the table', 'at school'처럼요!"
     * 각 교정마다 왜 그렇게 쓰는지 친절하고 명확하게 설명
   - alternatives: 같은 의미의 다른 표현 방법 2-3개

[핵심 원칙]
- 일기에 국한하지 않고 모든 영어 작문에 적용
- 문법 교정뿐만 아니라 다양한 표현 방법 학습에 중점
- 같은 의미도 상황, 톤, 레벨에 따라 다르게 표현할 수 있음을 안내
- 레벨에 맞는 적절한 대체 표현 제시

[구두점 교정 - 매우 중요]
- ⚠️ 학습자는 쉼표(,)나 마침표(.)를 빼먹을 수 있습니다
- 문장 끝에 마침표가 없어도 문장으로 인식하고 교정하세요
- 쉼표, 마침표 등 구두점을 반드시 정확하게 교정
- 문장 구분이 어려운 경우, 의미 단위로 나누어 판단하세요

[관사와 전치사 교정 - 자상하게 설명]
- 관사(a, an, the)와 전치사(in, on, at, with, to 등)는 학습자가 자주 빼먹는 부분입니다
- 관사 누락 시 교정하고, explanation에 왜 필요한지 명확하게 설명하세요
- 전치사 누락 시 교정하고, explanation에 언제 사용하는지 명확하게 설명하세요

반드시 위의 JSON 형식으로만 응답하세요.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API 오류: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    try {
      const cleanContent = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      
      const parsed = JSON.parse(cleanContent);
      
      if (!parsed.correctedText || !parsed.feedback) {
        throw new Error("필수 필드 누락");
      }
      
      return {
        ...parsed,
        sentenceExpansion: parsed.sentenceExpansion || "작문을 더 발전시켜보세요!",
        expansionExample: parsed.expansionExample || parsed.correctedText,
        cheerUp: parsed.cheerUp || "잘 작성하셨습니다! 계속 연습하세요!",
        alternativeExpressions: parsed.alternativeExpressions || [],
      };
    } catch (parseError) {
      console.error("JSON 파싱 실패:", parseError);
      console.log("원본 응답:", content);
      
      return {
        correctedText: content,
        feedback: "AI가 첨삭을 완료했습니다.",
        corrections: [],
        sentenceExpansion: "작문을 더 발전시켜보세요!",
        expansionExample: content,
        cheerUp: "잘 작성하셨습니다! 계속 연습하세요!",
        extractedWords: [],
        alternativeExpressions: [],
      };
    }
  } catch (error: any) {
    console.error("OpenAI API 오류:", error);
    throw new Error(`첨삭 처리 실패: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const originalText = body.originalText;
    const age = body.age?.toString() || "8";
    const englishLevel = body.englishLevel || "Lv.1";
    const compositionType = body.compositionType || "other";

    console.log("=== 영어작문 첨삭 요청 ===");
    console.log("originalText:", originalText?.substring(0, 50) + "...");
    console.log("age:", age);
    console.log("englishLevel:", englishLevel);
    console.log("compositionType:", compositionType);

    if (!originalText) {
      return NextResponse.json(
        { success: false, error: "작문 내용을 제공해주세요." },
        { status: 400 }
      );
    }

    // API 키 가져오기 및 검증
    const apiKeys = getAPIKeys();
    let openaiKey: string;
    try {
      openaiKey = validateAPIKey(apiKeys.openai, "OPENAI_API_KEY");
    } catch (keyError: unknown) {
      const error = keyError as Error;
      console.error("❌ API 키 검증 실패:", maskSensitiveInfo(error.message));
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    // GPT API 호출로 첨삭
    let correctionResult;
    console.log("=== API 키 확인 ===");
    console.log("OpenAI API 키 존재:", !!openaiKey);
    
    try {
      console.log("🤖 GPT API 호출 시작...");
      correctionResult = await correctCompositionWithOpenAI(
        originalText, 
        age, 
        englishLevel, 
        openaiKey,
        compositionType
      );
      console.log("✅ GPT API 호출 성공");
    } catch (gptError: unknown) {
      const error = gptError as Error;
      const errorMessage = error.message || "알 수 없는 오류가 발생했습니다.";
      console.error("❌ GPT 오류:", maskSensitiveInfo(errorMessage));
      
      // API 키 관련 오류인 경우 한국어 메시지로 변환
      let userFriendlyError = "작문 첨삭 처리 중 오류가 발생했습니다.";
      if (error.message?.includes("API key") || error.message?.includes("401") || error.message?.includes("invalid")) {
        userFriendlyError = "OpenAI API 키가 유효하지 않습니다. 관리자에게 문의해주세요.";
      } else if (error.message?.includes("rate limit") || error.message?.includes("429")) {
        userFriendlyError = "API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.";
      }
      
      return NextResponse.json(
        {
          success: false,
          error: userFriendlyError,
        },
        { status: 500 }
      );
    }

    // 결과 반환
    if (correctionResult) {
      console.log("✅ 실제 API 결과 반환");
      return NextResponse.json({
        success: true,
        data: {
          originalText: originalText,
          correctedText: correctionResult.correctedText || correctionResult,
          feedback: correctionResult.feedback || "AI가 첨삭을 완료했습니다.",
          corrections: correctionResult.corrections || [],
          sentenceExpansion: correctionResult.sentenceExpansion || "작문을 더 발전시켜보세요!",
          expansionExample: correctionResult.expansionExample || correctionResult.correctedText || correctionResult,
          cheerUp: correctionResult.cheerUp || "잘 작성하셨습니다! 계속 연습하세요!",
          extractedWords: correctionResult.extractedWords || [],
          alternativeExpressions: correctionResult.alternativeExpressions || [],
        },
      });
    }

    // 결과가 없는 경우 (이론적으로는 도달하지 않아야 함)
    return NextResponse.json(
      {
        success: false,
        error: "작문 첨삭 결과를 생성할 수 없습니다.",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error processing composition:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

