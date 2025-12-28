import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { 
  getStyleGuide, 
  getDefaultStyleGuide, 
  styleGuideToPrompt,
  validateScript,
  type GradeBand,
  type CefrLevel
} from "@/lib/styleGuides";

/**
 * POST /api/writingladder/submissions/{submission_id}/script
 * 
 * Writing Ladder Script Coach API
 * - Writing Ladder Level 0에 맞는 엄격한 문장 제약 적용
 * - LOW/A1: 2-3문장, 최대 6단어/문장
 * - MID/A1: 3-4문장, 최대 8단어/문장
 * - HIGH/A2: 3-4문장, 최대 10단어/문장
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

    console.log("=== Writing Ladder Script Coach 요청 ===");
    console.log("📝 Submission ID:", submission_id);

    // Submission 존재 확인
    const submissionRef = doc(db, "writingladder_writing_submissions", submission_id);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const submission = submissionDoc.data();
    console.log("✅ Submission 찾음:", submission.submission_id);
    
    // ===================================
    // 📐 스타일 가이드 로드
    // ===================================
    const { course_id, grade_band, cefr_level } = submission;
    
    // Writing Ladder는 항상 "writing_ladder" 타입
    let styleGuide = getStyleGuide(
      grade_band as GradeBand,
      cefr_level as CefrLevel,
      "writing_ladder"
    );
    
    // 폴백: 스타일 가이드가 없으면 기본값 사용
    if (!styleGuide) {
      console.log(`⚠️ 스타일 가이드 없음 (${grade_band}/${cefr_level}/writing_ladder), 기본값 사용`);
      styleGuide = getDefaultStyleGuide("writing_ladder");
    }
    
    console.log(`📐 스타일 가이드 적용: ${styleGuide.grade_band}/${styleGuide.cefr_level}/${styleGuide.course_type}`);
    console.log(`   30초: ${styleGuide.duration_30s.min_sentences}-${styleGuide.duration_30s.max_sentences}문장, 최대 ${styleGuide.duration_30s.max_words_per_sentence}단어/문장`);
    console.log(`   60초: ${styleGuide.duration_60s?.enabled ? `${styleGuide.duration_60s.min_sentences}-${styleGuide.duration_60s.max_sentences}문장` : "비활성"}`);

    // ===================================
    // 🤖 AI Script Coach with Style Guide
    // ===================================
    const { script_30s, script_60s, keywords, simplified_sentences } = 
      await generateScriptWithAI(
        submission.cleaned_text,
        styleGuide,
        submission.child_id
      );

    // ===================================
    // ✅ 생성된 스크립트 검증
    // ===================================
    const validation30s = validateScript(script_30s, styleGuide, 30);
    if (!validation30s.valid) {
      console.error("❌ 30초 스크립트 검증 실패:", validation30s.errors);
      // 실제로는 재생성 시도하거나 강제 수정
    }
    
    if (validation30s.warnings.length > 0) {
      console.warn("⚠️ 30초 스크립트 경고:", validation30s.warnings);
    }
    
    if (script_60s && styleGuide.duration_60s?.enabled) {
      const validation60s = validateScript(script_60s, styleGuide, 60);
      if (!validation60s.valid) {
        console.error("❌ 60초 스크립트 검증 실패:", validation60s.errors);
      }
    }

    // ===================================
    // 🤖 AI로 Shadowing 핵심 3문장 선택
    // GPT-3.5-turbo 사용
    // ===================================
    const shadowingSentences = await selectShadowingSentencesWithAI(script_30s);

    // Script ID 생성
    const script_id = `script_${submission_id}_${Date.now()}`;
    
    // Script structure 생성
    const script_30s_sentences = script_30s.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const structure = {
      intro: script_30s_sentences[0] ? script_30s_sentences[0].trim() + "." : "",
      body: script_30s_sentences.slice(1, -1).map((s) => s.trim()).join(". ") + (script_30s_sentences.length > 2 ? "." : ""),
      conclusion: script_30s_sentences[script_30s_sentences.length - 1] ? script_30s_sentences[script_30s_sentences.length - 1].trim() + "." : "Thank you!",
    };

    // Script 데이터
    const script = {
      script_id,
      submission_id,
      script_30s,
      script_60s,
      keywords,
      simplified_sentences,
      shadowing_sentences: shadowingSentences, // AI 선택 3문장 추가
      structure,
      estimated_duration_seconds: 30,
      created_at: new Date().toISOString(),
    };

    // Firestore에 저장
    await setDoc(doc(db, "writingladder_scripts", script_id), script);

    console.log(`✅ Script 저장 완료: ${script_id}`);
    console.log(`📊 30초 대본: ${script.script_30s.length} 글자`);
    console.log(`📊 60초 대본: ${script.script_60s?.length || 0} 글자`);
    console.log(`🔑 Keywords: ${keywords.join(", ")}`);
    console.log(`🎯 Shadowing 핵심 3문장 (AI 선택):`, shadowingSentences);
    
    // 진행 상태 업데이트
    await updateWeekProgress(submission.child_id, submission.week, {
      day2_script_id: script_id,
    });

    return NextResponse.json({
      success: true,
      data: {
        script_id,
        script_30s: script.script_30s,
        script_60s: script.script_60s,
        keywords: script.keywords,
        simplified_sentences: script.simplified_sentences,
        shadowing_sentences: script.shadowing_sentences, // 추가
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Script 생성 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate script" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/writingladder/submissions/{submission_id}/script
 * 
 * Script 조회 (submission_id로)
 */
