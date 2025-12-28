/**
 * 코스 진행 상태 계산 헬퍼
 * 
 * Show & Tell 코스의 Day별 완료 상태, 다음 단계, 진행률 등을 계산합니다.
 */

import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { 
  ShowTellWeekProgress, 
  WritingSubmission, 
  Script, 
  RehearsalSession, 
  JudgeSession, 
  AudioRecord,
  ShowTellTopic
} from "@/app/types/showtell";
import {
  WritingLadderWeekProgress,
  WritingLadderTopic
} from "@/app/types/writingladder";
import { 
  CourseProgress, 
  DayStatusMap, 
  NextStep, 
  WeekTopic 
} from "@/app/types/courses";

/**
 * Show & Tell 코스의 진행 상태 계산
 */
export async function calculateShowTellProgress(
  child_id: string
): Promise<CourseProgress | null> {
  if (!db) {
    console.error("❌ Firebase not initialized");
    return null;
  }

  try {
    // 1. 모든 주차 진행 상태 조회
    const progressQuery = query(
      collection(db, "showtell_week_progress"),
      where("child_id", "==", child_id),
      where("course_id", "==", "show_tell_12w"),
      orderBy("week", "asc")
    );
    const progressSnapshot = await getDocs(progressQuery);
    const allProgress: ShowTellWeekProgress[] = [];
    progressSnapshot.forEach((doc) => {
      allProgress.push(doc.data() as ShowTellWeekProgress);
    });

    // 2. 현재 주차 결정
    let current_week = 1;
    for (let i = 0; i < allProgress.length; i++) {
      if (allProgress[i].portfolio_completed) {
        current_week = allProgress[i].week + 1; // 완료된 주차 + 1
      } else {
        current_week = allProgress[i].week;
        break;
      }
    }
    if (current_week > 12) current_week = 12; // 최대 12주

    // 3. 현재 주차 진행 상태 조회
    const progress_id = `progress_${child_id}_week${current_week}`;
    const progressRef = doc(db, "showtell_week_progress", progress_id);
    const progressDoc = await getDoc(progressRef);

    let currentWeekProgress: ShowTellWeekProgress | null = null;
    if (progressDoc.exists()) {
      currentWeekProgress = progressDoc.data() as ShowTellWeekProgress;
    }

    // 4. Day별 상태 계산
    const dayStatus = await calculateDayStatus(child_id, current_week, currentWeekProgress);

    // 5. 다음 단계 결정
    const nextStep = determineNextStep(current_week, dayStatus);

    // 6. 이번 주 주제 조회
    const weekTopic = await getWeekTopic(current_week);

    // 7. 주간 결과물 확인
    const weeklyOutput = {
      required_portfolio_items: 1,
      completed_portfolio_items: currentWeekProgress?.portfolio_completed ? 1 : 0,
    };

    // 8. 진행률 계산
    const week_progress_ratio = calculateWeekProgressRatio(dayStatus, weeklyOutput);
    const overall_progress_ratio = allProgress.filter(p => p.portfolio_completed).length / 12;

    return {
      current_week,
      total_weeks: 12,
      week_progress_ratio,
      overall_progress_ratio,
      this_week_topic: weekTopic,
      today_next_step: nextStep,
      day_status: dayStatus,
      weekly_output: weeklyOutput,
    };

  } catch (error) {
    console.error("❌ 진행 상태 계산 오류:", error);
    return null;
  }
}

/**
 * Day별 상태 계산
 */
