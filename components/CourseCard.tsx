"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CourseInstance, DayStatus } from "@/app/types/courses";

interface CourseCardProps {
  courseInstance: CourseInstance;
}

/**
 * 코스 카드 컴포넌트
 * 진행 중인 코스를 카드 형태로 표시
 */
export default function CourseCard({ courseInstance }: CourseCardProps) {
  const router = useRouter();

  const {
    course_title,
    course_subtitle,
    thumbnail_url,
    progress,
    badges,
  } = courseInstance;

  const {
    current_week,
    total_weeks,
    week_progress_ratio,
    overall_progress_ratio,
    this_week_topic,
    today_next_step,
    day_status,
    weekly_output,
  } = progress;

  // CTA 버튼 클릭 핸들러
  const handleCTAClick = () => {
    if (today_next_step.blocked_reason) {
      alert(today_next_step.blocked_reason);
      return;
    }
    router.push(today_next_step.deeplink);
  };

  // Day 아이콘
  const getDayIcon = (status: DayStatus): string => {
    switch (status) {
      case "DONE":
        return "✅";
      case "TODO":
        return "🔵";
      case "LOCKED":
        return "🔒";
      default:
        return "⚪";
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
    >
      {/* 썸네일 */}
      <div className="relative h-48 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400">
        {/* 배지 */}
        {badges.length > 0 && (
          <div className="absolute top-3 right-3 flex gap-2">
            {badges.map((badge, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full shadow-lg"
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* 전체 진행률 */}
        <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-full">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            전체 {Math.round(overall_progress_ratio * 100)}%
          </span>
        </div>
      </div>

      {/* 카드 본문 */}
      <div className="p-6">
        {/* 코스 제목 */}
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {course_title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {course_subtitle}
        </p>

        {/* 이번 주 주제 */}
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              WEEK {current_week} / {total_weeks}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              이번 주 {Math.round(week_progress_ratio * 100)}%
            </span>
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
            {this_week_topic.title_ko}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {this_week_topic.title_en}
          </p>
        </div>

        {/* Day 상태 */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">{getDayIcon(day_status.day1_write_fix)}</div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Day 1</div>
          </div>
          <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">{getDayIcon(day_status.day2_script_shadow)}</div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Day 2</div>
          </div>
          <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
            <div className="text-2xl mb-1">{getDayIcon(day_status.day3_rehearsal_judge)}</div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Day 3</div>
          </div>
        </div>

        {/* 주간 결과물 */}
        <div className="mb-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>이번 주 결과물</span>
          <span className="font-bold">
            {weekly_output.completed_portfolio_items} / {weekly_output.required_portfolio_items}
          </span>
        </div>

        {/* CTA 버튼 */}
        <motion.button
          onClick={handleCTAClick}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={!!today_next_step.blocked_reason}
          className={`
            w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all
            ${today_next_step.blocked_reason
              ? "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-xl"
            }
          `}
        >
          {today_next_step.cta_ko}
        </motion.button>

        {/* 잠긴 이유 표시 */}
        {today_next_step.blocked_reason && (
          <p className="mt-2 text-xs text-center text-red-600 dark:text-red-400">
            {today_next_step.blocked_reason}
          </p>
        )}

        {/* 오늘 할 일 설명 */}
        <p className="mt-3 text-sm text-center text-gray-600 dark:text-gray-400">
          {today_next_step.label_ko}
        </p>
      </div>
    </motion.div>
  );
}




