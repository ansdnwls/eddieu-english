import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { JudgeSession, JudgeAnswer, JudgeFeedback } from "@/app/types/showtell";

/**
 * POST /api/showtell/judge-sessions/{judge_session_id}/answer
 * 
 * 답변 제출 + AI 피드백 (고정 형식: 칭찬 1 + 교정 1 + 더 좋은 표현 1)
 * - 답변 저장 후 즉시 피드백 생성
 * - current_question_index 증가
 * - 5문항 완료 시 세션 "completed" 처리
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
    const body = await request.json();
    const { answer_text, answer_audio_id } = body;

    if (!answer_text) {
      return NextResponse.json(
        { success: false, error: "Missing required field: answer_text" },
        { status: 400 }
      );
    }

    console.log("=== Judge 답변 제출 ===");
    console.log("🎯 Judge Session ID:", judge_session_id);
    console.log("💬 Answer:", answer_text);

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
        { success: false, error: "Judge session already completed" },
        { status: 400 }
      );
    }

    const currentIndex = judgeSession.current_question_index;
    const currentQuestion = judgeSession.selected_questions[currentIndex];

    // ===================================
    // 🤖 AI 피드백 생성 로직 (Mock/Dummy)
    // 실제로는 OpenAI GPT-4를 사용
    // 고정 형식: 칭찬 1 + 교정 1 + 더 좋은 표현 1
    // ===================================
    
    const feedback: JudgeFeedback = {
      praise: "좋은 답변이에요! 자신감 있게 말해줘서 고마워요. 👍",
      correction: "문법 교정: 'Because it is fun' → 'Because it's fun and exciting!'",
      better_expression: "더 좋은 표현: 'I really enjoy it because it's so much fun!' (더 자연스러워요!)",
    };

    console.log("✅ 피드백 생성 완료");
    console.log("💬 칭찬:", feedback.praise);
    console.log("✏️ 교정:", feedback.correction);
    console.log("✨ 더 좋은 표현:", feedback.better_expression);

    // 답변 객체 생성
    const judgeAnswer: JudgeAnswer = {
      question_index: currentIndex,
      question_id: currentQuestion.question_id,
      question_text: currentQuestion.text,
      answer_text,
      answer_audio_id,
      feedback,
      answered_at: new Date().toISOString(),
    };

    // 답변 배열에 추가
    const updatedAnswers = [...judgeSession.answers, judgeAnswer];
    const nextIndex = currentIndex + 1;
    const isCompleted = nextIndex >= judgeSession.selected_questions.length;

    // Judge Session 업데이트
    const updateData: Record<string, unknown> = {
      answers: updatedAnswers,
      current_question_index: nextIndex,
      updated_at: new Date().toISOString(),
    };

    if (isCompleted) {
      updateData.status = "completed";
      updateData.completed_at = new Date().toISOString();
      
      // Week Progress 업데이트
      await updateWeekProgress(judgeSession.child_id, judgeSession.week, {
        day3_judge_session_id: judge_session_id,
        day3_completed: true,
      });

      console.log("🎉 Judge Session 완료!");
    }

    await updateDoc(judgeRef, updateData);

    console.log(`✅ 답변 저장 완료 (${nextIndex}/${judgeSession.selected_questions.length})`);

    return NextResponse.json({
      success: true,
      data: {
        answer: judgeAnswer,
        feedback,
        current_question_index: nextIndex,
        total_questions: judgeSession.selected_questions.length,
        completed: isCompleted,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 답변 제출 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to submit answer" },
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