async function calculateDayStatus(
  child_id: string,
  week: number,
  currentWeekProgress: ShowTellWeekProgress | null
): Promise<DayStatusMap> {
  if (!db) {
    return {
      day1_write_fix: "TODO",
      day2_script_shadow: "LOCKED",
      day3_rehearsal_judge: "LOCKED",
    };
  }

  try {
    // Day1 완료 조건: WritingSubmission + CorrectionResult
    const day1_done = !!currentWeekProgress?.day1_submission_id && !!currentWeekProgress?.day1_correction_id;

    // Day2 완료 조건: Script + Shadowing 3개
    const day2_done = 
      !!currentWeekProgress?.day2_script_id && 
      (currentWeekProgress?.day2_shadowing_audio_ids?.length || 0) >= 3;

    // Day3 완료 조건: Rehearsal attempt2 + JudgeSession 완료
    const day3_done = 
      !!currentWeekProgress?.day3_rehearsal_session_id && 
      !!currentWeekProgress?.day3_judge_session_id &&
      currentWeekProgress?.day3_completed === true;

    // Day별 상태 결정
    const day1_status: "DONE" | "TODO" = day1_done ? "DONE" : "TODO";
    const day2_status: "DONE" | "TODO" | "LOCKED" = day1_done ? (day2_done ? "DONE" : "TODO") : "LOCKED";
    const day3_status: "DONE" | "TODO" | "LOCKED" = day2_done ? (day3_done ? "DONE" : "TODO") : "LOCKED";

    return {
      day1_write_fix: day1_status,
      day2_script_shadow: day2_status,
      day3_rehearsal_judge: day3_status,
    };

  } catch (error) {
    console.error("❌ Day 상태 계산 오류:", error);
    return {
      day1_write_fix: "TODO",
      day2_script_shadow: "LOCKED",
      day3_rehearsal_judge: "LOCKED",
    };
  }
}

/**
 * 다음 단계 결정
 */
function determineNextStep(week: number, dayStatus: DayStatusMap): NextStep {
  // Day1 TODO
  if (dayStatus.day1_write_fix === "TODO") {
    return {
      step_id: "DAY1_WRITE_FIX",
      label_ko: "Day1: 글쓰기 + 교정",
      cta_ko: "오늘 할 일 시작하기",
      deeplink: `/showtell/week/${week}/day1`,
      blocked_reason: null,
    };
  }

  // Day2 TODO
  if (dayStatus.day1_write_fix === "DONE" && dayStatus.day2_script_shadow === "TODO") {
    return {
      step_id: "DAY2_SCRIPT_SHADOW",
      label_ko: "Day2: 발표 대본 + 따라말하기",
      cta_ko: "오늘 할 일 시작하기",
      deeplink: `/showtell/week/${week}/day2`,
      blocked_reason: null,
    };
  }

  // Day3 TODO
  if (dayStatus.day2_script_shadow === "DONE" && dayStatus.day3_rehearsal_judge === "TODO") {
    return {
      step_id: "DAY3_REHEARSAL_JUDGE",
      label_ko: "Day3: 리허설 + 심사",
      cta_ko: "오늘 할 일 시작하기",
      deeplink: `/showtell/week/${week}/day3`,
      blocked_reason: null,
    };
  }

  // 이번 주 완료 → 다음 주 시작
  if (dayStatus.day3_rehearsal_judge === "DONE") {
    if (week >= 12) {
      return {
        step_id: "COURSE_COMPLETE",
        label_ko: "🎉 코스 완료!",
        cta_ko: "포트폴리오 보기",
        deeplink: `/showtell/portfolio`,
        blocked_reason: null,
      };
    }

    return {
      step_id: "WEEK_COMPLETE",
      label_ko: "이번 주 완료!",
      cta_ko: "다음 주 시작하기",
      deeplink: `/showtell/week/${week + 1}`,
      blocked_reason: null,
    };
  }

  // Fallback (Day2/Day3 LOCKED)
  if (dayStatus.day2_script_shadow === "LOCKED") {
    return {
      step_id: "DAY2_LOCKED",
      label_ko: "Day2: 발표 대본 + 따라말하기",
      cta_ko: "Day1을 먼저 완료하세요",
      deeplink: `/showtell/week/${week}/day1`,
      blocked_reason: "Day1을 먼저 완료해야 Day2가 열려요",
    };
  }

  if (dayStatus.day3_rehearsal_judge === "LOCKED") {
    return {
      step_id: "DAY3_LOCKED",
      label_ko: "Day3: 리허설 + 심사",
      cta_ko: "Day2를 먼저 완료하세요",
      deeplink: `/showtell/week/${week}/day2`,
      blocked_reason: "Day2를 먼저 완료해야 Day3가 열려요",
    };
  }

  // 기본값
  return {
    step_id: "DAY1_WRITE_FIX",
    label_ko: "Day1: 글쓰기 + 교정",
    cta_ko: "오늘 할 일 시작하기",
    deeplink: `/showtell/week/${week}/day1`,
    blocked_reason: null,
  };
}

