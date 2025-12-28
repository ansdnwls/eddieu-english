import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { WritingLadderJudgeQuestionSet } from "@/app/types/writingladder";

/**
 * Writing Ladder Judge 질문 세트 조회 API
 * 
 * GET /api/writingladder/questions?week=1
 * GET /api/writingladder/questions (전체 조회)
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
    const weekParam = searchParams.get("week");
    const level = searchParams.get("level") || "LEVEL0_SENTENCE";

    console.log("❓ Writing Ladder 질문 세트 조회 요청:", { week: weekParam, level });

    // 특정 주차 조회
    if (weekParam) {
      const week = parseInt(weekParam, 10);
      
      if (isNaN(week) || week < 1 || week > 4) {
        return NextResponse.json(
          { success: false, error: "Invalid week number. Must be between 1 and 4." },
          { status: 400 }
        );
      }

      // Judge Question Set 조회
      const questionSetRef = doc(db, "writingladder_judge_questions", `judge_writingladder_l0_week${week}`);
      const questionSetDoc = await getDoc(questionSetRef);

      if (!questionSetDoc.exists()) {
        return NextResponse.json(
          { success: false, error: `Question set for week ${week} not found` },
          { status: 404 }
        );
      }

      const questionSet = {
        ...questionSetDoc.data(),
      } as WritingLadderJudgeQuestionSet;

      console.log(`✅ Week ${week} 질문 세트 조회 완료 (${questionSet.json.questions.length}문항)`);

      return NextResponse.json({
        success: true,
        data: {
          question_set: questionSet,
          total_questions: questionSet.json.questions.length,
        },
      });
    }

    // 전체 주차 조회
    const questionSetsQuery = query(
      collection(db, "writingladder_judge_questions"),
      where("level", "==", level),
      where("active", "==", true),
      orderBy("week", "asc")
    );

    const questionSetsSnapshot = await getDocs(questionSetsQuery);
    const questionSets: WritingLadderJudgeQuestionSet[] = [];

    questionSetsSnapshot.forEach((doc) => {
      questionSets.push({
        ...doc.data(),
      } as WritingLadderJudgeQuestionSet);
    });

    console.log(`✅ 전체 질문 세트 조회 완료 (${questionSets.length}개)`);

    return NextResponse.json({
      success: true,
      data: {
        question_sets: questionSets,
        total: questionSets.length,
        level,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Writing Ladder 질문 세트 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch questions" },
      { status: 500 }
    );
  }
}


