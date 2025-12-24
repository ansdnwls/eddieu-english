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

// 단어 학습장 PDF 생성 (개선된 버전 - 한글 지원, 2열 레이아웃)
export async function generateVocabularyPDF(words: ExtractedWord[], childName: string): Promise<jsPDF> {
  const doc = new jsPDF();
  const wordCount = words.length;
  
  // 단어 개수에 따른 레이아웃 설정
  let columns: number; // 열 개수
  let wordFontSize: number; // 단어 폰트 크기
  let meaningFontSize: number; // 의미 폰트 크기
  let exampleFontSize: number; // 예문 폰트 크기
  let synonymFontSize: number; // 유의어/반의어 폰트 크기
  let tipFontSize: number; // 학습 팁 폰트 크기
  let wordSpacing: number; // 단어 간 간격
  let itemSpacing: number; // 항목 간 간격
  let cardPadding: number; // 카드 패딩
  let cardHeight: number; // 각 단어 카드 높이 (예상)

  if (wordCount <= 10) {
    // 10개 이하: 1열, 큰 폰트
    columns = 1;
    wordFontSize = 16;
    meaningFontSize = 12;
    exampleFontSize = 11;
    synonymFontSize = 10;
    tipFontSize = 9;
    wordSpacing = 35;
    itemSpacing = 5;
    cardPadding = 5;
    cardHeight = 50;
  } else if (wordCount <= 20) {
    // 11-20개: 2열, 중간 폰트
    columns = 2;
    wordFontSize = 14;
    meaningFontSize = 11;
    exampleFontSize = 10;
    synonymFontSize = 9;
    tipFontSize = 8;
    wordSpacing = 25;
    itemSpacing = 4;
    cardPadding = 4;
    cardHeight = 40;
  } else {
    // 21개 이상: 2열, 작은 폰트
    columns = 2;
    wordFontSize = 12;
    meaningFontSize = 10;
    exampleFontSize = 9;
    synonymFontSize = 8;
    tipFontSize = 7;
    wordSpacing = 20;
    itemSpacing = 3;
    cardPadding = 3;
    cardHeight = 35;
  }

  const pageWidth = 210; // A4 너비 (mm)
  const pageHeight = 297; // A4 높이 (mm)
  const margin = 15; // 여백
  const contentWidth = pageWidth - margin * 2; // 콘텐츠 너비
  const columnWidth = columns === 2 ? (contentWidth - 10) / 2 : contentWidth; // 열 너비 (열 간격 10mm)
  const startX = margin; // 시작 X 위치
  let startY = 20; // 시작 Y 위치

  // 제목 (한글 지원, 중앙 정렬)
  const titleText = `${childName}님의 영어 단어 학습장`;
  const titleWidth = 170; // 제목 너비
  const titleX = (pageWidth - titleWidth) / 2; // 중앙 정렬
  const titleHeight = await addKoreanText(doc, titleText, titleX, startY, 20, titleWidth);
  startY += titleHeight + 8;

  // 날짜 (한글 지원, 중앙 정렬)
  const dateText = `생성일: ${new Date().toLocaleDateString("ko-KR")}`;
  const dateWidth = 100;
  const dateX = (pageWidth - dateWidth) / 2;
  const dateHeight = await addKoreanText(doc, dateText, dateX, startY, 12, dateWidth);
  startY += dateHeight + 5;
  
  // AI 생성 표시 (한글 지원, 중앙 정렬)
  doc.setTextColor(100, 100, 100);
  const aiText = `AI 선생님이 만든 맞춤 단어장 (총 ${words.length}개)`;
  const aiWidth = 150;
  const aiX = (pageWidth - aiWidth) / 2;
  const aiHeight = await addKoreanText(doc, aiText, aiX, startY, 9, aiWidth, "#646464");
  doc.setTextColor(0, 0, 0);
  startY += aiHeight + 12;

  // 각 단어를 그리드 레이아웃으로 배치
  let currentY = startY;
  let rowStartY = startY; // 행 시작 Y 위치
  let rowMaxHeight = 0; // 현재 행의 최대 높이
  let currentColumn = 0;

  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    
    // 열 위치 계산
    let currentX: number;
    if (columns === 2) {
      currentX = startX + currentColumn * (columnWidth + 10);
    } else {
      currentX = startX;
    }

    // 페이지 넘김 체크
    if (rowStartY + cardHeight > pageHeight - margin) {
      doc.addPage();
      rowStartY = margin;
      currentY = margin;
      currentColumn = 0;
      rowMaxHeight = 0;
    }

    let yPos = rowStartY;

    // 단어 번호와 단어 (영어만)
    doc.setFontSize(wordFontSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 100, 200);
    doc.text(`${index + 1}. ${word.word}`, currentX + cardPadding, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += wordFontSize * 0.7;

    // 의미 (한글 지원)
    if (word.meaning) {
      const meaningLabel = "뜻: ";
      doc.setFontSize(meaningFontSize);
      doc.setFont("helvetica", "bold");
      const labelHeight = await addKoreanText(doc, meaningLabel, currentX + cardPadding, yPos, meaningFontSize, 20);
      
      const meaningText = word.meaning;
      const meaningHeight = await addKoreanText(doc, meaningText, currentX + cardPadding + 15, yPos, meaningFontSize, columnWidth - 25);
      yPos += Math.max(labelHeight, meaningHeight) + itemSpacing;
    }

    // 예문 (영어만)
    if (word.example) {
      doc.setFontSize(exampleFontSize);
      doc.setFont("helvetica", "bold");
      const exampleLabelHeight = await addKoreanText(doc, "예문: ", currentX + cardPadding, yPos, exampleFontSize, 20);
      yPos += exampleLabelHeight + 2;
      
      doc.setFont("helvetica", "italic");
      doc.setTextColor(50, 50, 50);
      const exampleLines = doc.splitTextToSize(word.example, columnWidth - cardPadding * 2 - 5);
      exampleLines.forEach((line: string) => {
        doc.text(line, currentX + cardPadding + 5, yPos);
        yPos += exampleFontSize * 0.5;
      });
      doc.setTextColor(0, 0, 0);
      yPos += itemSpacing;
    }

    // 유의어 (영어만)
    if ((word as any).synonym) {
      doc.setFontSize(synonymFontSize);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 150, 0);
      const synonymLabelHeight = await addKoreanText(doc, "유의어: ", currentX + cardPadding, yPos, synonymFontSize, 25, "#009600");
      doc.setFont("helvetica", "normal");
      doc.text((word as any).synonym, currentX + cardPadding + 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += Math.max(synonymLabelHeight, synonymFontSize * 0.7) + itemSpacing;
    }

    // 반의어 (영어만)
    if ((word as any).antonym) {
      doc.setFontSize(synonymFontSize);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(200, 0, 0);
      const antonymLabelHeight = await addKoreanText(doc, "반의어: ", currentX + cardPadding, yPos, synonymFontSize, 25, "#C80000");
      doc.setFont("helvetica", "normal");
      doc.text((word as any).antonym, currentX + cardPadding + 20, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += Math.max(antonymLabelHeight, synonymFontSize * 0.7) + itemSpacing;
    }

    // 학습 팁 (한글 지원)
    if ((word as any).tip) {
      const tipText = `💡 학습 팁: ${(word as any).tip}`;
      const tipHeight = await addKoreanText(doc, tipText, currentX + cardPadding, yPos, tipFontSize, columnWidth - cardPadding * 2 - 5, "#6464C8");
      yPos += tipHeight + itemSpacing;
    }

    // 실제 사용된 높이 계산
    const actualHeight = yPos - rowStartY + cardPadding;
    rowMaxHeight = Math.max(rowMaxHeight, actualHeight);

    // 다음 단어 위치 업데이트
    if (columns === 2) {
      currentColumn++;
      if (currentColumn >= 2) {
        // 다음 행으로
        currentColumn = 0;
        rowStartY += rowMaxHeight + wordSpacing;
        rowMaxHeight = 0;
        currentY = rowStartY;
      }
      // 같은 행의 다음 열인 경우 rowStartY는 유지
    } else {
      // 1열인 경우
      rowStartY += actualHeight + wordSpacing;
      currentY = rowStartY;
      rowMaxHeight = 0;
    }
  }

  return doc;
}