/**
 * 이번 주 주제 조회
 */
async function getWeekTopic(week: number): Promise<WeekTopic> {
  if (!db) {
    return {
      topic_id: "topic.unknown",
      title_ko: "주제 없음",
      title_en: "No Topic",
    };
  }

  try {
    const topicQuery = query(
      collection(db, "showtell_topics"),
      where("week", "==", week),
      limit(1)
    );
    const topicSnapshot = await getDocs(topicQuery);

    if (!topicSnapshot.empty) {
      const topicData = topicSnapshot.docs[0].data() as ShowTellTopic;
      return {
        topic_id: topicData.topic_id,
        title_ko: topicData.json.title_ko,
        title_en: topicData.json.title_en,
      };
    }

    return {
      topic_id: `topic.week${week}`,
      title_ko: `Week ${week} 주제`,
      title_en: `Week ${week} Topic`,
    };

  } catch (error) {
    console.error("❌ 주제 조회 오류:", error);
    return {
      topic_id: `topic.week${week}`,
      title_ko: `Week ${week} 주제`,
      title_en: `Week ${week} Topic`,
    };
  }
}

/**
 * 주간 진행률 계산
 */
function calculateWeekProgressRatio(dayStatus: DayStatusMap, weeklyOutput: { completed_portfolio_items: number }): number {
  if (weeklyOutput.completed_portfolio_items > 0) {
    return 1.0; // 포트폴리오 완료 = 100%
  }

  let completedDays = 0;
  if (dayStatus.day1_write_fix === "DONE") completedDays++;
  if (dayStatus.day2_script_shadow === "DONE") completedDays++;
  if (dayStatus.day3_rehearsal_judge === "DONE") completedDays++;

  return completedDays / 3; // 3 Days 기준
}

// ====================================
// Writing Ladder 진행 상태 계산
// ====================================

/**
 * Writing Ladder 코스의 진행 상태 계산
 */
export async function calculateWritingLadderProgress(
  child_id: string,
  course_id: string = "writing_ladder_level0"
): Promise<CourseProgress | null> {
  if (!db) {
    console.error("❌ Firebase not initialized");
    return null;
  }

  try {
    // 코스별 총 주차 수
    const totalWeeks = course_id === "writing_ladder_level0" ? 4 : 4;

    // 1. 모든 주차 진행 상태 조회
    const progressQuery = query(
      collection(db, "writingladder_week_progress"),
      where("child_id", "==", child_id),
      where("course_id", "==", course_id),
      orderBy("week", "asc")
    );
    const progressSnapshot = await getDocs(progressQuery);
    const allProgress: WritingLadderWeekProgress[] = [];
    progressSnapshot.forEach((doc) => {
      allProgress.push(doc.data() as WritingLadderWeekProgress);
    });

    // 2. 현재 주차 결정
    let current_week = 1;
    for (let i = 0; i < allProgress.length; i++) {
      if (allProgress[i].portfolio_completed) {
        current_week = allProgress[i].week + 1; // 완료된 주차 + 1
      } else {
        current_week = allProgress[i].week;
        break;
      }
    }
    if (current_week > totalWeeks) current_week = totalWeeks;

    // 3. 현재 주차 진행 상태 조회
    const progress_id = `progress_${child_id}_${course_id}_week${current_week}`;
    const progressRef = doc(db, "writingladder_week_progress", progress_id);
    const progressDoc = await getDoc(progressRef);

    let currentWeekProgress: WritingLadderWeekProgress | null = null;
    if (progressDoc.exists()) {
      currentWeekProgress = progressDoc.data() as WritingLadderWeekProgress;
    }

    // 4. Day별 상태 계산
    const dayStatus = await calculateWritingLadderDayStatus(child_id, current_week, currentWeekProgress);

    // 5. 다음 단계 결정
    const nextStep = determineWritingLadderNextStep(current_week, dayStatus, totalWeeks);

    // 6. 이번 주 주제 조회
    const weekTopic = await getWritingLadderWeekTopic(current_week, course_id);

    // 7. 주간 결과물 확인
    const weeklyOutput = {
      required_portfolio_items: 1,
      completed_portfolio_items: currentWeekProgress?.portfolio_completed ? 1 : 0,
    };

    // 8. 진행률 계산
    const week_progress_ratio = calculateWeekProgressRatio(dayStatus, weeklyOutput);
    const overall_progress_ratio = allProgress.filter(p => p.portfolio_completed).length / totalWeeks;

    return {
      current_week,
      total_weeks: totalWeeks,
      week_progress_ratio,
      overall_progress_ratio,
      this_week_topic: weekTopic,
      today_next_step: nextStep,
      day_status: dayStatus,
      weekly_output: weeklyOutput,
    };

  } catch (error) {
    console.error("❌ Writing Ladder 진행 상태 계산 오류:", error);
    return null;
  }
}

