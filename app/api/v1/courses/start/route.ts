import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { 
  getCourseDefinitionById, 
  CourseStartRequest, 
  CourseStartResponse 
} from "@/lib/courseDefinitions";

/**
 * POST /api/v1/courses/start
 * 
 * 코스 시작 (Course Instance 생성)
 * 
 * Body:
 * {
 *   "child_id": "child_demo_001",
 *   "course_id": "writing_ladder_level0",
 *   "start_week": 1
 * }
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    // 요청 본문 파싱
    const body: CourseStartRequest = await request.json();
    const { child_id, course_id, start_week = 1 } = body;

    console.log("=== 코스 시작 ===");
    console.log("👤 Child ID:", child_id);
    console.log("📚 Course ID:", course_id);
    console.log("📅 Start Week:", start_week);

    // 입력 검증
    if (!child_id || !course_id) {
      return NextResponse.json(
        { success: false, error: "child_id and course_id are required" },
        { status: 400 }
      );
    }

    // 코스 정의 조회
    const courseDefinition = getCourseDefinitionById(course_id);
    if (!courseDefinition) {
      return NextResponse.json(
        { success: false, error: `Course not found: ${course_id}` },
        { status: 404 }
      );
    }

    // AVAILABLE 상태 확인
    if (courseDefinition.state !== "AVAILABLE") {
      return NextResponse.json(
        { success: false, error: `Course is not available: ${courseDefinition.state}` },
        { status: 400 }
      );
    }

    // Course Instance ID 생성
    const course_instance_id = `ci_${child_id}_${course_id}_${Date.now()}`;

    // Course Instance 생성 (Firestore)
    const courseInstanceRef = doc(db, "course_instances", course_instance_id);
    await setDoc(courseInstanceRef, {
      course_instance_id,
      child_id,
      course_id,
      status: "ACTIVE",
      start_date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      start_week,
      current_week: start_week,
      completed_weeks: [],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    console.log(`✅ Course Instance 생성 완료: ${course_instance_id}`);

    // 첫 Day 딥링크 결정
    let first_day_deeplink = "/";
    
    if (course_id === "show_tell_12w") {
      first_day_deeplink = `/showtell/week/${start_week}/day1`;
    } else if (course_id === "writing_ladder_level0") {
      first_day_deeplink = `/writingladder/week/${start_week}/day1`;
    } else if (course_id.startsWith("writing_ladder_")) {
      first_day_deeplink = `/writingladder/week/${start_week}/day1`;
    }

    const response: CourseStartResponse = {
      success: true,
      data: {
        course_instance_id,
        course_id,
        child_id,
        start_week,
        first_day_deeplink,
      },
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 코스 시작 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to start course" },
      { status: 500 }
    );
  }
}


