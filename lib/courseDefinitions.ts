/**
 * 코스 정의 (Course Definitions)
 * 
 * 시스템에 등록된 모든 코스의 메타데이터를 정의합니다.
 * Firestore에 저장되거나, 코드 레벨에서 관리할 수 있습니다.
 */

export type CourseState = "AVAILABLE" | "COMING_SOON" | "HIDDEN" | "ARCHIVED";

export type WeeklyRoutineStep = 
  | "DAY1_WRITE_FIX" 
  | "DAY2_SCRIPT_SHADOW" 
  | "DAY3_REHEARSAL_JUDGE";

export type PortfolioOutputItem = 
  | "writing" 
  | "script" 
  | "rehearsal_audio2" 
  | "judge_log"
  | "tts_audio"
  | "shadowing_audios";

/**
 * 코스 정의
 */
export interface CourseDefinition {
  course_id: string; // 코스 고유 ID
  name_ko: string; // 한국어 이름
  name_en?: string; // 영어 이름 (선택)
  subtitle_ko: string; // 부제목
  description_ko?: string; // 상세 설명
  duration_weeks: number; // 주차 수
  grade_bands: string[]; // 대상 학년 (["LOW", "MID", "HIGH"])
  cefr_levels: string[]; // CEFR 레벨 (["A1", "A2", "B1", "B2"])
  state: CourseState; // 코스 상태
  default_weekly_routine: WeeklyRoutineStep[]; // 주간 루틴
  portfolio_output: PortfolioOutputItem[]; // 포트폴리오 항목
  thumbnail_url: string; // 썸네일 이미지 URL
  landing_page_url?: string; // 랜딩 페이지 URL
  start_deeplink?: string; // 시작 버튼 딥링크
  catalog_order?: number; // 카탈로그 정렬 순서 (낮을수록 먼저)
}

/**
 * 코스 카탈로그 API 응답
 */
export interface CourseCatalogResponse {
  courses: CourseDefinition[];
  server_time: string;
}

/**
 * 코스 시작 요청
 */
export interface CourseStartRequest {
  child_id: string;
  course_id: string;
  start_week?: number; // 시작 주차 (기본값: 1)
}

/**
 * 코스 시작 응답
 */
export interface CourseStartResponse {
  success: boolean;
  data?: {
    course_instance_id: string;
    course_id: string;
    child_id: string;
    start_week: number;
    first_day_deeplink: string; // 첫 Day로 이동하는 딥링크
  };
  error?: string;
}

// ====================================
// 코스 정의 데이터 (하드코딩)
// ====================================

/**
 * 등록된 모든 코스 정의
 */
