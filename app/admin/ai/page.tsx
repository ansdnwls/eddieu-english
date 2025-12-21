"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "../layout";
import { motion } from "framer-motion";

interface ApiLog {
  id: string;
  type: "gpt" | "openai" | "voice" | "tts" | "google" | "vision";
  userId?: string;
  status: "success" | "error";
  errorMessage?: string;
  timestamp: string;
  endpoint?: string;
}

interface UserApiStats {
  userId: string;
  userName: string;
  userEmail: string;
  gptCount: number;
  voiceCount: number;
  googleCount: number;
  totalCount: number;
}

interface DailyStats {
  date: string;
  gpt: number;
  voice: number;
  google: number;
  total: number;
}

export default function AIPage() {
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedApiType, setSelectedApiType] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  // 이번달 시작일 계산
  const getMonthStart = (monthStr: string): Date => {
    if (!monthStr) {
      const now = new Date();
      now.setDate(1);
      now.setHours(0, 0, 0, 0);
      return now;
    }
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // 다음달 시작일 계산
  const getMonthEnd = (monthStr: string): Date => {
    const start = getMonthStart(monthStr);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return end;
  };

  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(currentMonth);
  }, []);

  useEffect(() => {
    const loadApiLogs = async () => {
      if (!db || !selectedMonth) {
        setLoading(false);
        return;
      }

      try {
        console.log("📊 API 로그 로딩 중...");

        const monthStart = getMonthStart(selectedMonth);
        const monthEnd = getMonthEnd(selectedMonth);

        // 모든 API 로그 가져오기 (필터링은 클라이언트에서)
        const apiLogsSnapshot = await getDocs(collection(db, "apiLogs"));
        
        const logs: ApiLog[] = [];
        apiLogsSnapshot.forEach((doc) => {
          const data = doc.data();
          const timestamp = data.timestamp ? new Date(data.timestamp).getTime() : 0;
          
          // 선택한 월의 데이터만 필터링
          if (timestamp >= monthStart.getTime() && timestamp < monthEnd.getTime()) {
            logs.push({
              id: doc.id,
              type: data.type || "gpt",
              userId: data.userId,
              status: data.status || "success",
              errorMessage: data.errorMessage,
              timestamp: data.timestamp || new Date().toISOString(),
              endpoint: data.endpoint,
            });
          }
        });

        // 타임스탬프 기준 정렬 (최신순)
        logs.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        });

        setApiLogs(logs);
        console.log(`✅ API 로그 로딩 완료: ${logs.length}건`);
      } catch (error) {
        console.error("❌ API 로그 로딩 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadApiLogs();
  }, [selectedMonth]);


  // 통계 계산
  const stats = useMemo(() => {
    const filteredLogs = apiLogs.filter((log) => {
      if (selectedApiType !== "all") {
        const apiTypeMap: Record<string, string[]> = {
          gpt: ["gpt", "openai"],
          voice: ["voice", "tts"],
          google: ["google", "vision"],
        };
        const types = apiTypeMap[selectedApiType] || [];
        if (!types.includes(log.type)) return false;
      }
      if (selectedUserId !== "all" && log.userId !== selectedUserId) {
        return false;
      }
      return true;
    });

    const gptCount = filteredLogs.filter((log) => log.type === "gpt" || log.type === "openai").length;
    const voiceCount = filteredLogs.filter((log) => log.type === "voice" || log.type === "tts").length;
    const googleCount = filteredLogs.filter((log) => log.type === "google" || log.type === "vision").length;
    const successCount = filteredLogs.filter((log) => log.status === "success").length;
    const errorCount = filteredLogs.filter((log) => log.status === "error").length;

    return {
      total: filteredLogs.length,
      gpt: gptCount,
      voice: voiceCount,
      google: googleCount,
      success: successCount,
      error: errorCount,
    };
  }, [apiLogs, selectedApiType, selectedUserId]);


  // 일별 통계 계산
  const dailyStats = useMemo(() => {
    const dailyMap = new Map<string, { gpt: number; voice: number; google: number }>();

    apiLogs.forEach((log) => {
      const date = new Date(log.timestamp);
      const dateStr = date.toISOString().split("T")[0];

      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { gpt: 0, voice: 0, google: 0 });
      }

      const stats = dailyMap.get(dateStr)!;
      if (log.type === "gpt" || log.type === "openai") {
        stats.gpt++;
      } else if (log.type === "voice" || log.type === "tts") {
        stats.voice++;
      } else if (log.type === "google" || log.type === "vision") {
        stats.google++;
      }
    });

    const statsList: DailyStats[] = Array.from(dailyMap.entries())
      .map(([date, counts]) => ({
        date,
        gpt: counts.gpt,
        voice: counts.voice,
        google: counts.google,
        total: counts.gpt + counts.voice + counts.google,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return statsList;
  }, [apiLogs]);

  // 고유 사용자 목록
  const uniqueUsers = useMemo(() => {
    const userIds = new Set<string>();
    apiLogs.forEach((log) => {
      if (log.userId) userIds.add(log.userId);
    });
    return Array.from(userIds);
  }, [apiLogs]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">API 로그를 불러오는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            🤖 API 호출 통계
          </h1>
          <div className="flex items-center gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                return (
                  <option key={monthStr} value={monthStr}>
                    {date.getFullYear()}년 {date.getMonth() + 1}월
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">API 타입:</label>
            <select
              value={selectedApiType}
              onChange={(e) => setSelectedApiType(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="gpt">GPT API</option>
              <option value="voice">음성 API</option>
              <option value="google">구글 API</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">사용자:</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              {uniqueUsers.map((userId) => (
                <option key={userId} value={userId}>
                  {userId.substring(0, 8)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="text-sm opacity-90 mb-2">총 호출</div>
            <div className="text-3xl font-bold">{stats.total.toLocaleString()}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="text-sm opacity-90 mb-2">GPT API</div>
            <div className="text-3xl font-bold">{stats.gpt.toLocaleString()}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="text-sm opacity-90 mb-2">음성 API</div>
            <div className="text-3xl font-bold">{stats.voice.toLocaleString()}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="text-sm opacity-90 mb-2">구글 API</div>
            <div className="text-3xl font-bold">{stats.google.toLocaleString()}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="text-sm opacity-90 mb-2">성공</div>
            <div className="text-3xl font-bold">{stats.success.toLocaleString()}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white"
          >
            <div className="text-sm opacity-90 mb-2">실패</div>
            <div className="text-3xl font-bold">{stats.error.toLocaleString()}</div>
          </motion.div>
        </div>

        {/* 사용자별 통계 테이블 */}
        <UserStatsTable apiLogs={apiLogs} />

        {/* 일별 통계 차트 */}
        <DailyStatsChart dailyStats={dailyStats} />

        {/* 상세 내역 테이블 */}
        <ApiLogsTable 
          logs={apiLogs.filter((log) => {
            if (selectedApiType !== "all") {
              const apiTypeMap: Record<string, string[]> = {
                gpt: ["gpt", "openai"],
                voice: ["voice", "tts"],
                google: ["google", "vision"],
              };
              const types = apiTypeMap[selectedApiType] || [];
              if (!types.includes(log.type)) return false;
            }
            if (selectedUserId !== "all" && log.userId !== selectedUserId) {
              return false;
            }
            return true;
          })}
        />
      </div>
    </AdminLayout>
  );
}

// 사용자별 통계 테이블 컴포넌트
function UserStatsTable({ apiLogs }: { apiLogs: ApiLog[] }) {
  const [userStats, setUserStats] = useState<UserApiStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateUserStats = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        const userMap = new Map<string, { gpt: number; voice: number; google: number }>();

        apiLogs.forEach((log) => {
          if (!log.userId) return;

          if (!userMap.has(log.userId)) {
            userMap.set(log.userId, { gpt: 0, voice: 0, google: 0 });
          }

          const stats = userMap.get(log.userId)!;
          if (log.type === "gpt" || log.type === "openai") {
            stats.gpt++;
          } else if (log.type === "voice" || log.type === "tts") {
            stats.voice++;
          } else if (log.type === "google" || log.type === "vision") {
            stats.google++;
          }
        });

        // 사용자 정보 가져오기
        const userStatsList: UserApiStats[] = [];
        for (const [userId, counts] of userMap.entries()) {
          let userName = "알 수 없음";
          let userEmail = `UID: ${userId.substring(0, 8)}...`;

          try {
            // children 컬렉션에서 먼저 확인
            const childDoc = await getDoc(doc(db, "children", userId));
            if (childDoc.exists()) {
              const data = childDoc.data();
              userName = data.childName || "이름 없음";
              userEmail = data.email || userEmail;
            } else {
              // users 컬렉션 확인
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) {
                const data = userDoc.data();
                userName = data.name || data.displayName || "이름 없음";
                userEmail = data.email || userEmail;
              }
            }
          } catch (error) {
            console.error("❌ 사용자 정보 조회 실패:", error);
          }

          userStatsList.push({
            userId,
            userName,
            userEmail,
            gptCount: counts.gpt,
            voiceCount: counts.voice,
            googleCount: counts.google,
            totalCount: counts.gpt + counts.voice + counts.google,
          });
        }

        // 총 호출 수 기준 정렬
        userStatsList.sort((a, b) => b.totalCount - a.totalCount);
        setUserStats(userStatsList);
      } catch (error) {
        console.error("❌ 사용자 통계 계산 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateUserStats();
  }, [apiLogs]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
    >
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        👥 사용자별 API 호출 통계
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">사용자명</th>
              <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">이메일</th>
              <th className="text-right py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">GPT API</th>
              <th className="text-right py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">음성 API</th>
              <th className="text-right py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">구글 API</th>
              <th className="text-right py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">총 호출</th>
            </tr>
          </thead>
          <tbody>
            {userStats.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  데이터가 없습니다
                </td>
              </tr>
            ) : (
              userStats.map((user, index) => (
                <tr
                  key={user.userId}
                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-900 dark:text-white">{user.userName}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">{user.userEmail}</td>
                  <td className="py-3 px-4 text-right text-violet-600 dark:text-violet-400 font-medium">
                    {user.gptCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 font-medium">
                    {user.voiceCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-teal-600 dark:text-teal-400 font-medium">
                    {user.googleCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white font-bold">
                    {user.totalCount.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// 일별 통계 차트 컴포넌트
function DailyStatsChart({ dailyStats }: { dailyStats: DailyStats[] }) {
  const maxValue = Math.max(...dailyStats.map((d) => d.total), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
    >
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        📈 일별 API 호출 추이
      </h2>
      <div className="space-y-4">
        {dailyStats.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            데이터가 없습니다
          </div>
        ) : (
          dailyStats.map((stat) => {
            const date = new Date(stat.date);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

            return (
              <div key={stat.date} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{dateStr}</span>
                  <span className="text-gray-600 dark:text-gray-400">총 {stat.total}회</span>
                </div>
                <div className="flex items-end gap-1 h-8">
                  {stat.gpt > 0 && (
                    <div
                      className="bg-violet-500 rounded-t"
                      style={{ width: `${(stat.gpt / maxValue) * 100}%`, height: "100%" }}
                      title={`GPT: ${stat.gpt}`}
                    />
                  )}
                  {stat.voice > 0 && (
                    <div
                      className="bg-indigo-500 rounded-t"
                      style={{ width: `${(stat.voice / maxValue) * 100}%`, height: "100%" }}
                      title={`음성: ${stat.voice}`}
                    />
                  )}
                  {stat.google > 0 && (
                    <div
                      className="bg-teal-500 rounded-t"
                      style={{ width: `${(stat.google / maxValue) * 100}%`, height: "100%" }}
                      title={`구글: ${stat.google}`}
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {stat.gpt > 0 && (
                    <span>
                      <span className="inline-block w-3 h-3 bg-violet-500 rounded mr-1"></span>
                      GPT: {stat.gpt}
                    </span>
                  )}
                  {stat.voice > 0 && (
                    <span>
                      <span className="inline-block w-3 h-3 bg-indigo-500 rounded mr-1"></span>
                      음성: {stat.voice}
                    </span>
                  )}
                  {stat.google > 0 && (
                    <span>
                      <span className="inline-block w-3 h-3 bg-teal-500 rounded mr-1"></span>
                      구글: {stat.google}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// API 로그 상세 테이블 컴포넌트
function ApiLogsTable({ logs }: { logs: ApiLog[] }) {
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserNames = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      const nameMap = new Map<string, string>();
      const userIds = new Set<string>();

      logs.forEach((log) => {
        if (log.userId) userIds.add(log.userId);
      });

      for (const userId of userIds) {
        try {
          // children 컬렉션에서 먼저 확인
          const childDoc = await getDoc(doc(db, "children", userId));
          if (childDoc.exists()) {
            const data = childDoc.data();
            nameMap.set(userId, data.childName || "이름 없음");
          } else {
            // users 컬렉션 확인
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const data = userDoc.data();
              nameMap.set(userId, data.name || data.displayName || "이름 없음");
            } else {
              nameMap.set(userId, "알 수 없음");
            }
          }
        } catch (error) {
          nameMap.set(userId, "알 수 없음");
        }
      }

      setUserNames(nameMap);
      setLoading(false);
    };

    loadUserNames();
  }, [logs]);

  const getApiTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      gpt: "GPT API",
      openai: "GPT API",
      voice: "음성 API",
      tts: "음성 API",
      google: "구글 API",
      vision: "구글 API",
    };
    return typeMap[type] || type;
  };

  const getApiTypeColor = (type: string): string => {
    if (type === "gpt" || type === "openai") {
      return "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300";
    } else if (type === "voice" || type === "tts") {
      return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300";
    } else {
      return "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
    >
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        📋 상세 호출 내역
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">시간</th>
              <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">API 타입</th>
              <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">사용자</th>
              <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">상태</th>
              <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-semibold">에러 메시지</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                  데이터가 없습니다
                </td>
              </tr>
            ) : (
              logs.slice(0, 100).map((log) => {
                const date = new Date(log.timestamp);
                const timeStr = `${date.toLocaleDateString("ko-KR")} ${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
                const userName = log.userId ? (userNames.get(log.userId) || "로딩 중...") : "알 수 없음";

                return (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">{timeStr}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getApiTypeColor(log.type)}`}>
                        {getApiTypeLabel(log.type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white text-xs">
                      {userName}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          log.status === "success"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {log.status === "success" ? "성공" : "실패"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs max-w-xs truncate">
                      {log.errorMessage || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {logs.length > 100 && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          최근 100건만 표시됩니다 (총 {logs.length}건)
        </div>
      )}
    </motion.div>
  );
}
