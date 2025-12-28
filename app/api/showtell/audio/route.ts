import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { AudioRecord } from "@/app/types/showtell";

/**
 * Audio Record API
 * 
 * POST /api/showtell/audio
 * - 녹음 파일 메타데이터 저장
 * - Shadowing, Rehearsal, Judge 답변 녹음 지원
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
      related_type,
      related_id,
      duration_sec,
      storage_url,
      attempt_number,
      feedback,
    } = body;

    // 필수 필드 검증
    if (!child_id || !related_type || !related_id || !duration_sec || !storage_url) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // related_type 검증
    const validTypes = ["shadowing", "rehearsal1", "rehearsal2", "judge_answer"];
    if (!validTypes.includes(related_type)) {
      return NextResponse.json(
        { success: false, error: `Invalid related_type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    console.log("🎙️ Audio Record 저장 시작:", { child_id, related_type });

    // Audio ID 생성
    const audio_id = `audio_${child_id}_${related_type}_${Date.now()}`;

    // Audio Record 데이터 (undefined 필드 제거)
    const audioRecord: AudioRecord = {
      audio_id,
      child_id,
      related_type,
      related_id,
      duration_sec,
      storage_url,
      created_at: new Date().toISOString(),
    };

    // 선택적 필드는 조건부로 추가
    if (attempt_number !== undefined) {
      audioRecord.attempt_number = attempt_number;
    }
    if (feedback !== undefined) {
      audioRecord.feedback = feedback;
    }

    // Firestore에 저장
    await setDoc(doc(db, "showtell_audio_records", audio_id), audioRecord);

    console.log(`✅ Audio Record 저장 완료: ${audio_id}`);

    // Shadowing인 경우 진행 상태 업데이트
    if (related_type === "shadowing") {
      await updateShadowingProgress(child_id, related_id, audio_id);
    }

    return NextResponse.json({
      success: true,
      data: audioRecord,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Audio Record 저장 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save audio record" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/showtell/audio?audio_id=xxx
 * 또는 /api/showtell/audio?child_id=xxx&related_type=shadowing
 * Audio Record 조회
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
    const audio_id = searchParams.get("audio_id");
    const child_id = searchParams.get("child_id");
    const related_type = searchParams.get("related_type");

    // audio_id로 직접 조회
    if (audio_id) {
      const audioRef = doc(db, "showtell_audio_records", audio_id);
      const audioDoc = await getDoc(audioRef);

      if (!audioDoc.exists()) {
        return NextResponse.json(
          { success: false, error: "Audio record not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: audioDoc.data() as AudioRecord,
      });
    }

    // child_id + related_type으로 목록 조회
    if (child_id && related_type) {
      const audioQuery = query(
        collection(db, "showtell_audio_records"),
        where("child_id", "==", child_id),
        where("related_type", "==", related_type)
      );

      const audioSnapshot = await getDocs(audioQuery);
      const audioRecords: AudioRecord[] = [];

      audioSnapshot.forEach((doc) => {
        audioRecords.push(doc.data() as AudioRecord);
      });

      return NextResponse.json({
        success: true,
        data: audioRecords,
        total: audioRecords.length,
      });
    }

    return NextResponse.json(
      { success: false, error: "Missing required parameters" },
      { status: 400 }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Audio Record 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch audio records" },
      { status: 500 }
    );
  }
}

/**
 * Shadowing 진행 상태 업데이트
 */
async function updateShadowingProgress(
  child_id: string,
  script_id: string,
  audio_id: string
): Promise<void> {
  if (!db) return;

  try {
    // script_id에서 submission_id 추출하여 week 찾기
    const scriptRef = doc(db, "showtell_scripts", script_id);
    const scriptDoc = await getDoc(scriptRef);

    if (!scriptDoc.exists()) return;

    const scriptData = scriptDoc.data();
    const submissionRef = doc(db, "showtell_writing_submissions", scriptData.submission_id);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) return;

    const week = submissionDoc.data().week;
    const progress_id = `progress_${child_id}_week${week}`;
    const progressRef = doc(db, "showtell_week_progress", progress_id);

    // 기존 shadowing_audio_ids 배열에 추가
    const progressDoc = await getDoc(progressRef);
    if (progressDoc.exists()) {
      const existingIds = progressDoc.data().day2_shadowing_audio_ids || [];
      await updateDoc(progressRef, {
        day2_shadowing_audio_ids: [...existingIds, audio_id],
        updated_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("⚠️ Shadowing Progress 업데이트 실패:", error);
  }
}

