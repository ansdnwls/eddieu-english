/**
 * Script Coach 스타일 가이드
 * 
 * 레벨/나이대별로 문장 길이, 복잡도, 발표 시간을 제어합니다.
 */

export type GradeBand = "LOW" | "MID" | "HIGH";
export type CefrLevel = "A1" | "A2" | "B1" | "B2";

/**
 * 스타일 가이드 규칙
 */
export interface StyleGuideRule {
  grade_band: GradeBand;
  cefr_level: CefrLevel;
  course_type: "show_tell" | "writing_ladder";
  
  // 30초 대본 규칙
  duration_30s: {
    min_sentences: number;
    max_sentences: number;
    max_words_per_sentence: number;
    allowed_connectors: string[]; // 허용되는 연결어
    required_connectors?: string[]; // 필수 연결어
  };
  
  // 60초 대본 규칙
  duration_60s?: {
    enabled: boolean;
    min_sentences?: number;
    max_sentences?: number;
    max_words_per_sentence?: number;
  };
  
  // 어휘 제약
  vocabulary: {
    max_difficulty_level: number; // 1-10
    forbidden_words?: string[]; // 금지 단어
    preferred_words?: string[]; // 권장 단어
  };
  
  // 문법 제약
  grammar: {
    max_clause_depth: number; // 최대 절 깊이 (1=단문, 2=복문, 3=중문)
    allowed_tenses: string[]; // 허용 시제
    avoid_passive?: boolean; // 수동태 회피
  };
}

/**
 * 등록된 스타일 가이드
 */
export const STYLE_GUIDES: StyleGuideRule[] = [
  // Writing Ladder Level 0 - LOW/A1 (초등 저학년)
  {
    grade_band: "LOW",
    cefr_level: "A1",
    course_type: "writing_ladder",
    duration_30s: {
      min_sentences: 2,
      max_sentences: 3,
      max_words_per_sentence: 6,
      allowed_connectors: ["and", "but", "because"],
      required_connectors: [], // 필수 없음
    },
    duration_60s: {
      enabled: false, // 60초 비활성
    },
    vocabulary: {
      max_difficulty_level: 2,
      forbidden_words: ["extremely", "absolutely", "incredibly"], // 복잡한 부사
      preferred_words: ["like", "can", "have", "want", "is", "go"],
    },
    grammar: {
      max_clause_depth: 1, // 단문만
      allowed_tenses: ["present_simple"],
      avoid_passive: true,
    },
  },
  
  // Writing Ladder Level 0 - MID/A1 (초등 중학년)
  {
    grade_band: "MID",
    cefr_level: "A1",
    course_type: "writing_ladder",
    duration_30s: {
      min_sentences: 3,
      max_sentences: 4,
      max_words_per_sentence: 8,
      allowed_connectors: ["and", "but", "because", "so"],
      required_connectors: ["because"], // 필수: 1회 이상
    },
    duration_60s: {
      enabled: false, // 60초 비활성 (또는 텍스트만)
    },
    vocabulary: {
      max_difficulty_level: 3,
      forbidden_words: ["extremely", "absolutely", "incredibly"],
      preferred_words: ["like", "love", "enjoy", "can", "have", "want"],
    },
    grammar: {
      max_clause_depth: 2, // 복문 허용
      allowed_tenses: ["present_simple", "present_continuous"],
      avoid_passive: true,
    },
  },
  
  // Writing Ladder Level 0 - HIGH/A2 (초등 고학년)
  {
    grade_band: "HIGH",
    cefr_level: "A2",
    course_type: "writing_ladder",
    duration_30s: {
      min_sentences: 3,
      max_sentences: 4,
      max_words_per_sentence: 10,
      allowed_connectors: ["and", "but", "because", "so", "when", "if"],
      required_connectors: ["because"], // 필수: 1회
    },
    duration_60s: {
      enabled: true,
      min_sentences: 5,
      max_sentences: 7,
      max_words_per_sentence: 10,
    },
    vocabulary: {
      max_difficulty_level: 4,
      preferred_words: ["like", "love", "enjoy", "prefer", "can", "could", "have", "want"],
    },
    grammar: {
      max_clause_depth: 2,
      allowed_tenses: ["present_simple", "present_continuous", "past_simple"],
      avoid_passive: true,
    },
  },
  
  // Show & Tell - HIGH/A2 (기존 룰)
  {
    grade_band: "HIGH",
    cefr_level: "A2",
    course_type: "show_tell",
    duration_30s: {
      min_sentences: 3,
      max_sentences: 4,
      max_words_per_sentence: 15, // Show & Tell은 더 긴 문장 허용
      allowed_connectors: ["and", "but", "because", "so", "when", "if", "although"],
    },
    duration_60s: {
      enabled: true,
      min_sentences: 6,
      max_sentences: 8,
      max_words_per_sentence: 15,
    },
    vocabulary: {
      max_difficulty_level: 5,
    },
    grammar: {
      max_clause_depth: 3, // 중문 허용
      allowed_tenses: ["present_simple", "present_continuous", "past_simple", "future_will"],
    },
  },
];

