import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { RehearsalSession, RehearsalFeedback } from "@/app/types/showtell";

/**
 * POST /api/showtell/rehearsals/{rehearsal_id}/feedback
 * 
 * AI 피드백 생성 (고정 형식: 칭찬 1 + 팁 2 + 개선 문장 1)
 * - attempt1 transcript가 있으면 사용
 * - 없으면 script 기반으로 피드백
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

    console.log("=== Rehearsal 피드백 생성 ===");
    console.log("🎙️ Rehearsal ID:", rehearsal_id);

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

    // 상태 체크 (feedback은 attempt1_uploaded 상태에서만 가능)
    if (rehearsal.status !== "attempt1_uploaded") {
      return NextResponse.json(
        { success: false, error: `Cannot generate feedback in status: ${rehearsal.status}. Expected: attempt1_uploaded` },
        { status: 400 }
      );
    }

    // ===================================
    // 🤖 AI 피드백 생성 로직 (Mock/Dummy)
    // 실제로는 OpenAI GPT-4를 사용
    // ===================================
    
    // 고정 형식 피드백 생성
    const feedback: RehearsalFeedback = {
      praise: "발음이 정말 좋았어요! 특히 'exciting'이라는 단어를 자신감 있게 말했어요. 👍",
      tip1: "조금 더 천천히 말하면 더 좋을 것 같아요. 숨을 한 번 쉬고 다시 시작해보세요!",
      tip2: "문장의 끝을 올려서 말하면 더 자연스러워요. 'I like it.' 대신 'I like it↗️'처럼 말해보세요!",
      improved_sentence: "Try saying: 'I really love my toy robot because it can walk and dance!' (강조를 넣어서 말해보세요!)",
    };

    console.log("✅ 피드백 생성 완료");
    console.log("💬 칭찬:", feedback.praise);
    console.log("💡 팁 1:", feedback.tip1);
    console.log("💡 팁 2:", feedback.tip2);
    console.log("📝 개선 문장:", feedback.improved_sentence);

    // Rehearsal 업데이트
    await updateDoc(rehearsalRef, {
      feedback,
      status: "feedback_given",
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Feedback generated successfully. Ready for attempt 2.",
      data: feedback,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 피드백 생성 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate feedback" },
      { status: 500 }
    );
  }
}