export async function GET(
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

    // Submission 존재 확인
    const submissionRef = doc(db, "writingladder_writing_submissions", submission_id);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    // Week progress에서 script_id 가져오기
    const submission = submissionDoc.data();
    const progress_id = `progress_${submission.child_id}_week${submission.week}`;
    const progressRef = doc(db, "writingladder_week_progress", progress_id);
    const progressDoc = await getDoc(progressRef);

    if (!progressDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Progress not found" },
        { status: 404 }
      );
    }

    const progress = progressDoc.data();
    const script_id = progress.day2_script_id;

    if (!script_id) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    const scriptRef = doc(db, "writingladder_scripts", script_id);
    const scriptDoc = await getDoc(scriptRef);

    if (!scriptDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    const script = scriptDoc.data();

    return NextResponse.json({
      success: true,
      data: script,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Script 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch script" },
      { status: 500 }
    );
  }
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
  const progressRef = doc(db, "writingladder_week_progress", progress_id);
  
  try {
    await updateDoc(progressRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("⚠️ Week Progress 업데이트 실패:", error);
  }
}

/**
 * 🤖 AI Script Coach - 스타일 가이드 기반 스크립트 생성
 */
async function generateScriptWithAI(
  cleaned_text: string,
  styleGuide: import("@/lib/styleGuides").StyleGuideRule,
  child_id: string
): Promise<{
  script_30s: string;
  script_60s: string | undefined;
  keywords: string[];
  simplified_sentences: string[];
}> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    
    // OpenAI API 키가 없으면 Mock 데이터 사용
    if (!openaiKey) {
      console.warn("⚠️ OPENAI_API_KEY 없음 - Mock 데이터 사용");
      return getMockScript(cleaned_text, styleGuide);
    }
    
    // 스타일 가이드를 프롬프트로 변환
    const stylePrompt = styleGuideToPrompt(styleGuide);
    
    console.log("🤖 GPT-4로 스크립트 생성 중...");
    console.log("📐 스타일 가이드:\n", stylePrompt);
    
    // GPT-4로 스크립트 생성
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert Script Coach for children's English presentations.

Your task: Convert the child's writing into a clear, speakable script following STRICT style guidelines.

**CRITICAL RULES:**
${stylePrompt}

**Your Response Format (JSON):**
{
  "script_30s": "2-4 sentences for 30-second presentation",
  "script_60s": "5-8 sentences for 60-second presentation (or empty if disabled)",
  "keywords": ["key1", "key2", "key3"],
  "simplified_sentences": [
    "complex expression → simpler version",
    "another example → easier way"
  ]
}

**DO NOT:**
- Exceed sentence count limits
- Exceed word-per-sentence limits
- Use forbidden words
- Add complex grammar beyond allowed level`
          },
          {
            role: "user",
            content: `Convert this child's writing into a script following the style guide:

${cleaned_text}

Remember:
- 30s script: ${styleGuide.duration_30s.min_sentences}-${styleGuide.duration_30s.max_sentences} sentences, max ${styleGuide.duration_30s.max_words_per_sentence} words/sentence
- 60s script: ${styleGuide.duration_60s?.enabled ? `${styleGuide.duration_60s.min_sentences}-${styleGuide.duration_60s.max_sentences} sentences` : "DISABLED (leave empty)"}
- Connectors: ${styleGuide.duration_30s.allowed_connectors.join(", ")}
${styleGuide.duration_30s.required_connectors && styleGuide.duration_30s.required_connectors.length > 0 ? `- MUST use: ${styleGuide.duration_30s.required_connectors.join(", ")}` : ""}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
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
    
    console.log("✅ AI 스크립트 생성 완료");
    console.log(`   30초: ${result.script_30s}`);
    console.log(`   60초: ${result.script_60s || "(비활성)"}`);
    
    return {
      script_30s: result.script_30s,
      script_60s: result.script_60s || undefined,
      keywords: result.keywords || ["key1", "key2", "key3"],
      simplified_sentences: result.simplified_sentences || [],
    };
    
  } catch (error) {
    console.error("⚠️ OpenAI API 오류, Mock 데이터 사용:", error);
    return getMockScript(cleaned_text, styleGuide);
  }
}

