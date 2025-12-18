"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ExtractedWord, DiaryEntry } from "@/app/types";
import Link from "next/link";
import { generateVocabularyPDF } from "@/app/utils/pdfGenerator";
import { doc, getDoc } from "firebase/firestore";

interface VocabularyWord extends ExtractedWord {
  diaryId: string;
  diaryDate: string;
  count: number;
}

export default function VocabularyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [childName, setChildName] = useState("");
  const [currentAccountType, setCurrentAccountType] = useState<"child" | "parent">("child");

  useEffect(() => {
    const accountType = localStorage.getItem("currentAccountType") as "child" | "parent" | null;
    if (accountType) {
      setCurrentAccountType(accountType);
    }
  }, []);

  useEffect(() => {
    const loadVocabulary = async () => {
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
        const wordMap = new Map<string, VocabularyWord>();

        snapshot.forEach((doc) => {
          const diary = { id: doc.id, ...doc.data() } as DiaryEntry;
          
          // 계정 타입 필터링
          const diaryAccountType = diary.accountType;
          if (diaryAccountType) {
            // accountType이 설정되어 있으면 현재 모드와 일치해야 함
            if (diaryAccountType !== currentAccountType) {
              return; // 이 일기는 건너뛰기
            }
          } else {
            // accountType이 없는 기존 데이터는 아이 모드에서만 표시
            if (currentAccountType !== "child") {
              return; // 이 일기는 건너뛰기
            }
          }
          
          if (diary.extractedWords && diary.extractedWords.length > 0) {
            diary.extractedWords.forEach((word) => {
              const key = word.word.toLowerCase();
              const existing = wordMap.get(key);
              
              if (existing) {
                existing.count += 1;
                // 더 최근 일기의 단어 정보로 업데이트
                if (new Date(diary.createdAt) > new Date(existing.diaryDate)) {
                  existing.meaning = word.meaning || existing.meaning;
                  existing.level = word.level || existing.level;
                  existing.example = word.example || existing.example;
                  existing.category = word.category || existing.category;
                  existing.diaryDate = diary.createdAt;
                }
              } else {
                wordMap.set(key, {
                  ...word,
                  diaryId: diary.id,
                  diaryDate: diary.createdAt,
                  count: 1,
                });
              }
            });
          }
        });

        const wordList = Array.from(wordMap.values()).sort((a, b) => 
          b.count - a.count || a.word.localeCompare(b.word)
        );

        setWords(wordList);

        // 아이 이름 가져오기
        if (user) {
          const childDoc = await getDoc(doc(db, "children", user.uid));
          if (childDoc.exists()) {
            setChildName(childDoc.data().name || "");
          }
        }
      } catch (error) {
        console.error("Error loading vocabulary:", error);
      } finally {
        setLoading(false);
      }
    };

    loadVocabulary();
  }, [user, currentAccountType]); // currentAccountType 추가

  const handleDownloadVocabularyPDF = () => {
    if (words.length === 0) {
      alert("다운로드할 단어가 없습니다.");
      return;
    }

    setDownloadingPDF(true);
    try {
      const wordList: ExtractedWord[] = words.map(w => ({
        word: w.word,
        meaning: w.meaning,
        example: w.example,
        level: w.level,
        category: w.category,
      }));

      const pdf = generateVocabularyPDF(wordList, childName || "아이");
      pdf.save(`영어단어_학습장_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const categories = Array.from(new Set(words.map(w => w.category).filter(Boolean)));

  const filteredWords = selectedCategory
    ? words.filter(w => w.category === selectedCategory)
    : words;

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">단어장을 불러오는 중...</p>
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
                📚 {currentAccountType === "child" ? "나의 단어장" : "단어장"}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                총 {words.length}개 단어
              </div>
              {words.length > 0 && (
                <button
                  onClick={handleDownloadVocabularyPDF}
                  disabled={downloadingPDF}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    downloadingPDF
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600 text-white"
                  }`}
                >
                  {downloadingPDF ? "생성 중..." : "📄 단어장 PDF 다운로드"}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-6xl mx-auto px-4 py-12">
          {words.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
            >
              <div className="text-6xl mb-4">📖</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                아직 단어가 없어요
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {currentAccountType === "child" 
                  ? "일기를 작성하면 단어가 자동으로 추가됩니다!" 
                  : "작문을 작성하면 단어가 자동으로 추가됩니다!"}
              </p>
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:scale-105 transition-all"
              >
                {currentAccountType === "child" ? "일기 작성하기 →" : "작문 작성하기 →"}
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* 카테고리 필터 */}
              {categories.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        selectedCategory === null
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      전체
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          selectedCategory === category
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 단어 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWords.map((word, index) => (
                  <motion.div
                    key={`${word.word}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link href={`/diary/${word.diaryId}`}>
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-600 h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                              {word.word}
                            </div>
                            {word.meaning && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {word.meaning}
                              </div>
                            )}
                          </div>
                          {word.count > 1 && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                              {word.count}회
                            </span>
                          )}
                        </div>

                        {word.example && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              예문
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 italic">
                              "{word.example}"
                            </div>
                          </div>
                        )}

                        {word.level && (
                          <div className="mt-2">
                            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded">
                              {word.level}
                            </span>
                          </div>
                        )}

                        <div className="mt-3 text-xs text-gray-400">
                          {new Date(word.diaryDate).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

