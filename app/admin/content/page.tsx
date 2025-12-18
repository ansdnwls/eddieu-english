"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, addDoc, getDoc, deleteDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "../layout";
import { motion } from "framer-motion";
import Link from "next/link";

type DateFilter = "all" | "today" | "week" | "month" | "custom";

export default function ContentPage() {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [filteredDiaries, setFilteredDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "reported">("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState<"child" | "parent">("child"); // 기본값: 아이
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    const loadDiaries = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "diaries"),
          orderBy("createdAt", "desc"),
          limit(200) // 날짜 필터링을 위해 더 많이 가져오기
        );
        const snapshot = await getDocs(q);
        const diaryList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDiaries(diaryList);
      } catch (error) {
        console.error("Error loading diaries:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDiaries();
  }, []);

  // 날짜 및 신고 필터링 적용
  useEffect(() => {
    let filtered = [...diaries];

    // 신고 필터
    if (filter === "reported") {
      filtered = filtered.filter((diary) => diary.reported === true);
    }

    // 계정 타입 필터
    if (accountTypeFilter === "child") {
      filtered = filtered.filter((diary) => !diary.accountType || diary.accountType === "child");
    } else if (accountTypeFilter === "parent") {
      filtered = filtered.filter((diary) => diary.accountType === "parent");
    }

    // 날짜 필터
    const now = new Date();
    switch (dateFilter) {
      case "today": {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = filtered.filter((diary) => {
          const diaryDate = new Date(diary.createdAt);
          return diaryDate >= today;
        });
        break;
      }
      case "week": {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((diary) => {
          const diaryDate = new Date(diary.createdAt);
          return diaryDate >= weekAgo;
        });
        break;
      }
      case "month": {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filtered = filtered.filter((diary) => {
          const diaryDate = new Date(diary.createdAt);
          return diaryDate >= monthAgo;
        });
        break;
      }
      case "custom": {
        if (customDateRange && customDateRange.start && customDateRange.end) {
          filtered = filtered.filter((diary) => {
            const diaryDate = new Date(diary.createdAt);
            const startDate = new Date(customDateRange.start);
            const endDate = new Date(customDateRange.end + "T23:59:59");
            return diaryDate >= startDate && diaryDate <= endDate;
          });
        }
        break;
      }
      default:
        // "all" - 필터링 없음
        break;
    }

    setFilteredDiaries(filtered);
  }, [diaries, filter, accountTypeFilter, dateFilter, customDateRange]);

  const handleFeatureDiary = async (diaryId: string) => {
    if (
      !confirm(
        "이 일기를 '오늘의 일기'로 선정하시겠습니까?\n\n배지가 수여되고 알림이 전송됩니다."
      )
    ) {
      return;
    }

    try {
      if (!db) {
        alert("데이터베이스 연결 오류");
        return;
      }

      // 해당 일기 정보 가져오기
      const diary = diaries.find((d) => d.id === diaryId);
      if (!diary) {
        alert("일기를 찾을 수 없습니다.");
        return;
      }

      const userId = diary.userId;
      const featuredAt = new Date().toISOString();

      // 1. 일기에 featured 플래그 설정
      await updateDoc(doc(db, "diaries", diaryId), {
        featured: true,
        featuredAt: featuredAt,
      });

      // 2. 사용자의 배지 컬렉션에 추가
      const badgeData = {
        type: "featured_diary",
        diaryId: diaryId,
        awardedAt: featuredAt,
        title: "오늘의 일기 배지",
        description: "멋진 일기를 작성하여 오늘의 일기로 선정되었습니다!",
        icon: "⭐",
      };

      await addDoc(collection(db, `users/${userId}/badges`), badgeData);

      // 3. 알림 생성 (부모가 로그인할 때 볼 수 있도록)
      const childRef = doc(db, "children", userId);
      const childSnap = await getDoc(childRef);
      let childName = "아이";
      if (childSnap.exists()) {
        const childData = childSnap.data();
        // childName 필드 우선, 없으면 name 필드
        childName = childData.childName || childData.name || "아이";
      }

      const notificationData = {
        userId: userId,
        type: "badge_awarded",
        title: "🎉 오늘의 일기 배지 수상!",
        message: `${childName}가 오늘의 일기 배지를 받았어요! 아이에게 큰 격려를 해주세요!`,
        read: false,
        createdAt: featuredAt,
        relatedDiaryId: diaryId,
      };

      await addDoc(collection(db, `users/${userId}/notifications`), notificationData);

      // 4. 목록 업데이트
      setDiaries((prev) =>
        prev.map((d) =>
          d.id === diaryId
            ? { ...d, featured: true, featuredAt: featuredAt }
            : d
        )
      );

      alert(`✅ ${childName}이가 오늘의 일기로 선정되었습니다!\n배지가 수여되고 알림이 전송되었습니다.`);
    } catch (error) {
      console.error("Error featuring diary:", error);
      alert("오류가 발생했습니다: " + (error as Error).message);
    }
  };

  const handleUnfeatureDiary = async (diaryId: string) => {
    if (
      !confirm(
        "이 일기의 '오늘의 일기' 선정을 취소하시겠습니까?\n\n배지와 알림이 삭제되고 메인 페이지와 대시보드에서 사라집니다."
      )
    ) {
      return;
    }

    try {
      if (!db) {
        alert("데이터베이스 연결 오류");
        return;
      }

      // 해당 일기 정보 가져오기
      const diary = diaries.find((d) => d.id === diaryId);
      if (!diary) {
        alert("일기를 찾을 수 없습니다.");
        return;
      }

      const userId = diary.userId;
      
      // db가 null이 아님을 확인했으므로 타입 단언 사용
      const firestoreDb = db as NonNullable<typeof db>;

      // 1. 일기의 featured 플래그 제거
      await updateDoc(doc(firestoreDb, "diaries", diaryId), {
        featured: false,
        featuredAt: null,
      });

      // 2. 사용자의 배지 컬렉션에서 해당 배지 삭제
      const badgesRef = collection(firestoreDb, `users/${userId}/badges`);
      const badgesQuery = query(
        badgesRef,
        where("type", "==", "featured_diary"),
        where("diaryId", "==", diaryId)
      );
      const badgesSnapshot = await getDocs(badgesQuery);
      
      badgesSnapshot.forEach(async (badgeDoc) => {
        await deleteDoc(doc(firestoreDb, `users/${userId}/badges`, badgeDoc.id));
      });

      // 3. 알림 삭제
      const notificationsRef = collection(firestoreDb, `users/${userId}/notifications`);
      const notificationsQuery = query(
        notificationsRef,
        where("type", "==", "badge_awarded"),
        where("relatedDiaryId", "==", diaryId)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      
      notificationsSnapshot.forEach(async (notificationDoc) => {
        await deleteDoc(doc(firestoreDb, `users/${userId}/notifications`, notificationDoc.id));
      });

      // 4. 목록 업데이트
      setDiaries((prev) =>
        prev.map((d) =>
          d.id === diaryId
            ? { ...d, featured: false, featuredAt: null }
            : d
        )
      );

      // 아이 이름 가져오기
      const childRef = doc(db, "children", userId);
      const childSnap = await getDoc(childRef);
      let childName = "아이";
      if (childSnap.exists()) {
        const childData = childSnap.data();
        childName = childData.childName || childData.name || "아이";
      }

      alert(`✅ ${childName}이의 오늘의 일기 선정이 취소되었습니다.\n배지와 알림이 삭제되었습니다.`);
    } catch (error) {
      console.error("Error unfeaturing diary:", error);
      alert("오류가 발생했습니다: " + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          📝 영어 콘텐츠 관리 (일기 & 작문)
        </h1>

        {/* 필터 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
          {/* 계정 타입 필터 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              계정 타입
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setAccountTypeFilter("child")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  accountTypeFilter === "child"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                👶 아이 일기
              </button>
              <button
                onClick={() => setAccountTypeFilter("parent")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  accountTypeFilter === "parent"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                👨‍💼 어른 작문
              </button>
            </div>
          </div>

          {/* 신고 필터 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              상태 필터
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  filter === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setFilter("reported")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  filter === "reported"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                신고된 글
              </button>
            </div>
          </div>

          {/* 날짜 필터 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              📅 날짜별 필터
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setDateFilter("all");
                  setCustomDateRange(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  dateFilter === "all"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => {
                  setDateFilter("today");
                  setCustomDateRange(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  dateFilter === "today"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                오늘
              </button>
              <button
                onClick={() => {
                  setDateFilter("week");
                  setCustomDateRange(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  dateFilter === "week"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                최근 7일
              </button>
              <button
                onClick={() => {
                  setDateFilter("month");
                  setCustomDateRange(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  dateFilter === "month"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                최근 30일
              </button>
              <button
                onClick={() => {
                  setDateFilter("custom");
                  if (!customDateRange) {
                    const today = new Date().toISOString().split("T")[0];
                    const weekAgo = new Date(
                      Date.now() - 7 * 24 * 60 * 60 * 1000
                    )
                      .toISOString()
                      .split("T")[0];
                    setCustomDateRange({ start: weekAgo, end: today });
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  dateFilter === "custom"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                기간 선택
              </button>
            </div>

            {/* 기간 선택 UI */}
            {dateFilter === "custom" && (
              <div className="mt-4 flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={customDateRange?.start || ""}
                    onChange={(e) =>
                      setCustomDateRange((prev) => ({
                        ...(prev || { end: "" }),
                        start: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <span className="text-gray-500 dark:text-gray-400 pb-2">
                  ~
                </span>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={customDateRange?.end || ""}
                    onChange={(e) =>
                      setCustomDateRange((prev) => ({
                        ...(prev || { start: "" }),
                        end: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* 필터 결과 통계 */}
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              총 <span className="font-bold text-gray-800 dark:text-white">{filteredDiaries.length}</span>개의 항목이 표시됩니다
              {dateFilter !== "all" && (
                <span className="ml-2">
                  (전체 {diaries.length}개 중)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 일기 목록 */}
        {filteredDiaries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center"
          >
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              해당 조건의 일기가 없습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              필터 조건을 변경해보세요.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredDiaries.map((diary, index) => (
            <motion.div
              key={diary.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-500">
                      {new Date(diary.createdAt).toLocaleString("ko-KR")}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs">
                      {diary.englishLevel || "Lv.1"}
                    </span>
                    {diary.contentType === "composition" ? (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-xs">
                        {diary.compositionType === "letter" ? "✉️ 편지" : diary.compositionType === "essay" ? "📄 에세이" : "📝 작문"}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-xs">
                        📔 일기
                      </span>
                    )}
                    {diary.featured && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded text-xs">
                        ⭐ 오늘의 일기
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 line-clamp-2 mb-2">
                    {diary.originalText}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/diary/${diary.id}`}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-sm"
                >
                  상세 보기
                </Link>
                {/* 오늘의 일기 선정/취소 버튼은 아이 일기만 */}
                {accountTypeFilter === "child" && (
                  <>
                    {diary.featured ? (
                      <button
                        onClick={() => handleUnfeatureDiary(diary.id)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all text-sm"
                      >
                        오늘의 일기 취소
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFeatureDiary(diary.id)}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all text-sm"
                      >
                        오늘의 일기로 선정
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}




