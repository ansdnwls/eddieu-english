"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import Link from "next/link";

interface DashboardStats {
  todayNewUsers: number; // 금일신규
  todayWithdrawals: number; // 탈퇴
  unreadQnA: number; // Q&A
  unreadAds: number; // 광고문의
  totalUsers: number; // 총사용자수
  freeUsers: number; // FREE
  basicUsers: number; // 베이직
  premiumUsers: number; // 프리미엄
  todayDiaries: number; // 오늘작성일기
  penpalMatches: number; // 팬팔매칭
  monthlyGptApi: number; // GPT API
  monthlyVoiceApi: number; // 음성 API
  monthlyGoogleApi: number; // 구글 API
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayNewUsers: 0,
    todayWithdrawals: 0,
    unreadQnA: 0,
    unreadAds: 0,
    totalUsers: 0,
    freeUsers: 0,
    basicUsers: 0,
    premiumUsers: 0,
    todayDiaries: 0,
    penpalMatches: 0,
    monthlyGptApi: 0,
    monthlyVoiceApi: 0,
    monthlyGoogleApi: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        console.log("📊 대시보드 통계 로딩 중...");

        // 오늘 날짜 (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        // 이번달 시작일
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const thisMonthTimestamp = thisMonth.getTime();

        // 1. 총 사용자 수 & 요금제별 분류 (users + children 컬렉션 통합)
        let usersSnapshot;
        try {
          usersSnapshot = await getDocs(collection(db, "users"));
        } catch (error) {
          console.log("⚠️ users 컬렉션 없음");
          usersSnapshot = { docs: [], forEach: () => {} } as any;
        }

        const childrenSnapshot = await getDocs(collection(db, "children"));

        // 구독 정보 로드
        let subscriptionsSnapshot;
        try {
          subscriptionsSnapshot = await getDocs(collection(db, "subscriptions"));
        } catch (error) {
          console.log("⚠️ subscriptions 컬렉션 없음");
          subscriptionsSnapshot = { docs: [] } as any;
        }