export const COURSE_DEFINITIONS: CourseDefinition[] = [
  // Show & Tell 12주 코스
  {
    course_id: "show_tell_12w",
    name_ko: "Show & Tell (12주)",
    name_en: "Show & Tell (12 weeks)",
    subtitle_ko: "매주 발표 1개 완성",
    description_ko: "12주 동안 매주 새로운 주제로 영어 발표를 연습하는 코스입니다. Day 1에서 글을 쓰고, Day 2에서 발표 대본을 만들고, Day 3에서 리허설과 Judge Q&A를 진행합니다.",
    duration_weeks: 12,
    grade_bands: ["HIGH"], // 초등 고학년
    cefr_levels: ["A2"],
    state: "AVAILABLE",
    default_weekly_routine: ["DAY1_WRITE_FIX", "DAY2_SCRIPT_SHADOW", "DAY3_REHEARSAL_JUDGE"],
    portfolio_output: ["writing", "script", "rehearsal_audio2", "judge_log"],
    thumbnail_url: "/course-thumbnails/showtell.png",
    landing_page_url: "/showtell",
    start_deeplink: "/showtell",
    catalog_order: 1,
  },

  // Writing Ladder Level 0 (문장 4주)
  {
    course_id: "writing_ladder_level0",
    name_ko: "Writing Ladder Level 0",
    name_en: "Writing Ladder Level 0",
    subtitle_ko: "문장부터 탄탄하게 (4주)",
    description_ko: "4가지 문장 패턴(I like, I can, I have, I want)을 배우는 기초 영어 쓰기 코스입니다. 문장 쓰기부터 시작하여 발표와 Q&A까지 연습합니다.",
    duration_weeks: 4,
    grade_bands: ["LOW", "MID"], // 초등 저학년~중학년
    cefr_levels: ["A1"],
    state: "AVAILABLE",
    default_weekly_routine: ["DAY1_WRITE_FIX", "DAY2_SCRIPT_SHADOW", "DAY3_REHEARSAL_JUDGE"],
    portfolio_output: ["writing", "script", "rehearsal_audio2", "judge_log"],
    thumbnail_url: "/course-thumbnails/writingladder-level0.png",
    landing_page_url: "/writingladder",
    start_deeplink: "/writingladder",
    catalog_order: 2,
  },

  // Writing Ladder Level 1 (단락 4주) - 준비 중
  {
    course_id: "writing_ladder_level1",
    name_ko: "Writing Ladder Level 1",
    name_en: "Writing Ladder Level 1",
    subtitle_ko: "단락 쓰기 (4주)",
    description_ko: "Topic sentence, Supporting details, Conclusion을 갖춘 단락 쓰기를 배우는 코스입니다. (준비 중)",
    duration_weeks: 4,
    grade_bands: ["MID", "HIGH"], // 초등 중학년~고학년
    cefr_levels: ["A2"],
    state: "COMING_SOON",
    default_weekly_routine: ["DAY1_WRITE_FIX", "DAY2_SCRIPT_SHADOW", "DAY3_REHEARSAL_JUDGE"],
    portfolio_output: ["writing", "script", "rehearsal_audio2", "judge_log"],
    thumbnail_url: "/course-thumbnails/writingladder-level1.png",
    catalog_order: 3,
  },

  // Writing Ladder Level 2 (에세이 4주) - 준비 중
  {
    course_id: "writing_ladder_level2",
    name_ko: "Writing Ladder Level 2",
    name_en: "Writing Ladder Level 2",
    subtitle_ko: "에세이 쓰기 (4주)",
    description_ko: "3단락 에세이(Introduction, Body, Conclusion)를 작성하는 코스입니다. (준비 중)",
    duration_weeks: 4,
    grade_bands: ["HIGH"], // 초등 고학년~중등
    cefr_levels: ["B1"],
    state: "COMING_SOON",
    default_weekly_routine: ["DAY1_WRITE_FIX", "DAY2_SCRIPT_SHADOW", "DAY3_REHEARSAL_JUDGE"],
    portfolio_output: ["writing", "script", "rehearsal_audio2", "judge_log"],
    thumbnail_url: "/course-thumbnails/writingladder-level2.png",
    catalog_order: 4,
  },

  // Writing Ladder Level 3 (창작 4주) - 준비 중
  {
    course_id: "writing_ladder_level3",
    name_ko: "Writing Ladder Level 3",
    name_en: "Writing Ladder Level 3",
    subtitle_ko: "창작 글쓰기 (4주)",
    description_ko: "스토리텔링, 시, 편지 등 다양한 형식의 창작 글쓰기를 시도하는 코스입니다. (준비 중)",
    duration_weeks: 4,
    grade_bands: ["HIGH"], // 초등 고학년~중등
    cefr_levels: ["B1", "B2"],
    state: "COMING_SOON",
    default_weekly_routine: ["DAY1_WRITE_FIX", "DAY2_SCRIPT_SHADOW", "DAY3_REHEARSAL_JUDGE"],
    portfolio_output: ["writing", "script", "rehearsal_audio2", "judge_log"],
    thumbnail_url: "/course-thumbnails/writingladder-level3.png",
    catalog_order: 5,
  },
];

/**
 * 코스 ID로 코스 정의 조회
 */
export function getCourseDefinitionById(course_id: string): CourseDefinition | undefined {
  return COURSE_DEFINITIONS.find(c => c.course_id === course_id);
}

/**
 * AVAILABLE 상태의 코스만 필터링
 */
export function getAvailableCourses(): CourseDefinition[] {
  return COURSE_DEFINITIONS
    .filter(c => c.state === "AVAILABLE")
    .sort((a, b) => (a.catalog_order || 999) - (b.catalog_order || 999));
}

/**
 * COMING_SOON 상태의 코스만 필터링
 */
export function getComingSoonCourses(): CourseDefinition[] {
  return COURSE_DEFINITIONS
    .filter(c => c.state === "COMING_SOON")
    .sort((a, b) => (a.catalog_order || 999) - (b.catalog_order || 999));
}

/**
 * 전체 카탈로그 (AVAILABLE + COMING_SOON)
 */
export function getAllCatalogCourses(): CourseDefinition[] {
  return COURSE_DEFINITIONS
    .filter(c => c.state === "AVAILABLE" || c.state === "COMING_SOON")
    .sort((a, b) => (a.catalog_order || 999) - (b.catalog_order || 999));
}


