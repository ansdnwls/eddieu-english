"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { CorrectionResult as CorrectionResultType, EnglishLevel } from "../types";
import PracticeSentence from "./PracticeSentence";
import VoicePlayer from "./VoicePlayer";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { checkUserSubscription, SubscriptionStatus } from "@/lib/subscription/checkSubscription";

interface CorrectionResultProps {
  result: CorrectionResultType;
}

export default function CorrectionResult({ result }: CorrectionResultProps) {
  const { user } = useAuth();
  const [currentAccountType, setCurrentAccountType] = useState<"child" | "parent">("child");
  const [isCopied, setIsCopied] = useState(false);
  const [childInfo, setChildInfo] = useState<any>(null);
  const [contentType, setContentType] = useState<"diary" | "composition" | "letter">("diary");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const accountType = localStorage.getItem("currentAccountType") as "child" | "parent" | null;
    if (accountType) {
      setCurrentAccountType(accountType);
    }

    // childInfo 로드
    const storedChildInfo = localStorage.getItem("childInfo");
    if (storedChildInfo) {
      try {
        const parsed = JSON.parse(storedChildInfo);
        setChildInfo(parsed);
        
        // contentType 결정
        if (result.diaryId?.includes("letter") || parsed.contentType === "letter") {
          setContentType("letter");
        } else if (result.diaryId?.includes("composition") || parsed.contentType === "composition") {
          setContentType("composition");
        } else {
          setContentType("diary");
        }
      } catch (error) {
        console.error("childInfo 파싱 오류:", error);
      }
    }
  }, [result.diaryId]);

  // 단어 수 카운팅 함수
  const countWords = (text: string): number => {
    if (!text || !text.trim()) return 0;
    return text
      .replace(/[.,!?;:()\[\]{}'"]/g, ' ')
      .split(/\s+/)
      .filter(word => word.trim().length > 0).length;
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
      .filter(word => word.trim().length > 0);
    return new Set(words).size;
  };

  // 저장 기능
  const handleSave = async () => {
    if (!user || !db) {
      setSaveError("로그인이 필요합니다.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const originalText = result.originalText;
      const wordCount = countWords(originalText);
      const sentenceCount = countSentences(originalText);
      const uniqueWordsCount = countUniqueWords(originalText);

      const diaryEntry = {
        userId: user.uid,
        originalText: originalText,
        correctedText: result.correctedText,
        feedback: result.feedback,
        encouragement: result.cheerUp || result.encouragement || "잘하고 있어요! 계속 연습해봐요! 💪",
        corrections: result.corrections || [],
        extractedWords: result.extractedWords || [],
        sentenceByStence: result.sentenceByStence || [],
        sentenceExpansion: result.sentenceExpansion || "",
        expansionExample: result.expansionExample || "",
        englishLevel: childInfo?.englishLevel || "Lv.1",
        accountType: currentAccountType,
        contentType: contentType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: {
          wordCount: wordCount,
          sentenceCount: sentenceCount,
          averageSentenceLength: sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0,
          correctionCount: result.corrections?.length || 0,
          uniqueWords: uniqueWordsCount,
        }
      };

      await addDoc(collection(db, "diaries"), diaryEntry);
      console.log("✅ 교정 결과가 저장되었습니다!");
      setIsSaved(true);
      
      // 3초 후 저장 완료 메시지 숨기기
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ 저장 중 오류:", err);
      setSaveError(err.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 콘텐츠 타입별 텍스트
  const getContentText = (key: string) => {
    const texts: Record<string, Record<string, string>> = {
      diary: {
        title: "일기",
        original: "원본 일기",
        corrected: "교정된 일기",
      },
      composition: {
        title: "작문",
        original: "원본 작문",
        corrected: "교정된 작문",
      },
      letter: {
        title: "편지",
        original: "원본 편지",
        corrected: "교정된 편지",
      },
    };
    return texts[contentType][key] || texts.diary[key];
  };

  // 구독 상태 확인
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  
  useEffect(() => {
    if (user) {
      checkUserSubscription(user.uid).then(setSubscriptionStatus);
    }
  }, [user]);

  // GPT 대화 프롬프트 복사
  const handleCopyGPTPrompt = () => {
    // 구독 체크
    if (!subscriptionStatus?.isActive) {
      const confirmUpgrade = confirm(
        "🔒 GPT 대화하기 기능은 유료 구독 후 이용 가능합니다.\n\n" +
        "구독 페이지로 이동하시겠습니까?"
      );
      if (confirmUpgrade) {
        window.location.href = "/pricing";
      }
      return;
    }
    const childName = childInfo?.childName || "학생";
    const childAge = childInfo?.age || 8;
    
    const levelDescriptionMap: Record<EnglishLevel, string> = {
      "Lv.1": "영어 작문 처음 시작 (단어 몇 개로 쓰기 시작)",
      "Lv.2": "간단한 문장으로 작문 (기본 주어 동사 사용)",
      "Lv.3": "여러 문장으로 감정/이유도 쓰려고 해요",
      "Lv.4": "자유롭게 길게 쓰기도 해요 (자기 표현 가능)",
      "Lv.5": "유창해요 (첨삭보단 피드백 위주로 받고 싶어요)",
    };

    const levelDescription = levelDescriptionMap[childInfo.englishLevel as EnglishLevel] || "기본 영어 작문 수준";
    
    let levelInfo = "";
    if (childInfo.arScore) {
      levelInfo = `현재 AR ${childInfo.arScore}점대야.`;
    } else {
      levelInfo = `이 사람은 ${childInfo.englishLevel}이야. (${levelDescription})`;
    }

    const contentTypeText = getContentText("title");
    
    // 레벨에 따른 말하는 속도 지시
    const englishLevel = childInfo?.englishLevel || "Lv.1";
    const speedInstruction = englishLevel === "Lv.1" || englishLevel === "Lv.2" 
      ? "\n- **말하는 속도**: 초급 학습자이므로 천천히, 명확하게 말해줘. 속도는 0.7배 정도로 느리게 말해줘. (예: 'I am happy'를 'I... am... happy'처럼 단어 사이에 약간의 간격을 두고 말해줘)"
      : englishLevel === "Lv.3"
      ? "\n- **말하는 속도**: 중급 학습자이므로 보통 속도보다 조금 느리게 말해줘. (약 0.85배 속도)"
      : "";
    
    const promptText = `너는 원어민 영어 선생님이야.
학습자 이름은 ${childName}이고, 나이는 ${childAge}살이야.
${levelInfo}
오늘 아래 ${contentTypeText}을(를) 작성했어:

📝 영어 ${contentTypeText}:
${result.originalText}

🛠 교정 및 확장:
원본: ${result.originalText}
교정본: ${result.correctedText}
피드백: ${result.feedback}

[중요한 지침]
위 ${contentTypeText} 내용을 바탕으로 아이와 영어로 대화를 할 거야.
- 먼저 질문해서 대화를 이끌어줘
- 아이가 다른 걸 물어보고 이상한 말을 해도 본 대화가 계속 이어져야 해
- 학습자에게 자상하고 상냥하게 말해주고 본 대화에 집중해줘
- 이 글을 치고 전송한 다음 바로 음성대화모드가 시작될 거야
- 시작하는 음성이 나오면 위 ${contentTypeText} 내용으로 대화를 시작하면 돼${speedInstruction}

먼저 작성한 ${contentTypeText} 내용에 대해 친근하게 질문하거나 칭찬하면서 대화를 시작해줘.`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(promptText)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 3000);
          alert("✅ 프롬프트가 복사되었습니다!\n\nChatGPT 또는 Gemini에 붙여넣고 대화를 시작하세요.");
        })
        .catch((err) => {
          console.error("복사 실패:", err);
          fallbackCopyTextToClipboard(promptText);
        });
    } else {
      fallbackCopyTextToClipboard(promptText);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
        alert("✅ 프롬프트가 복사되었습니다!\n\nChatGPT 또는 Gemini에 붙여넣고 대화를 시작하세요.");
      } else {
        alert("❌ 복사에 실패했습니다. 수동으로 텍스트를 선택하여 복사해주세요.");
      }
    } catch (err) {
      console.error('Fallback 복사 실패:', err);
      document.body.removeChild(textArea);
      alert("❌ 복사에 실패했습니다. 수동으로 텍스트를 선택하여 복사해주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-6">
          {/* 1. AI 선생님의 피드백 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-purple-50 dark:bg-purple-900/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🤖</span>
              <h3 className="text-lg font-bold text-purple-700 dark:text-purple-300">
                AI 선생님의 피드백
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {result.feedback}
            </p>
          </motion.div>

          {/* 2. 원본 일기 (단독) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📝</span>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {getContentText("original")}
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {result.originalText}
            </p>
          </motion.div>

          {/* 3. 교정 내역 (문장별) */}
          {result.sentenceByStence && result.sentenceByStence.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✏️</span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  교정 내역
                </h3>
              </div>

              <div className="space-y-4">
                {result.sentenceByStence.map((sentence, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-green-500 pl-4 py-2"
                  >
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                      <span className="text-red-600 dark:text-red-400 line-through">
                        {sentence.original}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        {sentence.corrected}
                      </span>
                    </div>
                    {sentence.explanation && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {sentence.explanation}
                      </p>
                    )}
                    {sentence.alternatives && sentence.alternatives.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">
                          💡 다른 표현:
                        </p>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                          {sentence.alternatives.map((alt, altIndex) => (
                            <li key={altIndex}>{alt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 4. 말해볼까요? (문장별) */}
          {result.sentenceByStence && result.sentenceByStence.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔁</span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  말해볼까요? (문장별)
                </h3>
              </div>

              <div className="space-y-4">
                {result.sentenceByStence.map((sentence, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      📌 문장 {index + 1}
                    </h4>
                    <PracticeSentence
                      sentence={sentence.corrected}
                      original={sentence.original}
                      englishLevel={childInfo?.englishLevel || "Lv.1"}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* 5. 교정된 전체 일기 + 말해볼까요 (한번에) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl p-6 shadow-lg border-2 border-blue-200 dark:border-blue-700"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✨</span>
              <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300">
                교정된 {getContentText("title")} (전체)
              </h3>
            </div>
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-600">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed font-medium text-sm sm:text-base">
                {result.correctedText}
              </p>
            </div>

            {/* 전체 일기 듣고 말하기 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎤</span>
                <h4 className="text-md font-bold text-orange-700 dark:text-orange-300">
                  말해볼까요? (전체 {getContentText("title")})
                </h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                교정된 전체 {getContentText("title")}를 원어민 발음으로 듣고, 직접 말해보세요!
              </p>
              <PracticeSentence
                sentence={result.correctedText}
                original={result.originalText}
                englishLevel={childInfo?.englishLevel || "Lv.1"}
              />
            </div>
          </motion.div>

          {/* 6. GPT와 대화하기 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 shadow-lg border-2 border-green-200 dark:border-green-700"
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                <span className="text-2xl">💬</span>
                GPT와 대화하기
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                이 {getContentText("title")}를 바탕으로 ChatGPT와 영어 회화 연습을 시작해보세요!
              </p>
              <button
                onClick={handleCopyGPTPrompt}
                disabled={isCopied}
                className={`w-full px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  isCopied
                    ? "bg-green-500 text-white"
                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg"
                }`}
              >
                {isCopied ? (
                  <>
                    <span>✅</span>
                    <span>복사됨!</span>
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    <span>프롬프트 복사하기</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>📌 사용 방법:</strong>
              </p>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 pl-5 list-decimal">
                <li>"프롬프트 복사하기" 버튼 클릭</li>
                <li>
                  <a 
                    href="https://chatgpt.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 dark:text-green-400 hover:underline font-semibold"
                  >
                    ChatGPT
                  </a>
                  {" "}또는{" "}
                  <a 
                    href="https://gemini.google.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 dark:text-green-400 hover:underline font-semibold"
                  >
                    Gemini
                  </a>
                  {" "}새 창 열기
                </li>
                <li>복사된 프롬프트 붙여넣기 (Ctrl+V)</li>
                <li>AI 선생님과 영어로 대화 시작! 🎉</li>
              </ol>
              <p className="text-xs text-green-700 dark:text-green-300 mt-3 bg-green-100 dark:bg-green-900/30 rounded p-2">
                💡 무료로 AI 선생님과 {getContentText("title")} 내용으로 영어 회화 연습을 할 수 있어요!
              </p>
            </div>
          </motion.div>

          {/* 7. 오늘의 단어 (AI 단어장) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📖</span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  오늘의 단어
                </h3>
              </div>
            </div>

            {result.extractedWords && result.extractedWords.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    🤖 AI가 <span className="font-semibold text-blue-600 dark:text-blue-400">{childInfo?.englishLevel || "Lv.1"}</span> 레벨에 맞춰 유의어·반의어·학습팁 포함 ({result.extractedWords.length}개 단어)
                  </p>
                  <button
                    onClick={() => {
                      // TODO: PDF 생성 및 다운로드
                      alert("단어장 출력 기능은 곧 추가됩니다!");
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                  >
                    <span>🖨️</span>
                    <span>단어장 출력하기</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {result.extractedWords.map((word, index) => (
                    <div
                      key={index}
                      className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {word.word}
                        </span>
                        {word.level && (
                          <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                            {word.level}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {word.meaning}
                      </p>
                      {word.example && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 dark:text-gray-500 italic mb-2">
                            예: {word.example}
                          </p>
                          <VoicePlayer 
                            text={word.example}
                            defaultVoice="rachel_us"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  🤖 <strong>AI 단어장 만들기</strong>를 눌러보세요!
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                  AI가 이 {getContentText("title")}에서 중요한 단어를 골라 유의어, 반의어, 학습 팁까지 제공해드립니다.
                </p>
                <button
                  onClick={() => {
                    // TODO: AI 단어장 생성 API 호출
                    alert("AI 단어장 생성 기능은 곧 추가됩니다!");
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all"
                >
                  🤖 AI 단어장 만들기
                </button>
              </div>
            )}
          </motion.div>

          {/* 8. 응원 메시지 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl p-6 text-center"
          >
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {result.cheerUp || "잘하고 있어요! 계속 연습해봐요! 💪"}
            </p>
          </motion.div>

          {/* 저장 버튼 및 대시보드로 돌아가기 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={handleSave}
              disabled={isSaving || isSaved || !user}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                isSaved
                  ? "bg-green-500 text-white"
                  : isSaving
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : !user
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg"
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>저장 중...</span>
                </>
              ) : isSaved ? (
                <>
                  <span>✅</span>
                  <span>저장 완료!</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>저장하기</span>
                </>
              )}
            </button>
            
            {saveError && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm">
                {saveError}
              </div>
            )}
            
            <Link
              href="/dashboard"
              className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              ← 대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
