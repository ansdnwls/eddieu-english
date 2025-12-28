import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { RehearsalSession } from "@/app/types/showtell";

/**
 * POST /api/showtell/rehearsals/{rehearsal_id}/attempt2
 * 
 * 2차 녹음 업로드 (최종 발표)
 * - feedback을 받은 후에만 가능
 * - 완료 시 week_progress 업데이트
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rehearsal_id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { rehearsal_id } = await context.params;
    const body = await request.json();
    const { audio_id } = body;

    if (!audio_id) {
      return NextResponse.json(
        { success: false, error: "Missing required field: audio_id" },
        { status: 400 }
      );
    }

    console.log("=== Rehearsal Attempt 2 업로드 ===");
    console.log("🎙️ Rehearsal ID:", rehearsal_id);
    console.log("🎵 Audio ID:", audio_id);

    // Rehearsal Session 존재 확인
    const rehearsalRef = doc(db, "showtell_rehearsal_sessions", rehearsal_id);
    const rehearsalDoc = await getDoc(rehearsalRef);

    if (!rehearsalDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Rehearsal session not found" },
        { status: 404 }
      );
    }

    const rehearsal = rehearsalDoc.data() as RehearsalSession;

    // 상태 체크 (attempt2는 feedback_given 상태에서만 가능)
    if (rehearsal.status !== "feedback_given") {
      return NextResponse.json(
        { success: false, error: `Cannot upload attempt2 in status: ${rehearsal.status}. Expected: feedback_given` },
        { status: 400 }
      );
    }

    // Audio Record 존재 확인
    const audioRef = doc(db, "showtell_audio_records", audio_id);
    const audioDoc = await getDoc(audioRef);

    if (!audioDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Audio record not found" },
        { status: 404 }
      );
    }

    // Rehearsal 완료 처리
    await updateDoc(rehearsalRef, {
      attempt2_audio_id: audio_id,
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Week Progress 업데이트
    await updateWeekProgress(rehearsal.child_id, rehearsal.week, {
      day3_rehearsal_session_id: rehearsal_id,
    });

    console.log("✅ Attempt 2 업로드 완료 (Rehearsal 완료)");

    return NextResponse.json({
      success: true,
      message: "Rehearsal completed successfully! Ready for Judge Q&A.",
      data: {
        rehearsal_id,
        audio_id,
        status: "completed",
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Attempt 2 업로드 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to upload attempt 2" },
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

