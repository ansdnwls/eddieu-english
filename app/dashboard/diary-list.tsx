"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { collection, query, where, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DiaryEntry } from "@/app/types";
import Link from "next/link";

interface DiaryListProps {
  userId: string;
  currentAccountType?: "child" | "parent";
}

export default function DiaryList({ userId, currentAccountType: propAccountType }: DiaryListProps) {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAccountType, setCurrentAccountType] = useState<"child" | "parent">(propAccountType || "child");
  const [selectedDiaries, setSelectedDiaries] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // prop 변경 감지
  useEffect(() => {
    if (propAccountType && propAccountType !== currentAccountType) {
      setCurrentAccountType(propAccountType);
    }
  }, [propAccountType]);

  // localStorage 변화 감지를 위한 interval (prop이 없을 때만)
  useEffect(() => {
    if (propAccountType) return; // prop이 있으면 localStorage 체크 안 함

    const checkAccountType = () => {
      const accountType = localStorage.getItem("currentAccountType") as "child" | "parent" | null;
      const newType = accountType || "child";
      if (newType !== currentAccountType) {
        setCurrentAccountType(newType);
      }
    };

    // 초기 로드
    checkAccountType();

    // 주기적으로 체크 (500ms마다)
    const interval = setInterval(checkAccountType, 500);

    return () => clearInterval(interval);
  }, [currentAccountType, propAccountType]);

  useEffect(() => {
    if (!db || !userId) {
      setLoading(false);
      return;
    }

    // 실시간 동기화를 위한 쿼리 - userId만 필터링 (accountType은 클라이언트에서 필터)
    const q = query(
      collection(db, "diaries"),
      where("userId", "==", userId)
    );

    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("📚 Firestore 데이터 로드:", snapshot.size, "개 문서");
        const diaryList: DiaryEntry[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as DiaryEntry;
          const entry = {
            id: doc.id,
            ...data,
          };
          diaryList.push(entry);
          console.log("📄 문서 ID:", doc.id, "contentType:", data.contentType, "compositionType:", data.compositionType, "accountType:", data.accountType);
        });
        
        console.log("🔍 필터링 전 총:", diaryList.length, "개 | 현재 모드:", currentAccountType);
        
        // 클라이언트 사이드에서 계정 타입별 필터링
        const filteredList = diaryList.filter(diary => {
          const diaryAccountType = diary.accountType;
          
          // 1. accountType이 없는 기존 데이터는 아이 모드에서만 표시
          // 2. accountType이 있으면 정확히 일치하는 것만 표시
          if (diaryAccountType) {
            // accountType이 설정되어 있으면 현재 모드와 일치해야 함
            return diaryAccountType === currentAccountType;
          } else {
            // accountType이 없는 기존 데이터는 아이 모드에서만 표시
            return currentAccountType === "child";
          }
        });
        
        console.log("✅ 필터링 후:", filteredList.length, "개 항목");
        
        // 날짜순 정렬 (최신순)
        filteredList.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // 내림차순 (최신순)
        });
        
        setDiaries(filteredList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching diaries:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, currentAccountType]);

  const toggleSelection = (diaryId: string) => {
    const newSelected = new Set(selectedDiaries);
    if (newSelected.has(diaryId)) {
      newSelected.delete(diaryId);
    } else {
      newSelected.add(diaryId);
    }
    setSelectedDiaries(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDiaries.size === diaries.length) {
      setSelectedDiaries(new Set());
    } else {
      setSelectedDiaries(new Set(diaries.map(d => d.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDiaries.size === 0) {
      alert("삭제할 항목을 선택해주세요.");
      return;
    }

    if (!confirm(`선택한 ${selectedDiaries.size}개 항목을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      if (!db) {
        alert("데이터베이스 연결 오류");
        return;
      }

      // 선택된 일기들 삭제
      const deletePromises = Array.from(selectedDiaries).map(diaryId =>
        deleteDoc(doc(db, "diaries", diaryId))
      );

      await Promise.all(deletePromises);

      alert(`✅ ${selectedDiaries.size}개 항목이 삭제되었습니다.`);
      setSelectedDiaries(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error("Error deleting diaries:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (diaries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
      >
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          아직 작성한 항목이 없어요
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          영어 일기나 작문을 작성해보세요!
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:scale-105 transition-all"
          >
            📔 일기 작성하기 →
          </Link>
          <Link
            href="/composition"
            className="inline-block bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:scale-105 transition-all"
          >
            ✍️ 작문 작성하기 →
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          📅 나의 영어 목록
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            총 {diaries.length}개
          </span>
          
          {!isSelectionMode ? (
            <button
              onClick={() => setIsSelectionMode(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-sm font-semibold"
            >
              선택
            </button>
          ) : (
            <>
              <button
                onClick={toggleSelectAll}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all text-sm font-semibold"
              >
                {selectedDiaries.size === diaries.length ? "전체 해제" : "전체 선택"}
              </button>
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedDiaries(new Set());
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all text-sm font-semibold"
              >
                취소
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedDiaries.size === 0}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-semibold ${
                  selectedDiaries.size === 0
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                삭제 ({selectedDiaries.size})
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {diaries.map((diary, index) => (
          <motion.div
            key={diary.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-all border-2 ${
                selectedDiaries.has(diary.id)
                  ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "border-transparent hover:border-blue-300 dark:hover:border-blue-600"
              } ${!isSelectionMode ? "hover:shadow-lg" : ""}`}
            >
              <div className="flex items-start gap-4">
                {/* 선택 체크박스 */}
                {isSelectionMode && (
                  <div className="flex-shrink-0 pt-1">
                    <button
                      onClick={() => toggleSelection(diary.id)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        selectedDiaries.has(diary.id)
                          ? "bg-blue-500 border-blue-500"
                          : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {selectedDiaries.has(diary.id) && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}

                {/* 일기 내용 */}
                <div className="flex-1">
                  <Link 
                    href={`/diary/${diary.id}`}
                    className={isSelectionMode ? "pointer-events-none" : ""}
                  >
                    <div className={!isSelectionMode ? "cursor-pointer" : ""}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                            {diary.englishLevel}
                          </span>
                          {diary.contentType === "composition" && (
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                              {diary.compositionType === "letter" ? "✉️ 편지" : diary.compositionType === "essay" ? "📄 에세이" : "📝 작문"}
                            </span>
                          )}
                          {(!diary.contentType || diary.contentType === "diary") && (
                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">
                              📔 일기
                            </span>
                          )}
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(diary.createdAt).toLocaleDateString("ko-KR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(diary.createdAt).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p className="text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">
                        {diary.originalText}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>📊 단어 {diary.stats?.wordCount || 0}개</span>
                        <span>✨ 교정 {diary.stats?.correctionCount || 0}개</span>
                        {diary.extractedWords && diary.extractedWords.length > 0 && (
                          <span>📚 단어 {diary.extractedWords.length}개</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}




