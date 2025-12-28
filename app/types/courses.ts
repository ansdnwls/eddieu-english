/**
 * 코스 홈 화면 타입 정의
 * 
 * Course Instance: 학생이 실제로 진행 중인 코스
 * - 1개 코스를 여러 번 시작할 수 있으므로 "인스턴스" 개념 사용
 */

/**
 * Day 상태
 */
export type DayStatus = "DONE" | "TODO" | "LOCKED";

/**
 * 코스 인스턴스 상태
 */
export type CourseInstanceStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

/**
 * 배지 타입
 */
export type BadgeType = "STREAK" | "NEW" | "ACHIEVEMENT" | "MILESTONE";

/**
 * 이번 주 주제
 */
export interface WeekTopic {
  topic_id: string;
  title_ko: string;
  title_en: string;
}

/**
 * 오늘 할 일 (다음 단계)
 */
export interface NextStep {
  step_id: string; // "DAY1_WRITE_FIX" | "DAY2_SCRIPT_SHADOW" | "DAY3_REHEARSAL_JUDGE" | "WEEK_COMPLETE" | "COURSE_COMPLETE"
  label_ko: string;
  cta_ko: string;
  deeplink: string; // 딥링크 경로
  blocked_reason: string | null; // 잠긴 이유 (null이면 진행 가능)
  next_level_available?: boolean; // 다음 레벨 가능 여부 (코스 완료 시)
}

/**
 * Day별 상태
 */
export interface DayStatusMap {
  day1_write_fix: DayStatus;
  day2_script_shadow: DayStatus;
  day3_rehearsal_judge: DayStatus;
}

/**
 * 주간 결과물
 */
export interface WeeklyOutput {
  required_portfolio_items: number; // 필수 포트폴리오 개수 (보통 1)
  completed_portfolio_items: number; // 완료된 포트폴리오 개수
}

/**
 * 코스 진행 상태
 */
export interface CourseProgress {
  current_week: number; // 현재 진행 중인 주차 (1~12)
  total_weeks: number; // 전체 주차 (12)
  week_progress_ratio: number; // 이번 주 진행률 (0.0 ~ 1.0)
  overall_progress_ratio: number; // 전체 코스 진행률 (0.0 ~ 1.0)
  
  this_week_topic: WeekTopic; // 이번 주 주제
  today_next_step: NextStep; // 오늘 할 일
  day_status: DayStatusMap; // Day별 상태
  weekly_output: WeeklyOutput; // 주간 결과물
}

/**
 * 배지
 */
export interface Badge {
  type: BadgeType;
  label: string;
}

/**
 * 코스 인스턴스 (학생이 진행 중인 코스)
 */
export interface CourseInstance {
  course_instance_id: string; // 인스턴스 ID
  course_id: string; // 코스 ID (예: "show_tell_12w")
  course_title: string; // 코스 제목
  course_subtitle: string; // 코스 부제목
  thumbnail_url: string; // 썸네일 이미지
  status: CourseInstanceStatus; // 상태
  start_date: string; // 시작일 (ISO 8601)
  target_grade_band: string; // 학년대 (예: "HIGH")
  cefr_level: string; // CEFR 레벨 (예: "A2")
  
  progress: CourseProgress; // 진행 상태
  badges: Badge[]; // 배지 리스트
}

/**
 * 탭 UI
 */
export interface TabUI {
  id: string; // "ACTIVE" | "CATALOG"
  label_ko: string;
}

/**
 * Empty State UI
 */
export interface EmptyStateUI {
  title_ko: string;
  subtitle_ko: string;
  primary_cta: {
    label_ko: string;
    deeplink: string;
  };
}

/**
 * UI Hints (프론트엔드 힌트)
 */
export interface UIHints {
  tabs: TabUI[];
  empty_state: EmptyStateUI;
}

/**
 * 진행 중 코스 리스트 응답
 */
export interface CourseInstancesResponse {
  child_id: string;
  server_time: string; // ISO 8601
  active_course_instances: CourseInstance[];
  ui_hints: UIHints;
}



