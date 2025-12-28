#!/usr/bin/env node

/**
 * Script Coach 스타일 가이드 테스트 스크립트
 * 
 * 사용법:
 *   node scripts/test-style-guide.js
 */

// Node.js 환경에서 TypeScript 타입을 사용하지 않으므로 간단히 테스트

console.log("=== Script Coach 스타일 가이드 테스트 ===\n");

// 테스트 케이스
const testCases = [
  {
    name: "Writing Ladder L0 - LOW/A1",
    grade_band: "LOW",
    cefr_level: "A1",
    course_type: "writing_ladder",
    expected: {
      min_sentences: 2,
      max_sentences: 3,
      max_words_per_sentence: 6,
      duration_60s_enabled: false,
    },
  },
  {
    name: "Writing Ladder L0 - MID/A1",
    grade_band: "MID",
    cefr_level: "A1",
    course_type: "writing_ladder",
    expected: {
      min_sentences: 3,
      max_sentences: 4,
      max_words_per_sentence: 8,
      duration_60s_enabled: false,
      required_connectors: ["because"],
    },
  },
  {
    name: "Writing Ladder L0 - HIGH/A2",
    grade_band: "HIGH",
    cefr_level: "A2",
    course_type: "writing_ladder",
    expected: {
      min_sentences: 3,
      max_sentences: 4,
      max_words_per_sentence: 10,
      duration_60s_enabled: true,
      required_connectors: ["because"],
    },
  },
  {
    name: "Show & Tell - HIGH/A2",
    grade_band: "HIGH",
    cefr_level: "A2",
    course_type: "show_tell",
    expected: {
      min_sentences: 3,
      max_sentences: 4,
      max_words_per_sentence: 15,
      duration_60s_enabled: true,
    },
  },
];

// 스크립트 검증 테스트
const scripts = [
  {
    name: "LOW/A1 - 적합한 스크립트",
    script: "I like apples. They are red. I eat them.",
    grade_band: "LOW",
    cefr_level: "A1",
    course_type: "writing_ladder",
    expected: { valid: true },
  },
  {
    name: "LOW/A1 - 너무 많은 문장",
    script: "I like apples. They are red. I eat them. They are sweet. My mom buys apples.",
    grade_band: "LOW",
    cefr_level: "A1",
    course_type: "writing_ladder",
    expected: { valid: false, reason: "Too many sentences" },
  },
  {
    name: "MID/A1 - 'because' 누락",
    script: "I like soccer. I play with friends. It is fun.",
    grade_band: "MID",
    cefr_level: "A1",
    course_type: "writing_ladder",
    expected: { valid: false, reason: "Missing required connector: because" },
  },
  {
    name: "MID/A1 - 'because' 포함",
    script: "I like soccer. I play with friends. It is fun because we run a lot.",
    grade_band: "MID",
    cefr_level: "A1",
    course_type: "writing_ladder",
    expected: { valid: true },
  },
];

// 스타일 가이드 규칙 출력
console.log("📐 스타일 가이드 규칙:\n");
testCases.forEach((tc) => {
  console.log(`✅ ${tc.name}`);
  console.log(`   30초: ${tc.expected.min_sentences}-${tc.expected.max_sentences}문장, 최대 ${tc.expected.max_words_per_sentence}단어/문장`);
  console.log(`   60초: ${tc.expected.duration_60s_enabled ? "활성" : "비활성"}`);
  if (tc.expected.required_connectors) {
    console.log(`   필수: ${tc.expected.required_connectors.join(", ")}`);
  }
  console.log();
});

// 스크립트 검증 예시 출력
console.log("🧪 스크립트 검증 예시:\n");
scripts.forEach((s) => {
  console.log(`📝 ${s.name}`);
  console.log(`   Script: "${s.script}"`);
  console.log(`   Expected: ${s.expected.valid ? "✅ VALID" : `❌ INVALID (${s.expected.reason})`}`);
  console.log();
});

console.log("=== 테스트 완료 ===");
console.log("\n📌 실제 API 테스트:");
console.log("   POST /api/writingladder/submissions/{submission_id}/script");
console.log("   POST /api/showtell/submissions/{submission_id}/script");
console.log("\n💡 스타일 가이드는 lib/styleGuides.ts에 정의되어 있습니다.");


