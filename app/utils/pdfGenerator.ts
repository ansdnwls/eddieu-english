import jsPDF from "jspdf";
import { DiaryEntry, ExtractedWord } from "@/app/types";

// 한글 텍스트를 Canvas로 렌더링하여 이미지로 변환하는 헬퍼 함수
function renderKoreanTextToImage(
  text: string,
  fontSize: number,
  width: number = 170,
  color: string = "#000000"
): Promise<string> {
  return new Promise((resolve) => {
    // 브라우저 환경이 아니면 빈 문자열 반환
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve("");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      resolve("");
      return;
    }

    // 한글 폰트 설정 (시스템 폰트 사용)
    const fontFamily = "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', Arial, sans-serif";
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // 텍스트 줄바꿈 계산
    const chars = text.split("");
    const lines: string[] = [];
    let currentLine = "";

    for (let i = 0; i < chars.length; i++) {
      const testLine = currentLine + chars[i];
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > width && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = chars[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // Canvas 크기 설정
    const lineHeight = fontSize * 1.3;
    const padding = 10;
    canvas.width = width + padding * 2;
    canvas.height = lines.length * lineHeight + padding * 2;

    // 배경을 흰색으로
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 텍스트 그리기
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";

    lines.forEach((line, index) => {
      ctx.fillText(line, padding, padding + index * lineHeight);
    });

    // Base64 이미지로 변환
    try {
      const imageData = canvas.toDataURL("image/png");
      resolve(imageData);
    } catch (error) {
      console.error("Canvas toDataURL 오류:", error);
      resolve("");
    }
  });
}

// 한글 텍스트를 PDF에 추가 (Canvas 이미지로 변환)
async function addKoreanText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSize: number = 12,
  width: number = 170,
  color: string = "#000000"
): Promise<number> {
  // 한글이 포함되어 있는지 확인
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
  
  if (hasKorean && typeof window !== "undefined") {
    // 브라우저 환경에서만 Canvas 사용
    try {
      const imageData = await renderKoreanTextToImage(text, fontSize, width, color);
      if (imageData && imageData.length > 0) {
        const img = new Image();
        return new Promise((resolve) => {
          img.onload = () => {
            try {
              const imgWidth = img.width * 0.264583; // px to mm 변환
              const imgHeight = img.height * 0.264583;
              doc.addImage(imageData, "PNG", x, y, imgWidth, imgHeight);
              resolve(imgHeight);
            } catch (error) {
              console.error("PDF 이미지 추가 오류:", error);
              // 폴백: 기본 텍스트 사용
              doc.setFontSize(fontSize);
              const lines = doc.splitTextToSize(text, width);
              lines.forEach((line: string, index: number) => {
                doc.text(line, x, y + index * fontSize * 0.4);
              });
              resolve(lines.length * fontSize * 0.4);
            }
          };
          img.onerror = () => {
            // 이미지 로드 실패 시 기본 텍스트 사용
            doc.setFontSize(fontSize);
            const lines = doc.splitTextToSize(text, width);
            lines.forEach((line: string, index: number) => {
              doc.text(line, x, y + index * fontSize * 0.4);
            });
            resolve(lines.length * fontSize * 0.4);
          };
          img.src = imageData;
        });
      }
    } catch (error) {
      console.error("한글 렌더링 오류:", error);
    }
  }
  
  // 기본 텍스트 렌더링 (영어만 또는 서버 사이드)
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, width);
  lines.forEach((line: string, index: number) => {
    doc.text(line, x, y + index * fontSize * 0.4);
  });
  return lines.length * fontSize * 0.4;
}

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

// 단어 학습장 PDF 생성 (개선된 버전 - 한글 지원)
export async function generateVocabularyPDF(words: ExtractedWord[], childName: string): Promise<jsPDF> {
  const doc = new jsPDF();
  let yPos = 20;

  // 제목 (한글 지원)
  const titleText = `${childName}님의 영어 단어 학습장`;
  const titleHeight = await addKoreanText(doc, titleText, 20, yPos, 20, 170);
  yPos += titleHeight + 10;

  // 날짜 (한글 지원)
  const dateText = `생성일: ${new Date().toLocaleDateString("ko-KR")}`;
  const dateHeight = await addKoreanText(doc, dateText, 20, yPos, 12, 170);
  yPos += dateHeight + 5;
  
  // AI 생성 표시 (한글 지원)
  doc.setTextColor(100, 100, 100);
  const aiText = `AI 선생님이 만든 맞춤 단어장 (총 ${words.length}개)`;
  const aiHeight = await addKoreanText(doc, aiText, 20, yPos, 9, 170, "#646464");
  doc.setTextColor(0, 0, 0);
  yPos += aiHeight + 10;

  // 각 단어를 1페이지 또는 적절한 공간에 배치
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    
    // 페이지 넘김 체크 (공간이 부족하면 새 페이지)
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // 단어 번호와 단어 (영어만)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 100, 200);
    doc.text(`${index + 1}. ${word.word}`, 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    // 의미 (한글 지원)
    if (word.meaning) {
      const meaningLabel = "뜻: ";
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const labelHeight = await addKoreanText(doc, meaningLabel, 25, yPos, 12, 20);
      
      const meaningText = word.meaning;
      const meaningHeight = await addKoreanText(doc, meaningText, 38, yPos, 12, 140);
      yPos += Math.max(labelHeight, meaningHeight) + 5;
    }

    // 예문 (영어만)
    if (word.example) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const exampleLabelHeight = await addKoreanText(doc, "예문: ", 25, yPos, 11, 20);
      yPos += exampleLabelHeight + 3;
      
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

    // 유의어 (영어만)
    if ((word as any).synonym) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 150, 0);
      const synonymLabelHeight = await addKoreanText(doc, "유의어: ", 25, yPos, 10, 30, "#009600");
      doc.setFont("helvetica", "normal");
      doc.text((word as any).synonym, 45, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += Math.max(synonymLabelHeight, 7);
    }

    // 반의어 (영어만)
    if ((word as any).antonym) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(200, 0, 0);
      const antonymLabelHeight = await addKoreanText(doc, "반의어: ", 25, yPos, 10, 30, "#C80000");
      doc.setFont("helvetica", "normal");
      doc.text((word as any).antonym, 45, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += Math.max(antonymLabelHeight, 7);
    }

    // 학습 팁 (한글 지원)
    if ((word as any).tip) {
      const tipText = `💡 학습 팁: ${(word as any).tip}`;
      const tipHeight = await addKoreanText(doc, tipText, 25, yPos, 9, 160, "#6464C8");
      yPos += tipHeight + 5;
    }

    // 구분선
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
  }

  return doc;
}