/**
 * Mock 스크립트 생성 (API 키 없을 때)
 */
function getMockScript(
  cleaned_text: string,
  styleGuide: import("@/lib/styleGuides").StyleGuideRule
): {
  script_30s: string;
  script_60s: string | undefined;
  keywords: string[];
  simplified_sentences: string[];
} {
  // 원문을 문장 단위로 분리
  const sentences = cleaned_text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());
  
  // 30초 스크립트
  const maxSentences30s = styleGuide.duration_30s.max_sentences;
  const script_30s_sentences = sentences.slice(0, Math.min(maxSentences30s, sentences.length));
  const script_30s = script_30s_sentences.join(". ") + ".";
  
  // 60초 스크립트
  let script_60s: string | undefined;
  if (styleGuide.duration_60s?.enabled) {
    const maxSentences60s = styleGuide.duration_60s.max_sentences || 8;
    const script_60s_sentences = sentences.slice(0, Math.min(maxSentences60s, sentences.length));
    script_60s = script_60s_sentences.join(". ") + ".";
  }
  
  // Keywords (간단히 첫 3단어 추출)
  const words = cleaned_text.toLowerCase().match(/\b\w+\b/g) || [];
  const keywords = words.slice(0, 3);
  
  return {
    script_30s,
    script_60s,
    keywords,
    simplified_sentences: [
      "very excited → happy",
      "really like → like",
    ],
  };
}

/**
 * 🤖 AI로 Shadowing 핵심 3문장 선택
 * GPT-3.5-turbo 사용 (저렴하고 빠름)
 */
async function selectShadowingSentencesWithAI(script_30s: string): Promise<string[]> {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;

    // OpenAI API 키가 없으면 기본 방식으로 fallback
    if (!openaiKey) {
      console.warn("⚠️ OPENAI_API_KEY 없음 - 기본 방식으로 3문장 선택");
      const allSentences = script_30s
        .split(/[.!?]+/)
        .filter((s: string) => s.trim().length > 0)
        .map((s: string) => s.trim() + ".");
      return allSentences.slice(0, 3);
    }

    // 모든 문장 추출
    const allSentences = script_30s
      .split(/[.!?]+/)
      .filter((s: string) => s.trim().length > 0)
      .map((s: string) => s.trim() + ".");

    // 문장이 3개 이하면 그대로 반환
    if (allSentences.length <= 3) {
      console.log("📝 문장이 3개 이하라 전체 반환");
      return allSentences;
    }

    console.log("🤖 GPT-3.5로 핵심 3문장 선택 중...");

    // GPT-3.5-turbo로 핵심 문장 선택
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `당신은 영어 Shadowing(따라말하기) 교육 전문가입니다.
주어진 발표문에서 어린이(초등학생)가 연습하기에 가장 적합한 3개 문장을 선택해주세요.

선택 기준:
1. 주제의 핵심 내용을 담은 문장
2. 발음 연습에 도움이 되는 문장 (다양한 소리 포함)
3. 문법적으로 학습 가치가 높은 문장
4. 길이가 적절한 문장 (너무 짧거나 길지 않게)
5. 전체 구조가 균형있게 (Intro, Body, Conclusion 고려)

반드시 정확히 3개 문장만 선택하고, 원문 그대로 반환해주세요.
JSON 형식으로 반환: {"sentences": ["문장1", "문장2", "문장3"]}`
          },
          {
            role: "user",
            content: `다음 발표문에서 Shadowing 연습용 핵심 3문장을 선택해주세요:\n\n${script_30s}\n\n가능한 문장 목록:\n${allSentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
          }
        ],
        temperature: 0.3, // 일관성을 위해 낮게 설정
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("GPT 응답 없음");
    }

    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("JSON 형식이 아님");
    }

    const result = JSON.parse(jsonMatch[0]);
    const selectedSentences = result.sentences as string[];

    // 검증: 3개 문장이 맞는지
    if (!Array.isArray(selectedSentences) || selectedSentences.length !== 3) {
      console.warn("⚠️ AI가 3개가 아닌 문장 반환, 첫 3개로 대체");
      return allSentences.slice(0, 3);
    }

    console.log("✅ AI 선택 완료:", selectedSentences);
    return selectedSentences;

  } catch (error) {
    console.error("⚠️ Shadowing 문장 선택 실패, 기본 방식으로 fallback:", error);
    const allSentences = script_30s
      .split(/[.!?]+/)
      .filter((s: string) => s.trim().length > 0)
      .map((s: string) => s.trim() + ".");
    return allSentences.slice(0, 3);
  }
}


