import jsPDF from "jspdf";
import { DiaryEntry, ExtractedWord } from "@/app/types";

// 전체 학습 기록 PDF 생성
export function generateDiaryPDF(diaries: DiaryEntry[], childName: string) {
  const doc = new jsPDF();
  let yPos = 20;

  // 제목
  doc.setFontSize(20);
  doc.text(`${childName}님의 영어 일기 학습 기록`, 105, yPos, { align: "center" });
  yPos += 15;

  // 날짜
  doc.setFontSize(12);
  doc.text(`생성일: ${new Date().toLocaleDateString("ko-KR")}`, 105, yPos, { align: "center" });
  yPos += 20;

  // 각 일기 추가
  diaries.forEach((diary, index) => {
    // 페이지 넘김 체크
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // 일기 번호 및 날짜
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(
      `일기 ${index + 1} - ${new Date(diary.createdAt).toLocaleDateString("ko-KR")}`,
      20,
      yPos
    );
    yPos += 10;

    // 레벨
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`레벨: ${diary.englishLevel}`, 20, yPos);
    yPos += 8;

    // 원본 일기
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("원본 일기:", 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    const originalLines = doc.splitTextToSize(diary.originalText, 170);
    originalLines.forEach((line: string) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 25, yPos);
      yPos += 6;
    });
    yPos += 5;

    // 교정본
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("교정된 일기:", 20, yPos);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 100, 200);
    const correctedLines = doc.splitTextToSize(diary.correctedText, 170);
    correctedLines.forEach((line: string) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 25, yPos);
      yPos += 6;
    });
    doc.setTextColor(0, 0, 0);
    yPos += 5;

    // 피드백
    if (diary.feedback) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      const feedbackLines = doc.splitTextToSize(diary.feedback, 170);
      feedbackLines.forEach((line: string) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 25, yPos);
        yPos += 5;
      });
      yPos += 5;
    }

    // 통계
    if (diary.stats) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        `단어 ${diary.stats.wordCount}개 | 문장 ${diary.stats.sentenceCount}개 | 교정 ${diary.stats.correctionCount}개`,
        20,
        yPos
      );
      yPos += 10;
    }

    yPos += 5; // 일기 간 간격
  });

  return doc;
}

// 단어 학습장 PDF 생성 (개선된 버전)
export function generateVocabularyPDF(words: ExtractedWord[], childName: string) {
  const doc = new jsPDF();
  let yPos = 20;

  // 제목
  doc.setFontSize(20);
  doc.text(`${childName}님의 영어 단어 학습장`, 105, yPos, { align: "center" });
  yPos += 15;

  // 날짜
  doc.setFontSize(12);
  doc.text(`생성일: ${new Date().toLocaleDateString("ko-KR")}`, 105, yPos, { align: "center" });
  yPos += 10;
  
  // AI 생성 표시
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`AI 선생님이 만든 맞춤 단어장 (총 ${words.length}개)`, 105, yPos, { align: "center" });
  doc.setTextColor(0, 0, 0);
  yPos += 15;

  // 각 단어를 1페이지 또는 적절한 공간에 배치
  words.forEach((word, index) => {
    // 페이지 넘김 체크 (공간이 부족하면 새 페이지)
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // 단어 번호와 단어
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 100, 200);
    doc.text(`${index + 1}. ${word.word}`, 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    // 의미
    if (word.meaning) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("뜻:", 25, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(word.meaning, 38, yPos);
      yPos += 8;
    }

    // 예문
    if (word.example) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("예문:", 25, yPos);
      yPos += 6;
      doc.setFont("helvetica", "italic");
      doc.setTextColor(50, 50, 50);
      const exampleLines = doc.splitTextToSize(word.example, 160);
      exampleLines.forEach((line: string) => {
        doc.text(line, 30, yPos);
        yPos += 5;
      });
      doc.setTextColor(0, 0, 0);
      yPos += 3;
    }

    // 유의어
    if ((word as any).synonym) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 150, 0);
      doc.text("유의어:", 25, yPos);
      doc.setFont("helvetica", "normal");
      doc.text((word as any).synonym, 45, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 7;
    }

    // 반의어
    if ((word as any).antonym) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(200, 0, 0);
      doc.text("반의어:", 25, yPos);
      doc.setFont("helvetica", "normal");
      doc.text((word as any).antonym, 45, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 7;
    }

    // 학습 팁
    if ((word as any).tip) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 200);
      doc.text("💡 ", 25, yPos);
      const tipLines = doc.splitTextToSize((word as any).tip, 160);
      tipLines.forEach((line: string, i: number) => {
        doc.text(line, i === 0 ? 32 : 30, yPos);
        yPos += 5;
      });
      doc.setTextColor(0, 0, 0);
      yPos += 3;
    }

    // 구분선
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
  });

  return doc;
}



