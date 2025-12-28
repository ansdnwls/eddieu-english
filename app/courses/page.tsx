"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import CourseCard from "@/components/CourseCard";
import { CourseInstancesResponse, CourseInstance } from "@/app/types/courses";
import { CourseDefinition } from "@/lib/courseDefinitions";

type Tab = "ACTIVE" | "CATALOG";

/**
 * 코스 홈 화면
 * /courses
 * 
 * 탭 2개:
 * - 진행 중 (My Courses): 현재 진행 중인 코스 카드 리스트
 * - 전체 코스 (Catalog): 시작 가능한 모든 코스 (현재는 Show & Tell만)
 */
export default function CoursesHomePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("CATALOG"); // 비회원도 볼 수 있도록 기본값을 CATALOG로 변경
  const [courseData, setCourseData] = useState<CourseInstancesResponse | null>(null);
  const [catalogCourses, setCatalogCourses] = useState<CourseDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Mock child_id (실제로는 AuthContext에서 가져옴)
  const childId = user?.uid || null;

  useEffect(() => {
    fetchCatalog(); // 카탈로그는 항상 로드
    
    if (user && childId) {
      fetchCourses();
    } else {
      // 비회원인 경우 로딩 종료
      setLoading(false);
    }
  }, [childId, user]);

  const fetchCatalog = async () => {
    try {
      console.log("📚 코스 카탈로그 조회 중...");

      const response = await fetch("/api/v1/courses/catalog");
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "카탈로그 조회 실패");
      }

      console.log("✅ 코스 카탈로그 조회 완료:", result.data.courses);
      setCatalogCourses(result.data.courses);

    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 카탈로그 조회 오류:", error);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("📚 코스 목록 조회 중...");

      const response = await fetch(
        `/api/v1/children/${childId}/course-instances?status=ACTIVE`
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "코스 조회 실패");
      }

      console.log("✅ 코스 목록 조회 완료:", result.data);
      setCourseData(result.data);

    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 코스 조회 오류:", error);
      setError(error.message || "코스를 불러오는 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = async (courseId: string) => {
    if (!user || !childId) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    try {
      console.log(`🚀 코스 시작: ${courseId}`);

      const response = await fetch("/api/v1/courses/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          course_id: courseId,
          start_week: 1,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "코스 시작 실패");
      }

      console.log("✅ 코스 시작 완료:", result.data);

      // 첫 Day로 이동
      router.push(result.data.first_day_deeplink);

    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 코스 시작 오류:", error);
      alert(error.message || "코스 시작 중 오류가 발생했습니다");
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            코스 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-2xl p-8 max-w-md"
        >
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-2">
              오류가 발생했습니다
            </h2>
            <p className="text-red-700 dark:text-red-400 mb-6">{error}</p>
            <button
              onClick={fetchCourses}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
            >
              다시 시도
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const activeCourses = courseData?.active_course_instances || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            📚 내 코스
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            영어 학습 여정을 시작해보세요!
          </p>
        </motion.div>

        {/* 탭 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-4 mb-8"
        >
          {/* 로그인한 경우에만 "진행 중" 탭 표시 */}
          {user && (
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`
                px-6 py-3 rounded-xl font-bold text-lg transition-all
                ${activeTab === "ACTIVE"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }
              `}
            >
              진행 중
            </button>
          )}
          <button
            onClick={() => setActiveTab("CATALOG")}
            className={`
              px-6 py-3 rounded-xl font-bold text-lg transition-all
              ${activeTab === "CATALOG"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }
            `}
          >
            전체 코스
          </button>
        </motion.div>

        {/* 탭 컨텐츠 */}
        <AnimatePresence mode="wait">
          {activeTab === "ACTIVE" && (
            <motion.div
              key="active"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {activeCourses.length === 0 ? (
                // Empty State
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
                >
                  <div className="text-8xl mb-6">📚</div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {courseData?.ui_hints.empty_state.title_ko}
                  </h2>
                  <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                    {courseData?.ui_hints.empty_state.subtitle_ko}
                  </p>
                  <button
                    onClick={() => router.push(courseData?.ui_hints.empty_state.primary_cta.deeplink || "/showtell")}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    {courseData?.ui_hints.empty_state.primary_cta.label_ko}
                  </button>
                </motion.div>
              ) : (
                // 코스 카드 그리드
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeCourses.map((course, index) => (
                    <motion.div
                      key={course.course_instance_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <CourseCard courseInstance={course} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "CATALOG" && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* AVAILABLE 코스 */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  🚀 시작 가능한 코스
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {catalogCourses
                    .filter(course => course.state === "AVAILABLE")
                    .map((course, index) => (
                      <motion.div
                        key={course.course_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * (index + 1) }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all hover:scale-105"
                      >
                        {/* 썸네일 */}
                        <div className={`text-6xl mb-4 text-center ${course.course_id === 'show_tell_12w' ? '' : ''}`}>
                          {course.course_id === 'show_tell_12w' ? '🚀' : '📝'}
                        </div>
                        
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                          {course.name_ko}
                        </h3>
                        
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
                          {course.grade_bands.join(", ")} · {course.cefr_levels.join(", ")} · {course.duration_weeks}주
                        </p>
                        
                        <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
                          {course.description_ko}
                        </p>
                        
                        <ul className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2">
                          {course.default_weekly_routine.map((step, idx) => (
                            <li key={idx}>
                              ✅ {step === "DAY1_WRITE_FIX" ? "Day 1: Write + Fix" :
                                  step === "DAY2_SCRIPT_SHADOW" ? "Day 2: Script + Shadowing" :
                                  "Day 3: Rehearsal + Judge Q&A"}
                            </li>
                          ))}
                        </ul>
                        
                        <button
                          onClick={() => {
                            if (course.landing_page_url) {
                              router.push(course.landing_page_url);
                            } else {
                              handleStartCourse(course.course_id);
                            }
                          }}
                          className={`w-full px-6 py-3 font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 ${
                            course.course_id === 'show_tell_12w'
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                              : 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
                          }`}
                        >
                          코스 시작하기
                        </button>
                      </motion.div>
                    ))}
                </div>
              </div>

              {/* COMING_SOON 코스 */}
              {catalogCourses.filter(course => course.state === "COMING_SOON").length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 bg-gray-100 dark:bg-gray-700/50 rounded-2xl p-6"
                >
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4 text-center">
                    🚧 준비 중인 코스
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {catalogCourses
                      .filter(course => course.state === "COMING_SOON")
                      .map((course) => (
                        <div
                          key={course.course_id}
                          className="px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-center"
                        >
                          <div className="font-semibold mb-1">{course.name_ko}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {course.subtitle_ko}
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

