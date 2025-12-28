import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, orderBy } from "firebase/firestore";
import { PortfolioItem, WritingSubmission, Script, RehearsalSession, JudgeSession } from "@/app/types/showtell";

/**
 * POST /api/showtell/portfolio/complete-week
 * 
 * Week 완료 처리 + Portfolio Item 생성
 * - Day 3 Judge 세션 완료 시 자동 호출
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
    const { child_id, week, submission_id, script_id, rehearsal_session_id, judge_session_id } = body;

    if (!child_id || !week || !submission_id || !script_id || !rehearsal_session_id || !judge_session_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("=== Portfolio Week 완료 처리 ===");
    console.log("👤 Child ID:", child_id);
    console.log("📅 Week:", week);

    // 1. 모든 관련 데이터 가져오기
    const submissionDoc = await getDoc(doc(db, "showtell_writing_submissions", submission_id));
    const scriptDoc = await getDoc(doc(db, "showtell_scripts", script_id));
    const rehearsalDoc = await getDoc(doc(db, "showtell_rehearsal_sessions", rehearsal_session_id));
    const judgeDoc = await getDoc(doc(db, "showtell_judge_sessions", judge_session_id));

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

    // 2. Rehearsal attempt2 audio_id 가져오기
    const finalRecordingUrl = rehearsal.attempt2_audio_id || "";

    if (!finalRecordingUrl) {
      return NextResponse.json(
        { success: false, error: "Final recording (attempt2) not found" },
        { status: 400 }
      );
    }

    // 3. Content Pack에서 title 가져오기
    const contentResponse = await fetch(`${request.nextUrl.origin}/api/showtell/content?week=${week}`);
    const contentResult = await contentResponse.json();
    
    let title = `Week ${week}`;
    let description = "Show & Tell Presentation";
    
    if (contentResult.success) {
      title = contentResult.data.content_pack.json.title;
      description = contentResult.data.content_pack.json.description;
    }

    // 4. Portfolio ID 생성
    const portfolio_id = `portfolio_${child_id}_week${week}`;

    // 5. Portfolio Item 데이터
    const portfolioItem: PortfolioItem = {
      portfolio_id,
      child_id,
      course_id: "show_tell_12w",
      week,
      submission_id,
      script_id,
      rehearsal_session_id,
      rehearsal_attempt2_audio_id: finalRecordingUrl,
      judge_session_id,
      title,
      description,
      final_script: script.script_30s,
      final_recording_url: finalRecordingUrl,
      word_count: submission.word_count,
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 6. Firestore에 저장
    await setDoc(doc(db, "showtell_portfolio_items", portfolio_id), portfolioItem);

    console.log("✅ Portfolio Item 생성 완료:", portfolio_id);

    // 7. Week Progress 완료 처리
    const progress_id = `progress_${child_id}_week${week}`;
    const progressRef = doc(db, "showtell_week_progress", progress_id);

    await updateDoc(progressRef, {
      portfolio_completed: true,
      portfolio_id,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log("✅ Week Progress 완료 처리");

    return NextResponse.json({
      success: true,
      message: `Week ${week} completed! Portfolio created.`,
      data: {
        portfolio_id,
        title,
        week,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Portfolio 완료 처리 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to complete week" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/showtell/portfolio?child_id=xxx&course_id=show_tell_12w
 * 
 * Portfolio 목록 조회 (주차별 카드)
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
    const child_id = searchParams.get("child_id");
    const course_id = searchParams.get("course_id") || "show_tell_12w";

    if (!child_id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: child_id" },
        { status: 400 }
      );
    }

    console.log("=== Portfolio 목록 조회 ===");
    console.log("👤 Child ID:", child_id);
    console.log("📚 Course ID:", course_id);

    // Portfolio Items 조회 (week 순서대로 정렬)
    const portfolioQuery = query(
      collection(db, "showtell_portfolio_items"),
      where("child_id", "==", child_id),
      where("course_id", "==", course_id),
      orderBy("week", "asc")
    );

    const portfolioSnapshot = await getDocs(portfolioQuery);
    const portfolioItems: PortfolioItem[] = [];

    portfolioSnapshot.forEach((doc) => {
      portfolioItems.push(doc.data() as PortfolioItem);
    });

    console.log(`✅ Portfolio Items 조회 완료: ${portfolioItems.length}개`);

    return NextResponse.json({
      success: true,
      data: {
        portfolio_items: portfolioItems,
        total_weeks_completed: portfolioItems.length,
        course_id,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Portfolio 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}




