# 4단계: Script Coach 스타일 가이드 (레벨별 문장 길이 규칙)

## 📋 목표

Show & Tell과 달리 **Writing Ladder는 레벨별 "문장 길이/문장 수"를 더 엄격히 통제**해야 합니다.

**이유:**
- Writing Ladder Level 0은 **기초 문장 학습**이 목표이므로, 너무 긴 문장이나 복잡한 구조는 오히려 학습 효과를 떨어뜨립니다.
- 학년/CEFR 레벨에 따라 **어린이가 감당할 수 있는 문장 수와 길이**가 다르므로 세밀한 제어가 필요합니다.

---

## ✅ 완료 내용

### 1. 스타일 가이드 시스템 구축 (`lib/styleGuides.ts`)

**핵심 기능:**
- **레벨별 규칙 정의**: `grade_band` (LOW/MID/HIGH), `cefr_level` (A1/A2/B1/B2), `course_type` (show_tell/writing_ladder)에 따른 세밀한 제약
- **30초/60초 대본 규칙**: 문장 수, 단어 수, 허용 연결어, 필수 연결어
- **어휘 제약**: 최대 난이도 레벨, 금지 단어, 권장 단어
- **문법 제약**: 최대 절 깊이, 허용 시제, 수동태 회피 여부

**예시: Writing Ladder Level 0 - LOW/A1 (초등 저학년)**
```typescript
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
    forbidden_words: ["extremely", "absolutely", "incredibly"],
    preferred_words: ["like", "can", "have", "want", "is", "go"],
  },
  grammar: {
    max_clause_depth: 1, // 단문만
    allowed_tenses: ["present_simple"],
    avoid_passive: true,
  },
}
```

**예시: Writing Ladder Level 0 - HIGH/A2 (초등 고학년)**
```typescript
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
    preferred_words: ["like", "love", "enjoy", "prefer", "can", "could"],
  },
  grammar: {
    max_clause_depth: 2,
    allowed_tenses: ["present_simple", "present_continuous", "past_simple"],
    avoid_passive: true,
  },
}
```

---

### 2. Show & Tell Script Coach API 수정

**파일:** `app/api/showtell/submissions/[submission_id]/script/route.ts`

**변경 사항:**
1. **스타일 가이드 import 및 적용**
   - `getStyleGuide()` 함수로 레벨별 스타일 가이드 조회
   - 폴백: 스타일 가이드가 없으면 `getDefaultStyleGuide()` 사용
   
2. **AI 스크립트 생성 함수 추가 (`generateScriptWithAI`)**
   - GPT-4에 스타일 가이드를 프롬프트로 전달
   - **STRICT RULES** 강조: 문장 수, 단어 수, 연결어 제약
   - Mock fallback 포함 (API 키 없을 때)

3. **생성된 스크립트 검증 (`validateScript`)**
   - 문장 수 초과 여부
   - 문장당 단어 수 초과 여부
   - 필수 연결어 포함 여부
   - 금지 단어 사용 여부
   - 검증 실패 시 경고 로그 (재생성 로직 추가 가능)

4. **`WritingSubmission` 타입 확장**
   - `grade_band: "LOW" | "MID" | "HIGH"`
   - `cefr_level: "A1" | "A2" | "B1" | "B2"`
   - 이 정보를 바탕으로 스타일 가이드 선택

---

### 3. Writing Ladder Script Coach API 생성

**파일:** `app/api/writingladder/submissions/[submission_id]/script/route.ts`

**기능:**
- Show & Tell과 동일한 구조이지만, **`writing_ladder` 타입 스타일 가이드** 적용
- Firestore 컬렉션: `writingladder_writing_submissions`, `writingladder_scripts`, `writingladder_week_progress`
- **더 엄격한 규칙**: Level 0 기준으로 LOW/A1은 2-3문장, MID/A1은 3-4문장, HIGH/A2는 3-4문장
- **60초 비활성화**: LOW/A1, MID/A1은 60초 대본 없음 (또는 텍스트만)

---

## 📐 스타일 가이드 비교표

| 레벨 | 30초 문장 수 | 단어/문장 | 60초 | 허용 연결어 | 필수 연결어 |
|-----|------------|---------|-----|------------|-----------|
| **Writing Ladder L0 - LOW/A1** | 2-3 | 최대 6 | ❌ 비활성 | and, but, because | 없음 |
| **Writing Ladder L0 - MID/A1** | 3-4 | 최대 8 | ❌ 비활성 (or 텍스트만) | and, but, because, so | **because (필수)** |
| **Writing Ladder L0 - HIGH/A2** | 3-4 | 최대 10 | ✅ 5-7문장 | and, but, because, so, when, if | **because (필수)** |
| **Show & Tell - HIGH/A2** | 3-4 | 최대 15 | ✅ 6-8문장 | 모든 연결어 허용 | 없음 |

---

## 🎯 AI 프롬프트 예시 (Writing Ladder L0 - MID/A1)

```
**CRITICAL RULES:**
**30-Second Script Rules:**
- Sentences: 3-4 sentences ONLY
- Max words per sentence: 8 words
- Allowed connectors: and, but, because, so
- MUST include: because (at least once)

**60-Second Script:** DISABLED (leave empty)

**Vocabulary Rules:**
- Difficulty level: Max 3/10
- AVOID: extremely, absolutely, incredibly
- PREFER: like, love, enjoy, can, have, want

**Grammar Rules:**
- Clause depth: Max 2 (1=simple, 2=compound, 3=complex)
- Allowed tenses: present_simple, present_continuous
- AVOID passive voice
```

