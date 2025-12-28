import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { PortfolioItem, WritingSubmission, Script, RehearsalSession, JudgeSession, AudioRecord } from "@/app/types/showtell";

/**
 * GET /api/showtell/portfolio/{portfolio_id}
 * 
 * Portfolio 상세 조회
 * - 스크립트, 오디오, 질문 로그 등 전체 데이터
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ portfolio_id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { portfolio_id } = await context.params;

    console.log("=== Portfolio 상세 조회 ===");
    console.log("📂 Portfolio ID:", portfolio_id);

    // Portfolio Item 조회
    const portfolioRef = doc(db, "showtell_portfolio_items", portfolio_id);
    const portfolioDoc = await getDoc(portfolioRef);

    if (!portfolioDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Portfolio not found" },
        { status: 404 }
      );
    }

    const portfolio = portfolioDoc.data() as PortfolioItem;

    // 관련 데이터 모두 가져오기
    const [submissionDoc, scriptDoc, rehearsalDoc, judgeDoc] = await Promise.all([
      getDoc(doc(db, "showtell_writing_submissions", portfolio.submission_id)),
      getDoc(doc(db, "showtell_scripts", portfolio.script_id)),
      getDoc(doc(db, "showtell_rehearsal_sessions", portfolio.rehearsal_session_id)),
      getDoc(doc(db, "showtell_judge_sessions", portfolio.judge_session_id)),
    ]);

    if (!submissionDoc.exists() || !scriptDoc.exists() || !rehearsalDoc.exists() || !judgeDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Related data not found" },
        { status: 404 }
      );
    }

    const submission = submissionDoc.data() as WritingSubmission;
    const script = scriptDoc.data() as Script;
    const rehearsal = rehearsalDoc.data() as RehearsalSession;
    const judge = judgeDoc.data() as JudgeSession;

    // Audio Records 가져오기
    const audioRecords: Record<string, AudioRecord> = {};

    if (rehearsal.attempt1_audio_id) {
      const audio1Doc = await getDoc(doc(db, "showtell_audio_records", rehearsal.attempt1_audio_id));
      if (audio1Doc.exists()) {
        audioRecords.attempt1 = audio1Doc.data() as AudioRecord;
      }
    }

    if (rehearsal.attempt2_audio_id) {
      const audio2Doc = await getDoc(doc(db, "showtell_audio_records", rehearsal.attempt2_audio_id));
      if (audio2Doc.exists()) {
        audioRecords.attempt2 = audio2Doc.data() as AudioRecord;
      }
    }

    console.log("✅ Portfolio 상세 조회 완료");

    return NextResponse.json({
      success: true,
      data: {
        portfolio,
        submission,
        script,
        rehearsal,
        judge,
        audioRecords,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Portfolio 상세 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch portfolio detail" },
      { status: 500 }
    );
  }
}

