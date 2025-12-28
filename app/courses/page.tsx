"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  emoji: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

export default function CoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Mock 데이터 로딩 (나중에 Firestore로 대체 가능)
    const mockCourses: Course[] = [
      {
        id: "1",
        title: "영어 일기 첫걸음",
        description: "간단한 문장으로 영어 일기를 시작해요!",
        level: "Beginner",
        emoji: "🌱",
        progress: 60,
        totalLessons: 10,
        completedLessons: 6,
      },
      {
        id: "2",
        title: "나의 하루 표현하기",
        description: "오늘 있었던 일을 영어로 말해봐요",
        level: "Intermediate",
        emoji: "🌞",
        progress: 30,
        totalLessons: 15,
        completedLessons: 5,
      },
      {
        id: "3",
        title: "감정 표현 마스터",
        description: "내 기분과 느낌을 영어로 자세히 써봐요",
        level: "Advanced",
        emoji: "🎭",
        progress: 0,
        totalLessons: 20,
        completedLessons: 0,
      },
    ];

    setTimeout(() => {
      setCourses(mockCourses);
      setLoading(false);
    }, 500);
  }, []);

  const getLevelColor = (level: Course["level"]): string => {
    switch (level) {
      case "Beginner":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      case "Intermediate":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "Advanced":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-6xl"
        >
          📚
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 px-4 py-8 sm:px-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-12"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                📚 영어 학습 코스
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
                단계별로 영어 일기 실력을 키워보세요!
              </p>
            </div>
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                ← 대시보드
              </motion.button>
            </Link>
          </div>

          {user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
            >
              <p className="text-lg text-gray-700 dark:text-gray-300">
                안녕하세요, <span className="font-bold text-blue-600 dark:text-blue-400">{user.email}</span>님! 🎉
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                오늘도 영어 실력을 키워볼까요?
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Link href={`/courses/${course.id}`}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 h-full cursor-pointer"
                >
                  {/* Emoji Icon */}
                  <div className="text-6xl mb-4 text-center">
                    {course.emoji}
                  </div>

                  {/* Course Info */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {course.description}
                    </p>

                    {/* Level Badge */}
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(course.level)}`}>
                      {course.level}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        진행률
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {course.completedLessons}/{course.totalLessons} 완료
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${course.progress}%` }}
                        transition={{ duration: 1, delay: 0.3 + 0.1 * index }}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {course.progress === 0 ? "시작하기 🚀" : "계속하기 ▶️"}
                  </motion.button>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {courses.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center"
          >
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              코스가 아직 없어요
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              곧 멋진 영어 학습 코스가 추가될 거예요! 🎉
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
