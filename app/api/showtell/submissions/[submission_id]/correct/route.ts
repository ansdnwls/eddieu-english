import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { CorrectionResult, CorrectionUpgrade } from "@/app/types/showtell";

/**
 * Day 1: Correction API (교정 1-2개 룰 강제)
 * 
 * POST /api/showtell/submissions/[submission_id]/correct
 * - AI가 최소한의 교정만 수행 (1-2개 중요한 것만)
 * - 과도하게 빨갛게 바뀌지 않도록 제한
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ submission_id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { submission_id } = await context.params;
    
    // Request body에서 correction_level 가져오기 (기본값: minimal)
    const body = await request.json().catch(() => ({}));
    const correction_level: "minimal" | "detailed" = body.correction_level || "minimal";
    
    console.log("🔧 교정 시작:", { submission_id, correction_level });

    // Submission 존재 확인 및 로드
    const submissionRef = doc(db, "showtell_writing_submissions", submission_id);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const submissionData = submissionDoc.data();
    const { cleaned_text, child_id, week } = submissionData;

    console.log("📝 원본 텍스트:", cleaned_text.substring(0, 100) + "...");
    
    // 아이 정보 가져오기 (나이/레벨)
    const childAge = await getChildAge(child_id);
    console.log("👶 아이 나이:", childAge, "세");

    // OpenAI GPT-4로 교정 (레벨별 + 교정 수준별)
    const correction = await correctTextWithAI(
      cleaned_text, 
      week, 
      childAge, 
      correction_level
    );

    // Correction ID 생성
    const correction_id = `corr_${submission_id}_${Date.now()}`;

    // Correction Result 데이터
    const correctionResult: CorrectionResult = {
      correction_id,
      submission_id,
      minimal_fix_text: correction.minimal_fix_text,
      native_rewrite_text: correction.native_rewrite_text,
      upgrades: correction.upgrades,
      overall_feedback: correction.overall_feedback,
      encouragement: correction.encouragement,
      created_at: new Date().toISOString(),
    };

    // Firestore에 저장
    await setDoc(doc(db, "showtell_corrections", correction_id), correctionResult);

    console.log(`✅ 교정 완료: ${correction.upgrades.length}개 수정`);

    // 진행 상태 업데이트 (day1_completed)
    await updateWeekProgress(child_id, week, {
      day1_correction_id: correction_id,
      day1_completed: true,
      current_day: 2, // Day 2로 이동 가능
    });

    return NextResponse.json({
      success: true,
      data: {
        ...correctionResult,
        max_corrections_applied: correction.upgrades.length,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 교정 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to correct text" },
      { status: 500 }
    );
  }
}

/**
 * AI 교정 함수 (레벨별 + 교정 수준별)
 * @param text 원본 텍스트
 * @param week 주차 (1-12)
 * @param childAge 아이 나이 (6-13)
 * @param correction_level 교정 수준 (minimal: 1-2개, detailed: 상세)
 */
