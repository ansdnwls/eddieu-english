import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { CourseInstancesResponse, CourseInstance, Badge } from "@/app/types/courses";
import { calculateShowTellProgress, calculateWritingLadderProgress } from "@/lib/courseProgressHelper";
import { getCourseDefinitionById } from "@/lib/courseDefinitions";

/**
 * GET /api/v1/children/{child_id}/course-instances
 * 
 * 학생의 진행 중인 코스 인스턴스 목록 조회
 * 
 * Query Params:
 * - status: "ACTIVE" | "PAUSED" | "COMPLETED" (optional, default: "ACTIVE")
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ child_id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { child_id } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ACTIVE";

    console.log("=== 코스 인스턴스 조회 ===");
    console.log("👤 Child ID:", child_id);
    console.log("📊 Status Filter:", status);

    // Course Instances 컬렉션에서 사용자의 진행 중인 코스 조회
    const instancesQuery = query(
      collection(db, "course_instances"),
      where("child_id", "==", child_id),
      where("status", "==", status.toUpperCase())
    );
    const instancesSnapshot = await getDocs(instancesQuery);

    const courseInstances: CourseInstance[] = [];

    // 각 Course Instance에 대해 진행 상태 계산
    for (const instanceDoc of instancesSnapshot.docs) {
      const instanceData = instanceDoc.data();
      const course_id = instanceData.course_id;

      console.log(`📚 Processing course: ${course_id}`);

      // 코스 정의 조회
      const courseDefinition = getCourseDefinitionById(course_id);
      if (!courseDefinition) {
        console.warn(`⚠️ Course definition not found: ${course_id}`);
        continue;
      }

      // 코스별 진행 상태 계산
      let progress = null;
      
      if (course_id === "show_tell_12w") {
        progress = await calculateShowTellProgress(child_id);
      } else if (course_id === "writing_ladder_level0") {
        progress = await calculateWritingLadderProgress(child_id, course_id);
      } else {
        console.warn(`⚠️ Progress calculation not implemented for: ${course_id}`);
        continue;
      }

      if (!progress) {
        console.warn(`⚠️ Failed to calculate progress for: ${course_id}`);
        continue;
      }

      // 배지 계산
      const badges = calculateBadges(progress, courseDefinition);

      // 코스 인스턴스 생성
      const courseInstance: CourseInstance = {
        course_instance_id: instanceData.course_instance_id,
        course_id: course_id,
        course_title: courseDefinition.name_ko,
        course_subtitle: courseDefinition.subtitle_ko,
        thumbnail_url: courseDefinition.thumbnail_url,
        status: instanceData.status,
        start_date: instanceData.start_date,
        target_grade_band: instanceData.grade_band || courseDefinition.grade_bands[0] || "MID",
        cefr_level: instanceData.cefr_level || courseDefinition.cefr_levels[0] || "A1",
        progress,
        badges,
      };

      courseInstances.push(courseInstance);
    }

    console.log(`✅ 코스 인스턴스 조회 완료: ${courseInstances.length}개`);

    // 응답 생성
    const response: CourseInstancesResponse = {
      child_id,
      server_time: new Date().toISOString(),
      active_course_instances: courseInstances,
      ui_hints: {
        tabs: [
          { id: "ACTIVE", label_ko: "진행 중" },
          { id: "CATALOG", label_ko: "전체 코스" },
        ],
        empty_state: {
          title_ko: "진행 중인 코스가 없어요",
          subtitle_ko: "Show & Tell 코스를 시작해볼까요?",
          primary_cta: {
            label_ko: "코스 시작하기",
            deeplink: "/showtell",
          },
        },
      },
    };

    console.log(`✅ 코스 인스턴스 조회 완료: ${courseInstances.length}개`);

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 코스 인스턴스 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch course instances" },
      { status: 500 }
    );
  }
}

/**
 * 배지 계산 헬퍼 함수
 */
function calculateBadges(progress: any, courseDefinition: any): Badge[] {
  const badges: Badge[] = [];

  // 연속 학습 배지 (Mock - 실제로는 학습 기록 조회 필요)
  const streakDays = 2; // TODO: 실제 연속 학습일 계산
  if (streakDays >= 2) {
    badges.push({ type: "STREAK", label: `${streakDays}일 연속` });
  }

  // 새 주제 시작 배지
  if (progress.day_status.day1_write_fix === "TODO" && progress.current_week > 1) {
    badges.push({ type: "NEW", label: "이번 주 주제 시작" });
  }

  // 마일스톤 배지 (코스 완료)
  const isLastWeek = progress.current_week === progress.total_weeks;
  const isDay3Done = progress.day_status.day3_rehearsal_judge === "DONE";
  
  if (isLastWeek && isDay3Done) {
    badges.push({ type: "MILESTONE", label: "🎉 코스 완료!" });
  }

  // 진행률 기반 배지
  if (progress.overall_progress_ratio >= 0.5 && progress.overall_progress_ratio < 1.0) {
    badges.push({ type: "ACHIEVEMENT", label: "절반 완료!" });
  }

  return badges;
}



