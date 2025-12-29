"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  isCompleted: boolean;
  emoji: string;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  emoji: string;
  totalLessons: number;
  completedLessons: number;
  lessons: Lesson[];
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock 데이터 로딩 (나중에 Firestore로 대체 가능)
    const loadCourse = () => {
      const courseId = params.id as string;
      
      const mockCourses: Record<string, CourseDetail> = {
        "1": {
          id: "1",
          title: "영어 일기 첫걸음",
          description: "간단한 문장으로 영어 일기를 시작해요! 기본적인 표현부터 차근차근 배워봐요.",
          level: "Beginner",
          emoji: "🌱",
          totalLessons: 10,
          completedLessons: 6,
          lessons: [
            { id: "1-1", title: "나는 누구일까요?", description: "나를 소개하는 간단한 문장 배우기", duration: "10분", isCompleted: true, emoji: "👋" },
            { id: "1-2", title: "오늘의 날씨", description: "날씨를 표현하는 단어와 문장", duration: "10분", isCompleted: true, emoji: "☀️" },
            { id: "1-3", title: "내가 좋아하는 것", description: "I like... 문장으로 좋아하는 것 말하기", duration: "15분", isCompleted: true, emoji: "❤️" },
            { id: "1-4", title: "가족 소개하기", description: "My family has... 문장 배우기", duration: "15분", isCompleted: true, emoji: "👨‍👩‍👧‍👦" },
            { id: "1-5", title: "학교에서 배운 것", description: "I learned... 과거형 문장 연습", duration: "20분", isCompleted: true, emoji: "📚" },
            { id: "1-6", title: "점심 시간", description: "음식 관련 단어와 문장", duration: "15분", isCompleted: true, emoji: "🍽️" },
            { id: "1-7", title: "친구와 놀기", description: "I played with... 문장 연습", duration: "15분", isCompleted: false, emoji: "🎮" },
            { id: "1-8", title: "집에 가는 길", description: "장소와 이동 표현하기", duration: "20분", isCompleted: false, emoji: "🚶" },
            { id: "1-9", title: "저녁 시간", description: "하루 마무리 일과 표현하기", duration: "15분", isCompleted: false, emoji: "🌙" },
            { id: "1-10", title: "내일 계획", description: "I will... 미래 표현 배우기", duration: "20분", isCompleted: false, emoji: "📅" },
          ],
        },
        "2": {
          id: "2",
          title: "나의 하루 표현하기",
          description: "오늘 있었던 일을 영어로 자세히 표현해봐요!",
          level: "Intermediate",
          emoji: "🌞",
          totalLessons: 15,
          completedLessons: 5,
          lessons: [
            { id: "2-1", title: "아침 루틴", description: "아침에 하는 일 상세히 표현하기", duration: "20분", isCompleted: true, emoji: "☕" },
            { id: "2-2", title: "등교길 풍경", description: "보고 느낀 것 묘사하기", duration: "25분", isCompleted: true, emoji: "🚌" },
            { id: "2-3", title: "수업 시간", description: "수업 내용과 생각 표현하기", duration: "30분", isCompleted: true, emoji: "✏️" },
            { id: "2-4", title: "점심 시간 이야기", description: "친구들과의 대화 표현하기", duration: "25분", isCompleted: true, emoji: "🍱" },
            { id: "2-5", title: "방과 후 활동", description: "동아리나 활동 표현하기", duration: "30분", isCompleted: true, emoji: "⚽" },
            { id: "2-6", title: "집에서의 시간", description: "가족과의 시간 표현하기", duration: "25분", isCompleted: false, emoji: "🏠" },
            { id: "2-7", title: "숙제 시간", description: "공부하며 느낀 점 표현하기", duration: "30분", isCompleted: false, emoji: "📝" },
            { id: "2-8", title: "저녁 식사", description: "식사와 대화 표현하기", duration: "25분", isCompleted: false, emoji: "🍴" },
            { id: "2-9", title: "취미 시간", description: "좋아하는 활동 상세히 표현하기", duration: "30분", isCompleted: false, emoji: "🎨" },
            { id: "2-10", title: "하루 마무리", description: "하루를 돌아보며 생각 정리하기", duration: "25분", isCompleted: false, emoji: "🌟" },
            { id: "2-11", title: "특별한 날", description: "기억에 남는 일 표현하기", duration: "30분", isCompleted: false, emoji: "🎉" },
            { id: "2-12", title: "주말 계획", description: "앞으로의 계획 표현하기", duration: "25분", isCompleted: false, emoji: "🗓️" },
            { id: "2-13", title: "날씨와 기분", description: "날씨와 기분의 관계 표현하기", duration: "30분", isCompleted: false, emoji: "🌈" },
            { id: "2-14", title: "새로운 경험", description: "처음 해본 일 표현하기", duration: "35분", isCompleted: false, emoji: "🆕" },
            { id: "2-15", title: "종합 복습", description: "배운 표현 모두 사용하기", duration: "40분", isCompleted: false, emoji: "🏆" },
          ],
        },
        "3": {
          id: "3",
          title: "감정 표현 마스터",
          description: "내 기분과 느낌을 영어로 자세히 표현해봐요!",
          level: "Advanced",
          emoji: "🎭",
          totalLessons: 20,
          completedLessons: 0,
          lessons: [
            { id: "3-1", title: "기쁨의 여러 얼굴", description: "happy 외 다양한 표현 배우기", duration: "30분", isCompleted: false, emoji: "😊" },
            { id: "3-2", title: "슬픔과 아쉬움", description: "sad 외 세밀한 감정 표현", duration: "30분", isCompleted: false, emoji: "😢" },
            { id: "3-3", title: "화남과 짜증", description: "angry 외 분노의 단계 표현", duration: "35분", isCompleted: false, emoji: "😠" },
            { id: "3-4", title: "놀람과 당황", description: "surprised 외 놀라움 표현", duration: "30분", isCompleted: false, emoji: "😲" },
            { id: "3-5", title: "두려움과 걱정", description: "scared 외 불안 감정 표현", duration: "35분", isCompleted: false, emoji: "😰" },
            { id: "3-6", title: "설렘과 기대", description: "excited 외 긍정적 기대감 표현", duration: "30분", isCompleted: false, emoji: "🤩" },
            { id: "3-7", title: "지루함과 피곤", description: "bored 외 무기력함 표현", duration: "30분", isCompleted: false, emoji: "😴" },
            { id: "3-8", title: "자랑스러움과 뿌듯함", description: "proud 외 성취감 표현", duration: "35분", isCompleted: false, emoji: "🏅" },
            { id: "3-9", title: "부끄러움과 창피함", description: "embarrassed 외 수줍음 표현", duration: "30분", isCompleted: false, emoji: "😳" },
            { id: "3-10", title: "외로움과 그리움", description: "lonely 외 고독 표현", duration: "35분", isCompleted: false, emoji: "🌙" },
            { id: "3-11", title: "질투와 시샘", description: "jealous 외 부러움 표현", duration: "30분", isCompleted: false, emoji: "😒" },
            { id: "3-12", title: "감사함과 미안함", description: "grateful 외 고마움 표현", duration: "35min", isCompleted: false, emoji: "🙏" },
            { id: "3-13", title: "평화로움과 편안함", description: "calm 외 안정감 표현", duration: "30분", isCompleted: false, emoji: "🕊️" },
            { id: "3-14", title: "답답함과 갑갑함", description: "frustrated 외 답답함 표현", duration: "35분", isCompleted: false, emoji: "😤" },
            { id: "3-15", title: "혼란스러움", description: "confused 외 복잡한 감정 표현", duration: "30분", isCompleted: false, emoji: "🤔" },
            { id: "3-16", title: "감정의 변화", description: "감정 전환 표현하기", duration: "40분", isCompleted: false, emoji: "🔄" },
            { id: "3-17", title: "복합 감정", description: "여러 감정이 섞인 상태 표현", duration: "40분", isCompleted: false, emoji: "🎨" },
            { id: "3-18", title: "이유 설명하기", description: "감정의 원인 자세히 표현", duration: "35분", isCompleted: false, emoji: "💭" },
            { id: "3-19", title: "감정 조절하기", description: "감정을 다스리는 방법 표현", duration: "40분", isCompleted: false, emoji: "🧘" },
            { id: "3-20", title: "종합 실전", description: "모든 감정 표현 마스터", duration: "45분", isCompleted: false, emoji: "👑" },
          ],
        },
      };

      const foundCourse = mockCourses[courseId];
      if (foundCourse) {
        setCourse(foundCourse);
      }
      setLoading(false);
    };

    loadCourse();
  }, [params.id]);

  const getLevelColor = (level: string): string => {
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
      <AuthGuard>
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
      </AuthGuard>
    );
  }

  if (!course) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center max-w-md"
          >
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              코스를 찾을 수 없습니다
            </h2>
            <Link href="/courses">
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:scale-105 transition-all">
                코스 목록으로 돌아가기
              </button>
            </Link>
          </motion.div>
        </div>
      </AuthGuard>
    );
  }

  const progress = (course.completedLessons / course.totalLessons) * 100;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 px-4 py-8 sm:px-6 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link href="/courses">
              <button className="mb-4 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow hover:shadow-lg transition-all">
                ← 코스 목록
              </button>
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
                <div className="text-7xl">{course.emoji}</div>
                <div className="flex-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3 ${getLevelColor(course.level)}`}>
                    {course.level}
                  </span>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    {course.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    {course.description}
                  </p>
                </div>
              </div>

              {/* 진행률 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    전체 진행률
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {course.completedLessons}/{course.totalLessons} 완료 ({Math.round(progress)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                  />
                </div>
              </div>

              {progress === 100 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-lg p-4 text-center border-2 border-yellow-400 dark:border-yellow-600"
                >
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="font-bold text-yellow-800 dark:text-yellow-300">
                    축하합니다! 모든 레슨을 완료했어요!
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* 레슨 목록 */}
          <div className="space-y-4">
            {course.lessons.map((lesson, index) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <div
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl ${
                    lesson.isCompleted
                      ? "border-2 border-green-400 dark:border-green-600"
                      : "hover:scale-[1.02]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* 완료 체크 */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        lesson.isCompleted
                          ? "bg-green-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      {lesson.isCompleted ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 font-bold">{index + 1}</span>
                      )}
                    </div>

                    {/* 이모지 */}
                    <div className="text-4xl">{lesson.emoji}</div>

                    {/* 레슨 정보 */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {lesson.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {lesson.description}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        ⏱️ {lesson.duration}
                      </span>
                    </div>

                    {/* 시작 버튼 */}
                    <button
                      onClick={() => alert("🚧 준비 중입니다! 곧 만나요 😊")}
                      className={`flex-shrink-0 px-6 py-3 rounded-lg font-semibold transition-all ${
                        lesson.isCompleted
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-105 shadow-lg"
                      }`}
                    >
                      {lesson.isCompleted ? "완료 ✓" : "시작하기 →"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 하단 CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl shadow-xl p-8 text-center"
          >
            <div className="text-5xl mb-4">💪</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              꾸준히 연습하면 실력이 쑥쑥!
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              매일 조금씩 연습하는 것이 가장 중요해요.
            </p>
            <Link href="/dashboard">
              <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:scale-105 transition-all shadow-lg">
                대시보드로 가기 🏠
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}

