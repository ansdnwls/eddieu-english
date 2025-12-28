import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { PortfolioItem } from "@/app/types/showtell";

/**
 * Portfolio Item API
 * 
 * POST /api/showtell/portfolio
 * - 주차별 완성된 학습 결과물 포트폴리오 생성
 * - Day 1~3의 모든 데이터를 참조
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
      submission_id,
      script_id,
      rehearsal_session_id,
      rehearsal_attempt2_audio_id,
      judge_session_id,
      title,
      description,
      thumbnail_url,
    } = body;

    // 필수 필드 검증
    if (!child_id || !week || !submission_id || !script_id || !rehearsal_session_id || !rehearsal_attempt2_audio_id || !judge_session_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("🏆 Portfolio Item 생성 시작:", { child_id, week });

    // 연관 데이터 존재 확인 및 로드
    const [submissionDoc, scriptDoc, audioDoc] = await Promise.all([
      getDoc(doc(db, "showtell_writing_submissions", submission_id)),
      getDoc(doc(db, "showtell_scripts", script_id)),
      getDoc(doc(db, "showtell_audio_records", rehearsal_attempt2_audio_id)),
    ]);

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    if (!scriptDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    if (!audioDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Audio record not found" },
        { status: 404 }
      );
    }

    // 데이터 추출
    const submissionData = submissionDoc.data();
    const scriptData = scriptDoc.data();
    const audioData = audioDoc.data();

    // Portfolio ID 생성
    const portfolio_id = `portfolio_${child_id}_week${week}`;

    // Portfolio Item 데이터
    const portfolio: PortfolioItem = {
      portfolio_id,
      child_id,
      course_id: "show_tell_12w",
      week,
      submission_id,
      script_id,
      rehearsal_session_id,
      rehearsal_attempt2_audio_id,
      judge_session_id,
      title: title || `Week ${week} Portfolio`,
      description: description || "",
      thumbnail_url,
      // 빠른 접근을 위한 요약 데이터
      final_script: scriptData.script_30s,
      final_recording_url: audioData.storage_url,
      word_count: submissionData.word_count,
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Firestore에 저장
    await setDoc(doc(db, "showtell_portfolio_items", portfolio_id), portfolio);

    console.log(`✅ Portfolio Item 생성 완료: ${portfolio_id}`);

    // 진행 상태 업데이트 (포트폴리오 완성)
    const progress_id = `progress_${child_id}_week${week}`;
    const progressRef = doc(db, "showtell_week_progress", progress_id);
    await setDoc(progressRef, {
      portfolio_completed: true,
      portfolio_id,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      data: portfolio,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Portfolio Item 생성 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create portfolio item" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/showtell/portfolio?portfolio_id=xxx
 * 또는 /api/showtell/portfolio?child_id=xxx
 * 또는 /api/showtell/portfolio?child_id=xxx&week=1
 * Portfolio Item 조회
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
    const portfolio_id = searchParams.get("portfolio_id");
    const child_id = searchParams.get("child_id");
    const weekParam = searchParams.get("week");

    // portfolio_id로 직접 조회
    if (portfolio_id) {
      const portfolioRef = doc(db, "showtell_portfolio_items", portfolio_id);
      const portfolioDoc = await getDoc(portfolioRef);

      if (!portfolioDoc.exists()) {
        return NextResponse.json(
          { success: false, error: "Portfolio not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: portfolioDoc.data() as PortfolioItem,
      });
    }

    // child_id로 전체 포트폴리오 조회
    if (child_id) {
      let portfolioQuery;

      if (weekParam) {
        const week = parseInt(weekParam, 10);
        portfolioQuery = query(
          collection(db, "showtell_portfolio_items"),
          where("child_id", "==", child_id),
          where("week", "==", week)
        );
      } else {
        portfolioQuery = query(
          collection(db, "showtell_portfolio_items"),
          where("child_id", "==", child_id),
          orderBy("week", "asc")
        );
      }

      const portfolioSnapshot = await getDocs(portfolioQuery);
      const portfolioItems: PortfolioItem[] = [];

      portfolioSnapshot.forEach((doc) => {
        portfolioItems.push(doc.data() as PortfolioItem);
      });

      return NextResponse.json({
        success: true,
        data: portfolioItems,
        total: portfolioItems.length,
      });
    }

    return NextResponse.json(
      { success: false, error: "Missing required parameters" },
      { status: 400 }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Portfolio 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}




