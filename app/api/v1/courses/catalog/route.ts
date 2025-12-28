import { NextRequest, NextResponse } from "next/server";
import { 
  getAllCatalogCourses, 
  CourseCatalogResponse 
} from "@/lib/courseDefinitions";

/**
 * GET /api/v1/courses/catalog
 * 
 * 전체 코스 카탈로그 조회
 * - AVAILABLE: 시작 가능한 코스
 * - COMING_SOON: 준비 중인 코스
 */
export async function GET(request: NextRequest) {
  try {
    console.log("=== 코스 카탈로그 조회 ===");

    // 전체 카탈로그 조회 (AVAILABLE + COMING_SOON)
    const courses = getAllCatalogCourses();

    const response: CourseCatalogResponse = {
      courses,
      server_time: new Date().toISOString(),
    };

    console.log(`✅ 코스 카탈로그 조회 완료: ${courses.length}개`);

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 코스 카탈로그 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch course catalog" },
      { status: 500 }
    );
  }
}


