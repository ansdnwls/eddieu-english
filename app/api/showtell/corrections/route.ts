import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { CorrectionResult, CorrectionUpgrade } from "@/app/types/showtell";

/**
 * Day 1: Correction Result API
 * 
 * POST /api/showtell/corrections
 * - AI가 생성한 교정 결과 저장
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
      submission_id,
      minimal_fix_text,
      native_rewrite_text,
      upgrades,
      overall_feedback,
      encouragement,
    } = body;

    // 필수 필드 검증
    if (!submission_id || !minimal_fix_text || !native_rewrite_text) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Submission 존재 확인
    const submissionRef = doc(db, "showtell_writing_submissions", submission_id);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    console.log("🔧 Correction Result 생성 시작:", { submission_id });

    // Correction ID 생성
    const correction_id = `corr_${submission_id}_${Date.now()}`;

    // Correction Result 데이터
    const correction: CorrectionResult = {
      correction_id,
      submission_id,
      minimal_fix_text,
      native_rewrite_text,
      upgrades: upgrades || [],
      overall_feedback: overall_feedback || "",
      encouragement: encouragement || "",
      created_at: new Date().toISOString(),
    };

    // Firestore에 저장
    await setDoc(doc(db, "showtell_corrections", correction_id), correction);

    console.log(`✅ Correction Result 저장 완료: ${correction_id}`);

    // 진행 상태 업데이트
    const submissionData = submissionDoc.data();
    await updateWeekProgress(submissionData.child_id, submissionData.week, {
      day1_correction_id: correction_id,
      day1_completed: true,
    });

    return NextResponse.json({
      success: true,
      data: correction,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Correction Result 저장 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save correction" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/showtell/corrections?correction_id=xxx
 * 또는 /api/showtell/corrections?submission_id=xxx
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
    const correction_id = searchParams.get("correction_id");
    const submission_id = searchParams.get("submission_id");

    if (!correction_id && !submission_id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: correction_id or submission_id" },
        { status: 400 }
      );
    }

    // correction_id로 직접 조회
    if (correction_id) {
      const correctionRef = doc(db, "showtell_corrections", correction_id);
      const correctionDoc = await getDoc(correctionRef);

      if (!correctionDoc.exists()) {
        return NextResponse.json(
          { success: false, error: "Correction not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: correctionDoc.data() as CorrectionResult,
      });
    }

    // submission_id로 조회 (correction_id 생성 패턴 활용)
    // 실제 프로덕션에서는 Firestore query 사용
    return NextResponse.json({
      success: false,
      error: "Query by submission_id not yet implemented. Use correction_id instead.",
    }, { status: 501 });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Correction 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch correction" },
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
    await updateDoc(progressRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("⚠️ Week Progress 업데이트 실패:", error);
  }
}





