"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import ImageUpload from "./components/ImageUpload";
import LoadingSpinner from "./components/LoadingSpinner";
import CorrectionResult from "./components/CorrectionResult";
import { CorrectionResult as CorrectionResultType } from "./types";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, query, orderBy, limit, getDocs, onSnapshot } from "firebase/firestore";
import { EnglishLevel } from "./types";

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel | "">("");
  const [childInfo, setChildInfo] = useState<{
    childName?: string;
    name?: string;
    age?: number;
    grade?: string;
    englishLevel?: EnglishLevel;
    arScore?: string;
    avatar?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CorrectionResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentAccountType, setCurrentAccountType] = useState<"child" | "parent">("child");
  const [inputMode, setInputMode] = useState<"photo" | "typing">("photo");
  
  // OCR 관련 상태
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [editedText, setEditedText] = useState<string>("");
  const [showOcrEdit, setShowOcrEdit] = useState(false);
  
  // 직접 타이핑 상태
  const [directText, setDirectText] = useState<string>("");

  // 오늘의 일기 배지 수상자
  const [featuredUser, setFeaturedUser] = useState<{
    childName: string;
    diaryId: string;
    featuredAt: string;
  } | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (err) {
      console.error("로그아웃 오류:", err);
    }
  };

  // 계정 타입 로드
  useEffect(() => {
    const accountType = localStorage.getItem("currentAccountType") as "child" | "parent" | null;
    if (accountType) {
      setCurrentAccountType(accountType);
    }
  }, []);

  // 아이 정보 로드 (영어 레벨 가져오기)
  useEffect(() => {
    const loadChildInfo = async () => {
      if (!user || !db) return;
      
      try {
        const docRef = doc(db, "children", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setChildInfo(data);
          setEnglishLevel(data.englishLevel || "");
        }
      } catch (err) {
        console.error("Error loading child info:", err);
      }
    };
    
    if (user) {
      loadChildInfo();
    }
  }, [user]);

  // 오늘의 일기 배지 수상자 로드 (실시간 업데이트)
  useEffect(() => {
    if (!db) return;

    const firestoreDb = db as NonNullable<typeof db>;

    // 실시간 리스너 설정
    const q = query(
      collection(firestoreDb, "diaries"),
      orderBy("featuredAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          if (!snapshot.empty) {
            const diaryDoc = snapshot.docs[0];
            const diaryData = diaryDoc.data();

            if (diaryData.featured && diaryData.featuredAt) {
              // 오늘 날짜 확인 (featuredAt이 오늘인지)
              const featuredDate = new Date(diaryData.featuredAt);
              const today = new Date();
              const isToday =
                featuredDate.getDate() === today.getDate() &&
                featuredDate.getMonth() === today.getMonth() &&
                featuredDate.getFullYear() === today.getFullYear();

              if (isToday) {
                // 해당 사용자의 아이 이름 가져오기
                const childRef = doc(firestoreDb, "children", diaryData.userId);
                const childSnap = await getDoc(childRef);
                let childName = "어린이";
                
                if (childSnap.exists()) {
                  const childData = childSnap.data();
                  childName = childData.childName || childData.name || "어린이";
                }

                setFeaturedUser({
                  childName: childName,
                  diaryId: diaryDoc.id,
                  featuredAt: diaryData.featuredAt,
                });
              } else {
                // 오늘이 아니면 표시하지 않음
                setFeaturedUser(null);
              }
            } else {
              // featured가 false이거나 featuredAt이 없으면 표시하지 않음
              setFeaturedUser(null);
            }
          } else {
            // 일기가 없으면 표시하지 않음
            setFeaturedUser(null);
          }
        } catch (err) {
          console.error("Error loading featured diary:", err);
          setFeaturedUser(null);
        }
      },
      (error) => {
        console.error("Error in featured diary snapshot:", error);
        setFeaturedUser(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // 로딩 중이면 로딩 화면 표시
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 1단계: OCR로 텍스트 추출
  const handleOCR = async () => {
    if (!selectedImage) {
      setError("사진을 업로드해주세요.");
      return;
    }

    if (!user) {
      setError("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    setIsOcrLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      console.log("📸 OCR 시작...");
      const response = await fetch("/api/ocr-diary", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("OCR 응답:", data);

      if (data.success) {
        const extractedText = data.text;
        setOcrResult(extractedText);
        setEditedText(extractedText);
        setShowOcrEdit(true);
        console.log("✅ OCR 완료:", extractedText);
      } else {
        setError(data.error || "OCR 처리 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setError("OCR 처리 중 오류가 발생했습니다.");
      console.error("OCR 오류:", err);
    } finally {
      setIsOcrLoading(false);
    }
  };

  // 직접 타이핑 모드에서 AI 첨삭 시작
  // 정확한 단어 카운팅 함수
  const countWords = (text: string): number => {
    if (!text || !text.trim()) return 0;
    
    // 구두점 제거 후 공백으로 분리, 빈 문자열 필터링
    return text
      .replace(/[.,!?;:()\[\]{}'"]/g, ' ') // 구두점을 공백으로 변환
      .split(/\s+/) // 공백으로 분리
      .filter(word => word.length > 0) // 빈 문자열 제거
      .length;
  };

  // 문장 수 카운팅 함수
  const countSentences = (text: string): number => {
    if (!text || !text.trim()) return 0;
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  };

  // 고유 단어 수 카운팅 함수
  const countUniqueWords = (text: string): number => {
    if (!text || !text.trim()) return 0;
    const words = text
      .toLowerCase()
      .replace(/[.,!?;:()\[\]{}'"]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
    return new Set(words).size;
  };

  const handleDirectSubmit = async () => {
    if (!directText.trim()) {
      setError("작문 내용을 입력해주세요.");
      return;
    }

    if (!user) {
      setError("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("🤖 AI 첨삭 시작...");
      const age = childInfo?.age || 8;

      const response = await fetch("/api/correct-diary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalText: directText,
          age: age,
          englishLevel: englishLevel || childInfo?.englishLevel || "Lv.1",
          isParent: currentAccountType === "parent",
        }),
      });

      const data = await response.json();
      console.log("AI 첨삭 응답:", data);

      if (data.success) {
        const correctionData = data.data;
        setResult(correctionData);

        // Firestore에 저장
        if (db) {
          try {
            const wordCount = countWords(directText);
            const sentenceCount = countSentences(directText);
            const uniqueWordsCount = countUniqueWords(directText);
            
            await addDoc(collection(db, "diaries"), {
              userId: user.uid,
              originalText: directText,
              correctedText: correctionData.correctedText,
              feedback: correctionData.feedback,
              encouragement: correctionData.encouragement,
              corrections: correctionData.corrections || [],
              extractedWords: correctionData.extractedWords || [],
              englishLevel: englishLevel || childInfo?.englishLevel || "Lv.1",
              accountType: currentAccountType, // 현재 모드에 따라 저장 (아이/부모)
              contentType: "diary" as const, // 일기로 표시
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              stats: {
                wordCount: wordCount,
                sentenceCount: sentenceCount,
                averageSentenceLength: sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0,
                correctionCount: correctionData.corrections?.length || 0,
                uniqueWords: uniqueWordsCount,
              }
            });
            console.log("✅ Firestore 저장 완료");
          } catch (firestoreError) {
            console.error("❌ Firestore 저장 실패:", firestoreError);
          }
        }
      } else {
        setError(data.error || "첨삭 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setError("서버 오류가 발생했습니다.");
      console.error("첨삭 오류:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2단계: 수정된 텍스트로 AI 첨삭
  const handleSubmit = async () => {
    if (!editedText.trim()) {
      setError("일기 내용을 입력해주세요.");
      return;
    }

    if (!user) {
      setError("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("🤖 AI 첨삭 시작...");
      const age = childInfo?.age || 8;

      const response = await fetch("/api/correct-diary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalText: editedText,
          age: age,
          englishLevel: englishLevel || childInfo?.englishLevel || "Lv.1",
          isParent: currentAccountType === "parent",
        }),
      });

      const data = await response.json();
      console.log("AI 첨삭 응답:", data);

      if (data.success) {
        const correctionData = data.data;
        setResult(correctionData);
        
        // Firestore에 일기 저장
        if (user && db) {
          try {
            const originalText = correctionData.originalText;
            const wordCount = countWords(originalText);
            const sentenceCount = countSentences(originalText);
            const uniqueWordsCount = countUniqueWords(originalText);
            
            const diaryEntry = {
              userId: user.uid,
              originalText: originalText,
              correctedText: correctionData.correctedText,
              feedback: correctionData.feedback,
              encouragement: correctionData.encouragement,
              corrections: correctionData.corrections || [],
              extractedWords: correctionData.extractedWords || [],
              englishLevel: englishLevel || childInfo?.englishLevel || "Lv.1",
              accountType: currentAccountType, // 현재 모드에 따라 저장 (아이/부모)
              contentType: "diary" as const, // 일기로 표시
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              stats: {
                wordCount: wordCount,
                sentenceCount: sentenceCount,
                averageSentenceLength: sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0,
                correctionCount: correctionData.corrections?.length || 0,
                uniqueWords: uniqueWordsCount,
              }
            };
            
            await addDoc(collection(db, "diaries"), diaryEntry);
            console.log("✅ 일기가 저장되었습니다!");
          } catch (saveError) {
            console.error("일기 저장 중 오류:", saveError);
          }
        }
        
        // 상태 초기화
        setShowOcrEdit(false);
        setOcrResult("");
        setEditedText("");
      } else {
        setError(data.error || "첨삭 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setError("서버와 통신 중 오류가 발생했습니다.");
      console.error("첨삭 오류:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* 헤더 - 프로페셔널 디자인 */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between h-16"
          >
            {/* 로고 */}
            <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">✨</span>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  DiaryAI
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  영어일기 AI 첨삭 플랫폼
                </p>
              </div>
            </Link>

            {/* 네비게이션 */}
            <nav className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/pricing"
                className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                요금제
              </Link>
              <Link
                href="/board"
                className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                게시판
              </Link>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    대시보드
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 sm:px-6 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                  >
                    시작하기
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* 오늘의 일기 배지 수상자 */}
        {featuredUser && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 bg-gradient-to-r from-yellow-100 via-yellow-50 to-orange-100 dark:from-yellow-900/30 dark:via-yellow-800/20 dark:to-orange-900/30 rounded-2xl shadow-xl p-8 border-2 border-yellow-300 dark:border-yellow-700"
          >
            <div className="text-center space-y-4">
              <div className="text-6xl mb-2">⭐</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                오늘의 일기 배지 수상자
              </h2>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-3">
                {featuredUser.childName}
              </div>
              <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold">
                🎁 축하해요! 오늘의 일기 배지를 받았어요!
              </p>
            </div>
          </motion.div>
        )}

        {/* 항상 랜딩 페이지 표시 */}
        <div className="space-y-32">
            {/* 히어로 섹션 - 플래시 효과 */}
            <section className="relative overflow-hidden">
              {/* 배경 그라디언트 애니메이션 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 opacity-50"></div>
              
              {/* 플로팅 요소들 */}
              <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 dark:bg-blue-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob"></div>
              <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
              <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 dark:bg-pink-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center space-y-8"
                >
                  {/* 배지 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full"
                  >
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      AI 기반 영어 학습 플랫폼
                    </span>
                  </motion.div>

                  {/* 메인 헤드라인 */}
                  <div className="space-y-6">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                      <span className="block text-gray-900 dark:text-white mb-2">
                        아이의 영어 일기를
                      </span>
                      <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        AI가 첨삭해드려요
                      </span>
                    </h1>
                    <p className="max-w-3xl mx-auto text-xl sm:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed">
                      {currentAccountType === "child" 
                        ? "사진만 업로드하면 AI 선생님이 따뜻하게 첨삭하고, 단어 학습까지 도와드려요" 
                        : "사진이나 텍스트를 입력하면 AI가 전문적으로 첨삭하고 학습 분석을 제공합니다"}
                    </p>
                  </div>

                  {/* CTA 버튼 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12"
                  >
                    {user ? (
                      <Link
                        href="/dashboard"
                        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                      >
                        <span className="relative z-10">대시보드로 가기</span>
                        <motion.span
                          className="ml-2"
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          →
                        </motion.span>
                        {/* Hover 효과 */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </Link>
                    ) : (
                      <>
                        <Link
                          href="/signup"
                          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                        >
                          <span className="relative z-10">무료로 시작하기</span>
                          <motion.span
                            className="ml-2"
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            →
                          </motion.span>
                          {/* Hover 효과 */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </Link>
                        <Link
                          href="/login"
                          className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-600 dark:hover:border-blue-500 transition-all"
                        >
                          로그인
                        </Link>
                      </>
                    )}
                  </motion.div>

                  {/* 통계 - 신뢰도 향상 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-16 border-t border-gray-200 dark:border-gray-800 mt-16"
                  >
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">10,000+</div>
                      <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400">첨삭 완료</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">1,500+</div>
                      <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400">활성 사용자</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">98%</div>
                      <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400">만족도</div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </section>

            {/* 기능 소개 - 프로페셔널 카드 */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-16"
              >
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  강력한 기능으로 영어 학습을 도와드려요
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  AI 기술을 활용한 개인 맞춤형 영어 첨삭 및 학습 분석
                </p>
              </motion.div>

              <div className="grid md:grid-cols-3 gap-8">
                {/* 카드 1 - OCR */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="group relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-bl-full opacity-50"></div>
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                      <span className="text-3xl">📸</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      스마트 OCR
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                      손글씨 영어 일기를 사진으로 찍으면 자동으로 텍스트를 인식하고 분석합니다
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-blue-600 mt-0.5">✓</span>
                        <span>99% 정확도의 손글씨 인식</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-blue-600 mt-0.5">✓</span>
                        <span>수정 및 편집 가능</span>
                      </li>
                    </ul>
                  </div>
                </motion.div>

                {/* 카드 2 - AI 첨삭 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="group relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 dark:bg-purple-900/20 rounded-bl-full opacity-50"></div>
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                      <span className="text-3xl">🤖</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      AI 첨삭
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                      {currentAccountType === "child" 
                        ? "나이와 수준에 맞춰 따뜻하고 친절하게 첨삭해드립니다" 
                        : "전문적이고 체계적인 첨삭으로 영어 실력을 향상시킵니다"}
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-purple-600 mt-0.5">✓</span>
                        <span>문법, 철자, 표현 종합 분석</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-purple-600 mt-0.5">✓</span>
                        <span>개인 맞춤형 피드백</span>
                      </li>
                    </ul>
                  </div>
                </motion.div>

                {/* 카드 3 - 학습 분석 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="group relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 border border-gray-200 dark:border-gray-800 hover:border-pink-500 dark:hover:border-pink-500"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100 dark:bg-pink-900/20 rounded-bl-full opacity-50"></div>
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                      <span className="text-3xl">📊</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      학습 분석
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                      {currentAccountType === "child" 
                        ? "일기 통계와 학습 진도를 한눈에 확인하고 성장해요" 
                        : "작문 통계와 학습 데이터를 체계적으로 관리합니다"}
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-pink-600 mt-0.5">✓</span>
                        <span>단어/문장 통계 분석</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-pink-600 mt-0.5">✓</span>
                        <span>월간 리포트 제공</span>
                      </li>
                    </ul>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* 사용자 후기 섹션 */}
            <section className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950/20 py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-16"
                >
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    학부모님들의 생생한 후기
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    DiaryAI와 함께 영어 실력이 향상된 아이들의 이야기
                  </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-1 mb-4">
                      <span className="text-yellow-400">★★★★★</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                      "아이가 영어 일기 쓰는 것을 좋아하게 되었어요. AI 선생님의 따뜻한 피드백 덕분에 자신감도 생겼습니다!"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">김</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">김지은 님</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">초등 3학년 학부모</div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-1 mb-4">
                      <span className="text-yellow-400">★★★★★</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                      "사진만 찍으면 바로 첨삭받을 수 있어서 너무 편리해요. 학습 통계도 자세해서 아이 발전 상황을 한눈에 볼 수 있어요."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 dark:text-purple-400 font-semibold">이</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">이수진 님</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">초등 2학년 학부모</div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-1 mb-4">
                      <span className="text-yellow-400">★★★★★</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                      "AI 첨삭이 정말 세심해요. 문법뿐만 아니라 표현까지 꼼꼼하게 알려주고, 격려도 많이 해줘서 아이가 영어에 흥미를 가졌어요."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                        <span className="text-pink-600 dark:text-pink-400 font-semibold">박</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">박민수 님</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">초등 4학년 학부모</div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* 최종 CTA */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-12 sm:p-16 text-center overflow-hidden"
              >
                {/* 배경 패턴 */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                </div>

                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                    {user ? "대시보드에서 일기를 작성해보세요" : "지금 바로 시작해보세요"}
                  </h2>
                  <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                    {user ? "AI 첨삭과 학습 분석을 확인하세요" : "무료로 회원가입하고 AI 첨삭을 경험해보세요"}
                  </p>
                  <Link
                    href={user ? "/dashboard" : "/signup"}
                    className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-xl hover:bg-gray-100 transition-all hover:scale-105 shadow-xl"
                  >
                    {user ? "대시보드로 가기" : "무료로 시작하기"}
                    <span className="ml-2">→</span>
                  </Link>
                </div>
              </motion.div>
            </section>
          </div>
      </main>

      {/* 푸터 - 프로페셔널 디자인 */}
      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* 로고 및 설명 */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-xl">✨</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  DiaryAI
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
                AI 기술로 아이들의 영어 일기를 첨삭하고 학습을 도와주는 교육 플랫폼입니다.
              </p>
            </div>

            {/* 빠른 링크 */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">서비스</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/board" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    게시판
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    대시보드
                  </Link>
                </li>
                <li>
                  <Link href="/vocabulary" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    단어장
                  </Link>
                </li>
              </ul>
            </div>

            {/* 회사 정보 */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">회사</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    이용약관
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    개인정보처리방침
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    문의하기
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* 하단 정보 */}
          <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2024 DiaryAI. Made with ❤️ for kids learning English.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Powered by OpenAI GPT-4</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
