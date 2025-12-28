/**
 * 루브릭 검증 시스템
 * 
 * LLM의 불안정성을 줄이기 위해 정량적 체크를 먼저 수행하고,
 * LLM은 짧은 코칭 문구만 작성하도록 합니다.
 */

export type GradeBand = "LOW" | "MID" | "HIGH";
export type CefrLevel = "A1" | "A2" | "B1" | "B2";

/**
 * 루브릭 체크 결과
 */
export interface RubricCheckResult {
  // 기본 정보
  submission_id: string;
  course_id: string;
  week: number;
  grade_band: GradeBand;
  cefr_level: CefrLevel;
  
  // 정량적 체크 결과
  sentences_count: number;
  min_sentences_required: number;
  max_sentences_allowed: number;
  sentences_ok: boolean;
  
  // 필수 패턴 체크
  required_patterns: Record<string, boolean>; // { "because": true, "i_like": true }
  all_patterns_found: boolean;
  
  // 금지 항목 체크
  pii_risk: boolean;
  pii_detected?: string[]; // 감지된 개인정보 키워드
  
  // 종합 결과
  pass: boolean; // 모든 체크 통과 여부
  issues: string[]; // 문제점 목록
  
  // 메타데이터
  checked_at: string;
}

/**
 * 루브릭 규칙 정의
 */
export interface RubricRule {
  course_id: string;
  week: number;
  grade_band: GradeBand;
  
  // 문장 수 규칙
  min_sentences: number;
  max_sentences: number;
  
  // 필수 패턴 (대소문자 구분 없음)
  required_patterns: {
    pattern: string; // "because", "i like", "can", "have", etc.
    description_ko: string; // "왜냐하면 (because)"
    min_count?: number; // 최소 출현 횟수 (기본값: 1)
  }[];
  
  // 권장 패턴 (없어도 됨, 있으면 좋음)
  recommended_patterns?: {
    pattern: string;
    description_ko: string;
  }[];
  
  // 금지 키워드 (개인정보 등)
  forbidden_keywords?: string[];
}

/**
 * Writing Ladder Level 0 루브릭 규칙
 */
export const WRITING_LADDER_LEVEL0_RUBRICS: RubricRule[] = [
  // Week 1: Things I Like (because)
  {
    course_id: "writing_ladder_level0",
    week: 1,
    grade_band: "LOW",
    min_sentences: 3,
    max_sentences: 5,
    required_patterns: [
      { pattern: "i like", description_ko: "나는 ~을 좋아한다 (I like)" },
      { pattern: "because", description_ko: "왜냐하면 (because)", min_count: 1 },
    ],
    recommended_patterns: [
      { pattern: "i feel", description_ko: "나는 ~을 느낀다 (I feel)" },
    ],
  },
  {
    course_id: "writing_ladder_level0",
    week: 1,
    grade_band: "HIGH",
    min_sentences: 4,
    max_sentences: 6,
    required_patterns: [
      { pattern: "i like", description_ko: "나는 ~을 좋아한다 (I like)" },
      { pattern: "because", description_ko: "왜냐하면 (because)", min_count: 1 },
    ],
    recommended_patterns: [
      { pattern: "i feel", description_ko: "나는 ~을 느낀다 (I feel)" },
    ],
  },
  
  // Week 2: I Can / I Have
  {
    course_id: "writing_ladder_level0",
    week: 2,
    grade_band: "LOW",
    min_sentences: 3,
    max_sentences: 5,
    required_patterns: [
      { pattern: "i can", description_ko: "나는 ~할 수 있다 (I can)" },
      { pattern: "i have", description_ko: "나는 ~을 가지고 있다 (I have)" },
    ],
    recommended_patterns: [
      { pattern: "practice", description_ko: "연습하다 (practice)" },
    ],
  },
  {
    course_id: "writing_ladder_level0",
    week: 2,
    grade_band: "HIGH",
    min_sentences: 4,
    max_sentences: 6,
    required_patterns: [
      { pattern: "i can", description_ko: "나는 ~할 수 있다 (I can)" },
      { pattern: "i have", description_ko: "나는 ~을 가지고 있다 (I have)" },
    ],
    recommended_patterns: [
      { pattern: "practice", description_ko: "연습하다 (practice)" },
    ],
  },
  
  // Week 3: Describe a Place (There is/are)
  {
    course_id: "writing_ladder_level0",
    week: 3,
    grade_band: "LOW",
    min_sentences: 3,
    max_sentences: 5,
    required_patterns: [
      { pattern: "there is", description_ko: "~이 있다 (There is)", min_count: 1 },
      { pattern: "there are", description_ko: "~들이 있다 (There are)", min_count: 1 },
    ],
    recommended_patterns: [
      { pattern: "because", description_ko: "왜냐하면 (because)" },
    ],
  },
  {
    course_id: "writing_ladder_level0",
    week: 3,
    grade_band: "HIGH",
    min_sentences: 4,
    max_sentences: 6,
    required_patterns: [
      { pattern: "there is", description_ko: "~이 있다 (There is)", min_count: 1 },
      { pattern: "there are", description_ko: "~들이 있다 (There are)", min_count: 1 },
    ],
    recommended_patterns: [
      { pattern: "because", description_ko: "왜냐하면 (because)" },
    ],
  },
  
  // Week 4: Last Weekend (Mini Past)
  {
    course_id: "writing_ladder_level0",
    week: 4,
    grade_band: "LOW",
    min_sentences: 3,
    max_sentences: 5,
    required_patterns: [
      { pattern: "last weekend", description_ko: "지난 주말 (Last weekend)" },
      { pattern: "went", description_ko: "갔다 (went)", min_count: 1 },
      { pattern: "played", description_ko: "놀았다/했다 (played)", min_count: 1 },
      { pattern: "ate", description_ko: "먹었다 (ate)", min_count: 1 },
      { pattern: "was", description_ko: "~였다 (was)", min_count: 1 },
    ],
  },
  {
    course_id: "writing_ladder_level0",
    week: 4,
    grade_band: "HIGH",
    min_sentences: 4,
    max_sentences: 6,
    required_patterns: [
      { pattern: "last weekend", description_ko: "지난 주말 (Last weekend)" },
      { pattern: "went", description_ko: "갔다 (went)", min_count: 1 },
      { pattern: "played", description_ko: "놀았다/했다 (played)", min_count: 1 },
      { pattern: "ate", description_ko: "먹었다 (ate)", min_count: 1 },
      { pattern: "was", description_ko: "~였다 (was)", min_count: 1 },
    ],
  },
];

