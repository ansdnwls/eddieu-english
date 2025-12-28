# 6단계 완료: 평가(루브릭) — 자동 피드백 품질 일관성 시스템

## 🎯 목표

LLM의 불안정성을 줄이고 일관된 피드백 품질을 제공하기 위해, **정량적 체크를 먼저 수행**하고 LLM은 짧은 코칭 문구만 작성하도록 합니다.

---

## ✅ 구현 완료

### 1. **루브릭 검증 시스템** (`lib/rubricValidator.ts`)

#### 핵심 기능

**1) 문장 수 체크**
- 최소/최대 문장 수 준수 여부 검증
- 초과/부족 시 구체적 피드백 제공

**2) 필수 패턴 체크**
- Week별 필수 문법 패턴 포함 여부 검증
- 대소문자 구분 없이 검색
- 최소 출현 횟수 설정 가능

**3) PII (개인정보) 위험 체크**
- 학교명, 전화번호, 주소 등 개인정보 키워드 감지
- 정규식으로 전화번호 패턴 감지
- 감지된 키워드 목록 반환

**4) 종합 결과**
- `pass`: 모든 체크 통과 여부
- `issues`: 문제점 목록 (한국어)

---

### 2. **Writing Ladder Level 0 루브릭 규칙**

#### Week 1: Things I Like (because)

| Grade Band | 문장 수 | 필수 패턴 | 권장 패턴 |
|-----------|--------|---------|---------|
| LOW/A1 | 3-5 | "I like", "because" (1회) | "I feel" |
| HIGH/A2 | 4-6 | "I like", "because" (1회) | "I feel" |

**예시 검증:**
```typescript
{
  "sentences_count": 4,
  "required_patterns": {
    "i like": true,
    "because": true
  },
  "pii_risk": false,
  "pass": true
}
```

#### Week 2: I Can / I Have

| Grade Band | 문장 수 | 필수 패턴 | 권장 패턴 |
|-----------|--------|---------|---------|
| LOW/A1 | 3-5 | "I can", "I have" | "practice" |
| HIGH/A2 | 4-6 | "I can", "I have" | "practice" |

**예시 검증:**
```typescript
{
  "sentences_count": 4,
  "required_patterns": {
    "i can": true,
    "i have": true
  },
  "pii_risk": false,
  "pass": true
}
```

#### Week 3: Describe a Place (There is/are)

| Grade Band | 문장 수 | 필수 패턴 | 권장 패턴 |
|-----------|--------|---------|---------|
| LOW/A1 | 3-5 | "There is" (1회), "There are" (1회) | "because" |
| HIGH/A2 | 4-6 | "There is" (1회), "There are" (1회) | "because" |

**예시 검증:**
```typescript
{
  "sentences_count": 5,
  "required_patterns": {
    "there is": true,
    "there are": true
  },
  "pii_risk": false,
  "pass": true
}
```

#### Week 4: Last Weekend (Mini Past)

| Grade Band | 문장 수 | 필수 패턴 | 권장 패턴 |
|-----------|--------|---------|---------|
| LOW/A1 | 3-5 | "Last weekend", "went" (1회), "played" (1회), "ate" (1회), "was" (1회) | - |
| HIGH/A2 | 4-6 | "Last weekend", "went" (1회), "played" (1회), "ate" (1회), "was" (1회) | - |

**예시 검증:**
```typescript
{
  "sentences_count": 5,
  "required_patterns": {
    "last weekend": true,
    "went": true,
    "played": true,
    "ate": true,
    "was": true
  },
  "pii_risk": false,
  "pass": true
}
```

---

### 3. **PII (개인정보) 감지 시스템**

#### 감지 키워드

**한국어:**
- 학교: "초등학교", "중학교", "고등학교", "유치원"
- 주소: "번지", "동", "호", "아파트", "빌라", "구", "시", "도"

**영어:**
- 학교: "elementary school", "middle school", "high school", "kindergarten"
- 주소: "street", "avenue", "road", "apt", "apartment", "city", "district"

**전화번호 정규식:**
```regex
/\b0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}\b/g
```

**예시:**
- "010-1234-5678" ✅ 감지
- "010 1234 5678" ✅ 감지
- "01012345678" ✅ 감지

---

### 4. **API 통합**

#### Show & Tell Submission API 수정

**파일:** `app/api/showtell/submissions/writing/route.ts`

**추가 기능:**
```typescript
// 1. grade_band, cefr_level 파라미터 추가 (기본값: HIGH/A2)
const { grade_band = "HIGH", cefr_level = "A2" } = body;

// 2. 루브릭 검증 실행
const rubric_result = validateWithRubric(
  submission_id,
  "show_tell_12w",
  week,
  grade_band as GradeBand,
  cefr_level as CefrLevel,
  cleaned_text
);

// 3. Submission에 rubric_result 포함
const submission: WritingSubmission = {
  ...
  rubric_result, // ✅ 루브릭 결과 포함
  ...
};
```

