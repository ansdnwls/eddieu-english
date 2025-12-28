import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  WritingLadderContentPack, 
  WritingLadderJudgeQuestionSet, 
  WritingLadderTopic 
} from "@/app/types/writingladder";

/**
 * GET /api/v1/courses/writing_ladder_level0/weeks/{week}
 * 
 * Writing Ladder Level 0의 특정 주차 콘텐츠 조회 (RESTful 스타일)
 * 
 * 응답 예시:
 * {
 *   "success": true,
 *   "data": {
 *     "course_id": "writing_ladder_level0",
 *     "week": 1,
 *     "content_pack": { ... },
 *     "topic": { ... },
 *     "questions": { ... }
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ week: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { week: weekParam } = await context.params;
    const week = parseInt(weekParam, 10);

    console.log("=== Writing Ladder Level 0 콘텐츠 조회 ===");
    console.log("📅 Week:", week);

    // Week 범위 검증 (Level 0는 4주)
    if (isNaN(week) || week < 1 || week > 4) {
      return NextResponse.json(
        { success: false, error: "Invalid week number. Must be between 1 and 4 for Level 0." },
        { status: 400 }
      );
    }

    // 1. Content Pack 조회
    const contentPackRef = doc(db, "writingladder_content_packs", `writingladder_l0_week${week}`);
    const contentPackDoc = await getDoc(contentPackRef);

    if (!contentPackDoc.exists()) {
      return NextResponse.json(
        { success: false, error: `Content pack for week ${week} not found` },
        { status: 404 }
      );
    }

    const contentPack = contentPackDoc.data() as WritingLadderContentPack;

    // 2. Topic 조회
    const topicRef = doc(db, "writingladder_topics", contentPack.topic_id);
    const topicDoc = await getDoc(topicRef);
    const topic = topicDoc.exists() ? topicDoc.data() as WritingLadderTopic : null;

    // 3. Judge Questions 조회
    const questionBankRef = contentPack.json.day3.judge.question_bank_ref;
    const questionsRef = doc(db, "writingladder_judge_questions", questionBankRef);
    const questionsDoc = await getDoc(questionsRef);
    const questions = questionsDoc.exists() ? questionsDoc.data() as WritingLadderJudgeQuestionSet : null;

    console.log(`✅ Week ${week} 콘텐츠 조회 완료`);
    console.log(`  - Content Pack: ${contentPack.content_pack_id}`);
    console.log(`  - Topic: ${topic?.title || 'N/A'}`);
    console.log(`  - Questions: ${questions?.json.questions.length || 0}개`);

    return NextResponse.json({
      success: true,
      data: {
        course_id: "writing_ladder_level0",
        week,
        content_pack: contentPack,
        topic: topic,
        questions: questions,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Writing Ladder 콘텐츠 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch week content" },
      { status: 500 }
    );
  }
}


