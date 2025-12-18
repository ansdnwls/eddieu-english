"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import ImageUpload from "../components/ImageUpload";
import LoadingSpinner from "../components/LoadingSpinner";
import CorrectionResult from "../components/CorrectionResult";
import { CorrectionResult as CorrectionResultType } from "../types";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { EnglishLevel } from "../types";

export default function CompositionPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel | "">("");
  const [childInfo, setChildInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CorrectionResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentAccountType, setCurrentAccountType] = useState<"child" | "parent">("child");
  const [inputMode, setInputMode] = useState<"photo" | "typing">("typing");
  
  // OCR 관련 상태
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [editedText, setEditedText] = useState<string>("");
  const [showOcrEdit, setShowOcrEdit] = useState(false);
  
  // 직접 타이핑 상태
  const [directText, setDirectText] = useState<string>("");
  const [compositionType, setCompositionType] = useState<"letter" | "essay" | "other">("letter");
  
  // 임시 저장 관련
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

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

  // 임시 저장된 작문 불러오기
  useEffect(() => {
    if (user) {
      const savedComposition = localStorage.getItem(`composition_draft_${user.uid}`);
      const savedType = localStorage.getItem(`composition_type_${user.uid}`) as "letter" | "essay" | "other" | null;
      
      if (savedComposition) {
        setDirectText(savedComposition);
        if (savedType) {
          setCompositionType(savedType);
        }
        console.log("✅ 임시 저장된 작문 불러옴");
      }
    }
  }, [user]);

  // 자동 저장 (타이핑 멈춘 후 3초 후)
  useEffect(() => {
    if (!user || !directText.trim()) return;

    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(() => {
      localStorage.setItem(`composition_draft_${user.uid}`, directText);
      localStorage.setItem(`composition_type_${user.uid}`, compositionType);
      console.log("💾 작문 자동 저장됨");
    }, 3000); // 3초 후 저장

    setAutoSaveTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [directText, compositionType, user]);

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

  // 정확한 단어 카운팅 함수
  const countWords = (text: string): number => {
    if (!text || !text.trim()) return 0;
    
    return text
      .replace(/[.,!?;:()\[\]{}'"]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0)
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
      console.log("🤖 영어작문 AI 첨삭 시작...");
      const age = childInfo?.age || 8;

      const response = await fetch("/api/correct-composition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalText: directText,
          age: age,
          englishLevel: englishLevel || childInfo?.englishLevel || "Lv.1",
          compositionType: compositionType,
        }),
      });

      const data = await response.json();
      console.log("AI 첨삭 응답:", data);

      if (data.success) {
        const correctionData = data.data;
        setResult(correctionData);

        // Firestore에 저장
        if (db && user) {
          try {
            console.log("💾 Firestore 저장 시작...");
            console.log("userId:", user.uid);
            console.log("contentType:", "composition");
            console.log("compositionType:", compositionType);
            
            const wordCount = countWords(directText);
            const sentenceCount = countSentences(directText);
            const uniqueWordsCount = countUniqueWords(directText);
            
            const compositionData = {
              userId: user.uid,
              originalText: directText,
              correctedText: correctionData.correctedText,
              feedback: correctionData.feedback,
              encouragement: correctionData.cheerUp || "잘 작성하셨습니다!",
              corrections: correctionData.corrections || [],
              extractedWords: correctionData.extractedWords || [],
              englishLevel: englishLevel || childInfo?.englishLevel || "Lv.1",
              accountType: currentAccountType, // 현재 모드에 따라 저장 (아이/부모)
              contentType: "composition" as const, // 작문으로 표시
              compositionType: compositionType,
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
            
            console.log("저장할 데이터:", compositionData);
            
            const docRef = await addDoc(collection(db, "diaries"), compositionData);
            console.log("✅ Firestore 저장 완료! 문서 ID:", docRef.id);
            
            // 임시 저장 데이터 삭제
            localStorage.removeItem(`composition_draft_${user.uid}`);
            localStorage.removeItem(`composition_type_${user.uid}`);
            console.log("🗑️ 임시 저장 데이터 삭제됨");
          } catch (firestoreError) {
            console.error("❌ Firestore 저장 실패:", firestoreError);
            alert("작문 저장에 실패했습니다. 콘솔을 확인해주세요.");
          }
        } else {
          console.warn("⚠️ Firestore 또는 user가 없어서 저장하지 못함");
          console.log("db:", !!db, "user:", !!user);
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

  // 2단계: 수정된 텍스트로 AI 첨삭 (OCR 후)
  const handleSubmit = async () => {
    if (!editedText.trim()) {
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
      console.log("🤖 영어작문 AI 첨삭 시작...");
      const age = childInfo?.age || 8;

      const response = await fetch("/api/correct-composition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalText: editedText,
          age: age,
          englishLevel: englishLevel || childInfo?.englishLevel || "Lv.1",
          compositionType: compositionType,
        }),
      });

      const data = await response.json();
      console.log("AI 첨삭 응답:", data);

      if (data.success) {
        const correctionData = data.data;
        setResult(correctionData);
        
        // Firestore에 저장
        if (user && db) {
          try {
            console.log("💾 Firestore 저장 시작 (OCR 모드)...");
            console.log("userId:", user.uid);
            
            const originalText = correctionData.originalText;
            const wordCount = countWords(originalText);
            const sentenceCount = countSentences(originalText);
            const uniqueWordsCount = countUniqueWords(originalText);
            
            const compositionEntry = {
              userId: user.uid,
              originalText: originalText,
              correctedText: correctionData.correctedText,
              feedback: correctionData.feedback,
              encouragement: correctionData.cheerUp || "잘 작성하셨습니다!",
              corrections: correctionData.corrections || [],
              extractedWords: correctionData.extractedWords || [],
              englishLevel: englishLevel || childInfo?.englishLevel || "Lv.1",
              accountType: currentAccountType, // 현재 모드에 따라 저장 (아이/부모)
              contentType: "composition" as const, // 작문으로 표시
              compositionType: compositionType,
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
            
            console.log("저장할 데이터:", compositionEntry);
            
            const docRef = await addDoc(collection(db, "diaries"), compositionEntry);
            console.log("✅ 작문이 저장되었습니다! 문서 ID:", docRef.id);
            
            // 임시 저장 데이터 삭제
            localStorage.removeItem(`composition_draft_${user.uid}`);
            localStorage.removeItem(`composition_type_${user.uid}`);
            console.log("🗑️ 임시 저장 데이터 삭제됨");
          } catch (saveError) {
            console.error("❌ 작문 저장 중 오류:", saveError);
            alert("작문 저장에 실패했습니다. 콘솔을 확인해주세요.");
          }
        } else {
          console.warn("⚠️ Firestore 또는 user가 없어서 저장하지 못함");
          console.log("db:", !!db, "user:", !!user);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      {/* 헤더 */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <span className="text-4xl">✍️</span>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                  영어작문 AI 첨삭
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  편지, 에세이 등 다양한 영어 작문을 AI가 첨삭해드려요
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-sm"
              >
                ← 돌아가기
              </Link>
              {user && (
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all text-sm"
                >
                  로그아웃
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {!user ? (
          /* 로그인하지 않은 경우 */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-gray-800 dark:text-white">
                영어작문을 AI가 첨삭해드려요 ✨
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                편지, 에세이, 이메일 등 모든 영어 작문을 전문적으로 첨삭해드립니다
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
                  다양한 작문
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  편지, 에세이, 이메일 등 모든 형태의 영어 작문
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <div className="text-4xl mb-4">🎓</div>
                <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
                  원어민 수준 첨삭
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  영어문법과 작문 전문 원어민 선생님의 첨삭
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
                  다양한 표현 학습
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  같은 말도 레벨에 맞는 다양한 표현으로 학습
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12"
            >
              <Link
                href="/login"
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-4 px-12 rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-all"
              >
                로그인하고 시작하기 🚀
              </Link>
            </motion.div>
          </motion.div>
        ) : isLoading || isOcrLoading ? (
          /* 로딩 중 */
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner />
          </div>
        ) : result ? (
          /* 첨삭 결과 표시 */
          <CorrectionResult result={result} />
        ) : showOcrEdit ? (
          /* OCR 수정 화면 */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                📝 OCR 결과 확인 및 수정
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                스캔된 내용을 확인하고 필요하면 수정해주세요.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  작문 내용
                </label>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full h-64 px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="작문 내용을 입력하거나 수정하세요..."
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  💡 잘못 인식된 부분이 있다면 여기서 수정해주세요!
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowOcrEdit(false);
                    setOcrResult("");
                    setEditedText("");
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
                >
                  ← 다시 촬영하기
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!editedText.trim()}
                  className={`flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all ${
                    editedText.trim()
                      ? "hover:scale-105 hover:shadow-xl"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  🤖 AI 첨삭 시작하기 →
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* 로그인 후 - 작문 입력 화면 */
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                영어작문 첨삭하기
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                사진으로 업로드하거나 직접 타이핑해주세요
              </p>
            </motion.div>

            {/* 입력 모드 선택 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center gap-4 mb-6"
            >
              <button
                onClick={() => {
                  setInputMode("typing");
                  setSelectedImage(null);
                }}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  inputMode === "typing"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                ⌨️ 직접 타이핑
              </button>
              <button
                onClick={() => {
                  setInputMode("photo");
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
            </motion.div>

            {/* 작문 타입 선택 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6"
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                작문 유형 선택
              </label>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setCompositionType("letter")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    compositionType === "letter"
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  ✉️ 편지
                </button>
                <button
                  onClick={() => setCompositionType("essay")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    compositionType === "essay"
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  📄 에세이
                </button>
                <button
                  onClick={() => setCompositionType("other")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    compositionType === "other"
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  📝 기타
                </button>
              </div>
            </motion.div>

            {/* 직접 타이핑 모드 */}
            {inputMode === "typing" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    영어 작문 입력
                  </label>
                  <textarea
                    value={directText}
                    onChange={(e) => setDirectText(e.target.value)}
                    placeholder="영어 작문을 여기에 입력해주세요..."
                    className="w-full min-h-[300px] px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {directText.length} 글자
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <button
                    onClick={handleDirectSubmit}
                    disabled={!directText.trim()}
                    className={`bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-4 px-12 rounded-full shadow-lg transition-all ${
                      directText.trim()
                        ? "hover:scale-105 hover:shadow-xl"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    🤖 AI 첨삭 시작하기 🚀
                  </button>
                </motion.div>
              </motion.div>
            )}

            {/* 사진 업로드 모드 */}
            {inputMode === "photo" && (
              <>
                <ImageUpload
                  onImageSelect={setSelectedImage}
                  selectedImage={selectedImage}
                />

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-center"
                >
                  <button
                    onClick={handleOCR}
                    disabled={!selectedImage}
                    className={`bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-4 px-12 rounded-full shadow-lg transition-all ${
                      selectedImage
                        ? "hover:scale-105 hover:shadow-xl"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    📸 분석 시작하기 🚀
                  </button>
                </motion.div>
              </>
            )}
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="mt-20 py-8 text-center text-gray-600 dark:text-gray-400">
        <p className="text-sm">Made with ❤️ for English learners</p>
      </footer>
    </div>
  );
}