        // 구독 정보를 Map으로 변환
        const subscriptionMap = new Map<string, string>();
        subscriptionsSnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          if (data.userId && data.planId) {
            subscriptionMap.set(data.userId, data.planId);
          }
        });

        const processedUserIds = new Set<string>();
        let totalUsers = 0;
        let freeUsers = 0;
        let basicUsers = 0;
        let premiumUsers = 0;
        let todayNewUsers = 0;

        // children 컬렉션 처리
        childrenSnapshot.docs.forEach((childDoc) => {
          const childData = childDoc.data();
          const userId = childDoc.id;
          processedUserIds.add(userId);
          totalUsers++;

          const plan = subscriptionMap.get(userId) || childData.subscriptionPlan || "free";
          if (plan === "free") freeUsers++;
          else if (plan === "basic") basicUsers++;
          else if (plan === "premium") premiumUsers++;

          if (childData.createdAt) {
            const createdAt = new Date(childData.createdAt).getTime();
            if (createdAt >= todayTimestamp) {
              todayNewUsers++;
            }
          }
        });

        // users 컬렉션 처리 (children에 없는 경우)
        usersSnapshot.docs.forEach((userDoc) => {
          const userId = userDoc.id;
          if (processedUserIds.has(userId)) return; // 이미 처리됨

          const userData = userDoc.data();
          totalUsers++;

          const plan = subscriptionMap.get(userId) || userData.subscriptionPlan || "free";
          if (plan === "free") freeUsers++;
          else if (plan === "basic") basicUsers++;
          else if (plan === "premium") premiumUsers++;

          if (userData.createdAt) {
            const createdAt = new Date(userData.createdAt).getTime();
            if (createdAt >= todayTimestamp) {
              todayNewUsers++;
            }
          }
        });

        // 2. 오늘 탈퇴 수 (withdrawalRequests 컬렉션)
        let todayWithdrawals = 0;
        try {
          const withdrawalsSnapshot = await getDocs(collection(db, "withdrawalRequests"));
          withdrawalsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            if (data.withdrawnAt) {
              const withdrawalDate = new Date(data.withdrawnAt).getTime();
              if (withdrawalDate >= todayTimestamp) {
                todayWithdrawals++;
              }
            }
          });
        } catch (error) {
          console.log("⚠️ withdrawalRequests 컬렉션 없음");
        }

        // 3. Q&A 미확인 게시글
        let unreadQnA = 0;
        try {
          // Firestore 인덱스 문제를 피하기 위해 모든 Q&A 게시글을 가져와서 클라이언트에서 필터링
          const qnaQuery = query(
            collection(db, "posts"),
            where("category", "==", "qna")
          );
          const qnaSnapshot = await getDocs(qnaQuery);
          qnaSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            // isRead가 false이거나 undefined인 경우 (미확인)
            if (data.isRead !== true && !data.isDeleted) {
              unreadQnA++;
            }
          });
          console.log("✅ Q&A 미확인 게시글:", unreadQnA);
        } catch (error) {
          console.error("❌ Q&A 게시글 조회 실패:", error);
        }

        // 4. 광고문의 미확인 게시글
        let unreadAds = 0;
        try {
          // Firestore 인덱스 문제를 피하기 위해 모든 광고문의 게시글을 가져와서 클라이언트에서 필터링
          const adsQuery = query(
            collection(db, "posts"),
            where("category", "==", "advertisement")
          );
          const adsSnapshot = await getDocs(adsQuery);
          adsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            // isRead가 false이거나 undefined인 경우 (미확인)
            if (data.isRead !== true && !data.isDeleted) {
              unreadAds++;
            }
          });
          console.log("✅ 광고문의 미확인 게시글:", unreadAds);
        } catch (error) {
          console.error("❌ 광고문의 게시글 조회 실패:", error);
        }

        // 5. 오늘 작성 일기 수
        let todayDiaries = 0;
        const diariesSnapshot = await getDocs(collection(db, "diaries"));
        diariesSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          if (data.createdAt) {
            const createdAt = new Date(data.createdAt).getTime();
            if (createdAt >= todayTimestamp) {
              todayDiaries++;
            }
          }
        });

        // Compositions도 포함
        const compositionsSnapshot = await getDocs(collection(db, "compositions"));
        compositionsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          if (data.createdAt) {
            const createdAt = new Date(data.createdAt).getTime();
            if (createdAt >= todayTimestamp) {
              todayDiaries++;
            }
          }
        });

        // 6. 펜팔 매칭 수 (전체)
        let penpalMatches = 0;
        try {
          const matchesSnapshot = await getDocs(collection(db, "penpalMatches"));
          penpalMatches = matchesSnapshot.size;
        } catch (error) {
          console.log("⚠️ 펜팔 매칭 데이터 없음");
        }

        // 7. API 호출 수 (이번달)
        let monthlyGptApi = 0;
        let monthlyVoiceApi = 0;
        let monthlyGoogleApi = 0;

        try {
          const apiLogsSnapshot = await getDocs(collection(db, "apiLogs"));
          apiLogsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            if (data.timestamp) {
              const timestamp = new Date(data.timestamp).getTime();
              if (timestamp >= thisMonthTimestamp) {
                if (data.type === "gpt" || data.type === "openai") {
                  monthlyGptApi++;
                } else if (data.type === "voice" || data.type === "tts") {
                  monthlyVoiceApi++;
                } else if (data.type === "google" || data.type === "vision") {
                  monthlyGoogleApi++;
                }
              }
            }
          });
        } catch (error) {
          console.log("⚠️ API 로그 데이터 없음");
        }

        setStats({
          todayNewUsers,
          todayWithdrawals,
          unreadQnA,
          unreadAds,
          totalUsers,
          freeUsers,
          basicUsers,
          premiumUsers,
          todayDiaries,
          penpalMatches,
          monthlyGptApi,
          monthlyVoiceApi,
          monthlyGoogleApi,
        });

        console.log("✅ 대시보드 통계 로딩 완료", stats);
      } catch (error) {
        console.error("❌ 통계 로딩 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">통계를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 카드 데이터 정의
  const cards = [
    { title: "금일신규", value: stats.todayNewUsers, color: "blue", link: "/admin/users" },
    { title: "탈퇴", value: stats.todayWithdrawals, color: "red", link: "/admin/withdrawal" },
    { title: "Q&A", value: stats.unreadQnA, color: "yellow", badge: true, link: "/board?category=qna" },
    { title: "광고문의", value: stats.unreadAds, color: "purple", badge: true, link: "/board?category=advertisement" },
    
    { title: "총사용자수", value: stats.totalUsers, color: "green", link: "/admin/users" },
    { title: "FREE", value: stats.freeUsers, color: "gray", link: "/admin/users?plan=free" },
    { title: "베이직", value: stats.basicUsers, color: "blue", link: "/admin/users?plan=basic" },
    { title: "프리미엄", value: stats.premiumUsers, color: "orange", link: "/admin/users?plan=premium" },
    
    { title: "오늘작성일기", value: stats.todayDiaries, color: "pink", link: "/admin/content" },
    { title: "팬팔매칭", value: stats.penpalMatches, color: "cyan", link: "/admin/penpal" },
    { title: "GPT API", value: stats.monthlyGptApi, color: "violet", link: "/admin/ai" },
    { title: "음성 API", value: stats.monthlyVoiceApi, color: "indigo", link: "/admin/ai" },
    { title: "구글 API", value: stats.monthlyGoogleApi, color: "teal", link: "/admin/ai" },
    { title: "요금제 관리", value: 0, color: "emerald", link: "/admin/pricing" },
  ];

  // 색상 매핑
  const colorClasses: Record<string, string> = {
    blue: "bg-gradient-to-br from-blue-500 to-blue-600",
    red: "bg-gradient-to-br from-red-500 to-red-600",
    yellow: "bg-gradient-to-br from-yellow-500 to-yellow-600",
    purple: "bg-gradient-to-br from-purple-500 to-purple-600",
    green: "bg-gradient-to-br from-green-500 to-green-600",
    gray: "bg-gradient-to-br from-gray-500 to-gray-600",
    orange: "bg-gradient-to-br from-orange-500 to-orange-600",
    pink: "bg-gradient-to-br from-pink-500 to-pink-600",
    cyan: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    violet: "bg-gradient-to-br from-violet-500 to-violet-600",
    indigo: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    teal: "bg-gradient-to-br from-teal-500 to-teal-600",
    emerald: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white px-2 sm:px-0">
        📊 관리자 대시보드
      </h1>

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 px-2 sm:px-0">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="w-full"
          >
            <Link href={card.link} className="block w-full">
              <div
                className={`${colorClasses[card.color]} rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 text-white cursor-pointer active:scale-95 hover:scale-105 transition-transform duration-200 relative min-h-[120px] sm:min-h-[140px] flex flex-col justify-between`}
              >
                {/* 배지 (알림 있을 때) */}
                {card.badge && card.value > 0 && (
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs font-bold rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shadow-lg animate-pulse">
                    {card.value > 99 ? "99+" : card.value}
                  </div>
                )}

                {/* 제목 */}
                <div className="text-sm sm:text-lg lg:text-xl font-bold mb-2 sm:mb-4 opacity-90 leading-tight">
                  {card.title}
                </div>

                {/* 숫자 */}
                <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-none">
                  {card.value.toLocaleString()}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* 하단 안내 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-6 mx-2 sm:mx-0"
      >
        <div className="flex items-start gap-3">
          <div className="text-xl sm:text-2xl flex-shrink-0">💡</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 dark:text-white mb-2 text-sm sm:text-base">
              대시보드 안내
            </h3>
            <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 각 카드를 클릭하면 해당 관리 페이지로 이동합니다</li>
              <li>• Q&A와 광고문의는 확인하지 않은 새 게시글 수를 표시합니다</li>
              <li>• API 호출 수는 이번 달 누적 사용량입니다</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}





