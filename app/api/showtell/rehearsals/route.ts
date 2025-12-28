import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { RehearsalSession, Script, WritingSubmission } from "@/app/types/showtell";

/**
 * POST /api/showtell/rehearsals
 * 
 * Rehearsal 세션 생성
 * - script_id로 새 세션 생성
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
    const { script_id, child_id } = body;

    if (!script_id || !child_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: script_id, child_id" },
        { status: 400 }
      );
    }

    console.log("=== Rehearsal 세션 생성 ===");
    console.log("📝 Script ID:", script_id);
    console.log("👤 Child ID:", child_id);

    // Script 존재 확인
    const scriptRef = doc(db, "showtell_scripts", script_id);
    const scriptDoc = await getDoc(scriptRef);

    if (!scriptDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    const script = scriptDoc.data() as Script;

    // Submission에서 week 가져오기
    const submissionRef = doc(db, "showtell_writing_submissions", script.submission_id);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const submission = submissionDoc.data() as WritingSubmission;
    const week = submission.week;

    // Rehearsal ID 생성
    const rehearsal_id = `rehearsal_${script_id}_${Date.now()}`;

    // Rehearsal Session 데이터
    const rehearsalSession: RehearsalSession = {
      rehearsal_id,
      script_id,
      child_id,
      week,
      status: "created",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Firestore에 저장
    await setDoc(doc(db, "showtell_rehearsal_sessions", rehearsal_id), rehearsalSession);

    console.log("✅ Rehearsal 세션 생성 완료:", rehearsal_id);

    return NextResponse.json({
      success: true,
      data: rehearsalSession,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Rehearsal 세션 생성 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create rehearsal session" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/showtell/rehearsals?rehearsal_id=xxx
 * 
 * Rehearsal 세션 조회
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
    const rehearsal_id = searchParams.get("rehearsal_id");

    if (!rehearsal_id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: rehearsal_id" },
        { status: 400 }
      );
    }

    const rehearsalRef = doc(db, "showtell_rehearsal_sessions", rehearsal_id);
    const rehearsalDoc = await getDoc(rehearsalRef);

    if (!rehearsalDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Rehearsal session not found" },
        { status: 404 }
      );
    }

    const rehearsalSession = rehearsalDoc.data() as RehearsalSession;

    return NextResponse.json({
      success: true,
      data: rehearsalSession,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Rehearsal 세션 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch rehearsal session" },
      { status: 500 }
    );
  }
}





