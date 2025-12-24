"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DiaryEntry, ExtractedWord, EnglishLevel } from "@/app/types";
import Link from "next/link";
import PracticeSentence from "@/app/components/PracticeSentence";
import { generateVocabularyPDF } from "@/app/utils/pdfGenerator";

export default function DiaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [diary, setDiary] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayWords, setTodayWords] = useState<ExtractedWord[] | null>(null);
  const [isGeneratingWords, setIsGeneratingWords] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // todayWords 변경 감지 (디버깅용)
  useEffect(() => {
    console.log("📚 todayWords 상태 변경:", todayWords);
    if (todayWords) {
      console.log(`📚 todayWords 길이: ${todayWords.length}`);
      console.log("📚 todayWords 내용:", todayWords);
    }
  }, [todayWords]);
  const [childInfo, setChildInfo] = useState<{
    childName: string;
    age: number;
    arScore: string;
    englishLevel: EnglishLevel;
  } | null>(null);

  useEffect(() => {
    const loadDiary = async () => {
      if (!db || !user || !params.id) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "diaries", params.id as string);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("일기를 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        const data = docSnap.data();
        
        // 관리자 권한 확인
        let isAdmin = false;
        try {
          const adminDoc = await getDoc(doc(db, "admins", user.uid));
          if (adminDoc.exists() && adminDoc.data().isAdmin === true) {
            isAdmin = true;
          }
        } catch (adminErr) {
          console.log("관리자 권한 체크 실패:", adminErr);
        }
        
        // 사용자 확인 (관리자는 모든 일기 접근 가능)
        if (data.userId !== user.uid && !isAdmin) {
          setError("이 일기에 접근할 권한이 없습니다.");
          setLoading(false);
          return;
        }

        const diaryData = {
          id: docSnap.id,
          ...data,
        } as DiaryEntry;
        setDiary(diaryData);

        // 아이 정보 가져오기
        try {
          const childRef = doc(db, "children", user.uid);
          const childSnap = await getDoc(childRef);

          if (childSnap.exists()) {
            const childData = childSnap.data();
            setChildInfo({
              childName: childData.childName || user?.displayName || "우리 아이",
              age: childData.age || 8,
              arScore: childData.arScore || "",
              englishLevel: childData.englishLevel || diaryData.englishLevel || "Lv.1",
            });
          } else {
            // Firestore에 없으면 기본값 사용
            setChildInfo({
              childName: user?.displayName || "우리 아이",
              age: 8,
              arScore: "",
              englishLevel: diaryData.englishLevel || "Lv.1",
            });
          }
        } catch (childErr) {
          console.error("아이 정보 로딩 오류:", childErr);
          // 아이 정보 로딩 실패해도 일기는 보여줌
          setChildInfo({
            childName: user?.displayName || "우리 아이",
            age: 8,
            arScore: "",
            englishLevel: diaryData.englishLevel || "Lv.1",
          });
        }
      } catch (err) {
        console.error("Error loading diary:", err);
        setError("일기를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadDiary();
  }, [params.id, user]);

  const getWordCountByLevel = (level: EnglishLevel): number => {
    switch (level) {
      case "Lv.1":
        return 6;
      case "Lv.2":
        return 9;
      case "Lv.3":
        return 12;
      case "Lv.4":
        return 15;
      case "Lv.5":
        return 18;
      default:
        return 10;
    }
  };

  const handleGenerateTodayWords = async () => {
    console.log("handleGenerateTodayWords 호출됨");
    console.log("diary:", diary);
    console.log("extractedWords:", diary?.extractedWords);
    
    if (!diary) {
      console.error("diary가 없습니다");
      alert("일기 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!diary.extractedWords || diary.extractedWords.length === 0) {
      console.error("extractedWords가 없습니다");
      alert("이 일기에는 추출된 단어가 없습니다.");
      return;
    }

    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    setIsGeneratingWords(true);

    try {
      console.log("🤖 AI 단어장 생성 시작...");
      
      // AI API 호출
      const response = await fetch("/api/generate-vocabulary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          words: diary.extractedWords,
          englishLevel: diary.englishLevel,
          userId: user.uid,
          childAge: childInfo?.age || 8,
        }),
      });

      const result = await response.json();
      console.log("API 응답:", result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || "단어장 생성에 실패했습니다.");
      }

      const enhancedWords = result.words;
      
      if (!enhancedWords || enhancedWords.length === 0) {
        alert("생성된 단어가 없습니다. 다시 시도해주세요.");
        return;
      }

      console.log(`✅ ${enhancedWords.length}개의 단어 생성 완료`);
      console.log("생성된 단어 목록:", enhancedWords);
      setTodayWords(enhancedWords);
      console.log("todayWords 상태 업데이트 완료");
      
      alert(`✨ AI가 ${enhancedWords.length}개의 학습 단어를 생성했습니다!\n\n유의어, 반의어, 학습 팁이 포함되어 있어요.`);
    } catch (error) {
      console.error("단어 생성 오류:", error);
      alert("단어 생성 중 오류가 발생했습니다.\n\n" + (error as Error).message);
    } finally {
      setIsGeneratingWords(false);
    }
  };

  const handlePrintTodayWords = async () => {
    console.log("handlePrintTodayWords 호출됨");
    console.log("todayWords:", todayWords);
    
    if (!todayWords || todayWords.length === 0) {
      console.error("todayWords가 없습니다");
      alert("먼저 '오늘의 단어 만들기' 버튼을 눌러 단어를 생성해주세요.");
      return;
    }

    try {
      const childName = user?.displayName || "우리 아이";
      console.log(`PDF 생성 시작: ${todayWords.length}개 단어`);
      
      // PDF 생성 (async)
      const doc = await generateVocabularyPDF(todayWords, childName);
      
      // Blob URL을 사용하여 안전하게 다운로드 (Chrome 보안 경고 해결)
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `오늘의_단어_${childName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log("PDF 저장 완료");
      alert(`✅ 단어장이 다운로드되었습니다! (${todayWords.length}개 단어)`);
    } catch (error) {
      console.error("PDF 생성 오류:", error);
      alert("PDF 생성 중 오류가 발생했습니다: " + (error as Error).message);
    }
  };

  // GPT 대화 프롬프트 복사
  const handleCopyGPTPrompt = () => {
    if (!diary || !childInfo) return;

    const childName = childInfo.childName;
    const childAge = childInfo.age;
    
    // 영어 레벨 설명 매핑
    const levelDescriptionMap: Record<EnglishLevel, string> = {
      "Lv.1": "영어 일기 처음 써봐요 (단어 몇 개로 쓰기 시작)",
      "Lv.2": "간단한 문장으로 일기 써요 (기본 주어 동사 사용)",
      "Lv.3": "여러 문장으로 감정/이유도 쓰려고 해요",
      "Lv.4": "자유롭게 길게 쓰기도 해요 (자기 표현 가능)",
      "Lv.5": "유창해요 (첨삭보단 피드백 위주로 받고 싶어요)",
    };

    const levelDescription = levelDescriptionMap[childInfo.englishLevel] || "기본 영어 일기 수준";
    
    // AR 점수가 있으면 AR 점수 사용, 없으면 레벨 설명 사용
    let levelInfo = "";
    if (childInfo.arScore) {
      levelInfo = `현재 AR ${childInfo.arScore}점대야.`;
    } else {
      levelInfo = `이 아이는 ${childInfo.englishLevel}이야. (${levelDescription})`;
    }

    // 레벨에 따른 말하는 속도 지시
    const englishLevel = childInfo.englishLevel;
    const speedInstruction = englishLevel === "Lv.1" || englishLevel === "Lv.2" 
      ? "\n- **말하는 속도**: 초급 학습자이므로 천천히, 명확하게 말해줘. 속도는 0.7배 정도로 느리게 말해줘. (예: \"I am happy\"를 \"I... am... happy\"처럼 단어 사이에 약간의 간격을 두고 말해줘)"
      : englishLevel === "Lv.3"
      ? "\n- **말하는 속도**: 중급 학습자이므로 보통 속도보다 조금 느리게 말해줘. (약 0.85배 속도)"
      : "";

    const promptText = `너는 원어민 영어 선생님이야.
아이 이름은 ${childName}이고, 나이는 ${childAge}살이야.
${levelInfo}
오늘 아이가 직접 아래 일기를 작성했어:

📝 영어일기:
${diary.originalText}

🛠 교정 및 확장:
원본: ${diary.originalText}
교정본: ${diary.correctedText}
피드백: ${diary.feedback}

이 상황을 바탕으로 아이의 수준에 맞춰 영어로 대화를 시작해줘.
아이가 대화의 흐름을 바꾸더라도 
아이에게 자상하고 상냥하게 말해주고 본 대화에 집중해줘.${speedInstruction}

먼저 아이가 쓴 일기 내용에 대해 친근하게 질문하거나 칭찬하면서 대화를 시작해줘.`;

    // Clipboard API 사용 가능 여부 확인
    if (navigator.clipboard && window.isSecureContext) {
      // HTTPS 환경: Clipboard API 사용
      navigator.clipboard.writeText(promptText)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 3000);
          alert("✅ 프롬프트가 복사되었습니다!\n\nChatGPT 또는 Gemini에 붙여넣고 대화를 시작하세요.");
        })
        .catch((err) => {
          console.error("복사 실패:", err);
          // 폴백: 텍스트 영역 사용
          fallbackCopyTextToClipboard(promptText);
        });
    } else {
      // HTTP 환경: 폴백 방법 사용
      fallbackCopyTextToClipboard(promptText);
    }
  };

  // 폴백 복사 함수 (HTTP 환경용)
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
      if (successful) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
        alert("✅ 프롬프트가 복사되었습니다!\n\nChatGPT 또는 Gemini에 붙여넣고 대화를 시작하세요.");
      } else {
        // 복사 실패: 수동으로 선택된 텍스트 보여주기
        showPromptModal(text);
      }
    } catch (err) {
      console.error('폴백 복사 실패:', err);
      showPromptModal(text);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  // 프롬프트 모달 표시 (최후의 폴백)
  const showPromptModal = (text: string) => {
    alert("프롬프트를 수동으로 복사해주세요:\n\n" + text.substring(0, 200) + "...\n\n(아래 텍스트를 길게 눌러 복사하세요)");
  };

  // 일기 인쇄 함수
  const handlePrintDiary = () => {
    // 인쇄용 스타일 추가
    const printStyle = document.createElement("style");
    printStyle.textContent = `
      @media print {
        /* 인쇄 시 숨길 요소 */
        header,
        .print\\:hidden,
        button,
        a,
        .bg-gradient-to-r,
        .bg-gradient-to-br,
        .shadow-lg,
        .shadow-xl,
        .shadow-md,
        .hover\\:scale-105,
        .hover\\:shadow-xl,
        .transition-all,
        .transition-transform,
        .animate-spin,
        .animate-pulse {
          display: none !important;
        }

        /* 인쇄용 레이아웃 */
        body {
          background: white !important;
          color: black !important;
          font-size: 12pt;
          line-height: 1.6;
        }

        .print\\:block {
          display: block !important;
        }

        /* 인쇄용 컨테이너 */
        .print-container {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 20px !important;
        }

        /* 인쇄용 섹션 스타일 */
        .print-section {
          page-break-inside: avoid;
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }

        .print-title {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
          border-bottom: 2px solid #333;
          padding-bottom: 5px;
        }

        .print-content {
          font-size: 11pt;
          line-height: 1.8;
          color: #000;
        }

        /* 원본/교정 비교 */
        .print-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }

        .print-original {
          border: 1px solid #ccc;
          padding: 10px;
          background: #f9f9f9;
        }

        .print-corrected {
          border: 1px solid #4a90e2;
          padding: 10px;
          background: #e8f4f8;
        }

        /* 교정 내역 */
        .print-correction-item {
          margin-bottom: 10px;
          padding: 8px;
          border-left: 3px solid #4a90e2;
          background: #f0f8ff;
        }

        /* 단어 카드 */
        .print-word-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 10px;
        }

        .print-word-card {
          border: 1px solid #ddd;
          padding: 8px;
          border-radius: 4px;
          background: #f9f9f9;
        }

        /* 페이지 나누기 */
        .print-page-break {
          page-break-after: always;
        }

        /* 헤더/푸터 제거 */
        @page {
          margin: 1.5cm;
        }
      }
    `;
    document.head.appendChild(printStyle);

    // 인쇄용 HTML 생성
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("팝업이 차단되어 있습니다. 팝업을 허용해주세요.");
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>일기 인쇄 - ${new Date(diary.createdAt).toLocaleDateString("ko-KR")}</title>
          <style>
            body {
              font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20px;
              background: white;
              color: black;
              font-size: 12pt;
              line-height: 1.6;
            }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #333;
              padding-bottom: 15px;
            }
            .print-header h1 {
              font-size: 24pt;
              margin: 0 0 10px 0;
              color: #333;
            }
            .print-header .date {
              font-size: 14pt;
              color: #666;
            }
            .print-section {
              page-break-inside: avoid;
              margin-bottom: 25px;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 8px;
            }
            .print-title {
              font-size: 16pt;
              font-weight: bold;
              margin-bottom: 12px;
              color: #333;
              border-bottom: 2px solid #333;
              padding-bottom: 5px;
            }
            .print-content {
              font-size: 11pt;
              line-height: 1.8;
              color: #000;
              white-space: pre-wrap;
            }
            .print-comparison {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            .print-original {
              border: 1px solid #ccc;
              padding: 12px;
              background: #f9f9f9;
              border-radius: 4px;
            }
            .print-original h4 {
              margin: 0 0 8px 0;
              font-size: 12pt;
              color: #666;
            }
            .print-corrected {
              border: 1px solid #4a90e2;
              padding: 12px;
              background: #e8f4f8;
              border-radius: 4px;
            }
            .print-corrected h4 {
              margin: 0 0 8px 0;
              font-size: 12pt;
              color: #4a90e2;
            }
            .print-correction-item {
              margin-bottom: 12px;
              padding: 10px;
              border-left: 4px solid #4a90e2;
              background: #f0f8ff;
              border-radius: 4px;
            }
            .print-correction-item .original {
              text-decoration: line-through;
              color: #666;
              margin-right: 8px;
            }
            .print-correction-item .corrected {
              color: #4a90e2;
              font-weight: bold;
            }
            .print-correction-item .explanation {
              margin-top: 5px;
              font-size: 10pt;
              color: #555;
            }
            .print-word-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-top: 10px;
            }
            .print-word-card {
              border: 1px solid #ddd;
              padding: 10px;
              border-radius: 4px;
              background: #f9f9f9;
            }
            .print-word-card .word {
              font-weight: bold;
              font-size: 13pt;
              color: #4a90e2;
              margin-bottom: 5px;
            }
            .print-word-card .meaning {
              font-size: 10pt;
              color: #666;
            }
            @media print {
              body {
                margin: 0;
                padding: 15px;
              }
              .print-section {
                page-break-inside: avoid;
              }
              @page {
                margin: 1.5cm;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>📝 영어 일기 학습 자료</h1>
            <div class="date">작성일: ${new Date(diary.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })} | 레벨: ${diary.englishLevel}</div>
          </div>

          <!-- AI 선생님의 피드백 -->
          <div class="print-section">
            <div class="print-title">🤖 AI 선생님의 피드백</div>
            <div class="print-content">${diary.feedback || "피드백이 없습니다."}</div>
          </div>

          <!-- 원본 일기 & 교정된 일기 -->
          <div class="print-section">
            <div class="print-title">📝 원본 일기 & ✨ 교정된 일기</div>
            <div class="print-comparison">
              <div class="print-original">
                <h4>📝 원본 일기</h4>
                <div class="print-content">${diary.originalText || ""}</div>
              </div>
              <div class="print-corrected">
                <h4>✨ 교정된 일기</h4>
                <div class="print-content">${diary.correctedText || ""}</div>
              </div>
            </div>
          </div>

          <!-- 교정 내역 -->
          ${diary.corrections && diary.corrections.length > 0 ? `
          <div class="print-section">
            <div class="print-title">✏️ 교정 내역</div>
            ${diary.corrections.map((correction: any) => `
              <div class="print-correction-item">
                <div>
                  <span class="original">${correction.original || ""}</span>
                  <span>→</span>
                  <span class="corrected">${correction.corrected || ""}</span>
                </div>
                ${correction.explanation ? `<div class="explanation">${correction.explanation}</div>` : ""}
              </div>
            `).join("")}
          </div>
          ` : ""}

          <!-- 주요 단어 -->
          ${diary.extractedWords && diary.extractedWords.length > 0 ? `
          <div class="print-section">
            <div class="print-title">📚 주요 단어</div>
            <div class="print-word-grid">
              ${diary.extractedWords.map((word: any) => `
                <div class="print-word-card">
                  <div class="word">${word.word || ""}</div>
                  ${word.meaning ? `<div class="meaning">${word.meaning}</div>` : ""}
                </div>
              `).join("")}
            </div>
          </div>
          ` : ""}

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 10pt;">
            EddieU English - AI 영어 일기 첨삭 서비스
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // 인쇄 대화상자 열기
    setTimeout(() => {
      printWindow.print();
      // 인쇄 후 스타일 제거
      setTimeout(() => {
        document.head.removeChild(printStyle);
      }, 1000);
    }, 250);
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">일기를 불러오는 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !diary) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center max-w-md"
          >
            <div className="text-6xl mb-4">😢</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              {error || "일기를 찾을 수 없습니다"}
            </h2>
            <Link
              href="/dashboard"
              className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:scale-105 transition-all"
            >
              대시보드로 돌아가기
            </Link>
          </motion.div>
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
                일기 상세 보기
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded">
                {diary.englishLevel}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(diary.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="space-y-6">
            {/* AI 피드백 - 제일 위로 이동 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-purple-50 dark:bg-purple-900/30 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <h3 className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    AI 선생님의 피드백
                  </h3>
                </div>
                <button
                  onClick={handlePrintDiary}
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all print:hidden"
                  title="인쇄하기"
                >
                  <span>🖨️</span>
                  <span className="hidden sm:inline">인쇄하기</span>
                </button>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {diary.feedback}
              </p>
            </motion.div>

            {/* 교정 전후 비교 */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* 원본 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📝</span>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    원본 일기
                  </h3>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {diary.originalText}
                </p>
              </motion.div>

              {/* 교정본 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl p-6 shadow-lg border-2 border-blue-200 dark:border-blue-700"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">✨</span>
                  <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    교정된 일기
                  </h3>
                </div>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-medium">
                  {diary.correctedText}
                </p>
              </motion.div>
            </div>

            {/* 교정 내역 */}
            {diary.corrections && diary.corrections.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">✏️</span>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    교정 내역
                  </h3>
                </div>
                <div className="space-y-3">
                  {diary.corrections.map((correction, index) => (
                    <div
                      key={index}
                      className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-r"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800 dark:text-gray-200 line-through">
                          {correction.original}
                        </span>
                        <span className="text-gray-500">→</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {correction.corrected}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {correction.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 추출된 단어 */}
            {diary.extractedWords && diary.extractedWords.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📚</span>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    주요 단어
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {diary.extractedWords.map((word, index) => (
                    <div
                      key={index}
                      className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800"
                    >
                      <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
                        {word.word}
                      </div>
                      {word.meaning && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {word.meaning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 다시 말해보기 */}
            {diary.correctedText && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
              >
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🔁</span>
                  말해볼까요?
                </h3>
                <div className="space-y-4">
                  {diary.correctedText
                    .split(/[.!?]+/)
                    .filter((s) => s.trim().length > 0)
                    .slice(0, 3)
                    .map((sentence, index) => (
                      <PracticeSentence
                        key={index}
                        sentence={sentence.trim()}
                        original={diary.originalText
                          .split(/[.!?]+/)
                          .filter((s) => s.trim().length > 0)[index]?.trim()}
                      />
                    ))}
                </div>
              </motion.div>
            )}

            {/* GPT와 대화하기 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 shadow-lg border-2 border-green-200 dark:border-green-700"
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                  <span className="text-2xl">💬</span>
                  GPT와 대화하기
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  이 일기를 바탕으로 ChatGPT와 영어 회화 연습을 시작해보세요!
                </p>
                <button
                  onClick={handleCopyGPTPrompt}
                  disabled={!childInfo}
                  className={`w-full px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    isCopied
                      ? "bg-green-500 text-white"
                      : !childInfo
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md"
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
                  💡 무료로 AI 선생님과 일기 내용으로 영어 회화 연습을 할 수 있어요!
                </p>
              </div>
            </motion.div>

            {/* 통계 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📊</span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  통계
                </h3>
              </div>
              {diary.stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {diary.stats.wordCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      단어 수
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {diary.stats.sentenceCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      문장 수
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {diary.stats.uniqueWords}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      고유 단어
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {diary.stats.correctionCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      교정 수
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  통계 정보가 없습니다.
                </p>
              )}
            </motion.div>

            {/* 오늘의 단어 - 일기별 단어장 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
            >
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                    <span className="text-2xl">📖</span>
                    오늘의 단어
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    🤖 AI가 {diary.englishLevel} 레벨에 맞춰 유의어·반의어·학습팁 포함 ({getWordCountByLevel(diary.englishLevel)}개 단어)
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("오늘의 단어 만들기 버튼 클릭됨");
                        handleGenerateTodayWords();
                      }}
                      disabled={isGeneratingWords || !diary.extractedWords || diary.extractedWords.length === 0}
                      className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        isGeneratingWords || !diary.extractedWords || diary.extractedWords.length === 0
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                          : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white cursor-pointer"
                      }`}
                      style={{ touchAction: "manipulation" }}
                    >
                      {isGeneratingWords ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>만드는 중...</span>
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          <span>AI 단어장 만들기</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("단어장 출력하기 버튼 클릭됨");
                        handlePrintTodayWords();
                      }}
                      disabled={!todayWords || todayWords.length === 0}
                      className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        !todayWords || todayWords.length === 0
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                          : "bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white cursor-pointer"
                      }`}
                      style={{ touchAction: "manipulation" }}
                    >
                      <span>🖨️</span>
                      <span>단어장 출력하기</span>
                    </button>
                  </div>
                </div>

                {!diary.extractedWords || diary.extractedWords.length === 0 ? (
                  <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center border border-yellow-200 dark:border-yellow-700">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      이 일기에는 추출된 단어가 없어요. 새로 첨삭한 일기에서 단어장을 만들어보세요.
                    </p>
                  </div>
                ) : !todayWords || todayWords.length === 0 ? (
                  <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      🤖 <strong>AI 단어장 만들기</strong>를 눌러보세요!
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      AI가 이 일기에서 중요한 단어를 골라 유의어, 반의어, 학습 팁까지 제공해드립니다.
                    </p>
                  </div>
                ) : null}

                {todayWords && Array.isArray(todayWords) && todayWords.length > 0 && (
                  <>
                    <div className="mt-3 mb-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                      <p className="text-sm text-purple-700 dark:text-purple-300 text-center">
                        🤖 <strong>AI가 생성한 맞춤 단어장</strong>입니다. 유의어, 반의어, 학습 팁이 포함되어 있어요!
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {todayWords.map((word, index) => {
                        console.log(`렌더링 단어 ${index}:`, word);
                        return (
                        <div
                          key={`${word.word}-${index}`}
                          className="border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800/60 hover:shadow-lg transition-all hover:scale-[1.02]"
                        >
                          {/* 단어 */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {index + 1}. {word.word}
                            </span>
                            {word.level && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                {word.level}
                              </span>
                            )}
                          </div>
                          
                          {/* 의미 */}
                          {word.meaning && (
                            <p className="text-base text-gray-800 dark:text-gray-200 mb-3 font-semibold">
                              💡 {word.meaning}
                            </p>
                          )}
                          
                          {/* 예문 */}
                          {word.example && (
                            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-blue-400">
                              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                "{word.example}"
                              </p>
                            </div>
                          )}
                          
                          {/* 유의어/반의어 */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {(word as any).synonym && (
                              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-sm">
                                <span className="font-semibold">유의어:</span>
                                <span>{(word as any).synonym}</span>
                              </div>
                            )}
                            {(word as any).antonym && (
                              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-sm">
                                <span className="font-semibold">반의어:</span>
                                <span>{(word as any).antonym}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* 학습 팁 */}
                          {(word as any).tip && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 leading-relaxed">
                                <span className="font-semibold">✨ 학습 팁:</span> {(word as any).tip}
                              </p>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </>
                )}

              </motion.div>

            {/* 응원 메시지 - 맨 아래로 이동 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl p-6 text-center"
            >
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {diary.encouragement || diary.cheerUp || "잘하고 있어요! 계속 연습해봐요! 💪"}
              </p>
            </motion.div>

            {/* 뒤로 가기 버튼 */}
            <div className="flex justify-center">
              <Link
                href="/dashboard"
                className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-3 px-8 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                ← 대시보드로 돌아가기
              </Link>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
