"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import ImageUpload from "./components/ImageUpload";
import LoadingSpinner from "./components/LoadingSpinner";
import CorrectionResult from "./components/CorrectionResult";
import { CorrectionResult as CorrectionResultType } from "./types";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EnglishLevel } from "./types";
import { useFeaturedDiary } from "@/hooks/useFeaturedDiary";
import { saveDiary } from "@/lib/diary/saveDiary";

function HomeContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [currentChildId, setCurrentChildId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"photo" | "typing">("photo");
  
  // OCR 관련 상태
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [editedText, setEditedText] = useState<string>("");
  const [showOcrEdit, setShowOcrEdit] = useState(false);
  
  // 직접 타이핑 상태
  const [directText, setDirectText] = useState<string>("");

  // 오늘의 일기 배지 수상자 (커스텀 훅 사용)
  const { featuredUser } = useFeaturedDiary();

  // 플래시 메시지 로테이션 상태
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);
  
  const heroMessages = [
    {
      title: "사진 한 장으로",
      subtitle: "영어 실력이 쑥쑥",
      description: "손글씨 영어일기를 사진으로 찍기만 하면,\nAI 선생님이 친절하게 첨삭하고 단어까지 학습시켜드려요"
    },
    {
      title: "읽기만 하지 말고",
      subtitle: "직접 말해보세요",
      description: "AI 원어민 발음을 듣고 따라 말하기!\n일기 내용으로 생성형 AI와 실시간 영어 대화까지 가능해요"
    },
    {
      title: "국내 친구들과",
      subtitle: "영어편지 교환",
      description: "같은 또래 친구들과 영어로 편지를 주고받으며 함께 성장해요.\n안전한 국내 펜팔 매칭!"
    }
  ];

  // 메시지 자동 전환 (5초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % heroMessages.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (err) {
      console.error("로그아웃 오류:", err);
    }
  };

  // URL 파라미터 확인 (사진 업로드 모드) 및 해시 확인
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "upload") {
      setInputMode("photo");
      // 사진 업로드 섹션으로 스크롤
      setTimeout(() => {
        const uploadSection = document.getElementById("upload-section");
        if (uploadSection) {
          uploadSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
    
    // 해시가 upload-section인 경우 스크롤
    if (window.location.hash === "#upload-section") {
      setTimeout(() => {
        const uploadSection = document.getElementById("upload-section");
        if (uploadSection) {
          uploadSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    }
  }, [searchParams]);

  // 계정 타입 및 아이 ID 로드
  useEffect(() => {
    const accountType = localStorage.getItem("currentAccountType") as "child" | "parent" | null;
    if (accountType) {
      setCurrentAccountType(accountType);
    }

    // 현재 선택된 아이 ID 로드
    const childId = localStorage.getItem("currentChildId");
    if (childId) {
      setCurrentChildId(childId);
    }
  }, []);

  // 아이 정보 로드 (영어 레벨 가져오기)
  useEffect(() => {
    const loadChildInfo = async () => {
      if (!user || !db) return;
      
      try {
        // localStorage에서 저장된 아이 정보 먼저 확인
        const savedChildInfo = localStorage.getItem("childInfo");
        if (savedChildInfo) {
          const data = JSON.parse(savedChildInfo);
          setChildInfo(data);
          setEnglishLevel(data.englishLevel || "");
          return;
        }

        // localStorage에 없으면 Firestore에서 로드
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

        // Firestore에 저장 (lib 함수 사용)
        try {
          await saveDiary({
            userId: user.uid,
            childId: currentAccountType === "child" ? currentChildId || undefined : undefined,
            originalText: directText,
            correctionData,
            englishLevel: (englishLevel || childInfo?.englishLevel || "Lv.1") as EnglishLevel,
            accountType: currentAccountType,
          });
        } catch (saveError) {
          console.error("❌ 일기 저장 실패:", saveError);
          // 저장 실패해도 UI는 계속 표시 (사용자 경험 우선)
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
        
        // Firestore에 일기 저장 (lib 함수 사용)
        if (user) {
          try {
            // 현재 선택된 아이 ID 가져오기
            const currentChildId = currentAccountType === "child" 
              ? localStorage.getItem("currentChildId") || undefined
              : undefined;

            await saveDiary({
              userId: user.uid,
              childId: currentChildId,
              originalText: correctionData.originalText,
              correctionData,
              englishLevel: (englishLevel || childInfo?.englishLevel || "Lv.1") as EnglishLevel,
              accountType: currentAccountType,
            });
          } catch (saveError) {
            console.error("❌ 일기 저장 실패:", saveError);
            // 저장 실패해도 UI는 계속 표시 (사용자 경험 우선)
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <Image 
                  src="/icon-192x192.png?v=2" 
                  alt="EddieU AI 로고" 
                  width={40} 
                  height={40}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EddieU AI
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  영어일기·작문·스피킹 올인원
                </p>
              </div>
            </Link>

            {/* 네비게이션 */}
            <nav className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/courses"
                className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                📚 코스
              </Link>
              <Link
                href="/dashboard"
                className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✍️ 영어일기
              </Link>
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
                    className="px-4 sm:px-6 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                  >
                    로그인
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

                  {/* 메인 헤드라인 - 플래시 애니메이션 */}
                  <div className="space-y-6">
                    <motion.h1 
                      key={currentMessageIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.6 }}
                      className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight"
                    >
                      <span className="block text-gray-900 dark:text-white mb-2">
                        {heroMessages[currentMessageIndex].title}
                      </span>
                      <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {heroMessages[currentMessageIndex].subtitle}
                      </span>
                    </motion.h1>
                    <motion.p 
                      key={`desc-${currentMessageIndex}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className="max-w-3xl mx-auto text-xl sm:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line"
                    >
                      {heroMessages[currentMessageIndex].description}
                    </motion.p>
                    
                    {/* 인디케이터 점들 */}
                    <div className="flex items-center justify-center gap-2 pt-4">
                      {heroMessages.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentMessageIndex(index)}
                          className={`transition-all ${
                            index === currentMessageIndex
                              ? "w-8 h-2 bg-gradient-to-r from-blue-600 to-purple-600"
                              : "w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                          } rounded-full`}
                          aria-label={`메시지 ${index + 1}로 이동`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* CTA 버튼 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col items-center justify-center gap-4 mt-12"
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
                          href="/login"
                          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                        >
                          <span className="relative z-10">로그인</span>
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
                          href="/signup"
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          회원가입
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
                    EddieU AI와 함께 영어 실력이 향상된 아이들의 이야기
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
                        <div className="font-semibold text-gray-900 dark:text-white">김X은 님</div>
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
                        <div className="font-semibold text-gray-900 dark:text-white">이X진 님</div>
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
                        <div className="font-semibold text-gray-900 dark:text-white">박X수 님</div>
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

            {/* 로그인한 사용자를 위한 업로드 섹션 */}
            {user && (
              <section id="upload-section" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800"
                >
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                    📝 영어 일기 첨삭하기
                  </h2>
                  
                  {/* 입력 모드 선택 */}
                  <div className="flex justify-center gap-4 mb-6">
                    <button
                      onClick={() => {
                        setInputMode("photo");
                        setSelectedImage(null);
                        setDirectText("");
                      }}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                        inputMode === "photo"
                          ? "bg-blue-500 text-white shadow-lg"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                      }`}
                    >
                      📸 사진 업로드
                    </button>
                    <button
                      onClick={() => {
                        setInputMode("typing");
                        setSelectedImage(null);
                        setDirectText("");
                      }}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                        inputMode === "typing"
                          ? "bg-blue-500 text-white shadow-lg"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                      }`}
                    >
                      ⌨️ 직접 타이핑
                    </button>
                  </div>

                  {/* 사진 업로드 모드 */}
                  {inputMode === "photo" && (
                    <div className="space-y-6">
                      <ImageUpload
                        onImageSelect={setSelectedImage}
                        selectedImage={selectedImage}
                      />
                      {selectedImage && (
                        <div className="flex justify-center gap-4">
                          <button
                            onClick={handleOCR}
                            disabled={isOcrLoading}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all"
                          >
                            {isOcrLoading ? "처리 중..." : "📸 OCR 시작하기"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 직접 타이핑 모드 */}
                  {inputMode === "typing" && (
                    <div className="space-y-6">
                      <textarea
                        value={directText}
                        onChange={(e) => setDirectText(e.target.value)}
                        placeholder="영어 일기를 직접 입력해주세요..."
                        rows={10}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                      <div className="flex justify-center">
                        <button
                          onClick={handleDirectSubmit}
                          disabled={!directText.trim() || isLoading}
                          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all"
                        >
                          {isLoading ? "처리 중..." : "🤖 AI 첨삭 시작하기"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* OCR 결과 편집 */}
                  {showOcrEdit && (
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          OCR로 추출된 텍스트 (수정 가능)
                        </label>
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          rows={10}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                      </div>
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={handleSubmit}
                          disabled={!editedText.trim() || isLoading}
                          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all"
                        >
                          {isLoading ? "처리 중..." : "🤖 AI 첨삭 시작하기"}
                        </button>
                        <button
                          onClick={() => {
                            setShowOcrEdit(false);
                            setOcrResult("");
                            setEditedText("");
                            setSelectedImage(null);
                          }}
                          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-all"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 에러 메시지 */}
                  {error && (
                    <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded-lg">
                      {error}
                    </div>
                  )}

                  {/* 로딩 스피너 */}
                  {isLoading && (
                    <div className="mt-6 flex justify-center">
                      <LoadingSpinner />
                    </div>
                  )}

                  {/* 결과 표시 */}
                  {result && (
                    <div className="mt-6">
                      <CorrectionResult result={result} />
                    </div>
                  )}
                </motion.div>
              </section>
            )}
          </div>
      </main>

      {/* 푸터 - 프로페셔널 디자인 */}
      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* 로고 및 설명 */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/icon-192x192.png?v=2" 
                    alt="EddieU AI 로고" 
                    width={32} 
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  EddieU AI
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
                  <Link href="/courses" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    코스
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    영어일기 첨삭
                  </Link>
                </li>
                <li>
                  <Link href="/board" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    게시판
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
              © 2024 EddieU AI. Made with ❤️ for kids learning English.
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
