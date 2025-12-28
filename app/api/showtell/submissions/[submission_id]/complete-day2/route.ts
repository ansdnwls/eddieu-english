import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { WritingSubmission } from "@/app/types/showtell";

/**
 * POST /api/showtell/submissions/{submission_id}/complete-day2
 * 
 * Day 2 완료 처리
 * - 최소 1개 shadowing 오디오가 저장돼야 Day 3 버튼 활성화
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

    console.log("=== Day 2 완료 체크 ===");
    console.log("📝 Submission ID:", submission_id);

    // Submission 존재 확인
    const submissionRef = doc(db, "showtell_writing_submissions", submission_id);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const submission = submissionDoc.data() as WritingSubmission;
    const { child_id, week } = submission;

    // 진행 상태 확인
    const progress_id = `progress_${child_id}_week${week}`;
    const progressRef = doc(db, "showtell_week_progress", progress_id);
    const progressDoc = await getDoc(progressRef);

    if (!progressDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Week progress not found" },
        { status: 404 }
      );
    }

    const progressData = progressDoc.data();

    // 완료 조건 체크
    const hasScript = !!progressData.day2_script_id;
    const shadowingAudioIds = progressData.day2_shadowing_audio_ids || [];
    const hasShadowing = shadowingAudioIds.length >= 3; // 3문장 모두 필요

    console.log("📊 완료 조건:");
    console.log("  - Script 생성:", hasScript ? "✅" : "❌");
    console.log(`  - Shadowing 녹음 (3개): ${shadowingAudioIds.length}/3`, hasShadowing ? "✅" : "❌");

    if (!hasScript) {
      return NextResponse.json(
        { success: false, error: "Script not yet generated. Please complete Script Coach first." },
        { status: 400 }
      );
    }

    if (!hasShadowing) {
      return NextResponse.json(
        { 
          success: false, 
          error: `3 shadowing recordings required (current: ${shadowingAudioIds.length}/3). Please record all 3 sentences.` 
        },
        { status: 400 }
      );
    }

    // Day 2 완료 처리
    await updateDoc(progressRef, {
      day2_completed: true,
      current_day: 3, // 다음 Day로 진행
      updated_at: new Date().toISOString(),
    });

    console.log("✅ Day 2 완료!");

    return NextResponse.json({
      success: true,
      message: "Day 2 completed! You can now proceed to Day 3.",
      data: {
        day2_completed: true,
        current_day: 3,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Day 2 완료 처리 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to complete Day 2" },
      { status: 500 }
    );
  }
}

