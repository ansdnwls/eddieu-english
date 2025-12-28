import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { validateWithRubric, type GradeBand, type CefrLevel } from "@/lib/rubricValidator";

/**
 * Day 1: Writing Ladder Writing Submission API
 * 
 * POST /api/writingladder/submissions/writing
 * - Writing Ladder Level 0 제출
 * - 루브릭 자동 검증 (문장 수, 필수 패턴, PII 위험)
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      child_id,
      week,
      input_method,
      raw_text,
      ocr_text,
      image_url,
      grade_band = "LOW", // Writing Ladder Level 0 기본값: LOW
      cefr_level = "A1", // Writing Ladder Level 0 기본값: A1
    } = body;

    // 필수 필드 검증
    if (!child_id || !week || !input_method || !raw_text) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: child_id, week, input_method, raw_text" },
        { status: 400 }
      );
    }

    if (week < 1 || week > 4) {
      return NextResponse.json(
        { success: false, error: "Invalid week number. Must be between 1 and 4 for Level 0." },
        { status: 400 }
      );
    }

    if (!["typing", "ocr"].includes(input_method)) {
      return NextResponse.json(
        { success: false, error: "Invalid input_method. Must be 'typing' or 'ocr'." },
        { status: 400 }
      );
    }

    console.log("✍️ Writing Ladder Submission 시작:", { child_id, week, input_method, grade_band, cefr_level });

    // 텍스트 정제 (공백/특수문자 정리)
    const cleaned_text = raw_text.trim().replace(/\s+/g, " ");
    
    // 단어 수 계산
    const word_count = cleaned_text.split(/\s+/).filter((word) => word.length > 0).length;

    // 🔍 루브릭 검증 (6단계: 자동 피드백 품질 관리)
    console.log("🔍 루브릭 검증 시작...");
    const rubric_result = validateWithRubric(
      `temp_${child_id}_week${week}`, // submission_id는 나중에 업데이트
      "writing_ladder_level0",
      week,
      grade_band as GradeBand,
      cefr_level as CefrLevel,
      cleaned_text
    );
    
    console.log(`${rubric_result.pass ? "✅" : "⚠️"} 루브릭 검증 완료:`, {
      pass: rubric_result.pass,
      sentences: rubric_result.sentences_count,
      patterns_ok: rubric_result.all_patterns_found,
      pii_risk: rubric_result.pii_risk,
      issues: rubric_result.issues,
    });

    // Submission ID 생성
    const submission_id = `wl_sub_${child_id}_week${week}_${Date.now()}`;
    
    // 루브릭 결과에 submission_id 업데이트
    rubric_result.submission_id = submission_id;

    // Writing Submission 데이터
    const submission = {
      submission_id,
      child_id,
      course_id: "writing_ladder_level0",
      week,
      grade_band: grade_band as GradeBand,
      cefr_level: cefr_level as CefrLevel,
      input_method,
      raw_text,
      cleaned_text,
      word_count,
      rubric_result, // 루브릭 결과 포함
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // OCR 관련 필드는 조건부로 추가
    if (input_method === "ocr" && ocr_text) {
      (submission as typeof submission & { ocr_text: string }).ocr_text = ocr_text;
    }
    if (input_method === "ocr" && image_url) {
      (submission as typeof submission & { image_url: string }).image_url = image_url;
    }

    // Firestore에 저장
    await setDoc(doc(db, "writingladder_writing_submissions", submission_id), submission);

    console.log(`✅ Writing Ladder Submission 저장 완료: ${submission_id}`);
    
    // 루브릭 결과 로그
    if (!rubric_result.pass) {
      console.warn("⚠️ 루브릭 검증 실패:", rubric_result.issues);
    }

    // 진행 상태 업데이트 (day1_submission_id 설정)
    await updateWeekProgress(child_id, week, {
      day1_submission_id: submission_id,
    });

    return NextResponse.json({
      success: true,
      data: submission,
      rubric: {
        pass: rubric_result.pass,
        issues: rubric_result.issues,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Writing Ladder Submission 저장 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save writing submission" },
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
    // 진행 상태 문서가 없으면 생성
    const progressDoc = await getDoc(progressRef);
    
    if (!progressDoc.exists()) {
      // 새로 생성
      await setDoc(progressRef, {
        progress_id,
        child_id,
        course_id: "writing_ladder_level0",
        level: "LEVEL0_SENTENCE",
        week,
        day1_completed: false,
        day2_completed: false,
        day3_completed: false,
        portfolio_completed: false,
        current_day: 1,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...updates,
      });
      console.log(`✅ Week Progress 생성: ${progress_id}`);
    } else {
      // 업데이트
      await updateDoc(progressRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      console.log(`✅ Week Progress 업데이트: ${progress_id}`);
    }
  } catch (error) {
    console.error("⚠️ Week Progress 업데이트 실패:", error);
  }
}


