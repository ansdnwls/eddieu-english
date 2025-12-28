import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { ShowTellContentPack, JudgeQuestionSet, ShowTellTopic } from "@/app/types/showtell";

/**
 * Show & Tell 콘텐츠 팩 조회 API
 * 
 * GET /api/showtell/content?week=1
 * GET /api/showtell/content?week=1&includeQuestions=true
 * GET /api/showtell/content (전체 조회)
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
    const includeQuestions = searchParams.get("includeQuestions") === "true";

    console.log("📚 Show & Tell 콘텐츠 조회 요청:", { week: weekParam, includeQuestions });

    // 특정 주차 조회
    if (weekParam) {
      const week = parseInt(weekParam, 10);
      
      if (isNaN(week) || week < 1 || week > 12) {
        return NextResponse.json(
          { success: false, error: "Invalid week number. Must be between 1 and 12." },
          { status: 400 }
        );
      }

      // Content Pack 조회
      const contentPackRef = doc(db, "showtell_content_packs", `showtell_week${week}`);
      const contentPackDoc = await getDoc(contentPackRef);

      if (!contentPackDoc.exists()) {
        return NextResponse.json(
          { success: false, error: `Content pack for week ${week} not found` },
          { status: 404 }
        );
      }

      const contentPack = {
        ...contentPackDoc.data(),
      } as ShowTellContentPack;

      // Topic 조회 (참조 데이터)
      const topicRef = doc(db, "showtell_topics", contentPack.topic_id);
      const topicDoc = await getDoc(topicRef);
      const topic = topicDoc.exists() ? topicDoc.data() as ShowTellTopic : null;

      // Judge Questions 조회 (옵션)
      let questions: JudgeQuestionSet | null = null;
      if (includeQuestions) {
        const questionBankRef = contentPack.json.day3.judge.question_bank_ref;
        const questionsRef = doc(db, "showtell_judge_questions", questionBankRef);
        const questionsDoc = await getDoc(questionsRef);
        questions = questionsDoc.exists() ? questionsDoc.data() as JudgeQuestionSet : null;
      }

      console.log(`✅ Week ${week} 콘텐츠 조회 완료`);

      return NextResponse.json({
        success: true,
        data: {
          content_pack: contentPack,
          topic: topic,
          questions: questions,
        },
      });
    }

    // 전체 주차 조회 (1~12주)
    const contentPacksQuery = query(
      collection(db, "showtell_content_packs"),
      where("course_id", "==", "show_tell_12w"),
      where("active", "==", true),
      orderBy("week", "asc")
    );

    const contentPacksSnapshot = await getDocs(contentPacksQuery);
    const contentPacks: ShowTellContentPack[] = [];

    contentPacksSnapshot.forEach((doc) => {
      contentPacks.push({
        ...doc.data(),
      } as ShowTellContentPack);
    });

    console.log(`✅ 전체 콘텐츠 조회 완료 (${contentPacks.length}개)`);

    return NextResponse.json({
      success: true,
      data: {
        content_packs: contentPacks,
        total: contentPacks.length,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Show & Tell 콘텐츠 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch content" },
      { status: 500 }
    );
  }
}