/**
 * Writing Ladder Day별 상태 계산
 */
async function calculateWritingLadderDayStatus(
  child_id: string,
  week: number,
  currentWeekProgress: WritingLadderWeekProgress | null
): Promise<DayStatusMap> {
  if (!db) {
    return {
      day1_write_fix: "TODO",
      day2_script_shadow: "LOCKED",
      day3_rehearsal_judge: "LOCKED",
    };
  }

  try {
    // Day1 완료 조건: WritingSubmission + CorrectionResult
    const day1_done = !!currentWeekProgress?.day1_submission_id && !!currentWeekProgress?.day1_correction_id;

    // Day2 완료 조건: Script + Shadowing 1개 이상 (Writing Ladder는 짧아서 1개로 충분)
    const day2_done = 
      !!currentWeekProgress?.day2_script_id && 
      (currentWeekProgress?.day2_shadowing_audio_ids?.length || 0) >= 1;

    // Day3 완료 조건: Rehearsal attempt2 + JudgeSession 완료
    const day3_done = 
      !!currentWeekProgress?.day3_rehearsal_session_id && 
      !!currentWeekProgress?.day3_judge_session_id &&
      currentWeekProgress?.day3_completed === true;

    // Day별 상태 결정
    const day1_status: "DONE" | "TODO" = day1_done ? "DONE" : "TODO";
    const day2_status: "DONE" | "TODO" | "LOCKED" = day1_done ? (day2_done ? "DONE" : "TODO") : "LOCKED";
    const day3_status: "DONE" | "TODO" | "LOCKED" = day2_done ? (day3_done ? "DONE" : "TODO") : "LOCKED";

    return {
      day1_write_fix: day1_status,
      day2_script_shadow: day2_status,
      day3_rehearsal_judge: day3_status,
    };

  } catch (error) {
    console.error("❌ Writing Ladder Day 상태 계산 오류:", error);
    return {
      day1_write_fix: "TODO",
      day2_script_shadow: "LOCKED",
      day3_rehearsal_judge: "LOCKED",
    };
  }
}

/**
 * Writing Ladder 다음 단계 결정
 */