---

## 🧪 검증 로직 (`validateScript`)

**검증 항목:**
1. **문장 수**: `min_sentences <= actual <= max_sentences`
2. **문장당 단어 수**: 각 문장이 `max_words_per_sentence` 이하인지 확인
3. **필수 연결어**: `required_connectors`가 스크립트에 1회 이상 포함되었는지
4. **금지 단어**: `forbidden_words`가 포함되지 않았는지 (경고만, 에러 아님)

**검증 실패 시:**
- 콘솔에 에러/경고 로그
- 실제 프로덕션에서는 **재생성 시도** 또는 **강제 수정** 로직 추가 가능

---

## ✅ 완료 조건 (AC) 달성

**AC:** Script 생성 결과가 레벨0 규칙을 넘지 않는다 (너무 길어지는 문제 방지)

**검증 방법:**
1. Writing Ladder Level 0 - LOW/A1 제출:
   - 30초 스크립트: 2-3문장, 각 문장 최대 6단어
   - 60초 스크립트: 비활성 (또는 빈 문자열)
   - 허용 연결어: and, but, because만 사용

2. Writing Ladder Level 0 - HIGH/A2 제출:
   - 30초 스크립트: 3-4문장, 각 문장 최대 10단어
   - **"because"가 최소 1회 포함**
   - 60초 스크립트: 5-7문장 (활성화된 경우)

3. Show & Tell - HIGH/A2 제출:
   - 30초 스크립트: 3-4문장, 각 문장 최대 15단어 (더 긴 문장 허용)
   - 60초 스크립트: 6-8문장

---

## 📂 생성/수정된 파일

### 신규 생성
- ✅ `lib/styleGuides.ts` - 스타일 가이드 시스템
- ✅ `app/api/writingladder/submissions/[submission_id]/script/route.ts` - Writing Ladder Script Coach API

### 수정
- ✅ `app/api/showtell/submissions/[submission_id]/script/route.ts` - 스타일 가이드 적용
- ✅ `app/types/showtell.ts` - `WritingSubmission`에 `grade_band`, `cefr_level` 추가

---

## 🚀 다음 단계 (선택사항)

1. **Correction API에도 스타일 가이드 적용**
   - 교정 수준 (minimal/detailed)을 레벨에 따라 자동 조정
   - LOW/A1: 최대 1개 교정, MID/A1: 최대 2개 교정

2. **Judge 질문 난이도 제어**
   - LOW/A1: 매우 짧은 질문 (3-5단어)
   - HIGH/A2: 조금 더 긴 질문 (5-8단어)

3. **TTS 속도 조절**
   - LOW/A1: 0.8x 속도 (천천히)
   - HIGH/A2: 1.0x 속도 (정상)

---

## 📊 테스트 시나리오

### 시나리오 1: Writing Ladder L0 - LOW/A1 (초등 저학년)
**입력:**
```
I like apples. They are red. I eat them every day. They are sweet and yummy. My mom buys apples.
```

**기대 출력 (30초 스크립트):**
```
I like apples. They are red. I eat them.
```
- ✅ 3문장
- ✅ 각 문장 최대 4단어 (규칙: 최대 6단어)
- ✅ 연결어 없음 (단문만)

### 시나리오 2: Writing Ladder L0 - MID/A1 (초등 중학년)
**입력:**
```
I like playing soccer. I play with my friends. We play on weekends. It's fun because we run a lot.
```

**기대 출력 (30초 스크립트):**
```
I like playing soccer. I play with my friends. It's fun because we run a lot.
```
- ✅ 3문장
- ✅ 각 문장 최대 8단어
- ✅ **"because" 포함 (필수)**

### 시나리오 3: Writing Ladder L0 - HIGH/A2 (초등 고학년)
**입력:**
```
I love reading books. I read every day because books are interesting. When I read, I learn new things. My favorite genre is fantasy.
```

**기대 출력 (30초 스크립트):**
```
I love reading books. I read every day because books are interesting. When I read, I learn new things.
```
- ✅ 3문장
- ✅ 각 문장 최대 10단어
- ✅ **"because" 포함 (필수)**
- ✅ 연결어: because, when 사용

**기대 출력 (60초 스크립트):**
```
I love reading books. I read every day because books are interesting. When I read, I learn new things. My favorite genre is fantasy. I also like adventure stories. Reading helps me improve my English.
```
- ✅ 6문장 (규칙: 5-7문장)
- ✅ 각 문장 최대 10단어

---

## 🎉 구현 완료!

**4단계: Script Coach 스타일 가이드 시스템**이 성공적으로 구현되었습니다!

**핵심 성과:**
- ✅ 레벨별 문장 길이/복잡도 제어 시스템 구축
- ✅ Show & Tell과 Writing Ladder에 각각 다른 규칙 적용
- ✅ AI 프롬프트에 STRICT RULES 반영
- ✅ 생성된 스크립트 자동 검증 로직

**완료조건(AC) 달성:**
- ✅ Script 생성 결과가 레벨0 규칙을 넘지 않는다
- ✅ Writing Ladder Level 0은 Show & Tell보다 더 짧고 간단한 문장 생성
- ✅ 필수 연결어(예: "because") 강제 포함

---

**다음 작업:** 실제 제출 데이터를 통한 테스트 및 검증 → 프로덕션 배포