#### Writing Ladder Submission API 생성

**파일:** `app/api/writingladder/submissions/writing/route.ts`

**기능:**
- Writing Ladder Level 0 전용 Submission API
- 기본값: `grade_band = "LOW"`, `cefr_level = "A1"`
- Week 1-4 범위 검증
- 루브릭 검증 결과 포함

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "submission_id": "wl_sub_child123_week1_1735363200000",
    "rubric_result": {
      "sentences_count": 4,
      "sentences_ok": true,
      "required_patterns": {
        "i like": true,
        "because": true
      },
      "all_patterns_found": true,
      "pii_risk": false,
      "pass": true,
      "issues": []
    }
  },
  "rubric": {
    "pass": true,
    "issues": []
  }
}
```

---

### 5. **UI 배지 시스템**

#### `rubricToBadges()` 함수

루브릭 결과를 UI용 배지 데이터로 변환합니다.

**예시 출력:**
```typescript
[
  {
    label: "문장 수: 4개",
    status: "pass",
    icon: "✅"
  },
  {
    label: "필수 패턴",
    status: "pass",
    icon: "✅"
  },
  {
    label: "검증 통과",
    status: "pass",
    icon: "🎉"
  }
]
```

**실패 시 예시:**
```typescript
[
  {
    label: "문장 수: 2개",
    status: "fail",
    icon: "❌"
  },
  {
    label: "필수 패턴",
    status: "fail",
    icon: "❌"
  },
  {
    label: "개인정보 주의",
    status: "warning",
    icon: "⚠️"
  },
  {
    label: "수정 필요",
    status: "fail",
    icon: "📝"
  }
]
```

---

## 🔍 검증 로직 상세

### 1. 문장 수 체크

```typescript
function checkSentenceCount(
  text: string,
  min_sentences: number,
  max_sentences: number
): {
  count: number;
  ok: boolean;
  issue?: string;
}
```

**로직:**
1. 문장 분리: `.`, `!`, `?` 기준
2. 빈 문장 제거
3. 개수 카운트
4. min/max 범위 검증

**반환 예시:**
```typescript
// 성공
{ count: 4, ok: true }

// 실패 (너무 적음)
{ count: 2, ok: false, issue: "문장이 너무 적어요. (2개, 최소 3개 필요)" }

// 실패 (너무 많음)
{ count: 7, ok: false, issue: "문장이 너무 많아요. (7개, 최대 5개 허용)" }
```

---

### 2. 필수 패턴 체크

```typescript
function checkRequiredPatterns(
  text: string,
  required_patterns: RubricRule["required_patterns"]
): {
  results: Record<string, boolean>;
  all_found: boolean;
  issues: string[];
}
```

**로직:**
1. 텍스트를 소문자로 변환
2. 각 패턴 출현 횟수 카운트 (정규식)
3. `min_count` 이상 출현 여부 확인
4. 누락된 패턴 이슈 생성

**반환 예시:**
```typescript
// 성공
{
  results: { "because": true, "i like": true },
  all_found: true,
  issues: []
}

// 실패
{
  results: { "because": false, "i like": true },
  all_found: false,
  issues: ["필수 패턴 누락: 왜냐하면 (because)"]
}
```

---

### 3. PII 위험 체크

```typescript
function checkPIIRisk(text: string): {
  risk: boolean;
  detected: string[];
}
```

**로직:**
1. 텍스트를 소문자로 변환
2. 금지 키워드 목록 순회
3. 전화번호 정규식 매칭
4. 감지된 항목 수집

**반환 예시:**
```typescript
// 안전
{ risk: false, detected: [] }

// 위험
{ risk: true, detected: ["초등학교", "전화번호 패턴"] }
```

---

## ✅ 완료조건(AC) 달성

### AC: Day1 제출 때 루브릭 결과가 저장되고, UI에 "체크 배지"로 표시 가능

**검증:**

#### 1. Firestore에 루브릭 결과 저장 확인

```javascript
// writingladder_writing_submissions 문서 구조
{
  submission_id: "wl_sub_child123_week1_...",
  ...
  rubric_result: {
    sentences_count: 4,
    min_sentences_required: 3,
    max_sentences_allowed: 5,
    sentences_ok: true,
    required_patterns: {
      "i like": true,
      "because": true
    },
    all_patterns_found: true,
    pii_risk: false,
    pass: true,
    issues: [],
    checked_at: "2025-12-28T..."
  }
}
```

#### 2. API 응답에 루브릭 결과 포함

```bash
POST /api/writingladder/submissions/writing

