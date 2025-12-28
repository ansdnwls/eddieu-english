import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { JudgeSession } from "@/app/types/showtell";

/**
 * POST /api/showtell/judge-sessions/{judge_session_id}/next-question
 * 
 * 다음 질문 가져오기
 * - current_question_index에 해당하는 질문 반환
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ judge_session_id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { judge_session_id } = await context.params;

    console.log("=== 다음 질문 요청 ===");
    console.log("🎯 Judge Session ID:", judge_session_id);

    // Judge Session 존재 확인
    const judgeRef = doc(db, "showtell_judge_sessions", judge_session_id);
    const judgeDoc = await getDoc(judgeRef);

    if (!judgeDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Judge session not found" },
        { status: 404 }
      );
    }

    const judgeSession = judgeDoc.data() as JudgeSession;

    // 완료 여부 체크
    if (judgeSession.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Judge session already completed", completed: true },
        { status: 400 }
      );
    }

    // 현재 질문 인덱스
    const currentIndex = judgeSession.current_question_index;
    
    // 질문이 남아있는지 체크
    if (currentIndex >= judgeSession.selected_questions.length) {
      return NextResponse.json(
        { success: false, error: "No more questions", completed: true },
        { status: 400 }
      );
    }

    const currentQuestion = judgeSession.selected_questions[currentIndex];

    console.log(`✅ 질문 ${currentIndex + 1}/${judgeSession.selected_questions.length}: ${currentQuestion.text}`);

    return NextResponse.json({
      success: true,
      data: {
        question: currentQuestion,
        question_index: currentIndex,
        total_questions: judgeSession.selected_questions.length,
        remaining_questions: judgeSession.selected_questions.length - currentIndex,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 다음 질문 요청 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to get next question" },
      { status: 500 }
    );
  }
}

