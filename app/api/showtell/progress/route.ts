import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { ShowTellWeekProgress } from "@/app/types/showtell";

/**
 * Show & Tell Progress API
 * 
 * GET /api/showtell/progress?child_id=xxx
 * - 아이의 전체 12주 진행 상태 조회
 * 
 * GET /api/showtell/progress?child_id=xxx&week=1
 * - 특정 주차 진행 상태 조회
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
    const child_id = searchParams.get("child_id");
    const weekParam = searchParams.get("week");

    if (!child_id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: child_id" },
        { status: 400 }
      );
    }

    console.log("📊 Progress 조회:", { child_id, week: weekParam });

    // 특정 주차 진행 상태 조회
    if (weekParam) {
      const week = parseInt(weekParam, 10);
      
      if (isNaN(week) || week < 1 || week > 12) {
        return NextResponse.json(
          { success: false, error: "Invalid week number. Must be between 1 and 12." },
          { status: 400 }
        );
      }

      const progress_id = `progress_${child_id}_week${week}`;
      const progressRef = doc(db, "showtell_week_progress", progress_id);
      const progressDoc = await getDoc(progressRef);

      if (!progressDoc.exists()) {
        // 아직 시작하지 않은 주차
        return NextResponse.json({
          success: true,
          data: {
            progress_id,
            child_id,
            course_id: "show_tell_12w",
            week,
            day1_completed: false,
            day2_completed: false,
            day3_completed: false,
            portfolio_completed: false,
            current_day: null,
            started_at: null,
            completed_at: null,
            updated_at: null,
          } as ShowTellWeekProgress,
        });
      }

      return NextResponse.json({
        success: true,
        data: progressDoc.data() as ShowTellWeekProgress,
      });
    }

    // 전체 12주 진행 상태 조회
    const progressQuery = query(
      collection(db, "showtell_week_progress"),
      where("child_id", "==", child_id),
      where("course_id", "==", "show_tell_12w"),
      orderBy("week", "asc")
    );

    const progressSnapshot = await getDocs(progressQuery);
    const progressList: ShowTellWeekProgress[] = [];

    progressSnapshot.forEach((doc) => {
      progressList.push(doc.data() as ShowTellWeekProgress);
    });

    // 시작하지 않은 주차들 추가 (1~12주 전체)
    const completedWeeks = new Set(progressList.map(p => p.week));
    for (let week = 1; week <= 12; week++) {
      if (!completedWeeks.has(week)) {
        progressList.push({
          progress_id: `progress_${child_id}_week${week}`,
          child_id,
          course_id: "show_tell_12w",
          week,
          day1_completed: false,
          day2_completed: false,
          day3_completed: false,
          portfolio_completed: false,
          current_day: null,
          started_at: "",
          updated_at: "",
        } as ShowTellWeekProgress);
      }
    }

    // week 순으로 정렬
    progressList.sort((a, b) => a.week - b.week);

    // 전체 완료율 계산
    const totalCompleted = progressList.filter(p => p.portfolio_completed).length;
    const completionRate = Math.round((totalCompleted / 12) * 100);

    // 현재 진행 중인 주차 찾기
    const currentWeek = progressList.find(p => 
      !p.portfolio_completed && p.started_at
    );

    console.log(`✅ Progress 조회 완료: ${totalCompleted}/12 완료`);

    return NextResponse.json({
      success: true,
      data: {
        child_id,
        course_id: "show_tell_12w",
        weeks: progressList,
        total_weeks: 12,
        completed_weeks: totalCompleted,
        completion_rate: completionRate,
        current_week: currentWeek?.week || null,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Progress 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch progress" },
      { status: 500 }
    );
  }
}




