"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DiaryEntry, GrowthStats, EnglishLevel, DailyWordCount, MonthlyReport } from "@/app/types";
import Link from "next/link";

export default function StatsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<GrowthStats | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [dailyWordCounts, setDailyWordCounts] = useState<DailyWordCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"all" | "month" | "week">("month");
  const [currentAccountType, setCurrentAccountType] = useState<"child" | "parent">("child");
  const [showReportModal, setShowReportModal] = useState(false);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportCached, setReportCached] = useState(false);

  useEffect(() => {
    const accountType = localStorage.getItem("currentAccountType") as "child" | "parent" | null;
    if (accountType) {
      setCurrentAccountType(accountType);
    }
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      if (!db || !user) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "diaries"),
          where("userId", "==", user.uid)
        );

        const snapshot = await getDocs(q);
        const diaryList: DiaryEntry[] = [];
        
        snapshot.forEach((doc) => {
          diaryList.push({
            id: doc.id,
            ...doc.data(),
          } as DiaryEntry);
        });

        // 계정 타입 및 날짜 필터링
        const now = new Date();
        const filteredDiaries = diaryList.filter((diary) => {
          const diaryAccountType = diary.accountType;
          
          // 계정 타입 필터링
          // 1. accountType이 없는 기존 데이터는 아이 모드에서만 표시
          // 2. accountType이 있으면 정확히 일치하는 것만 표시
          if (diaryAccountType) {
            // accountType이 설정되어 있으면 현재 모드와 일치해야 함
            if (diaryAccountType !== currentAccountType) {
              return false;
            }
          } else {
            // accountType이 없는 기존 데이터는 아이 모드에서만 표시
            if (currentAccountType !== "child") {
              return false;
            }
          }
          
          // 날짜 필터링
          const diaryDate = new Date(diary.createdAt);
          if (timeRange === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return diaryDate >= weekAgo;
          } else if (timeRange === "month") {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return diaryDate >= monthAgo;
          }
          return true;
        });

        console.log("📊 통계 페이지 필터링:", {
          전체: diaryList.length,
          필터후: filteredDiaries.length,
          계정타입: currentAccountType,
          기간: timeRange,
        });
        
        // 디버깅: 각 일기의 계정 타입 확인
        diaryList.forEach((diary, idx) => {
          if (idx < 5) { // 처음 5개만 출력
            console.log(`일기 ${idx + 1}:`, {
              날짜: new Date(diary.createdAt).toLocaleDateString("ko-KR"),
              계정타입: diary.accountType || "없음",
              단어수: diary.stats?.wordCount,
            });
          }
        });

        setDiaries(filteredDiaries);

        // 일자별 단어 수 계산 (그래프용)
        const dailyMap = new Map<string, { wordCount: number; entryCount: number }>();
        
        filteredDiaries.forEach((diary) => {
          // 한국 시간대(KST) 기준으로 날짜 계산
          const diaryDate = new Date(diary.createdAt);
          // 한국 시간대로 변환 (toLocaleDateString 사용)
          const year = diaryDate.getFullYear();
          const month = String(diaryDate.getMonth() + 1).padStart(2, '0');
          const day = String(diaryDate.getDate()).padStart(2, '0');
          const date = `${year}-${month}-${day}`; // YYYY-MM-DD
          const wordCount = diary.stats?.wordCount || 0;
          
          if (dailyMap.has(date)) {
            const existing = dailyMap.get(date)!;
            dailyMap.set(date, {
              wordCount: existing.wordCount + wordCount,
              entryCount: existing.entryCount + 1,
            });
          } else {
            dailyMap.set(date, { wordCount, entryCount: 1 });
          }
        });

        // 날짜 범위 계산 (필터링된 기간 기준)
        let startDate: Date;
        let endDate: Date = new Date();
        
        if (timeRange === "week") {
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeRange === "month") {
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else {
          // 전체 기간: 일기 데이터에서 최소/최대 날짜 찾기
          if (filteredDiaries.length > 0) {
            const dates = filteredDiaries.map(d => new Date(d.createdAt));
            startDate = new Date(Math.min(...dates.map(d => d.getTime())));
            endDate = new Date(Math.max(...dates.map(d => d.getTime())));
          } else {
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          }
        }

        // 모든 날짜를 포함한 배열 생성 (빈 날짜는 0으로 채움)
        const allDates: string[] = [];
        const currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split("T")[0];
          allDates.push(dateStr);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // 모든 날짜에 대해 데이터 생성 (없는 날짜는 0으로)
        const dailyData: DailyWordCount[] = allDates.map((date) => {
          const existing = dailyMap.get(date);
          return {
            date,
            wordCount: existing?.wordCount || 0,
            entryCount: existing?.entryCount || 0,
          };
        });

        setDailyWordCounts(dailyData);

        // 통계 계산
        if (filteredDiaries.length > 0) {
          const totalWords = filteredDiaries.reduce(
            (sum, d) => sum + (d.stats?.wordCount || 0),
            0
          );
          const totalSentences = filteredDiaries.reduce(
            (sum, d) => sum + (d.stats?.sentenceCount || 0),
            0
          );

          // 레벨별 분포
          const levelCounts = filteredDiaries.reduce((acc, d) => {
            acc[d.englishLevel] = (acc[d.englishLevel] || 0) + 1;
            return acc;
          }, {} as Record<EnglishLevel, number>);

          // 최근 레벨 (가장 많이 사용된 레벨)
          const currentLevel = (Object.entries(levelCounts).sort(
            (a, b) => b[1] - a[1]
          )[0]?.[0] as EnglishLevel) || "Lv.1";

          // 다음 레벨 계산
          const levelOrder: EnglishLevel[] = ["Lv.1", "Lv.2", "Lv.3", "Lv.4", "Lv.5"];
          const currentIndex = levelOrder.indexOf(currentLevel);
          const nextLevel = currentIndex < levelOrder.length - 1 
            ? levelOrder[currentIndex + 1] 
            : null;

          // 진행도 계산 (간단한 예시)
          const progress = Math.min(100, (filteredDiaries.length / 10) * 100);

          // 개선 추세 계산 (최근 일기들의 평균 단어 수와 이전 비교)
          let improvementTrend: "up" | "down" | "stable" = "stable";
          if (filteredDiaries.length >= 4) {
            const recent = filteredDiaries.slice(0, 2);
            const older = filteredDiaries.slice(2, 4);
            const recentAvg = recent.reduce((sum, d) => sum + (d.stats?.wordCount || 0), 0) / recent.length;
            const olderAvg = older.reduce((sum, d) => sum + (d.stats?.wordCount || 0), 0) / older.length;
            
            if (recentAvg > olderAvg * 1.1) improvementTrend = "up";
            else if (recentAvg < olderAvg * 0.9) improvementTrend = "down";
          }

          setStats({
            totalDiaries: filteredDiaries.length,
            totalWords,
            averageWordCount: Math.round(totalWords / filteredDiaries.length),
            averageSentenceLength: totalSentences > 0 
              ? Math.round(totalWords / totalSentences) 
              : 0,
            improvementTrend,
            levelProgress: {
              current: currentLevel,
              next: nextLevel,
              progress,
            },
          });
        } else {
          setStats(null);
        }
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user, timeRange, currentAccountType]); // currentAccountType 추가

  // 월별 리포트 생성
  const generateMonthlyReport = async (forceRegenerate: boolean = false) => {
    const MIN_DIARIES_REQUIRED = 10;
    
    if (!diaries || diaries.length === 0) {
      alert(`월말 보고서를 생성하려면 최소 ${MIN_DIARIES_REQUIRED}개 이상의 일기/작문이 필요합니다.`);
      return;
    }

    // 최근 30일 데이터 필터링
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthDiaries = diaries.filter((d) => {
      const diaryDate = new Date(d.createdAt);
      return diaryDate >= monthAgo;
    });

    if (monthDiaries.length === 0) {
      alert("최근 30일 내 작성된 일기/작문이 없습니다.");
      return;
    }

    // 최소 일기 수 체크 (최근 30일 기준)
    if (monthDiaries.length < MIN_DIARIES_REQUIRED) {
      alert(
        `월말 보고서를 생성하려면 최근 30일 내에 최소 ${MIN_DIARIES_REQUIRED}개 이상의 일기/작문이 필요합니다.\n\n` +
        `현재: ${monthDiaries.length}개\n` +
        `필요: ${MIN_DIARIES_REQUIRED}개 이상\n\n` +
        `더 많은 일기를 작성한 후 다시 시도해주세요! 💪`
      );
      return;
    }

    setReportLoading(true);
    try {
      console.log("📊 월별 리포트 생성 중...", forceRegenerate ? "(강제 재생성)" : "");

      const response = await fetch("/api/monthly-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          diaries: monthDiaries,
          accountType: currentAccountType,
          forceRegenerate,
          userId: user?.uid,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ 월별 리포트 생성 완료", data.cached ? "(캐시)" : "(새로 생성)");
        setMonthlyReport(data.data);
        setReportCached(data.cached || false);
        setShowReportModal(true);
      } else {
        // 구독 필요 에러
        if (data.requiresSubscription) {
          const confirmUpgrade = confirm(
            "🔒 월별 리포트는 유료 구독 후 이용 가능합니다.\n\n" +
            "구독 페이지로 이동하시겠습니까?"
          );
          if (confirmUpgrade) {
            router.push("/pricing");
          }
        }
        // 최소 일기 수 부족 에러는 더 친절한 메시지로 표시
        else if (data.minRequired && data.currentCount !== undefined) {
          alert(
            `월말 보고서를 생성하려면 최소 ${data.minRequired}개 이상의 일기/작문이 필요합니다.\n\n` +
            `현재: ${data.currentCount}개\n` +
            `필요: ${data.minRequired}개 이상\n\n` +
            `더 많은 일기를 작성한 후 다시 시도해주세요! 💪`
          );
        } else {
          alert(data.error || "리포트 생성 중 오류가 발생했습니다.");
        }
      }
    } catch (error) {
      console.error("❌ 리포트 생성 오류:", error);
      alert("리포트 생성 중 오류가 발생했습니다.");
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">통계를 불러오는 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-2xl hover:scale-110 transition-transform"
              >
                ←
              </Link>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                📊 {currentAccountType === "child" ? "나의 성장 통계" : "학습 통계"}
              </h1>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-6xl mx-auto px-4 py-12">
          {!stats ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
            >
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                아직 통계가 없어요
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {currentAccountType === "child" 
                  ? "일기를 작성하면 성장 통계를 확인할 수 있습니다!" 
                  : "작문을 작성하면 학습 통계를 확인할 수 있습니다!"}
              </p>
              <Link
                href={currentAccountType === "child" ? "/#upload-section" : "/composition"}
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:scale-105 transition-all"
              >
                {currentAccountType === "child" ? "일기 작성하기 →" : "작문 작성하기 →"}
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* 기간 선택 및 월별 리포트 버튼 */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex gap-2">
                    {(["all", "month", "week"] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                          timeRange === range
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {range === "all" ? "전체" : range === "month" ? "최근 30일" : "최근 7일"}
                      </button>
                    ))}
                  </div>
                  
                  {(() => {
                    // 최근 30일 일기 수 계산
                    const now = new Date();
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    const monthDiaries = diaries.filter((d) => {
                      const diaryDate = new Date(d.createdAt);
                      return diaryDate >= monthAgo;
                    });
                    const MIN_DIARIES_REQUIRED = 10;
                    const hasEnoughDiaries = monthDiaries.length >= MIN_DIARIES_REQUIRED;
                    
                    return (
                      <div className="flex flex-col items-end gap-2">
                        <motion.button
                          onClick={() => generateMonthlyReport(false)}
                          disabled={reportLoading || !hasEnoughDiaries}
                          whileHover={hasEnoughDiaries ? { scale: 1.05 } : {}}
                          whileTap={hasEnoughDiaries ? { scale: 0.95 } : {}}
                          className={`px-6 py-3 rounded-lg font-bold shadow-lg transition-all ${
                            reportLoading || !hasEnoughDiaries
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-xl"
                          }`}
                        >
                          {reportLoading ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              생성 중...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              🤖 월별 성장 리포트 생성
                            </span>
                          )}
                        </motion.button>
                        {!hasEnoughDiaries && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-right max-w-xs">
                            💡 월말 보고서를 생성하려면 최소 {MIN_DIARIES_REQUIRED}개 이상의 일기가 필요합니다.
                            <br />
                            현재: {monthDiaries.length}개 / 필요: {MIN_DIARIES_REQUIRED}개
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 전체 통계 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                >
                  <div className="text-3xl mb-2">📝</div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {stats.totalDiaries}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    총 일기 수
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                >
                  <div className="text-3xl mb-2">📚</div>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    {stats.totalWords}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    총 단어 수
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                >
                  <div className="text-3xl mb-2">✨</div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                    {stats.averageWordCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    평균 단어 수
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                >
                  <div className="text-3xl mb-2">
                    {stats.improvementTrend === "up" ? "📈" : stats.improvementTrend === "down" ? "📉" : "➡️"}
                  </div>
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-1">
                    {stats.improvementTrend === "up" ? "향상 중" : stats.improvementTrend === "down" ? "보완 필요" : "안정적"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    성장 추세
                  </div>
                </motion.div>
              </div>

              {/* 일자별 단어 사용 그래프 */}
              {dailyWordCounts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                >
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">
                    📈 일자별 단어 사용량
                  </h3>
                  <div className="flex gap-4">
                    {/* Y축 레이블 */}
                    <div className="flex flex-col justify-between h-64 text-xs text-gray-500 dark:text-gray-400 py-1">
                      {(() => {
                        const maxWords = Math.max(...dailyWordCounts.map((d) => d.wordCount));
                        const adjustedMax = Math.ceil(maxWords * 1.3);
                        return [adjustedMax, Math.round(adjustedMax * 0.75), Math.round(adjustedMax * 0.5), Math.round(adjustedMax * 0.25), 0].map((val, i) => (
                          <span key={i} className="leading-none">{val}</span>
                        ));
                      })()}
                    </div>
                    
                    {/* 그래프 영역 */}
                    <div className="relative h-64 flex-1">
                      {/* 그래프 배경 그리드 */}
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="border-t border-gray-200 dark:border-gray-700"
                          />
                        ))}
                      </div>
                    
                    {/* 막대 그래프 */}
                    <div className="relative h-full flex items-end justify-between gap-1 px-2">
                      {dailyWordCounts.map((day, index) => {
                        const maxWords = Math.max(...dailyWordCounts.map((d) => d.wordCount));
                        // 최대값에 30% 여유를 두어 그래프가 예쁘게 보이도록 설정
                        const adjustedMax = maxWords * 1.3;
                        const heightPercent = adjustedMax > 0 ? (day.wordCount / adjustedMax) * 100 : 0;
                        
                        return (
                          <motion.div
                            key={day.date}
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className="flex-1 relative group cursor-pointer"
                          >
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-lg hover:from-blue-600 hover:to-purple-600 transition-colors"
                              style={{ height: "100%" }}
                            />
                            
                            {/* 툴팁 */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                                <div className="font-bold">{new Date(day.date + "T00:00:00").toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}</div>
                                <div>단어: {day.wordCount}개</div>
                                <div>일기: {day.entryCount}개</div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* 선 그래프 (SVG) */}
                    <svg className="absolute inset-0 pointer-events-none" preserveAspectRatio="none">
                      <motion.polyline
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        points={dailyWordCounts.map((day, index) => {
                          const maxWords = Math.max(...dailyWordCounts.map((d) => d.wordCount));
                          // 최대값에 30% 여유를 두어 그래프가 예쁘게 보이도록 설정
                          const adjustedMax = maxWords * 1.3;
                          const heightPercent = adjustedMax > 0 ? (day.wordCount / adjustedMax) * 100 : 0;
                          const x = ((index + 0.5) / dailyWordCounts.length) * 100;
                          const y = 100 - heightPercent;
                          return `${x},${y}`;
                        }).join(" ")}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                      
                      {/* 점 표시 */}
                      {dailyWordCounts.map((day, index) => {
                        const maxWords = Math.max(...dailyWordCounts.map((d) => d.wordCount));
                        // 최대값에 30% 여유를 두어 그래프가 예쁘게 보이도록 설정
                        const adjustedMax = maxWords * 1.3;
                        const heightPercent = adjustedMax > 0 ? (day.wordCount / adjustedMax) * 100 : 0;
                        const x = ((index + 0.5) / dailyWordCounts.length) * 100;
                        const y = 100 - heightPercent;
                        
                        return (
                          <motion.circle
                            key={`dot-${day.date}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r="5"
                            fill="white"
                            stroke="url(#lineGradient)"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </svg>
                    </div>
                  </div>
                  
                  {/* X축 레이블 (날짜) */}
                  <div className="flex justify-between mt-4 text-xs text-gray-600 dark:text-gray-400">
                    {dailyWordCounts.length > 0 && (
                      <>
                        <span>
                          {new Date(dailyWordCounts[0].date + "T00:00:00").toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {dailyWordCounts.length > 1 && dailyWordCounts.length <= 7 && (
                          // 7일 이하일 때는 중간 날짜도 표시
                          <span>
                            {new Date(dailyWordCounts[Math.floor(dailyWordCounts.length / 2)].date + "T00:00:00").toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        <span>
                          {new Date(dailyWordCounts[dailyWordCounts.length - 1].date + "T00:00:00").toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
                    💡 막대에 마우스를 올려보세요!
                  </p>
                </motion.div>
              )}

              {/* 최근 일기 통계 */}
              {diaries.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                >
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                    최근 일기 통계
                  </h3>
                  <div className="space-y-2">
                    {diaries.slice(0, 5).map((diary, index) => (
                      <div
                        key={diary.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">
                            {new Date(diary.createdAt).toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {diary.englishLevel}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>단어 {diary.stats?.wordCount || 0}개</span>
                          <span>교정 {diary.stats?.correctionCount || 0}개</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </main>

        {/* 월별 리포트 모달 */}
        <AnimatePresence>
          {showReportModal && monthlyReport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowReportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-2xl font-bold">🤖 월별 성장 리포트</h2>
                        {reportCached && (
                          <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                            💾 캐시됨
                          </span>
                        )}
                      </div>
                      <p className="text-purple-100 text-sm">
                        {new Date(monthlyReport.period.start).toLocaleDateString("ko-KR")} ~{" "}
                        {new Date(monthlyReport.period.end).toLocaleDateString("ko-KR")}
                      </p>
                      {reportCached && (
                        <p className="text-purple-200 text-xs mt-1">
                          생성 시간: {new Date(monthlyReport.createdAt).toLocaleString("ko-KR")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {reportCached && (
                        <button
                          onClick={() => {
                            setShowReportModal(false);
                            setTimeout(() => generateMonthlyReport(true), 300);
                          }}
                          className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                          title="강제 재생성 (토큰 사용)"
                        >
                          🔄 재생성
                        </button>
                      )}
                      <button
                        onClick={() => setShowReportModal(false)}
                        className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* 요약 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {monthlyReport.summary.totalEntries}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        총 작성 수
                      </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {monthlyReport.summary.totalWords}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        총 단어 수
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {monthlyReport.summary.averageWordsPerEntry}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        평균 단어 수
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/30 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {monthlyReport.summary.growthPercentage > 0 ? "+" : ""}
                        {monthlyReport.summary.growthPercentage}%
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        성장률
                      </div>
                    </div>
                  </div>

                  {/* 점수 분석 */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                      📊 분석 점수
                    </h3>
                    <div className="space-y-4">
                      {[
                        { label: "길이 점수", score: monthlyReport.analysis.lengthScore, color: "blue" },
                        { label: "어휘 점수", score: monthlyReport.analysis.vocabularyScore, color: "purple" },
                        { label: "문법 점수", score: monthlyReport.analysis.grammarScore, color: "green" },
                        { label: "종합 점수", score: monthlyReport.analysis.overallScore, color: "orange" },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {item.label}
                            </span>
                            <span className={`font-bold text-${item.color}-600 dark:text-${item.color}-400`}>
                              {item.score}점
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.score}%` }}
                              transition={{ duration: 1, delay: 0.2 }}
                              className={`bg-gradient-to-r from-${item.color}-400 to-${item.color}-600 h-3 rounded-full`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI 분석 */}
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <span>🤖</span>
                      <span>AI 선생님의 분석</span>
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {monthlyReport.insights}
                    </p>
                  </div>

                  {/* 추천 사항 */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 border-2 border-yellow-200 dark:border-yellow-800">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                      <span>💡</span>
                      <span>다음 단계 추천</span>
                    </h3>
                    <ul className="space-y-3">
                      {monthlyReport.recommendations.map((rec, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                        >
                          <span className="text-yellow-600 dark:text-yellow-400 font-bold mt-1">
                            {index + 1}.
                          </span>
                          <span>{rec}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  {/* 자주 사용하는 단어 TOP 10 */}
                  {monthlyReport.topWords && monthlyReport.topWords.length > 0 && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border-2 border-indigo-200 dark:border-indigo-800">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span>📚</span>
                        <span>자주 사용하는 단어 TOP 10</span>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {monthlyReport.topWords.slice(0, 10).map((word, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center shadow-sm"
                          >
                            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                              {word.word}
                            </div>
                            {word.meaning && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {word.meaning}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {word.count}회
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 잘 쓰는 표현 예시 */}
                  {monthlyReport.goodExpressions && monthlyReport.goodExpressions.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span>⭐</span>
                        <span>잘 쓰는 표현 예시</span>
                      </h3>
                      <div className="space-y-4">
                        {monthlyReport.goodExpressions.map((expr, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm"
                          >
                            <div className="font-semibold text-green-700 dark:text-green-400 mb-2">
                              "{expr.expression}"
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                              예시: {expr.example}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {expr.explanation}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 새로 시도한 문법 구조 */}
                  {monthlyReport.newGrammar && monthlyReport.newGrammar.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span>🚀</span>
                        <span>새로 시도한 문법 구조</span>
                      </h3>
                      <div className="space-y-4">
                        {monthlyReport.newGrammar.map((grammar, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm"
                          >
                            <div className="font-semibold text-blue-700 dark:text-blue-400 mb-2">
                              {grammar.grammar}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                              예시: {grammar.example}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {grammar.explanation}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 자주 틀리는 문법 패턴 및 개선 팁 */}
                  {monthlyReport.commonMistakes && monthlyReport.commonMistakes.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border-2 border-red-200 dark:border-red-800">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span>💪</span>
                        <span>자주 틀리는 문법 패턴 및 개선 팁</span>
                      </h3>
                      <div className="space-y-4">
                        {monthlyReport.commonMistakes.map((mistake, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm"
                          >
                            <div className="flex items-start gap-3 mb-2">
                              <span className="text-red-600 dark:text-red-400 font-bold">
                                {mistake.frequency}회
                              </span>
                              <div className="flex-1">
                                <div className="text-sm text-gray-500 dark:text-gray-400 line-through mb-1">
                                  ❌ {mistake.mistake}
                                </div>
                                <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                                  ✅ {mistake.correct}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 mt-2">
                              💡 {mistake.tip}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 닫기 버튼 */}
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-lg hover:shadow-lg transition-all"
                  >
                    닫기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthGuard>
  );
}