/**
 * 개인정보(PII) 위험 키워드
 * 
 * 학교명, 전화번호, 주소 등을 감지합니다.
 */
const PII_KEYWORDS = [
  // 한국어 학교명 패턴
  "초등학교", "중학교", "고등학교", "유치원",
  
  // 영어 학교명 패턴
  "elementary school", "middle school", "high school", "kindergarten",
  
  // 전화번호 패턴 (정규식으로 체크)
  // 010-1234-5678, 010 1234 5678, 01012345678
  
  // 주소 관련
  "번지", "동", "호", "아파트", "빌라",
  "street", "avenue", "road", "apt", "apartment",
  
  // 구체적 위치
  "구", "시", "도",
  "city", "district",
];

/**
 * 전화번호 정규식
 */
const PHONE_REGEX = /\b0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}\b/g;

/**
 * 루브릭 규칙 조회
 */
export function getRubricRule(
  course_id: string,
  week: number,
  grade_band: GradeBand
): RubricRule | null {
  const rule = WRITING_LADDER_LEVEL0_RUBRICS.find(
    (r) => r.course_id === course_id && r.week === week && r.grade_band === grade_band
  );
  return rule || null;
}

/**
 * 문장 수 체크
 */
function checkSentenceCount(
  text: string,
  min_sentences: number,
  max_sentences: number
): {
  count: number;
  ok: boolean;
  issue?: string;
} {
  // 문장 분리 (., !, ? 기준)
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());
  
  const count = sentences.length;
  const ok = count >= min_sentences && count <= max_sentences;
  
  let issue: string | undefined;
  if (count < min_sentences) {
    issue = `문장이 너무 적어요. (${count}개, 최소 ${min_sentences}개 필요)`;
  } else if (count > max_sentences) {
    issue = `문장이 너무 많아요. (${count}개, 최대 ${max_sentences}개 허용)`;
  }
  
  return { count, ok, issue };
}

/**
 * 필수 패턴 체크
 */