Response:
{
  "success": true,
  "data": { ... },
  "rubric": {
    "pass": true,
    "issues": []
  }
}
```

#### 3. UI 배지 데이터 생성

```typescript
const badges = rubricToBadges(submission.rubric_result);
// [
//   { label: "문장 수: 4개", status: "pass", icon: "✅" },
//   { label: "필수 패턴", status: "pass", icon: "✅" },
//   { label: "검증 통과", status: "pass", icon: "🎉" }
// ]
```

---

## 📊 루브릭 규칙 요약표

| Week | Topic | 문장 수 (LOW) | 문장 수 (HIGH) | 필수 패턴 |
|------|-------|------------|-------------|---------|
| 1 | Things I Like | 3-5 | 4-6 | "I like", "because" |
| 2 | I Can / I Have | 3-5 | 4-6 | "I can", "I have" |
| 3 | Describe a Place | 3-5 | 4-6 | "There is", "There are" |
| 4 | Last Weekend | 3-5 | 4-6 | "Last weekend", "went", "played", "ate", "was" |

---

## 🎯 핵심 성과

### 1. **일관된 품질 관리**
- LLM 없이도 정량적 기준으로 일관된 검증
- 문제점을 명확히 식별 (문장 수, 패턴 누락, PII 위험)

### 2. **안전장치 강화**
- 개인정보 위험 자동 감지
- 학교명, 전화번호, 주소 등 민감 정보 차단

### 3. **LLM 역할 최소화**
- LLM은 짧은 코칭 문구만 생성 (선택사항)
- 핵심 검증은 정량적 로직으로 처리

### 4. **확장 가능한 설계**
- 새로운 Week/Course 추가 시 `WRITING_LADDER_LEVEL0_RUBRICS` 배열에 규칙만 추가
- 금지 키워드 추가 가능

---

## 📂 생성/수정된 파일

### ✅ 신규 생성
1. `lib/rubricValidator.ts` - 루브릭 검증 시스템
2. `app/api/writingladder/submissions/writing/route.ts` - Writing Ladder Submission API

### ✅ 수정
3. `app/types/showtell.ts` - `WritingSubmission`에 `rubric_result` 추가
4. `app/api/showtell/submissions/writing/route.ts` - 루브릭 검증 추가

---

## 🧪 테스트 시나리오

### 시나리오 1: Week 1 - 성공 케이스

**입력:**
```
I like drawing. I like it because it is fun. I feel happy when I draw. It is relaxing.
```

**루브릭 결과:**
```json
{
  "sentences_count": 4,
  "sentences_ok": true,
  "required_patterns": {
    "i like": true,
    "because": true
  },
  "all_patterns_found": true,
  "pii_risk": false,
  "pass": true,
  "issues": []
}
```

---

### 시나리오 2: Week 1 - "because" 누락

**입력:**
```
I like drawing. It is fun. I feel happy.
```

**루브릭 결과:**
```json
{
  "sentences_count": 3,
  "sentences_ok": true,
  "required_patterns": {
    "i like": true,
    "because": false
  },
  "all_patterns_found": false,
  "pii_risk": false,
  "pass": false,
  "issues": ["필수 패턴 누락: 왜냐하면 (because)"]
}
```

---

### 시나리오 3: Week 1 - 문장 수 초과

**입력:**
```
I like drawing. I like painting. I like coloring. I like sketching. I like creating art. It is fun because I can express myself.
```

**루브릭 결과:**
```json
{
  "sentences_count": 6,
  "sentences_ok": false,
  "required_patterns": {
    "i like": true,
    "because": true
  },
  "all_patterns_found": true,
  "pii_risk": false,
  "pass": false,
  "issues": ["문장이 너무 많아요. (6개, 최대 5개 허용)"]
}
```

---

### 시나리오 4: Week 1 - PII 위험 감지

**입력:**
```
I like drawing at Seoul Elementary School. My phone is 010-1234-5678.
```

**루브릭 결과:**
```json
{
  "sentences_count": 2,
  "sentences_ok": false,
  "required_patterns": {
    "i like": true,
    "because": false
  },
  "all_patterns_found": false,
  "pii_risk": true,
  "pii_detected": ["elementary school", "전화번호 패턴"],
  "pass": false,
  "issues": [
    "문장이 너무 적어요. (2개, 최소 3개 필요)",
    "필수 패턴 누락: 왜냐하면 (because)",
    "개인정보 위험: elementary school, 전화번호 패턴 포함"
  ]
}
```

---

## 🎉 6단계 완료!

**완료조건(AC) 달성:**
- ✅ Day1 제출 때 루브릭 결과가 저장됨
- ✅ UI에 "체크 배지"로 표시 가능 (`rubricToBadges()` 제공)
- ✅ 문장 수, 필수 패턴, PII 위험 모두 자동 검증
- ✅ LLM 의존도 최소화 (정량적 체크 우선)

**핵심 성과:**
- 일관된 피드백 품질 보장
- 안전장치 강화 (개인정보 보호)
- 확장 가능한 설계

**다음 작업:**
- UI 컴포넌트에 배지 표시 구현
- LLM 코칭 문구 생성 (선택사항)
- 프로덕션 배포

---

**구현 완료 일시:** 2025년 12월 28일  
**구현자:** Cursor AI + User