/**
 * 스타일 가이드 조회
 */
export function getStyleGuide(
  grade_band: GradeBand,
  cefr_level: CefrLevel,
  course_type: "show_tell" | "writing_ladder"
): StyleGuideRule | null {
  const guide = STYLE_GUIDES.find(
    (g) =>
      g.grade_band === grade_band &&
      g.cefr_level === cefr_level &&
      g.course_type === course_type
  );
  
  return guide || null;
}

/**
 * 기본 스타일 가이드 (폴백)
 */
export function getDefaultStyleGuide(course_type: "show_tell" | "writing_ladder"): StyleGuideRule {
  if (course_type === "writing_ladder") {
    // Writing Ladder Level 0 기본값 (MID/A1)
    return STYLE_GUIDES[1];
  }
  
  // Show & Tell 기본값
  return STYLE_GUIDES[3];
}

/**
 * 스타일 가이드를 GPT 프롬프트로 변환
 */
export function styleGuideToPrompt(guide: StyleGuideRule): string {
  const rules: string[] = [];
  
  // 30초 규칙
  rules.push(`**30-Second Script Rules:**`);
  rules.push(`- Sentences: ${guide.duration_30s.min_sentences}-${guide.duration_30s.max_sentences} sentences ONLY`);
  rules.push(`- Max words per sentence: ${guide.duration_30s.max_words_per_sentence} words`);
  rules.push(`- Allowed connectors: ${guide.duration_30s.allowed_connectors.join(", ")}`);
  
  if (guide.duration_30s.required_connectors && guide.duration_30s.required_connectors.length > 0) {
    rules.push(`- MUST include: ${guide.duration_30s.required_connectors.join(", ")} (at least once)`);
  }
  
  // 60초 규칙
  if (guide.duration_60s?.enabled) {
    rules.push(``);
    rules.push(`**60-Second Script Rules:**`);
    rules.push(`- Sentences: ${guide.duration_60s.min_sentences}-${guide.duration_60s.max_sentences} sentences`);
    rules.push(`- Max words per sentence: ${guide.duration_60s.max_words_per_sentence} words`);
  } else {
    rules.push(``);
    rules.push(`**60-Second Script:** DISABLED (text only or empty)`);
  }
  
  // 어휘 규칙
  rules.push(``);
  rules.push(`**Vocabulary Rules:**`);
  rules.push(`- Difficulty level: Max ${guide.vocabulary.max_difficulty_level}/10`);
  
  if (guide.vocabulary.forbidden_words && guide.vocabulary.forbidden_words.length > 0) {
    rules.push(`- AVOID: ${guide.vocabulary.forbidden_words.join(", ")}`);
  }
  
  if (guide.vocabulary.preferred_words && guide.vocabulary.preferred_words.length > 0) {
    rules.push(`- PREFER: ${guide.vocabulary.preferred_words.join(", ")}`);
  }
  
  // 문법 규칙
  rules.push(``);
  rules.push(`**Grammar Rules:**`);
  rules.push(`- Clause depth: Max ${guide.grammar.max_clause_depth} (1=simple, 2=compound, 3=complex)`);
  rules.push(`- Allowed tenses: ${guide.grammar.allowed_tenses.join(", ")}`);
  
  if (guide.grammar.avoid_passive) {
    rules.push(`- AVOID passive voice`);
  }
  
  return rules.join("\n");
}

/**
 * 생성된 스크립트 검증
 */
export function validateScript(
  script: string,
  guide: StyleGuideRule,
  duration: 30 | 60
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 문장 분리
  const sentences = script
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());
  
  const rules = duration === 30 ? guide.duration_30s : guide.duration_60s;
  
  if (!rules || (duration === 60 && !rules.enabled)) {
    return { valid: true, errors, warnings };
  }
  
  // 문장 수 검증
  if (sentences.length < rules.min_sentences!) {
    errors.push(`Too few sentences: ${sentences.length} < ${rules.min_sentences}`);
  }
  
  if (sentences.length > rules.max_sentences!) {
    errors.push(`Too many sentences: ${sentences.length} > ${rules.max_sentences}`);
  }
  
  // 문장당 단어 수 검증
  sentences.forEach((sentence, idx) => {
    const words = sentence.split(/\s+/).filter((w) => w.length > 0);
    if (words.length > rules.max_words_per_sentence!) {
      errors.push(`Sentence ${idx + 1} too long: ${words.length} words > ${rules.max_words_per_sentence}`);
    }
  });
  
  // 필수 연결어 검증 (30초만)
  if (duration === 30 && guide.duration_30s.required_connectors) {
    const scriptLower = script.toLowerCase();
    guide.duration_30s.required_connectors.forEach((connector) => {
      if (!scriptLower.includes(connector)) {
        errors.push(`Missing required connector: "${connector}"`);
      }
    });
  }
  
  // 금지 단어 검증
  if (guide.vocabulary.forbidden_words) {
    const scriptLower = script.toLowerCase();
    guide.vocabulary.forbidden_words.forEach((word) => {
      if (scriptLower.includes(word)) {
        warnings.push(`Contains forbidden word: "${word}"`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}


