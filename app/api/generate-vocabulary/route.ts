import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ExtractedWord, EnglishLevel } from "@/app/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { words, englishLevel, userId, childAge } = body;

    console.log("=== AI 단어장 생성 API 호출 ===");
    console.log("words:", words?.length);
    console.log("englishLevel:", englishLevel);
    console.log("userId:", userId);
    console.log("childAge:", childAge);

    if (!words || words.length === 0) {
      return NextResponse.json(
        { success: false, error: "단어가 없습니다." },
        { status: 400 }
      );
    }

    if (!englishLevel) {
      return NextResponse.json(
        { success: false, error: "영어 레벨이 필요합니다." },
        { status: 400 }
      );
    }

    // Firestore에서 OpenAI API 키 가져오기
    let openaiApiKey = process.env.OPENAI_API_KEY;

    if (db && (!openaiApiKey || openaiApiKey === "your_openai_api_key_here")) {
      try {
        const apiKeysDoc = await getDoc(doc(db, "settings", "apiKeys"));
        if (apiKeysDoc.exists()) {
          openaiApiKey = apiKeysDoc.data().openaiApiKey;
          console.log("✅ Firestore에서 OpenAI API 키 로드 완료");
        }
      } catch (error) {
        console.error("Firestore API 키 로드 실패:", error);
      }
    }

    if (!openaiApiKey || openaiApiKey === "your_openai_api_key_here") {
      console.error("❌ OpenAI API 키가 설정되지 않았습니다");
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.",
        },
        { status: 500 }
      );
    }

    // 레벨별 목표 단어 수
    const targetCountMap: Record<EnglishLevel, number> = {
      "Lv.1": 6,
      "Lv.2": 9,
      "Lv.3": 12,
      "Lv.4": 15,
      "Lv.5": 18,
    };

    const targetCount = targetCountMap[englishLevel] || 10;

    // 레벨별 설명
    const levelDescriptionMap: Record<EnglishLevel, string> = {
      "Lv.1": "영어 일기 처음 써봐요 (단어 몇 개로 쓰기 시작)",
      "Lv.2": "간단한 문장으로 일기 써요 (기본 주어 동사 사용)",
      "Lv.3": "여러 문장으로 감정/이유도 쓰려고 해요",
      "Lv.4": "자유롭게 길게 쓰기도 해요 (자기 표현 가능)",
      "Lv.5": "유창해요 (첨삭보단 피드백 위주로 받고 싶어요)",
    };

    const levelDescription = levelDescriptionMap[englishLevel];

    // 단어 목록 문자열 생성
    const wordList = words
      .map((w: ExtractedWord) => `"${w.word}"`)
      .join(", ");

    // GPT 프롬프트
    const prompt = `당신은 ${childAge}살 아이의 영어 학습을 돕는 교육 전문가입니다.

아이의 영어 수준: ${englishLevel} (${levelDescription})

다음 단어들 중에서 아이의 수준에 맞는 ${targetCount}개의 단어를 선택하고, 각 단어마다 다음 정보를 제공해주세요:
${wordList}

**중요한 규칙:**
1. 아이의 레벨 (${englishLevel})에 맞는 단어를 선택하세요
2. Lv.1-2는 짧고 쉬운 단어 우선, Lv.4-5는 긴 단어도 포함
3. 각 단어마다 반드시 다음 정보를 포함:
   - word: 단어
   - meaning: 한글 뜻 (간단 명료하게)
   - example: 아이 수준에 맞는 영어 예문 (짧고 쉽게)
   - synonym: 유의어 1개 (영어로, 아이가 알기 쉬운 단어)
   - antonym: 반의어 1개 (영어로, 있으면 제공)
   - tip: 학습 팁 또는 기억법 (한글로, 아이가 이해하기 쉽게)

**응답 형식 (JSON):**
{
  "words": [
    {
      "word": "happy",
      "meaning": "행복한, 기쁜",
      "example": "I am happy today.",
      "synonym": "glad",
      "antonym": "sad",
      "tip": "happy는 기쁠 때 쓰는 단어예요. 'h'로 시작하는 행복을 기억하세요!"
    }
  ]
}

정확히 ${targetCount}개의 단어를 선택하여 위 형식으로 응답하세요.`;

    console.log("GPT API 호출 중...");

    // OpenAI API 호출
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "당신은 어린이 영어 교육 전문가입니다. 아이의 수준에 맞는 단어 학습자료를 생성합니다. 항상 JSON 형식으로 응답하세요.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!gptResponse.ok) {
      const errorData = await gptResponse.text();
      console.error("GPT API 오류:", errorData);
      return NextResponse.json(
        {
          success: false,
          error: `OpenAI API 오류: ${gptResponse.status} ${gptResponse.statusText}`,
        },
        { status: 500 }
      );
    }

    const gptData = await gptResponse.json();
    console.log("GPT API 응답 완료");

    const content = gptData.choices[0].message.content;
    console.log("GPT 응답 내용:", content);

    // JSON 파싱
    let parsedContent;
    try {
      // JSON 코드 블록 제거 (```json ... ```)
      const cleanedContent = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      parsedContent = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("JSON 파싱 오류:", parseError);
      console.log("파싱 시도한 내용:", content);
      return NextResponse.json(
        {
          success: false,
          error: "AI 응답 파싱에 실패했습니다.",
        },
        { status: 500 }
      );
    }

    const enhancedWords = parsedContent.words || [];
    console.log(`✅ ${enhancedWords.length}개의 단어 생성 완료`);

    return NextResponse.json({
      success: true,
      words: enhancedWords,
    });
  } catch (error: any) {
    console.error("AI 단어장 생성 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "단어장 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
