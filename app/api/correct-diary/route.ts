import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// API 키 가져오기 (Firestore에서 가져오기)
async function getAPIKeys() {
  try {
    // Firestore에서 가져오기 (관리자 페이지에서 입력한 값)
    if (!db) {
      console.warn("Firestore가 초기화되지 않았습니다.");
      // Firestore가 없으면 환경 변수 사용
      return {
        openai: process.env.OPENAI_API_KEY || "",
        googleVision: process.env.GOOGLE_VISION_API_KEY || "",
        tts: process.env.TTS_API_KEY || "",
      };
    }

    const docRef = doc(db, "admin_settings", "api_keys");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Firestore에 값이 있으면 사용, 없으면 환경 변수 사용
      return {
        openai: data.openai || process.env.OPENAI_API_KEY || "",
        googleVision: data.googleVision || process.env.GOOGLE_VISION_API_KEY || "",
        tts: data.tts || process.env.TTS_API_KEY || "",
      };
    }
    
    // Firestore에 문서가 없으면 환경 변수 사용
    return {
      openai: process.env.OPENAI_API_KEY || "",
      googleVision: process.env.GOOGLE_VISION_API_KEY || "",
      tts: process.env.TTS_API_KEY || "",
    };
  } catch (error) {
    console.error("API 키 로드 실패:", error);
    // 오류 발생 시 환경 변수 사용
    return {
      openai: process.env.OPENAI_API_KEY || "",
      googleVision: process.env.GOOGLE_VISION_API_KEY || "",
      tts: process.env.TTS_API_KEY || "",
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

// OpenAI API로 첨삭 처리
// OpenAI API로 첨삭 처리 - 1단계 개선
async function correctWithOpenAI(
  originalText: string,
  age: string,
  englishLevel: string,
  apiKey: string,
  isParent: boolean = false
): Promise<any> {
  if (!apiKey) {
    throw new Error("OpenAI API 키가 설정되지 않았습니다.");
  }

  try {
    // ===== 부모 계정용 프롬프트 =====
    if (isParent) {
      const parentSystemPrompt = `당신은 성인 학습자를 위한 전문적인 영어 작문 코치입니다.

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
반드시 아래 JSON 형식으로만 응답하세요.
{
  "correctedText": "첨삭된 영어 작문 전문 (구두점 포함)",
  "feedback": "전문적인 피드백 (한국어)",
  "corrections": [
    {
      "original": "원본 표현",
      "corrected": "수정된 표현",
      "explanation": "왜 고쳤는지 설명 (한국어)"
    }
  ],
  "sentenceExpansion": "작문을 확장할 수 있는 질문이나 제안 (한국어)",
  "expansionExample": "확장된 작문 예시 (영어, 더 풍부하고 세련된 형태)",
  "cheerUp": "격려 메시지 (한국어)",
  "extractedWords": [
    {
      "word": "영어 단어/표현",
      "meaning": "한국어 뜻",
      "level": "중급/고급/비즈니스",
      "example": "예문"
    }
  ],
  "betterVocabulary": [
    {
      "original": "원래 사용한 단어",
      "better": "더 좋은 단어",
      "explanation": "왜 더 좋은지 설명",
      "example": "예문"
    }
  ],
  "sentenceByStence": [
    {
      "original": "원본 문장",
      "corrected": "교정된 문장 (구두점 포함)",
      "explanation": "교정 설명 (한국어)"
    }
  ]
}`;

      const parentUserPrompt = `아래 영어 작문을 첨삭해주세요.

[원본 작문]
${originalText}

[중요: 구두점 교정]
- 쉼표(,), 마침표(.), 느낌표(!), 물음표(?) 등 모든 구두점을 자연스러운 영어 문장에 맞게 교정
- 구두점이 없거나 부적절한 경우 반드시 추가/수정
- 구두점은 원어민이 읽을 때 자연스러운 호흡과 억양을 위해 매우 중요함

[첨삭 가이드]
1. correctedText: 문법/철자/구두점 교정, 더 자연스러운 표현으로 개선
   - ⚠️ 매우 중요: 단순히 문장을 나열하지 말고, 자연스럽게 연결하세요!
   - 같은 주어가 반복되면 접속사나 전치사구로 연결
   - 문장이 너무 짧고 반복적이면 하나로 합치거나 자연스럽게 연결
2. feedback: 전문적인 피드백 (3-4문장)
   - 잘 쓴 부분 구체적으로 언급
   - 개선할 점 제안 (구두점 포함)
   - 글의 전반적인 평가
3. corrections: 중요한 교정 3-5개 (구두점 교정 포함)
4. sentenceExpansion: 작문을 더 풍부하게 만들 수 있는 질문/제안
   - 예: "이 경험이 당신에게 어떤 의미가 있었나요? 구체적인 감정이나 생각을 추가해보세요."
5. expansionExample: 확장된 작문 예시 (더 세련되고 풍부한 표현)
6. cheerUp: 격려 메시지
7. extractedWords: 작문에서 좋은 단어/표현 3-5개
8. betterVocabulary: 더 나은 단어 제안 3-5개
9. sentenceByStence: 문장별 교정 (배열)
   - original: 원본 문장
   - corrected: 교정된 문장
   - explanation: 교정 설명

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
            { role: "system", content: parentSystemPrompt },
            { role: "user", content: parentUserPrompt },
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
          betterVocabulary: parsed.betterVocabulary || [],
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
          betterVocabulary: [],
        };
      }
    }

    // ===== 아이 계정용 프롬프트 (기존 로직) =====
    // ===== 1단계: JSON 스키마 정의 (레벨별 차별화) =====
    const level = englishLevel || "Lv.1";
    
    // 레벨별 스키마 정의
    let jsonSchema = `{
  "correctedText": "첨삭된 영어 일기 전문",
  "feedback": "AI 선생님의 따뜻한 피드백 (한국어, 아이의 작문 수준에 맞게)",
  "corrections": [
    {
      "original": "원본 표현",
      "corrected": "수정된 표현",
      "explanation": "왜 고쳤는지 설명 (한국어, 쉽고 친절하게)"
    }
  ],
  "sentenceExpansion": "한글로 대화를 이어가며 질문 (아이의 작문 수준에 맞는 확장 질문)",
  "expansionExample": "확장된 일기 예시 (영어, 아이의 현재 수준에서 한 단계 발전된 형태)",
  "cheerUp": "다음에 더 자세히 써보도록 격려하는 메시지 (한국어, 아이의 수준에 맞게)",
  "extractedWords": [
    {
      "word": "영어 단어",
      "meaning": "한국어 뜻",
      "level": "초급/중급/고급",
      "example": "예문"
    }
  ]
}`;

    // ===== 2단계: System Prompt 개선 (레벨별 차별화) =====
    let levelGuidance = "";
    
    switch(level) {
      case "Lv.1":
        levelGuidance = `
[Lv.1 전략 - 단어/짧은 문장 중심]
- 아이의 작문 특징: 단어 몇 개 또는 매우 짧은 문장 (예: "park", "I go park")
- 피드백: 단어를 알고 있다는 것 자체를 크게 칭찬
- 교정: 핵심만 1-2개 (과거 시제 등)
- sentenceExpansion: 아이가 쓴 내용을 바탕으로 매우 간단한 질문
  * 예시: 아이가 "park"만 썼다면 → "우와 공원 갔구나! 공원에서 뭐했어?"
  * 예시: 아이가 "I go park" 썼다면 → "공원 갔구나! 거기서 뭐했어? 재밌었어?"
- expansionExample: 아이의 현재 수준에서 한 단계만 발전
  * 아이가 단어만 썼다면 → "I went to the park."
  * 아이가 짧은 문장 썼다면 → "I went to the park. I played there."
- cheerUp: "다음엔 뭐했는지도 써보자! 화이팅!"`;
        break;
      case "Lv.2":
        levelGuidance = `
[Lv.2 전략 - 기본 문장 구조]
- 아이의 작문 특징: 기본 주어+동사 문장 (예: "I go park. I play friend.")
- 피드백: 문장을 만들 수 있다는 것 칭찬, 기본 구조 언급
- 교정: 과거 시제, 기본 문법 2-3개
- sentenceExpansion: 아이가 쓴 내용을 바탕으로 감정/이유 물어보기
  * 예시: "공원에서 뭐했어? 누구랑 갔어? 그래서 기분이 어땠어?"
- expansionExample: 아이의 문장에 감정이나 이유 추가
  * 아이가 "I went park. I played." 썼다면 → "I went to the park. I played with my friend. I was happy."
- cheerUp: "다음엔 왜 재밌었는지, 누구랑 갔는지도 써보자! 잘하고 있어!"`;
        break;
      case "Lv.3":
        levelGuidance = `
[Lv.3 전략 - 여러 문장, 감정 표현 시도]
- 아이의 작문 특징: 여러 문장으로 쓰려고 시도 (예: "I go park. I play friend. I happy.")
- 피드백: 여러 문장을 쓸 수 있다는 것 칭찬, 감정 표현 시도 언급
- 교정: 과거 시제, 연결어, 감정 표현 자연스럽게 3-4개
- sentenceExpansion: 아이가 쓴 내용을 바탕으로 구체적 상황 묻기
  * 예시: "공원에서 뭐했어? 누구랑 갔어? 날씨는 어땠어? 그래서 기분이 어땠어?"
- expansionExample: 아이의 문장에 구체적 상황과 이유 추가
  * 아이가 "I went park. I played. I happy." 썼다면 → "I went to the park with my mom. I played on the swings. I was very happy because it was sunny."
- cheerUp: "다음엔 누구랑 갔는지, 왜 재밌었는지, 날씨는 어땠는지도 써보자! 멋져!"`;
        break;
      case "Lv.4":
        levelGuidance = `
[Lv.4 전략 - 자유로운 표현, 다양한 단어]
- 아이의 작문 특징: 자유롭게 긴 문장 시도, 다양한 단어 사용 (예: "I went beautiful park. I played many games. I felt excited.")
- 피드백: 표현력과 다양한 단어 사용 칭찬
- 교정: 자연스러운 표현, 문법 정확도 2-3개
- sentenceExpansion: 아이가 쓴 내용을 바탕으로 창의적이고 심화된 질문
  * 예시: "공원에서 뭐했어? 어떤 느낌이었어? 그 경험이 너에게 어떤 의미였어? 다음엔 또 가고 싶어?"
- expansionExample: 아이의 문장을 더 풍부하고 자연스럽게 확장
  * 아이가 "I went beautiful park. I played many games. I felt excited." 썼다면 → "I went to the beautiful park near my house. I played on the swings and slides with my best friend. The weather was perfect, and I felt so excited. I want to go there again next weekend."
- cheerUp: "다음엔 더 자세히, 더 창의적으로 써보자! 이미 잘하고 있어!"`;
        break;
      case "Lv.5":
        levelGuidance = `
[Lv.5 전략 - 고급 표현, 복잡한 구조]
- 아이의 작문 특징: 이미 자연스러운 문장, 복잡한 구조 시도 (예: "I visited the park where I always go. I enjoyed various activities with friends.")
- 피드백: 고급 표현과 문장 구조 칭찬
- 교정: 최소화 (1-2개, 자연스러움 위주)
- sentenceExpansion: 아이가 쓴 내용을 바탕으로 심화되고 철학적인 질문
  * 예시: "공원에서 뭐했어? 그 경험이 너에게 어떤 의미였어? 그 경험을 통해 무엇을 배웠어? 다음엔 어떻게 발전시킬 수 있을까?"
- expansionExample: 아이의 문장을 더 복잡한 구조와 깊이 있는 내용으로 확장
  * 아이가 이미 좋은 문장을 썼다면 → 복합문, 관계절, 더 깊이 있는 표현 추가
- cheerUp: "더 복잡한 문장 구조나 창의적인 표현을 시도해보자! 이미 훌륭해!"`;
        break;
      default:
        levelGuidance = `
[기본 전략]
- 아이의 실제 작문 수준을 파악하여 맞춤형 피드백
- 교정 2-3개
- sentenceExpansion: 아이의 내용에 맞는 질문
- expansionExample: 아이의 수준에서 한 단계 발전`;
    }
    
    const systemPrompt = `당신은 ${age}살 어린이를 위한 따뜻하고 친절한 영어 선생님입니다.

[당신의 역할]
- 아이의 영어 일기를 첨삭하고 격려하는 선생님
- 실수를 지적하기보다는 성장을 응원하는 따뜻한 멘토
- 한국인 초등교사가 직접 쓴 것처럼 자연스러운 한국어 사용

[중요한 원칙]
1. 항상 긍정적이고 구체적인 칭찬으로 시작
2. 아이가 이미 잘하고 있는 부분을 먼저 언급
3. 교정은 레벨에 맞게 선택 (너무 많으면 아이가 위축됨)
4. 설명은 ${age}살이 이해할 수 있는 쉬운 말로
5. 한국어는 자연스럽게 (번역체 금지)

[아이의 영어 수준]
${level}${levelGuidance}

[응답 형식]
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.
${jsonSchema}`;

    // ===== 3단계: User Prompt 개선 =====
    const userPrompt = `아래 영어 일기를 첨삭해주세요.

[원본 일기]
${originalText}

[중요: 아이의 실제 작문 수준 파악]
먼저 아이가 쓴 일기를 분석하세요:
- 문장 길이와 복잡도
- 사용한 단어 수준
- 문법 수준
- 표현의 깊이

이 분석을 바탕으로 아이의 실제 작문 수준에 맞춰 피드백을 제공하세요.

[첨삭 가이드 - 순서대로 작성]
1. correctedText: 문법/철자 교정 (자연스러운 영어로, 아이의 원래 톤 유지)
   - ⚠️ 매우 중요: 단순히 문장을 나열하지 말고, 자연스럽게 연결하세요!
   - 예시 (나쁜 예): "Today I went to the park. I played with my friend. We had a fun time."
   - 예시 (좋은 예): "Today I went to the park with my friend. We played together and had a fun time."
   - 같은 주어가 반복되면 접속사(and, but, so)나 전치사구(with, in, at)로 연결
   - 문장이 너무 짧고 반복적이면 하나로 합치거나 자연스럽게 연결
   - 아이의 영어 레벨에 맞게 연결 (너무 복잡하지 않게)

2. feedback: AI 선생님의 따뜻한 피드백
   - 아이가 실제로 잘한 점을 구체적으로 칭찬
   - 아이의 작문 수준에 맞는 격려
   - 다음에 시도해볼 점 1개 제안

3. corrections: 중요한 교정만 (아이의 수준에 맞게 1-4개)
   - 원본, 수정, 쉬운 설명

4. sentenceExpansion: 한글로 대화를 이어가며 질문하기
   - 아이가 쓴 내용을 바탕으로 자연스럽게 질문
   - 아이의 작문 수준에 맞는 질문 난이도
   - 예시: 
     * 단어만 썼다면 → "우와 공원 갔구나! 공원에서 뭐했어?"
     * 짧은 문장 썼다면 → "공원 갔구나! 거기서 뭐했어? 재밌었어?"
     * 여러 문장 썼다면 → "공원에서 뭐했어? 누구랑 갔어? 그래서 기분이 어땠어?"
   - 자연스러운 대화체로 작성

5. expansionExample: 확장된 일기 예시 (영어)
   - 아이의 현재 작문 수준에서 한 단계만 발전된 형태
   - sentenceExpansion의 질문에 답한 형태
   - 아이가 쓴 내용을 바탕으로 자연스럽게 확장
   - 문장 개수가 아니라 내용의 깊이와 표현의 풍부함에 초점

6. cheerUp: 다음에 더 자세히 써보도록 격려
   - 아이의 작문 수준에 맞는 구체적인 제안
   - 예시: "다음엔 공원에 갔고 거기서 뭘했고 기분이 어떤지까지 이야기 해보자! 화이팅 잘하고 있어!!"
   - 레벨에 맞게 격려 강도 조절

7. extractedWords: 일기에서 좋은 단어 3-5개 (뜻, 난이도, 예문)

8. sentenceByStence: 문장별 교정 (배열)
   - 일기를 문장 단위로 나누어 각각 교정
   - original: 원본 문장
   - corrected: 교정된 문장 (구두점 반드시 포함)
   - explanation: 교정 설명 (한국어)

[핵심 원칙]
- 아이의 실제 작문 수준을 정확히 파악
- 그 수준에 맞춰 피드백과 확장 제공
- 문장 개수가 아니라 내용의 깊이와 표현력에 초점
- 아이가 쓴 내용을 바탕으로 자연스럽게 확장
- 쉼표, 마침표 등 구두점을 반드시 정확하게 교정 (원어민 발음을 위해 매우 중요)
- ⚠️ correctedText는 반드시 자연스럽게 연결된 문장으로 작성 (단순 나열 금지)
  * 같은 주어 반복 피하기 (I, I, I... → I... and...)
  * 접속사나 전치사구 활용하여 문장 연결
  * 아이의 레벨에 맞는 적절한 연결 (너무 복잡하지 않게)

반드시 위의 JSON 형식으로만 응답하세요.`;

    // ===== 4단계: API 호출 (JSON Mode는 다음 단계에서) =====
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
        // 다음 단계에서 response_format 추가 예정
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API 오류: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    // ===== 5단계: JSON 파싱 (기본) =====
    try {
      // JSON 마크다운 제거 (```json ... ``` 형태)
      const cleanContent = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      
      const parsed = JSON.parse(cleanContent);
      
      // 필수 필드 검증
      if (!parsed.correctedText || !parsed.feedback) {
        throw new Error("필수 필드 누락");
      }
      
      // 선택적 필드 기본값 설정
      return {
        ...parsed,
        sentenceExpansion: parsed.sentenceExpansion || "다음에 더 자세히 써보면 좋을 것 같아요!",
        expansionExample: parsed.expansionExample || parsed.correctedText,
        cheerUp: parsed.cheerUp || "잘하고 있어요! 계속 연습해봐요! 💪",
      };
    } catch (parseError) {
      console.error("JSON 파싱 실패:", parseError);
      console.log("원본 응답:", content);
      
      // 파싱 실패 시 기본 구조 반환
      return {
        correctedText: content,
        feedback: "AI가 첨삭을 완료했습니다.",
        corrections: [],
        sentenceExpansion: "다음에 더 자세히 써보면 좋을 것 같아요!",
        expansionExample: content,
        cheerUp: "잘하고 있어요! 계속 연습해봐요! 💪",
        extractedWords: [],
      };
    }
  } catch (error: any) {
    console.error("OpenAI API 오류:", error);
    throw new Error(`첨삭 처리 실패: ${error.message}`);
  }
}

// ===== 사용 예시 (route.ts의 POST 함수에서) =====
// const correctionResult = await correctWithOpenAI(
//   originalText, 
//   age, 
//   englishLevel, 
//   apiKeys.openai
// );

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let originalText = "";
    let age: string;
    let englishLevel: string;
    let isJsonRequest = false;
    let isParent = false;

    console.log("=== 요청 정보 ===");
    console.log("Content-Type:", contentType);

    // Content-Type 체크를 더 명확하게
    if (contentType.includes("application/json")) {
      isJsonRequest = true;
    } else if (contentType.includes("multipart/form-data") || !contentType.includes("application/json")) {
      isJsonRequest = false;
    }

    console.log("JSON 요청 여부:", isJsonRequest);

    if (isJsonRequest) {
      // JSON 요청 (OCR 후 텍스트만 전달)
      try {
        const body = await request.json();
        originalText = body.originalText;
        age = body.age?.toString() || "8";
        englishLevel = body.englishLevel || "Lv.1";
        isParent = body.isParent || false;

        console.log("📝 JSON 요청 처리 성공");
        console.log("originalText:", originalText?.substring(0, 50) + "...");
        console.log("isParent:", isParent);

        if (!originalText) {
          return NextResponse.json(
            { success: false, error: "일기 내용을 제공해주세요." },
            { status: 400 }
          );
        }
      } catch (jsonError) {
        console.error("JSON 파싱 오류:", jsonError);
        return NextResponse.json(
          { success: false, error: "JSON 파싱에 실패했습니다." },
          { status: 400 }
        );
      }
    } else {
      // FormData 요청 (이미지 + OCR 처리)
      try {
        const formData = await request.formData();
        const image = formData.get("image") as File;
        age = formData.get("age") as string;
        englishLevel = formData.get("englishLevel") as string;
        isParent = formData.get("isParent") === "true";

        console.log("📸 FormData 요청 처리");
        console.log("이미지:", image?.name, image?.size);
        console.log("나이:", age);
        console.log("레벨:", englishLevel);
        console.log("isParent:", isParent);

        if (!image || !age) {
          return NextResponse.json(
            { success: false, error: "이미지와 나이를 모두 제공해주세요." },
            { status: 400 }
          );
        }

        // API 키 가져오기
        const apiKeys = await getAPIKeys();
        
        // 이미지를 Buffer로 변환
        const arrayBuffer = await image.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        // 1. OCR 처리 (Google Vision API 사용)
        if (apiKeys.googleVision) {
          try {
            console.log("Google Vision API로 OCR 시작...");
            originalText = await extractTextWithGoogleVision(imageBuffer, apiKeys.googleVision);
            console.log("OCR 성공:", originalText?.substring(0, 50) + "...");
          } catch (ocrError: any) {
            console.error("OCR 오류:", ocrError);
            // OCR 실패 시 Mock 텍스트 사용
            originalText = "Today I go to park. I play with my friend. We have fun time.";
          }
        } else {
          console.log("Google Vision API 키 없음 - Mock 텍스트 사용");
          // API 키가 없으면 Mock 텍스트 사용
          originalText = "Today I go to park. I play with my friend. We have fun time.";
        }
      } catch (formError) {
        console.error("FormData 파싱 오류:", formError);
        return NextResponse.json(
          { success: false, error: "FormData 파싱에 실패했습니다." },
          { status: 400 }
        );
      }
    }

    // API 키 가져오기 (JSON 요청의 경우 여기서 가져옴)
    const apiKeys = await getAPIKeys();

    // 2. GPT API 호출로 첨삭
    let correctionResult;
    console.log("=== API 키 확인 ===");
    console.log("OpenAI API 키 존재:", !!apiKeys.openai);
    console.log("원본 텍스트:", originalText);
    console.log("나이:", age);
    console.log("영어 레벨:", englishLevel);
    
    if (apiKeys.openai && originalText) {
      try {
        console.log("GPT API 호출 시작...");
        correctionResult = await correctWithOpenAI(originalText, age, englishLevel, apiKeys.openai, isParent);
        console.log("GPT API 호출 성공:", correctionResult);
      } catch (gptError: any) {
        console.error("GPT 오류:", gptError);
        console.error("오류 상세:", gptError.message);
        // GPT 실패 시 Mock 데이터 사용
        correctionResult = null;
      }
    } else {
      console.log("API 키 없음 또는 텍스트 없음 - Mock 데이터 사용");
    }

    // 3. 결과 반환
    if (correctionResult) {
      console.log("실제 API 결과 반환");
      // 실제 API 호출 성공
      return NextResponse.json({
        success: true,
        data: {
          originalText: originalText,
          correctedText: correctionResult.correctedText || correctionResult,
          feedback: correctionResult.feedback || "AI가 첨삭을 완료했습니다.",
          corrections: correctionResult.corrections || [],
          sentenceExpansion: correctionResult.sentenceExpansion || "다음에 더 자세히 써보면 좋을 것 같아요!",
          expansionExample: correctionResult.expansionExample || correctionResult.correctedText || correctionResult,
          cheerUp: correctionResult.cheerUp || "잘하고 있어요! 계속 연습해봐요! 💪",
          extractedWords: correctionResult.extractedWords || [],
        },
      });
    }

    // API 키가 없거나 실패 시 Mock 데이터 사용
    console.log("⚠️ Mock 데이터 반환 중 - API 호출 실패했거나 API 키 없음");
    const diaryLevel = englishLevel || "Lv.1";
    
    // 레벨별 Mock 데이터 (API 키가 없을 때 사용)
    const getLevelBasedResponse = (level: string) => {
      const baseText = "Today I go to park. I play with my friend. We have fun time.";
      const baseCorrected = "Today I went to the park. I played with my friend. We had a fun time.";
      
      switch (level) {
        case "Lv.1":
          // Lv.1: 단어 중심, 칭찬 위주
          return {
            originalText: baseText,
            correctedText: baseCorrected,
            feedback: `와! ${age}살인데 영어 단어를 이렇게 많이 알고 있네요! 정말 대단해요! 🎉 오늘도 열심히 써주셔서 고마워요. 계속 연습하면 더 좋아질 거예요!`,
            encouragement: "첫 영어 일기 정말 멋져요! 계속 써보면 영어가 점점 쉬워질 거예요! 💪",
            sentenceExpansion: "우와 공원 갔구나! 공원에서 뭐했어? 재밌었어?",
            expansionExample: "Today I went to the park. I played with my friend. We played on the swings and slides. We had a fun time. I was very happy!",
            cheerUp: "정말 잘했어요! 다음엔 공원에서 뭐했는지 더 써보면 좋을 것 같아요. 화이팅!! 💪",
            corrections: [
              {
                original: "go",
                corrected: "went",
                explanation: "과거에 일어난 일이니까 'went'를 쓰면 더 좋아요!"
              }
            ],
            sentenceByStence: [
              {
                original: "Today I go to park.",
                corrected: "Today I went to the park.",
                explanation: "과거에 일어난 일이니까 'go'는 'went'로, 'to the park'라고 쓰면 더 자연스러워요!",
                alternatives: ["Today I visited the park.", "Today I went to a park."]
              },
              {
                original: "I play with my friend.",
                corrected: "I played with my friend.",
                explanation: "'play'의 과거형은 'played'예요!",
                alternatives: ["I had fun with my friend.", "I spent time with my friend."]
              },
              {
                original: "We have fun time.",
                corrected: "We had a fun time.",
                explanation: "'have'의 과거형은 'had'이고, 'a fun time'이라고 쓰면 더 자연스러워요!",
                alternatives: ["We enjoyed ourselves.", "We had a great time."]
              }
            ],
            extractedWords: [
              { word: "park", meaning: "공원", level: "초급", example: "I went to the park." },
              { word: "friend", meaning: "친구", level: "초급", example: "My friend is nice." },
              { word: "fun", meaning: "재미있는", level: "초급", example: "We had fun!" }
            ]
          };
        
        case "Lv.2":
          // Lv.2: 기본 문법 설명 추가
          return {
            originalText: baseText,
            correctedText: baseCorrected,
            feedback: `문장을 잘 만들었어요! 주어와 동사를 사용해서 문장을 만드는 연습을 하고 있네요. 과거 시제를 조금 더 연습하면 완벽할 거예요!`,
            encouragement: "기본 문장 구조를 잘 알고 있어요! 조금만 더 연습하면 더 좋은 문장을 쓸 수 있을 거예요! ✨",
            sentenceExpansion: "공원에 갔구나! 친구랑 뭐하고 놀았어? 그래서 기분이 어땠어?",
            expansionExample: "Today I went to the park. I played with my friend on the swings. We also played tag together. I felt very happy because it was so much fun!",
            cheerUp: "문장 구조가 좋아지고 있어요! 다음엔 감정이나 이유도 써보면 더 멋진 일기가 될 거예요. 잘하고 있어요! 🌟",
            corrections: [
              {
                original: "go",
                corrected: "went",
                explanation: "과거에 일어난 일이므로 'go'의 과거형 'went'를 사용해요."
              },
              {
                original: "play",
                corrected: "played",
                explanation: "'play'의 과거형은 'played'예요."
              }
            ],
            sentenceByStence: [
              {
                original: "Today I go to park.",
                corrected: "Today I went to the park.",
                explanation: "과거 시제는 'went'를 사용하고, 'to the park'라고 써야 해요!",
                alternatives: ["Today I visited the park.", "Today I went to a park."]
              },
              {
                original: "I play with my friend.",
                corrected: "I played with my friend.",
                explanation: "과거 시제는 'played'를 써야 해요!",
                alternatives: ["I had fun with my friend.", "I spent time with my friend."]
              },
              {
                original: "We have fun time.",
                corrected: "We had a fun time.",
                explanation: "'have'의 과거형은 'had'이고, 'a fun time'이 더 자연스러워요!",
                alternatives: ["We enjoyed ourselves.", "We had a great time.", "We had lots of fun."]
              }
            ],
            extractedWords: [
              { word: "park", meaning: "공원", level: "초급", example: "I go to the park." },
              { word: "friend", meaning: "친구", level: "초급", example: "My friend is nice." },
              { word: "fun", meaning: "재미있는", level: "초급", example: "It was fun!" }
            ]
          };
        
        case "Lv.3":
          // Lv.3: 감정/이유 표현 피드백
          return {
            originalText: baseText,
            correctedText: baseCorrected,
            feedback: `여러 문장으로 일기를 써주셨네요! 감정이나 이유를 더 자세히 써보면 더 재미있는 일기가 될 거예요. 예를 들어 "I was happy because..." 같은 표현을 사용해볼까요?`,
            encouragement: "문장을 길게 쓰는 연습을 하고 있어요! 감정과 이유를 더 표현하면 더 멋진 일기가 될 거예요! 🌟",
            sentenceExpansion: "공원에서 친구랑 뭐하고 놀았어? 누가 더 재밌었어? 그때 기분이 어땠는지 자세히 말해줄래?",
            expansionExample: "Today I went to the park with my best friend. We played on the swings and slides for a long time. I was very happy because we laughed a lot together. The weather was nice and sunny. It was the best day ever!",
            cheerUp: "감정과 이유를 표현하는 연습을 하고 있어요! 다음엔 왜 재밌었는지, 어떤 기분이었는지 더 자세히 써보면 완벽할 거예요. 계속 화이팅! 🎉",
            corrections: [
              {
                original: "go",
                corrected: "went",
                explanation: "과거에 일어난 일이므로 'go'의 과거형 'went'를 사용해요."
              },
              {
                original: "play",
                corrected: "played",
                explanation: "'play'의 과거형은 'played'예요."
              },
              {
                original: "have",
                corrected: "had",
                explanation: "'have'의 과거형은 'had'예요. 과거 시제를 맞춰줘야 해요."
              }
            ],
            sentenceByStence: [
              {
                original: "Today I go to park.",
                corrected: "Today I went to the park.",
                explanation: "과거 시제는 'went'를 사용하고, 'to the park'라고 써야 해요!",
                alternatives: ["Today I visited the park.", "Today I went to the local park."]
              },
              {
                original: "I play with my friend.",
                corrected: "I played with my friend.",
                explanation: "과거 시제는 'played'를 사용해야 해요!",
                alternatives: ["I had fun with my friend.", "I spent time with my best friend."]
              },
              {
                original: "We have fun time.",
                corrected: "We had a fun time.",
                explanation: "'have'의 과거형은 'had'이고, 'a fun time'이 더 자연스러워요!",
                alternatives: ["We enjoyed ourselves.", "We had a great time.", "We had so much fun together."]
              }
            ],
            extractedWords: [
              { word: "park", meaning: "공원", level: "초급", example: "I went to the park yesterday." },
              { word: "friend", meaning: "친구", level: "초급", example: "I played with my friend." },
              { word: "fun", meaning: "재미있는", level: "초급", example: "We had a fun time." }
            ]
          };
        
        case "Lv.4":
          // Lv.4: 표현력 향상 피드백
          return {
            originalText: baseText,
            correctedText: baseCorrected,
            feedback: `자유롭게 긴 문장을 쓰고 있어요! 표현력이 좋아지고 있네요. 더 다양한 단어와 표현을 사용해보면 더 풍부한 일기가 될 거예요. 예를 들어 "enjoyable", "wonderful" 같은 단어도 써볼까요?`,
            encouragement: "표현력이 뛰어나요! 다양한 단어와 표현을 사용해서 더 멋진 일기를 써보세요! 🎨",
            sentenceExpansion: "공원에서 친구랑 구체적으로 어떤 놀이를 했어? 가장 기억에 남는 순간은 뭐였어? 주변 환경이나 날씨는 어땠어?",
            expansionExample: "Today I went to the local park with my best friend. We spent the afternoon playing on the swings and challenging each other on the monkey bars. The weather was perfect - sunny with a gentle breeze. We laughed so much that my stomach hurt! I felt incredibly happy because I got to spend quality time with my friend. It was definitely one of the most enjoyable days I've had in a while.",
            cheerUp: "이미 훌륭한 표현력을 가지고 있어요! 다음엔 더 다양한 형용사와 부사를 사용해서 장면을 생생하게 묘사해보면 어떨까요? 계속 도전해봐요! 🎨",
            corrections: [
              {
                original: "go",
                corrected: "went",
                explanation: "과거에 일어난 일이므로 'go'의 과거형 'went'를 사용해요."
              },
              {
                original: "play",
                corrected: "played",
                explanation: "'play'의 과거형은 'played'예요."
              },
              {
                original: "have",
                corrected: "had",
                explanation: "'have'의 과거형은 'had'예요. 과거 시제를 맞춰줘야 해요."
              },
              {
                original: "fun time",
                corrected: "a fun time",
                explanation: "셀 수 있는 명사 앞에는 'a'를 붙여주면 더 자연스러워요."
              }
            ],
            sentenceByStence: [
              {
                original: "Today I go to park.",
                corrected: "Today I went to the park.",
                explanation: "과거 시제는 'went'를 사용하고, 정관사 'the'를 써야 해요!",
                alternatives: ["Today I visited the local park.", "Today I went to our neighborhood park."]
              },
              {
                original: "I play with my friend.",
                corrected: "I played with my friend.",
                explanation: "과거 시제는 'played'를 사용해야 해요!",
                alternatives: ["I enjoyed time with my friend.", "I spent quality time with my best friend."]
              },
              {
                original: "We have fun time.",
                corrected: "We had a fun time.",
                explanation: "'have'의 과거형은 'had'이고, 부정관사 'a'가 필요해요!",
                alternatives: ["We enjoyed ourselves thoroughly.", "We had an amazing time.", "We had so much fun together."]
              }
            ],
            extractedWords: [
              { word: "park", meaning: "공원", level: "중급", example: "I went to the beautiful park yesterday." },
              { word: "friend", meaning: "친구", level: "중급", example: "I played with my best friend." },
              { word: "fun", meaning: "재미있는", level: "중급", example: "We had a really fun time together." }
            ]
          };
        
        case "Lv.5":
          // Lv.5: 피드백 위주, 교정 최소화
          return {
            originalText: baseText,
            correctedText: baseCorrected,
            feedback: `일기를 잘 쓰고 있어요! 문법적으로 거의 완벽하고, 표현도 자연스러워요. 앞으로는 더 창의적인 표현이나 복잡한 문장 구조를 시도해보면 어떨까요? 예를 들어 복합문이나 관계절을 사용해볼 수 있어요.`,
            encouragement: "이미 훌륭한 영어 실력을 가지고 있어요! 더 도전적인 표현을 시도해보세요! 🚀",
            sentenceExpansion: "공원에서 친구와 함께한 경험을 더 깊이 있게 표현해볼 수 있을까요? 그 순간의 감각적인 묘사나 내면의 생각을 추가해보면 어떨까요?",
            expansionExample: "Today I visited the neighborhood park with my closest friend, which turned out to be an incredibly memorable experience. We spent hours on the swings, trying to see who could go higher, and challenged ourselves on the monkey bars. The afternoon was perfect - the sun was shining brightly, and a cool breeze kept us comfortable. What made it truly special was not just the activities, but the deep conversations we had and the laughter we shared. I felt genuinely happy and grateful for having such a wonderful friend in my life. These simple moments, I realized, are what make childhood so precious.",
            cheerUp: "이미 높은 수준의 영어 실력을 보여주고 있어요! 다음엔 메타포, 관용구, 또는 더 복잡한 문장 구조를 사용해서 문학적인 표현을 시도해보는 건 어떨까요? 계속해서 자신만의 스타일을 발전시켜 나가세요! 🚀",
            corrections: [
              {
                original: "fun time",
                corrected: "a fun time",
                explanation: "셀 수 있는 명사 앞에는 'a'를 붙여주면 더 자연스러워요."
              }
            ],
            sentenceByStence: [
              {
                original: "Today I go to park.",
                corrected: "Today I went to the park.",
                explanation: "과거 시제와 정관사를 정확히 사용하세요!",
                alternatives: ["Today I visited the neighborhood park.", "Today I went to the local park.", "I spent the day at the park."]
              },
              {
                original: "I play with my friend.",
                corrected: "I played with my friend.",
                explanation: "과거 시제를 일관되게 유지하세요!",
                alternatives: ["I spent quality time with my friend.", "I enjoyed my friend's company.", "I had a wonderful time with my closest friend."]
              },
              {
                original: "We have fun time.",
                corrected: "We had a fun time.",
                explanation: "부정관사와 과거 시제를 함께 사용하세요!",
                alternatives: ["We thoroughly enjoyed ourselves.", "We had an amazing time together.", "We shared wonderful moments.", "The experience was incredibly enjoyable."]
              }
            ],
            extractedWords: [
              { word: "park", meaning: "공원", level: "고급", example: "I visited the park where we used to play." },
              { word: "friend", meaning: "친구", level: "고급", example: "My friend, who lives nearby, joined me." },
              { word: "fun", meaning: "재미있는", level: "고급", example: "We had an absolutely fun time together." }
            ]
          };
        
        default:
          return {
            originalText: baseText,
            correctedText: baseCorrected,
            feedback: `정말 잘 썼어요! ${age}살이면 이렇게 긴 문장을 쓰는 것이 대단해요. 과거 시제를 사용하는 연습을 조금 더 하면 완벽할 거예요!`,
            encouragement: "멋진 일기예요! 계속 쓰다보면 영어 실력이 쑥쑥 늘 거예요! 💪",
            sentenceExpansion: "공원에서 뭐했어? 누구랑 갔어? 재밌었어?",
            expansionExample: "Today I went to the park. I played with my friend. We played on the swings. We had a fun time. I was happy!",
            cheerUp: "잘하고 있어요! 다음에는 더 자세히 써보면 좋을 것 같아요. 화이팅! 💪",
            corrections: [
              {
                original: "go",
                corrected: "went",
                explanation: "과거에 일어난 일이므로 'go'의 과거형 'went'를 사용해요."
              }
            ],
            sentenceByStence: [
              {
                original: "Today I go to park.",
                corrected: "Today I went to the park.",
                explanation: "과거 시제는 'went'를 사용하고, 'to the park'라고 써야 해요!",
                alternatives: ["Today I visited the park.", "Today I went to a park."]
              },
              {
                original: "I play with my friend.",
                corrected: "I played with my friend.",
                explanation: "과거 시제는 'played'를 사용해야 해요!",
                alternatives: ["I had fun with my friend.", "I spent time with my friend."]
              },
              {
                original: "We have fun time.",
                corrected: "We had a fun time.",
                explanation: "'have'의 과거형은 'had'이고, 'a fun time'이 더 자연스러워요!",
                alternatives: ["We enjoyed ourselves.", "We had a great time."]
              }
            ],
            extractedWords: [
              { word: "park", meaning: "공원", level: "초급", example: "I went to the park." },
              { word: "friend", meaning: "친구", level: "초급", example: "My friend is nice." },
              { word: "fun", meaning: "재미있는", level: "초급", example: "We had fun!" }
            ]
          };
      }
    };

    // Mock 응답 반환 (API 키가 없거나 실패한 경우)
    const mockResponse = {
      success: true,
      data: {
        ...getLevelBasedResponse(diaryLevel),
        originalText: originalText || getLevelBasedResponse(diaryLevel).originalText,
        // API 키 상태 정보 추가
        apiStatus: {
          openai: apiKeys.openai ? "configured" : "not_configured",
          googleVision: apiKeys.googleVision ? "configured" : "not_configured",
        },
      },
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error("Error processing diary:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

