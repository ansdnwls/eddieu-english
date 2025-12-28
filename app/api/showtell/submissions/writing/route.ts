import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { WritingSubmission } from "@/app/types/showtell";
import { validateWithRubric, type GradeBand, type CefrLevel } from "@/lib/rubricValidator";

/**
 * Day 1: Writing Submission API
 * 
 * POST /api/showtell/submissions/writing
 * - 유저가 작성한 글 제출
 * - 타이핑 or OCR 방식 지원
 * - 루브릭 자동 검증 (6단계)
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
      grade_band = "HIGH", // 기본값: HIGH
      cefr_level = "A2", // 기본값: A2
    } = body;

    // 필수 필드 검증
    if (!child_id || !week || !input_method || !raw_text) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: child_id, week, input_method, raw_text" },
        { status: 400 }
      );
    }

    if (week < 1 || week > 12) {
      return NextResponse.json(
        { success: false, error: "Invalid week number. Must be between 1 and 12." },
        { status: 400 }
      );
    }

    if (!["typing", "ocr"].includes(input_method)) {
      return NextResponse.json(
        { success: false, error: "Invalid input_method. Must be 'typing' or 'ocr'." },
        { status: 400 }
      );
    }

    console.log("✍️ Writing Submission 시작:", { child_id, week, input_method, grade_band, cefr_level });

    // 텍스트 정제 (공백/특수문자 정리)
    const cleaned_text = raw_text.trim().replace(/\s+/g, " ");
    
    // 단어 수 계산
    const word_count = cleaned_text.split(/\s+/).filter((word: string) => word.length > 0).length;

    // 🔍 루브릭 검증 (6단계: 자동 피드백 품질 관리)
    console.log("🔍 루브릭 검증 시작...");
    const rubric_result = validateWithRubric(
      `temp_${child_id}_week${week}`, // submission_id는 나중에 업데이트
      "show_tell_12w",
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
    });

    // Submission ID 생성
    const submission_id = `sub_${child_id}_week${week}_${Date.now()}`;
    
    // 루브릭 결과에 submission_id 업데이트
    rubric_result.submission_id = submission_id;

    // Writing Submission 데이터
    const submission: WritingSubmission = {
      submission_id,
      child_id,
      course_id: "show_tell_12w",
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
    if (input_method === "ocr") {
      if (ocr_text) {
        submission.ocr_text = ocr_text;
      }
      if (image_url) {
        submission.image_url = image_url;
      }
    }

    // Firestore에 저장
    await setDoc(doc(db, "showtell_writing_submissions", submission_id), submission);

    console.log(`✅ Writing Submission 저장 완료: ${submission_id}`);

    // 진행 상태 업데이트 (day1_submission_id 설정)
    await updateWeekProgress(child_id, week, {
      day1_submission_id: submission_id,
    });

    return NextResponse.json({
      success: true,
      data: submission,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Writing Submission 저장 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save writing submission" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/showtell/submissions/writing?submission_id=xxx
 * 특정 submission 조회
 */
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const submission_id = searchParams.get("submission_id");

    if (!submission_id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: submission_id" },
        { status: 400 }
      );
    }

    const submissionRef = doc(db, "showtell_writing_submissions", submission_id);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const submission = submissionDoc.data() as WritingSubmission;

    return NextResponse.json({
      success: true,
      data: submission,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Writing Submission 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch submission" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/showtell/submissions/writing?submission_id=xxx
 * Submission 수정 (OCR 텍스트 수정 반영)
 */
export async function PUT(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const submission_id = searchParams.get("submission_id");

    if (!submission_id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: submission_id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { cleaned_text } = body;

    if (!cleaned_text) {
      return NextResponse.json(
        { success: false, error: "Missing required field: cleaned_text" },
        { status: 400 }
      );
    }

    console.log("📝 Writing Submission 수정:", { submission_id });

    // Submission 존재 확인
    const submissionRef = doc(db, "showtell_writing_submissions", submission_id);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    // 단어 수 재계산
    const word_count = cleaned_text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;

    // 업데이트
    await updateDoc(submissionRef, {
      cleaned_text: cleaned_text.trim(),
      word_count,
      updated_at: new Date().toISOString(),
    });

    console.log(`✅ Writing Submission 수정 완료: ${submission_id}`);

    // 업데이트된 데이터 반환
    const updatedDoc = await getDoc(submissionRef);

    return NextResponse.json({
      success: true,
      data: updatedDoc.data() as WritingSubmission,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Writing Submission 수정 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update submission" },
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
  const progressRef = doc(db, "showtell_week_progress", progress_id);
  
  try {
    const progressDoc = await getDoc(progressRef);
    
    if (progressDoc.exists()) {
      // 기존 진행 상태 업데이트
      await updateDoc(progressRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
    } else {
      // 새로운 진행 상태 생성
      await setDoc(progressRef, {
        progress_id,
        child_id,
        course_id: "show_tell_12w",
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
    }
  } catch (error) {
    console.error("⚠️ Week Progress 업데이트 실패:", error);
    // 실패해도 메인 작업은 계속 진행
  }
}

