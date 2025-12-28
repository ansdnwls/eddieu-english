import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { ShowTellTopic } from "@/app/types/showtell";

/**
 * Show & Tell 주제 목록 조회 API
 * 
 * GET /api/showtell/topics
 * GET /api/showtell/topics?week=1
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

    console.log("📚 Show & Tell 주제 조회 요청:", { week: weekParam });

    let topicsQuery;

    if (weekParam) {
      const week = parseInt(weekParam, 10);
      
      if (isNaN(week) || week < 1 || week > 12) {
        return NextResponse.json(
          { success: false, error: "Invalid week number. Must be between 1 and 12." },
          { status: 400 }
        );
      }

      topicsQuery = query(
        collection(db, "showtell_topics"),
        where("week", "==", week),
        where("active", "==", true)
      );
    } else {
      topicsQuery = query(
        collection(db, "showtell_topics"),
        where("active", "==", true),
        orderBy("week", "asc")
      );
    }

    const topicsSnapshot = await getDocs(topicsQuery);
    const topics: ShowTellTopic[] = [];

    topicsSnapshot.forEach((doc) => {
      topics.push({
        ...doc.data(),
      } as ShowTellTopic);
    });

    console.log(`✅ 주제 조회 완료 (${topics.length}개)`);

    return NextResponse.json({
      success: true,
      data: {
        topics: topics,
        total: topics.length,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Show & Tell 주제 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch topics" },
      { status: 500 }
    );
  }
}





