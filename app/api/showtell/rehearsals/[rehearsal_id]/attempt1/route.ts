import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { RehearsalSession, AudioRecord } from "@/app/types/showtell";

/**
 * POST /api/showtell/rehearsals/{rehearsal_id}/attempt1
 * 
 * 1차 녹음 업로드
 * - audio_id와 transcript(옵션) 제공
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
    const { audio_id, transcript } = body;

    if (!audio_id) {
      return NextResponse.json(
        { success: false, error: "Missing required field: audio_id" },
        { status: 400 }
      );
    }

    console.log("=== Rehearsal Attempt 1 업로드 ===");
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

    // 상태 체크 (attempt1은 created 상태에서만 가능)
    if (rehearsal.status !== "created") {
      return NextResponse.json(
        { success: false, error: `Cannot upload attempt1 in status: ${rehearsal.status}. Expected: created` },
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

    // Rehearsal 업데이트
    await updateDoc(rehearsalRef, {
      attempt1_audio_id: audio_id,
      attempt1_transcript: transcript || null,
      status: "attempt1_uploaded",
      updated_at: new Date().toISOString(),
    });

    console.log("✅ Attempt 1 업로드 완료");

    return NextResponse.json({
      success: true,
      message: "Attempt 1 uploaded successfully. Ready for feedback.",
      data: {
        rehearsal_id,
        audio_id,
        status: "attempt1_uploaded",
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Attempt 1 업로드 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to upload attempt 1" },
      { status: 500 }
    );
  }
}

