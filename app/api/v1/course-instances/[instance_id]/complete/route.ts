import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

/**
 * POST /api/v1/course-instances/[instance_id]/complete
 * 
 * 코스 인스턴스를 COMPLETED 상태로 변경
 * - Level 0 완료 후 호출
 * - 다음 레벨이 AVAILABLE일 때 안내
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ instance_id: string }> }
) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { instance_id } = await context.params;

    console.log(`🏁 코스 완료 처리 시작: ${instance_id}`);

    // Course Instance 존재 확인
    const instanceRef = doc(db, "course_instances", instance_id);
    const instanceDoc = await getDoc(instanceRef);

    if (!instanceDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Course instance not found" },
        { status: 404 }
      );
    }

    const instance = instanceDoc.data();
    const { child_id, course_id, status } = instance;

    // 이미 완료된 경우
    if (status === "COMPLETED") {
      console.log("⚠️ 이미 완료된 코스입니다.");
      return NextResponse.json({
        success: true,
        message: "Course already completed",
        data: instance,
      });
    }

    // 코스 완료 상태로 업데이트
    await updateDoc(instanceRef, {
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log(`✅ 코스 완료 처리 완료: ${course_id} (${child_id})`);

    // 다음 레벨 확인 (Writing Ladder Level 0 → Level 1)
    let next_level_info = null;
    if (course_id === "writing_ladder_level0") {
      // Level 1이 AVAILABLE한지 확인 (추후 구현)
      next_level_info = {
        next_course_id: "writing_ladder_level1",
        next_course_name: "Writing Ladder Level 1 (단락)",
        available: false, // 현재는 COMING_SOON
        message: "Level 1은 곧 출시됩니다! 🚀",
      };
    }

    return NextResponse.json({
      success: true,
      message: "Course completed successfully",
      data: {
        course_id,
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
        next_level_info,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 코스 완료 처리 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to complete course" },
      { status: 500 }
    );
  }
}