async function correctTextWithAI(
  text: string, 
  week: number, 
  childAge: number,
  correction_level: "minimal" | "detailed"
): Promise<{
  minimal_fix_text: string;
  native_rewrite_text: string;
  upgrades: CorrectionUpgrade[];
  overall_feedback: string;
  encouragement: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.startsWith("sk-your")) {
    console.warn("⚠️ OpenAI API 키가 없습니다. Mock 데이터 반환");
    return getMockCorrection(text, childAge, correction_level);
  }

  // 나이에 따른 권장 단어 수준
  const vocabularyLevel = childAge <= 8 ? "very simple words (Grade 1-2 level)" :
                          childAge <= 10 ? "simple words (Grade 3-4 level)" :
                          "elementary-level words (Grade 5-6 level)";
  
  // 교정 수준에 따른 지침
  const correctionGuidelines = correction_level === "minimal" 
    ? `
**MINIMAL Correction Mode (1-2 fixes only):**
1. Fix ONLY critical grammar or spelling errors (maximum 2)
2. Keep ALL vocabulary as simple as possible
3. Do NOT suggest complex words
4. Preserve the child's original expression completely
5. Only fix errors, do NOT enhance style

Example of what NOT to do:
- ❌ "very fun" → "incredibly fun" (too advanced!)
- ❌ "I feel happy" → "I feel delighted" (too complex!)
- ✅ "I like play" → "I like to play" (grammar fix OK)
- ✅ "It are fun" → "It is fun" (grammar fix OK)
`
    : `
**DETAILED Correction Mode (comprehensive feedback):**
1. Provide 3-5 corrections covering different aspects
2. Include grammar, vocabulary, and structure improvements
3. Still use ${vocabularyLevel} - do NOT use advanced vocabulary
4. Provide helpful explanations in Korean for each correction
5. Balance between corrections and encouragement

Focus areas:
- Grammar errors
- Sentence structure
- More natural expressions (still keeping it simple!)
- Punctuation and capitalization
- Basic vocabulary improvements (simple → simple but better)
`;

  try {
    const prompt = `You are a gentle English teacher for a ${childAge}-year-old child (초등학교 ${childAge <= 7 ? '1-2학년' : childAge <= 9 ? '3-4학년' : '5-6학년'}). 

${correctionGuidelines}

**Vocabulary Level Rules:**
- Use ONLY ${vocabularyLevel}
- NEVER use words like: incredibly, extremely, delighted, magnificent, etc.
- ALWAYS use simple words: very, really, happy, fun, nice, good, etc.

**Examples of appropriate corrections:**
✅ "very fun" → "really fun" or "so fun" (simple words only!)
✅ "I feel happy" → "I feel very happy" or "I feel so happy"
✅ "It is good" → "It is really good" or "It is very nice"

❌ DO NOT use: incredibly, extremely, absolutely, tremendously, magnificent, delightful, etc.

Original Text:
"${text}"

Please provide corrections in this exact JSON format:
{
  "minimal_fix_text": "text with ${correction_level === 'minimal' ? '1-2 minimal fixes only, using SIMPLE words' : 'grammar and structure fixes, keeping simple vocabulary'}",
  "native_rewrite_text": "natural rewrite, still using ${vocabularyLevel}",
  "upgrades": [
    {
      "original": "exact phrase from original",
      "suggestion": "corrected phrase using SIMPLE words only",
      "category": "grammar|vocabulary|structure|style",
      "explanation": "simple explanation in Korean for ${childAge}-year-old",
      "example": "simple example sentence using basic vocabulary"
    }
  ],
  "overall_feedback": "positive feedback in Korean, encouraging tone",
  "encouragement": "encouraging message in Korean"
}

${correction_level === 'minimal' ? 'Remember: MAXIMUM 1-2 corrections! Focus on critical errors only.' : 'Provide 3-5 helpful corrections, but keep vocabulary simple for a ' + childAge + '-year-old child!'}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a gentle English teacher for ${childAge}-year-old children. Use ONLY simple, age-appropriate vocabulary (${vocabularyLevel}). ${correction_level === 'minimal' ? 'Make MINIMAL corrections (1-2 only)' : 'Provide detailed but encouraging feedback (3-5 corrections)'}.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: correction_level === "minimal" ? 1000 : 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // JSON 추출
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const result = JSON.parse(jsonMatch[0]);

    // 교정 수준별 제한
    if (correction_level === "minimal" && result.upgrades.length > 2) {
      result.upgrades = result.upgrades.slice(0, 2);
      console.log("⚠️ Minimal 모드: 최대 2개로 제한");
    } else if (correction_level === "detailed" && result.upgrades.length > 5) {
      result.upgrades = result.upgrades.slice(0, 5);
      console.log("⚠️ Detailed 모드: 최대 5개로 제한");
    }

    console.log(`✅ AI 교정 완료 (${correction_level}): ${result.upgrades.length}개 수정`);

    return result;

  } catch (error) {
    console.error("⚠️ OpenAI API 오류, Mock 데이터 사용:", error);
    return getMockCorrection(text, childAge, correction_level);
  }
}

/**
 * Mock 교정 데이터 (API 키 없을 때)
 */
function getMockCorrection(
  text: string,
  childAge: number,
  correction_level: "minimal" | "detailed"
): {
  minimal_fix_text: string;
  native_rewrite_text: string;
  upgrades: CorrectionUpgrade[];
  overall_feedback: string;
  encouragement: string;
} {
  // 레벨별 간단한 교정 시뮬레이션
  const minimal_fix_text = text
    .replace("I like play", "I like to play")
    .replace("It are", "It is");
  
  const native_rewrite_text = text
    .replace("I like play", "I like to play")
    .replace("very fun", "really fun")
    .replace("It are", "It is");

  // Minimal vs Detailed 모드
  const upgradesMinimal: CorrectionUpgrade[] = [
    {
      original: "I like play",
      suggestion: "I like to play",
      category: "grammar",
      explanation: "동사 뒤에는 'to'를 붙여요",
      example: "I like to swim. I like to read."
    }
  ];

  const upgradesDetailed: CorrectionUpgrade[] = [
    {
      original: "I like play",
      suggestion: "I like to play",
      category: "grammar",
      explanation: "동사 뒤에는 'to'를 붙여서 '~하는 것을 좋아한다'고 표현해요",
      example: "I like to swim. I like to read books."
    },
    {
      original: "very fun",
      suggestion: "really fun",
      category: "vocabulary",
      explanation: "'really'가 더 자연스러운 표현이에요",
      example: "It is really fun. The game is really exciting."
    },
    {
      original: "It is fun",
      suggestion: "It's fun",
      category: "structure",
      explanation: "말할 때는 줄여서 'It's'라고 하는 게 더 자연스러워요",
      example: "It's fun. It's nice. It's cool."
    }
  ];

  return {
    minimal_fix_text,
    native_rewrite_text,
    upgrades: correction_level === "minimal" ? upgradesMinimal : upgradesDetailed,
    overall_feedback: childAge <= 8 
      ? "정말 잘 썼어요! 재미있는 이야기네요. 😊" 
      : "와! 멋진 글이에요! 더 자세하게 잘 표현했어요. 👍",
    encouragement: childAge <= 8
      ? "계속 이렇게 연습하면 영어가 더 좋아질 거예요! 화이팅! 💪"
      : "계속 열심히 하면 영어를 정말 잘하게 될 거예요! 멋져요! 🌟"
  };
}

/**
 * 아이 나이 가져오기 (Firestore에서)
 */
async function getChildAge(child_id: string): Promise<number> {
  if (!db) return 8; // 기본값

  try {
    const childRef = doc(db, "children", child_id);
    const childDoc = await getDoc(childRef);
    
    if (childDoc.exists()) {
      const age = childDoc.data().age;
      return age || 8;
    }
  } catch (error) {
    console.error("⚠️ 아이 나이 조회 실패:", error);
  }
  
  return 8; // 기본값 (초2)
}

/**
 * 주차별 진행 상태 업데이트 헬퍼 함수
 */
async function updateWeekProgress(
  child_id: string,
  week: number,
  updates: Record<string, unknown>
): Promise<void> {
  if (!db) return;

  const progress_id = `progress_${child_id}_week${week}`;
  const progressRef = doc(db, "showtell_week_progress", progress_id);
  
  try {
    await updateDoc(progressRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("⚠️ Week Progress 업데이트 실패:", error);
  }
}

