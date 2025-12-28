import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { JudgeQuestionSet } from "@/app/types/showtell";

/**
 * Judge 질문 세트 조회 API
 * 
 * GET /api/showtell/questions?set_id=judge_week1
 * GET /api/showtell/questions?week=1
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
    const setId = searchParams.get("set_id");
    const weekParam = searchParams.get("week");

    console.log("📚 Judge 질문 조회 요청:", { setId, week: weekParam });

    let questionSetId = setId;

    // week 파라미터로부터 set_id 생성
    if (weekParam && !setId) {
      const week = parseInt(weekParam, 10);
      
      if (isNaN(week) || week < 1 || week > 12) {
        return NextResponse.json(
          { success: false, error: "Invalid week number. Must be between 1 and 12." },
          { status: 400 }
        );
      }

      questionSetId = `judge_week${week}`;
    }

    if (!questionSetId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: set_id or week" },
        { status: 400 }
      );
    }

    // Question Set 조회
    const questionsRef = doc(db, "showtell_judge_questions", questionSetId);
    const questionsDoc = await getDoc(questionsRef);

    if (!questionsDoc.exists()) {
      return NextResponse.json(
        { success: false, error: `Question set ${questionSetId} not found` },
        { status: 404 }
      );
    }

    const questionSet = {
      ...questionsDoc.data(),
    } as JudgeQuestionSet;

    console.log(`✅ 질문 세트 조회 완료: ${questionSetId}`);

    return NextResponse.json({
      success: true,
      data: questionSet,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Judge 질문 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch questions" },
      { status: 500 }
    );
  }
}




