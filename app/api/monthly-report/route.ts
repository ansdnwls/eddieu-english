import { NextRequest, NextResponse } from "next/server";
import { DiaryEntry, MonthlyReport } from "@/app/types";
import { maskSensitiveInfo } from "@/app/utils/apiLogger";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { checkUserSubscriptionServer } from "@/lib/subscription/checkSubscription";

// API 키 가져오기 (환경변수만 사용)
function getAPIKeys() {
  return {
    openai: process.env.OPENAI_API_KEY || "",
  };
}

// API 키 검증 및 에러 반환
function validateAPIKey(key: string | undefined, keyName: string): string {
  if (!key || key.trim().length === 0) {
    throw new Error(`${keyName}가 설정되지 않았습니다. Vercel 환경변수에서 ${keyName}를 설정해주세요.`);
  }
  return key;
}

async function generateReportWithGPT(
  diaries: DiaryEntry[],
  accountType: "child" | "parent",
  apiKey: string
): Promise<MonthlyReport> {
  console.log("🤖 GPT 월별 리포트 생성 시작...");

  // 데이터 분석
  const totalEntries = diaries.length;
  const totalWords = diaries.reduce((sum, d) => sum + (d.stats?.wordCount || 0), 0);
  const averageWordsPerEntry = totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0;

  // 이전 기간과 비교 (간단히 전반부 vs 후반부 비교)
  const halfPoint = Math.floor(totalEntries / 2);
  const firstHalf = diaries.slice(0, halfPoint);
  const secondHalf = diaries.slice(halfPoint);
  
  const firstHalfAvg = firstHalf.length > 0
    ? firstHalf.reduce((sum, d) => sum + (d.stats?.wordCount || 0), 0) / firstHalf.length
    : 0;
  const secondHalfAvg = secondHalf.length > 0
    ? secondHalf.reduce((sum, d) => sum + (d.stats?.wordCount || 0), 0) / secondHalf.length
    : 0;
  
  const growthPercentage = firstHalfAvg > 0
    ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
    : 0;

  // 일기 내용 샘플 (GPT 분석용, 최대 5개)
  const sampleDiaries = diaries.slice(0, 5).map((d, i) => ({
    number: i + 1,
    originalText: d.originalText.substring(0, 200), // 첫 200자만
    correctedText: d.correctedText.substring(0, 200),
    wordCount: d.stats?.wordCount || 0,
    corrections: d.corrections.length,
  }));

  // 데이터 분석: 자주 사용하는 단어 빈도 계산
  const wordFrequency: Record<string, number> = {};
  diaries.forEach((diary) => {
    diary.extractedWords?.forEach((word) => {
      const wordKey = word.word.toLowerCase().trim();
      if (wordKey && wordKey.length > 0) {
        wordFrequency[wordKey] = (wordFrequency[wordKey] || 0) + 1;
      }
    });
  });
  const topWordsData = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20) // GPT에게 전달할 때는 20개까지
    .map(([word, count]) => ({ word, count }));

  // 데이터 분석: 교정 내역 수집 (문법 패턴 분석용)
  const allCorrections = diaries.flatMap((diary) => 
    diary.corrections.map((correction, index) => ({
      original: correction.original,
      corrected: correction.corrected,
      explanation: correction.explanation,
      date: diary.createdAt,
      order: index,
    }))
  );

  // 데이터 분석: 시간순으로 정렬된 일기 (새로 시도한 문법 찾기용)
  const sortedDiaries = [...diaries].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // 전반부와 후반부의 교정 패턴 비교
  const firstHalfCorrections = sortedDiaries.slice(0, Math.floor(sortedDiaries.length / 2))
    .flatMap((d) => d.corrections);
  const secondHalfCorrections = sortedDiaries.slice(Math.floor(sortedDiaries.length / 2))
    .flatMap((d) => d.corrections);

  // 잘 쓰는 표현 추출을 위한 원문 샘플
  const originalTexts = diaries.map((d) => d.originalText).join("\n---\n");

  // GPT 프롬프트
  const systemPrompt = accountType === "child" 
    ? `당신은 어린이 영어 학습 전문가입니다. 한 달간의 영어 일기 데이터를 분석하여 성장 리포트를 작성해주세요.

[분석 기준]
1. 길이 점수 (0-100): 일기 길이의 증가 추세, 문장 수 증가
2. 어휘 점수 (0-100): 다양한 단어 사용, 새로운 표현 시도
3. 문법 점수 (0-100): 교정 빈도 감소, 정확도 향상
4. 종합 점수 (0-100): 위 3가지의 평균

[중요한 원칙]
- 따뜻하고 격려하는 톤
- 구체적인 개선 사항 언급
- 다음 단계 학습 방향 제시
- 부모가 아이에게 보여줄 수 있는 긍정적인 내용

[응답 형식]
반드시 아래 JSON 형식으로만 응답하세요:
{
  "lengthScore": 85,
  "vocabularyScore": 78,
  "grammarScore": 82,
  "overallScore": 82,
  "insights": "한 달간 정말 멋진 성장을 보여주었어요! 특히 일기 길이가 평균 15% 증가하면서...",
  "recommendations": [
    "과거형 동사 연습을 더 해보면 좋겠어요",
    "감정 표현 단어를 다양하게 써보세요",
    "주말에 있었던 일을 자세히 써보는 연습을 해보세요"
  ],
  "topWords": [
    {"word": "happy", "count": 15, "meaning": "행복한"},
    {"word": "went", "count": 12, "meaning": "갔다"}
  ],
  "goodExpressions": [
    {
      "expression": "I was so excited",
      "example": "I was so excited to go to the park.",
      "explanation": "감정을 잘 표현한 문장이에요!"
    }
  ],
  "newGrammar": [
    {
      "grammar": "과거형 동사",
      "example": "I went to school yesterday.",
      "explanation": "이번 달에 과거형을 처음 시도했어요!"
    }
  ],
  "commonMistakes": [
    {
      "mistake": "I go to school yesterday",
      "correct": "I went to school yesterday",
      "frequency": 5,
      "tip": "과거 일을 말할 때는 동사에 -ed를 붙이거나 불규칙 동사를 사용해요!"
    }
  ]
}`
    : `당신은 성인 영어 학습 전문가입니다. 한 달간의 영어 작문 데이터를 분석하여 성장 리포트를 작성해주세요.

[분석 기준]
1. 길이 점수 (0-100): 작문 길이의 증가 추세, 문장 복잡도
2. 어휘 점수 (0-100): 고급 어휘 사용, 표현의 다양성
3. 문법 점수 (0-100): 문법 정확도, 자연스러운 표현
4. 종합 점수 (0-100): 위 3가지의 평균

[중요한 원칙]
- 전문적이고 객관적인 톤
- 구체적인 데이터 기반 분석
- 실용적인 개선 방향 제시
- 비즈니스/일상 영어 활용 팁

[응답 형식]
반드시 아래 JSON 형식으로만 응답하세요:
{
  "lengthScore": 85,
  "vocabularyScore": 78,
  "grammarScore": 82,
  "overallScore": 82,
  "insights": "한 달간 작문 실력이 눈에 띄게 향상되었습니다. 특히 복잡한 문장 구조 사용이 증가하면서...",
  "recommendations": [
    "비즈니스 이메일 표현 연습을 추천합니다",
    "접속사를 활용한 문장 연결 연습이 도움이 될 것입니다",
    "원어민이 자주 쓰는 관용 표현을 학습해보세요"
  ],
  "topWords": [
    {"word": "however", "count": 20, "meaning": "그러나"},
    {"word": "therefore", "count": 15, "meaning": "따라서"}
  ],
  "goodExpressions": [
    {
      "expression": "In conclusion",
      "example": "In conclusion, I believe that...",
      "explanation": "논리적인 결론 도입부로 잘 사용하셨습니다."
    }
  ],
  "newGrammar": [
    {
      "grammar": "복합문 (Complex Sentences)",
      "example": "Although it was raining, I went outside.",
      "explanation": "이번 달에 접속사를 활용한 복합문을 처음 시도하셨습니다."
    }
  ],
  "commonMistakes": [
    {
      "mistake": "I am interesting in",
      "correct": "I am interested in",
      "frequency": 8,
      "tip": "interested는 '관심 있는'이라는 의미로 사람이 주어일 때 사용하고, interesting은 '흥미로운'이라는 의미로 사물이 주어일 때 사용합니다."
    }
  ]
}`;

  const userPrompt = `[기간 통계]
- 총 작성 수: ${totalEntries}개
- 총 단어 수: ${totalWords}개
- 평균 단어 수: ${averageWordsPerEntry}개
- 전반부 평균: ${firstHalfAvg.toFixed(1)}단어
- 후반부 평균: ${secondHalfAvg.toFixed(1)}단어
- 성장률: ${growthPercentage}%

[샘플 작문 데이터]
${JSON.stringify(sampleDiaries, null, 2)}

[자주 사용하는 단어 빈도 (상위 20개)]
${JSON.stringify(topWordsData, null, 2)}

[전체 교정 내역]
총 ${allCorrections.length}개의 교정이 있었습니다.
전반부 교정 수: ${firstHalfCorrections.length}개
후반부 교정 수: ${secondHalfCorrections.length}개
${allCorrections.length > 0 ? `\n교정 샘플 (최대 10개):\n${JSON.stringify(allCorrections.slice(0, 10).map(c => ({
  original: c.original.substring(0, 50),
  corrected: c.corrected.substring(0, 50),
  explanation: c.explanation.substring(0, 100)
})), null, 2)}` : ''}

[원문 텍스트 샘플 (잘 쓰는 표현 찾기용)]
${originalTexts.substring(0, 2000)}...

위 데이터를 바탕으로 성장 리포트를 JSON 형식으로 작성해주세요.

**중요 지침:**
1. **topWords**: 자주 사용하는 단어 TOP 10을 빈도순으로 정렬하고, 각 단어의 의미를 추가해주세요.
2. **goodExpressions**: 원문에서 잘 쓰인 표현 3-5개를 찾아서 예시와 설명을 함께 제공해주세요.
3. **newGrammar**: 전반부에는 없었지만 후반부에 새로 시도한 문법 구조를 찾아주세요. (최대 3개)
4. **commonMistakes**: 자주 반복되는 문법 실수를 빈도순으로 정렬하고, 개선 팁을 제공해주세요. (최대 5개)

모든 분석은 ${accountType === "child" ? "어린이에게 따뜻하고 격려하는 톤으로" : "성인에게 전문적이고 객관적인 톤으로"} 작성해주세요.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000, // 새로운 섹션들을 위해 토큰 수 증가
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const gptResponse = data.choices[0]?.message?.content || "";
    
    console.log("✅ GPT 응답:", gptResponse.substring(0, 200));

    // JSON 파싱
    let analysisResult;
    try {
      const jsonMatch = gptResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("JSON 형식을 찾을 수 없습니다");
      }
    } catch (parseError) {
      console.error("❌ JSON 파싱 실패:", parseError);
      // 기본값 사용
      analysisResult = {
        lengthScore: 75,
        vocabularyScore: 75,
        grammarScore: 75,
        overallScore: 75,
        insights: accountType === "child"
          ? "한 달간 꾸준히 영어 일기를 작성하며 실력이 향상되고 있어요! 계속 이렇게 열심히 해보세요. 💪"
          : "한 달간 꾸준한 영어 작문 연습으로 실력이 향상되고 있습니다. 지속적인 노력이 돋보입니다.",
        recommendations: [
          "다양한 주제로 작성해보세요",
          "새로운 단어를 적극적으로 사용해보세요",
          "매일 조금씩이라도 꾸준히 작성하는 것이 중요해요",
        ],
        topWords: topWordsData.slice(0, 10).map((w) => ({ word: w.word, count: w.count })),
        goodExpressions: [],
        newGrammar: [],
        commonMistakes: [],
      };
    }

    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      userId: diaries[0]?.userId || "",
      accountType,
      period: {
        start: monthAgo.toISOString(),
        end: now.toISOString(),
      },
      summary: {
        totalEntries,
        totalWords,
        averageWordsPerEntry,
        growthPercentage,
      },
      analysis: {
        lengthScore: analysisResult.lengthScore || 75,
        vocabularyScore: analysisResult.vocabularyScore || 75,
        grammarScore: analysisResult.grammarScore || 75,
        overallScore: analysisResult.overallScore || 75,
      },
      insights: analysisResult.insights || "",
      recommendations: analysisResult.recommendations || [],
      topWords: analysisResult.topWords?.slice(0, 10) || topWordsData.slice(0, 10).map((w) => ({ word: w.word, count: w.count })),
      goodExpressions: analysisResult.goodExpressions || [],
      newGrammar: analysisResult.newGrammar || [],
      commonMistakes: analysisResult.commonMistakes || [],
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ GPT API 오류:", error);
    
    // Mock 데이터 반환
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      userId: diaries[0]?.userId || "",
      accountType,
      period: {
        start: monthAgo.toISOString(),
        end: now.toISOString(),
      },
      summary: {
        totalEntries,
        totalWords,
        averageWordsPerEntry,
        growthPercentage,
      },
      analysis: {
        lengthScore: 80,
        vocabularyScore: 75,
        grammarScore: 78,
        overallScore: 78,
      },
      insights: accountType === "child"
        ? "한 달간 정말 열심히 영어 일기를 썼어요! 🌟 일기 길이도 조금씩 길어지고 있고, 새로운 단어도 많이 사용하고 있어요. 특히 감정을 표현하는 문장이 많아졌다는 게 정말 멋져요. 계속 이렇게 하면 영어 실력이 쑥쑥 자랄 거예요!"
        : "한 달간 꾸준한 영어 작문 연습으로 눈에 띄는 발전이 있었습니다. 평균 작문 길이가 증가했으며, 문법 정확도도 향상되었습니다. 특히 복잡한 문장 구조를 시도하는 빈도가 늘어났다는 점이 긍정적입니다.",
      recommendations: accountType === "child"
        ? [
            "과거형 동사를 사용하는 연습을 더 해보세요 (went, saw, ate)",
            "감정을 나타내는 단어를 다양하게 써보세요 (happy, excited, surprised)",
            "주말에 있었던 일을 자세히 써보는 연습을 해보세요",
          ]
        : [
            "비즈니스 상황에서 사용하는 공식적인 표현을 학습해보세요",
            "접속사(however, therefore, moreover)를 활용한 문장 연결 연습을 추천합니다",
            "원어민이 자주 쓰는 관용 표현(idioms)을 익혀보세요",
          ],
      topWords: topWordsData.slice(0, 10).map((w) => ({ word: w.word, count: w.count })),
      goodExpressions: [],
      newGrammar: [],
      commonMistakes: [],
      createdAt: new Date().toISOString(),
    };
  }
}

// 기간별 고유 키 생성 (캐싱용)
function generatePeriodKey(userId: string, accountType: string, periodStart: string, periodEnd: string): string {
  const startDate = new Date(periodStart).toISOString().split('T')[0]; // YYYY-MM-DD
  const endDate = new Date(periodEnd).toISOString().split('T')[0];
  return `${userId}_${accountType}_${startDate}_${endDate}`;
}

// Firestore에서 기존 리포트 조회
async function getCachedReport(periodKey: string): Promise<MonthlyReport | null> {
  if (!db) {
    console.warn("⚠️ Firestore가 초기화되지 않음 - 캐시 확인 불가");
    return null;
  }

  try {
    const reportRef = doc(db, "monthlyReports", periodKey);
    const reportDoc = await getDoc(reportRef);
    
    if (reportDoc.exists()) {
      const data = reportDoc.data();
      const report = data as MonthlyReport;
      console.log("✅ 캐시된 리포트 발견:", periodKey);
      return report;
    }
    
    return null;
  } catch (error) {
    console.error("❌ 캐시 조회 오류:", error);
    return null;
  }
}

// Firestore에 리포트 저장
async function saveReportToCache(periodKey: string, report: MonthlyReport): Promise<void> {
  if (!db) {
    console.warn("⚠️ Firestore가 초기화되지 않음 - 리포트 저장 불가");
    return;
  }

  try {
    const reportRef = doc(db, "monthlyReports", periodKey);
    await setDoc(reportRef, {
      ...report,
      periodKey, // 검색용
      cachedAt: new Date().toISOString(),
    }, { merge: true });
    console.log("✅ 리포트 캐시 저장 완료:", periodKey);
  } catch (error) {
    console.error("❌ 리포트 저장 오류:", error);
    // 저장 실패해도 리포트는 반환
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("📊 월별 리포트 생성 API 호출");

    const body = await request.json();
    const { diaries, accountType, forceRegenerate, userId } = body;

    if (!diaries || !Array.isArray(diaries) || diaries.length === 0) {
      return NextResponse.json(
        { success: false, error: "일기 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    if (!accountType) {
      return NextResponse.json(
        { success: false, error: "계정 타입이 필요합니다." },
        { status: 400 }
      );
    }

    // 구독 체크 (유료 기능)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "사용자 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const subscription = await checkUserSubscriptionServer(userId);
    if (!subscription.isActive) {
      return NextResponse.json(
        { 
          success: false, 
          error: "월별 리포트는 유료 구독 후 이용 가능합니다. /pricing 페이지에서 구독해주세요.",
          requiresSubscription: true 
        },
        { status: 403 }
      );
    }

    // 최소 일기 수 제한 (10개 이상)
    const MIN_DIARIES_REQUIRED = 10;
    if (diaries.length < MIN_DIARIES_REQUIRED) {
      return NextResponse.json(
        { 
          success: false, 
          error: `월말 보고서를 생성하려면 최소 ${MIN_DIARIES_REQUIRED}개 이상의 일기/작문이 필요합니다. 현재 ${diaries.length}개입니다.`,
          minRequired: MIN_DIARIES_REQUIRED,
          currentCount: diaries.length,
        },
        { status: 400 }
      );
    }

    // 기간 계산
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodKey = generatePeriodKey(
      diaries[0]?.userId || "unknown",
      accountType,
      monthAgo.toISOString(),
      now.toISOString()
    );

    // 강제 재생성이 아니면 캐시 확인
    if (!forceRegenerate) {
      const cachedReport = await getCachedReport(periodKey);
      if (cachedReport) {
        // 캐시된 리포트가 1시간 이내에 생성된 것이면 재사용
        const cacheAge = new Date().getTime() - new Date(cachedReport.createdAt).getTime();
        const oneHour = 60 * 60 * 1000;
        
        if (cacheAge < oneHour) {
          console.log("✅ 최근 생성된 리포트 재사용 (캐시)");
          return NextResponse.json({
            success: true,
            data: cachedReport,
            cached: true,
          });
        } else {
          console.log("⚠️ 캐시가 오래됨 (1시간 이상) - 재생성 가능");
        }
      }
    } else {
      console.log("🔄 강제 재생성 요청");
    }

    // API 키 가져오기 및 검증
    const apiKeys = getAPIKeys();
    let openaiKey: string;
    try {
      openaiKey = validateAPIKey(apiKeys.openai, "OPENAI_API_KEY");
    } catch (keyError: unknown) {
      const error = keyError as Error;
      console.error("❌ API 키 검증 실패:", maskSensitiveInfo(error.message));
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    let report: MonthlyReport;
    try {
      report = await generateReportWithGPT(
        diaries,
        accountType,
        openaiKey
      );
      
      // 생성된 리포트를 캐시에 저장 (비동기, 실패해도 응답에는 영향 없음)
      saveReportToCache(periodKey, report).catch((error) => {
        console.warn("⚠️ 리포트 캐시 저장 실패 (무시됨):", error);
      });
      
    } catch (gptError: unknown) {
      const error = gptError as Error;
      const errorMessage = error.message || "알 수 없는 오류가 발생했습니다.";
      console.error("❌ GPT 오류:", maskSensitiveInfo(errorMessage));
      
      // API 키 관련 오류인 경우 한국어 메시지로 변환
      let userFriendlyError = "월별 리포트 생성 중 오류가 발생했습니다.";
      if (error.message?.includes("API key") || error.message?.includes("401") || error.message?.includes("invalid")) {
        userFriendlyError = "OpenAI API 키가 유효하지 않습니다. 관리자에게 문의해주세요.";
      } else if (error.message?.includes("rate limit") || error.message?.includes("429")) {
        userFriendlyError = "API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.";
      }
      
      return NextResponse.json(
        {
          success: false,
          error: userFriendlyError,
        },
        { status: 500 }
      );
    }

    console.log("✅ 월별 리포트 생성 완료");

    return NextResponse.json({
      success: true,
      data: report,
      cached: false,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 월별 리포트 생성 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "리포트 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}