function determineWritingLadderNextStep(week: number, dayStatus: DayStatusMap, totalWeeks: number): NextStep {
  // Day1 TODO
  if (dayStatus.day1_write_fix === "TODO") {
    return {
      step_id: "DAY1_WRITE_FIX",
      label_ko: "Day1: 글쓰기 + 교정",
      cta_ko: "오늘 할 일 시작하기",
      deeplink: `/writingladder/week/${week}/day1`,
      blocked_reason: null,
    };
  }

  // Day2 TODO
  if (dayStatus.day1_write_fix === "DONE" && dayStatus.day2_script_shadow === "TODO") {
    return {
      step_id: "DAY2_SCRIPT_SHADOW",
      label_ko: "Day2: 발표 대본 + 따라말하기",
      cta_ko: "오늘 할 일 시작하기",
      deeplink: `/writingladder/week/${week}/day2`,
      blocked_reason: null,
    };
  }

  // Day3 TODO
  if (dayStatus.day2_script_shadow === "DONE" && dayStatus.day3_rehearsal_judge === "TODO") {
    return {
      step_id: "DAY3_REHEARSAL_JUDGE",
      label_ko: "Day3: 리허설 + 심사",
      cta_ko: "오늘 할 일 시작하기",
      deeplink: `/writingladder/week/${week}/day3`,
      blocked_reason: null,
    };
  }

  // 이번 주 완료 → 다음 주 시작
  if (dayStatus.day3_rehearsal_judge === "DONE") {
    if (week >= totalWeeks) {
      // 코스 완료!
      return {
        step_id: "COURSE_COMPLETE",
        label_ko: "🎉 코스 완료!",
        cta_ko: "포트폴리오 보기",
        deeplink: `/writingladder/portfolio`,
        blocked_reason: null,
        next_level_available: true, // 다음 레벨 가능 여부 (Level 1이 AVAILABLE일 때 true)
      };
    }

    return {
      step_id: "WEEK_COMPLETE",
      label_ko: "이번 주 완료!",
      cta_ko: "다음 주 시작하기",
      deeplink: `/writingladder/week/${week + 1}`,
      blocked_reason: null,
    };
  }

  // Fallback (Day2/Day3 LOCKED)
  if (dayStatus.day2_script_shadow === "LOCKED") {
    return {
      step_id: "DAY2_LOCKED",
      label_ko: "Day2: 발표 대본 + 따라말하기",
      cta_ko: "Day1을 먼저 완료하세요",
      deeplink: `/writingladder/week/${week}/day1`,
      blocked_reason: "Day1을 먼저 완료해야 Day2가 열려요",
    };
  }

  if (dayStatus.day3_rehearsal_judge === "LOCKED") {
    return {
      step_id: "DAY3_LOCKED",
      label_ko: "Day3: 리허설 + 심사",
      cta_ko: "Day2를 먼저 완료하세요",
      deeplink: `/writingladder/week/${week}/day2`,
      blocked_reason: "Day2를 먼저 완료해야 Day3가 열려요",
    };
  }

  // 기본값
  return {
    step_id: "DAY1_WRITE_FIX",
    label_ko: "Day1: 글쓰기 + 교정",
    cta_ko: "오늘 할 일 시작하기",
    deeplink: `/writingladder/week/${week}/day1`,
    blocked_reason: null,
  };
}

/**
 * Writing Ladder 주제 조회
 */
async function getWritingLadderWeekTopic(week: number, course_id: string): Promise<WeekTopic> {
  if (!db) {
    return {
      topic_id: "topic.unknown",
      title_ko: "주제 없음",
      title_en: "No Topic",
    };
  }

  try {
    const topicQuery = query(
      collection(db, "writingladder_topics"),
      where("week", "==", week),
      where("level", "==", "LEVEL0_SENTENCE"), // Level 0만 현재 구현됨
      limit(1)
    );
    const topicSnapshot = await getDocs(topicQuery);

    if (!topicSnapshot.empty) {
      const topicData = topicSnapshot.docs[0].data() as WritingLadderTopic;
      return {
        topic_id: topicData.topic_id,
        title_ko: topicData.title, // Writing Ladder는 title_ko가 아닌 title
        title_en: topicData.title,
      };
    }

    return {
      topic_id: `topic.week${week}`,
      title_ko: `Week ${week} 주제`,
      title_en: `Week ${week} Topic`,
    };

  } catch (error) {
    console.error("❌ Writing Ladder 주제 조회 오류:", error);
    return {
      topic_id: `topic.week${week}`,
      title_ko: `Week ${week} 주제`,
      title_en: `Week ${week} Topic`,
    };
  }
}