function checkRequiredPatterns(
  text: string,
  required_patterns: RubricRule["required_patterns"]
): {
  results: Record<string, boolean>;
  all_found: boolean;
  issues: string[];
} {
  const textLower = text.toLowerCase();
  const results: Record<string, boolean> = {};
  const issues: string[] = [];
  
  for (const { pattern, description_ko, min_count = 1 } of required_patterns) {
    const patternLower = pattern.toLowerCase();
    
    // 패턴 출현 횟수 세기
    const regex = new RegExp(patternLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.match(regex);
    const count = matches ? matches.length : 0;
    
    const found = count >= min_count;
    results[pattern] = found;
    
    if (!found) {
      if (min_count === 1) {
        issues.push(`필수 패턴 누락: ${description_ko}`);
      } else {
        issues.push(`필수 패턴 부족: ${description_ko} (${count}회, 최소 ${min_count}회 필요)`);
      }
    }
  }
  
  const all_found = Object.values(results).every((v) => v === true);
  
  return { results, all_found, issues };
}

/**
 * PII (개인정보) 위험 체크
 */
function checkPIIRisk(text: string): {
  risk: boolean;
  detected: string[];
} {
  const textLower = text.toLowerCase();
  const detected: string[] = [];
  
  // 키워드 체크
  for (const keyword of PII_KEYWORDS) {
    if (textLower.includes(keyword.toLowerCase())) {
      detected.push(keyword);
    }
  }
  
  // 전화번호 체크
  const phoneMatches = text.match(PHONE_REGEX);
  if (phoneMatches && phoneMatches.length > 0) {
    detected.push("전화번호 패턴");
  }
  
  return {
    risk: detected.length > 0,
    detected,
  };
}

/**
 * 루브릭 검증 실행
 */
export function validateWithRubric(
  submission_id: string,
  course_id: string,
  week: number,
  grade_band: GradeBand,
  cefr_level: CefrLevel,
  text: string
): RubricCheckResult {
  console.log(`🔍 루브릭 검증 시작: ${course_id} Week ${week} (${grade_band}/${cefr_level})`);
  
  // 루브릭 규칙 조회
  const rule = getRubricRule(course_id, week, grade_band);
  
  if (!rule) {
    console.warn(`⚠️ 루브릭 규칙 없음: ${course_id} Week ${week} (${grade_band})`);
    // 기본 규칙으로 fallback
    return {
      submission_id,
      course_id,
      week,
      grade_band,
      cefr_level,
      sentences_count: 0,
      min_sentences_required: 3,
      max_sentences_allowed: 5,
      sentences_ok: true,
      required_patterns: {},
      all_patterns_found: true,
      pii_risk: false,
      pass: true,
      issues: [],
      checked_at: new Date().toISOString(),
    };
  }
  
  const issues: string[] = [];
  
  // 1. 문장 수 체크
  const sentenceCheck = checkSentenceCount(text, rule.min_sentences, rule.max_sentences);
  if (!sentenceCheck.ok && sentenceCheck.issue) {
    issues.push(sentenceCheck.issue);
  }
  
  // 2. 필수 패턴 체크
  const patternCheck = checkRequiredPatterns(text, rule.required_patterns);
  issues.push(...patternCheck.issues);
  
  // 3. PII 위험 체크
  const piiCheck = checkPIIRisk(text);
  if (piiCheck.risk) {
    issues.push(`개인정보 위험: ${piiCheck.detected.join(", ")} 포함`);
  }
  
  // 종합 결과
  const pass = sentenceCheck.ok && patternCheck.all_found && !piiCheck.risk;
  
  const result: RubricCheckResult = {
    submission_id,
    course_id,
    week,
    grade_band,
    cefr_level,
    sentences_count: sentenceCheck.count,
    min_sentences_required: rule.min_sentences,
    max_sentences_allowed: rule.max_sentences,
    sentences_ok: sentenceCheck.ok,
    required_patterns: patternCheck.results,
    all_patterns_found: patternCheck.all_found,
    pii_risk: piiCheck.risk,
    pii_detected: piiCheck.risk ? piiCheck.detected : undefined,
    pass,
    issues,
    checked_at: new Date().toISOString(),
  };
  
  console.log(`✅ 루브릭 검증 완료: ${pass ? "PASS" : "FAIL"}`);
  console.log(`   문장 수: ${sentenceCheck.count} (${rule.min_sentences}~${rule.max_sentences})`);
  console.log(`   필수 패턴: ${patternCheck.all_found ? "모두 포함" : "일부 누락"}`);
  console.log(`   PII 위험: ${piiCheck.risk ? "감지됨" : "없음"}`);
  if (issues.length > 0) {
    console.log(`   문제점: ${issues.join(", ")}`);
  }
  
  return result;
}

/**
 * 루브릭 결과를 UI용 배지 데이터로 변환
 */
export function rubricToBadges(rubric: RubricCheckResult): {
  label: string;
  status: "pass" | "warning" | "fail";
  icon: string;
}[] {
  const badges: {
    label: string;
    status: "pass" | "warning" | "fail";
    icon: string;
  }[] = [];
  
  // 문장 수 배지
  badges.push({
    label: `문장 수: ${rubric.sentences_count}개`,
    status: rubric.sentences_ok ? "pass" : "fail",
    icon: rubric.sentences_ok ? "✅" : "❌",
  });
  
  // 필수 패턴 배지
  badges.push({
    label: "필수 패턴",
    status: rubric.all_patterns_found ? "pass" : "fail",
    icon: rubric.all_patterns_found ? "✅" : "❌",
  });
  
  // PII 위험 배지
  if (rubric.pii_risk) {
    badges.push({
      label: "개인정보 주의",
      status: "warning",
      icon: "⚠️",
    });
  }
  
  // 종합 배지
  badges.push({
    label: rubric.pass ? "검증 통과" : "수정 필요",
    status: rubric.pass ? "pass" : "fail",
    icon: rubric.pass ? "🎉" : "📝",
  });
  
  return badges;
}


