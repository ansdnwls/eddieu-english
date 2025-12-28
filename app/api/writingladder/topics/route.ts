import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { WritingLadderTopic } from "@/app/types/writingladder";

/**
 * Writing Ladder 주제 목록 조회 API
 * 
 * GET /api/writingladder/topics
 * GET /api/writingladder/topics?week=1
 * GET /api/writingladder/topics?level=LEVEL0_SENTENCE
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

    console.log("📚 Writing Ladder 주제 조회 요청:", { week: weekParam, level });

    let topicsQuery;

    if (weekParam) {
      const week = parseInt(weekParam, 10);
      
      if (isNaN(week) || week < 1 || week > 4) {
        return NextResponse.json(
          { success: false, error: "Invalid week number. Must be between 1 and 4." },
          { status: 400 }
        );
      }

      topicsQuery = query(
        collection(db, "writingladder_topics"),
        where("week", "==", week),
        where("level", "==", level),
        where("active", "==", true)
      );
    } else {
      topicsQuery = query(
        collection(db, "writingladder_topics"),
        where("level", "==", level),
        where("active", "==", true),
        orderBy("week", "asc")
      );
    }

    const topicsSnapshot = await getDocs(topicsQuery);
    const topics: WritingLadderTopic[] = [];

    topicsSnapshot.forEach((doc) => {
      topics.push({
        ...doc.data(),
      } as WritingLadderTopic);
    });

    console.log(`✅ 주제 조회 완료 (${topics.length}개)`);

    return NextResponse.json({
      success: true,
      data: {
        topics: topics,
        total: topics.length,
        level,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Writing Ladder 주제 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch topics" },
      { status: 500 }
    );
  }
}


