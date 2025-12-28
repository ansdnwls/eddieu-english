# 8단계: Writing Ladder Level 1-3 확장 로드맵

## 🎯 목표

Level 0(문장 4주)에서 검증된 엔진을 그대로 재사용하여, Level 1(단락 6주), Level 2(에세이3 8주), Level 3(에세이5 10주)로 점진적으로 확장합니다.

**핵심 원칙:**
- ✅ 엔진 재사용 (Write+Fix / Script / Rehearsal / Judge / Portfolio)
- ✅ 콘텐츠만 교체 (Topics, Content Packs, Judge Questions)
- ✅ 점진적 난이도 증가 (문장 → 단락 → 에세이)

---

## 📋 Level 1: Writing Ladder Level 1 (단락 6주)

### 기본 정보

| 항목 | 값 |
|------|-----|
| course_id | `writing_ladder_level1` |
| name_ko | Writing Ladder Level 1 (단락) |
| subtitle_ko | 단락 구조로 확장 |
| duration_weeks | 6주 |
| grade_bands | LOW, MID, HIGH |
| cefr_levels | A2, B1 |
| task_type_id | `writing.paragraph` |
| state | COMING_SOON → AVAILABLE (구현 후) |

### Day 1: Write + Fix (단락 템플릿)

#### Writing Template

```json
{
  "type": "paragraph",
  "min_sentences": 5,
  "max_sentences": 8,
  "structure": {
    "topic_sentence": "Main idea in one sentence",
    "reasons": ["Reason 1", "Reason 2"],
    "example": "One concrete example",
    "closing": "Conclusion sentence"
  },
  "sentence_frames": [
    "Topic: I think/believe ___.",
    "Reason 1: First, ___.",
    "Reason 2: Second, ___.",
    "Example: For example, ___.",
    "Closing: That is why ___."
  ],
  "required_patterns": ["First", "Second", "For example"]
}
```

#### 루브릭 규칙 (Level 1)

```typescript
{
  course_id: "writing_ladder_level1",
  week: 1,
  grade_band: "LOW",
  min_sentences: 5,
  max_sentences: 8,
  required_patterns: [
    { pattern: "First", description_ko: "첫째 (First)" },
    { pattern: "Second", description_ko: "둘째 (Second)" },
    { pattern: "For example", description_ko: "예를 들어 (For example)" }
  ],
  grammar: {
    max_clause_depth: 2,
    allowed_tenses: ["present_simple", "present_continuous", "past_simple"]
  }
}
```

### Day 2: Script Coach (30초 + 60초)

#### 스타일 가이드 규칙

| Grade Band | 30초 문장 수 | 60초 문장 수 | 단어/문장 | 필수 연결어 |
|-----------|------------|------------|---------|-----------|
| LOW/A2 | 4-5 | ❌ 비활성 | 최대 10 | First, Second, For example |
| MID/A2 | 5-6 | 8-10 | 최대 12 | First, Second, For example |
| HIGH/B1 | 5-7 | 10-12 | 최대 15 | First, Second, For example, However |

**중요:** 60초 스크립트는 상위 플랜/쿼터만 활성화 (선택사항)

### Day 3: Judge (5문항)

#### Judge 질문 예시

```json
{
  "questions": [
    { "q": "What is your main idea?", "intent": "topic_sentence" },
    { "q": "What is your first reason?", "intent": "reason_detail" },
    { "q": "Can you give me an example?", "intent": "example" },
    { "q": "Why is this important?", "intent": "reason" },
    { "q": "Can you summarize in one sentence?", "intent": "summarize" }
  ]
}
```

**특징:**
- 5문항 (Level 0는 3-5문항)
- 예시/이유/요약 요구 포함
- LOW는 3-4문항 선택, HIGH는 5문항 모두

### 주차별 주제 (6주)

| Week | Topic | Grammar Focus | Paragraph Structure |
|------|-------|---------------|---------------------|
| 1 | My Favorite Season | First, Second, For example | Topic + 2 Reasons + Example + Closing |
| 2 | A Place I Want to Visit | First, Second, For example | Topic + 2 Reasons + Example + Closing |
| 3 | My Daily Routine | First, Then, Finally | Topic + Sequence + Example + Closing |
| 4 | A Person I Admire | First, Also, For instance | Topic + 2 Qualities + Example + Closing |
| 5 | My Future Dream | First, Second, That is why | Topic + 2 Goals + Plan + Closing |
| 6 | Why Reading is Important | First, Moreover, For example | Topic + 2 Benefits + Example + Closing |

---

## 📋 Level 2: Writing Ladder Level 2 (에세이3 8주)

### 기본 정보

| 항목 | 값 |
|------|-----|
| course_id | `writing_ladder_level2` |
| name_ko | Writing Ladder Level 2 (에세이3) |
| subtitle_ko | 3단락 에세이 구조 |
| duration_weeks | 8주 |
| grade_bands | MID, HIGH |
| cefr_levels | A2, B1 |
| task_type_id | `writing.essay3` |
| state | COMING_SOON |

### Day 1: Write + Fix (3단락 구조)

#### Writing Template

```json
{
  "type": "essay3",
  "min_paragraphs": 3,
  "max_paragraphs": 3,
  "structure": {
    "intro": {
      "hook": "Interesting opening",
      "thesis": "Main argument in one sentence"
    },
    "body1": {
      "topic_sentence": "First main point",
      "reason": "Why this point matters",
      "example": "Concrete example"
    },
    "body2": {
      "topic_sentence": "Second main point",
      "reason": "Why this point matters",
      "example": "Concrete example"
    },
    "conclusion": {
      "restate_thesis": "Restate main argument",
      "final_thought": "Closing remark"
    }
  },
  "min_sentences": 10,
  "max_sentences": 15,
  "required_patterns": ["First", "Second", "For example", "In conclusion"]
}
```

#### 루브릭 규칙 (Level 2)

```typescript
{
  course_id: "writing_ladder_level2",
  week: 1,
  grade_band: "MID",
  min_sentences: 10,
  max_sentences: 15,
  required_patterns: [
    { pattern: "First", description_ko: "첫째 (First)" },
    { pattern: "Second", description_ko: "둘째 (Second)" },
    { pattern: "For example", description_ko: "예를 들어 (For example)", min_count: 2 },
    { pattern: "In conclusion", description_ko: "결론적으로 (In conclusion)" }
  ],
  grammar: {
    max_clause_depth: 3,
    allowed_tenses: ["present_simple", "present_continuous", "past_simple", "future_will"]
  }
}
```

### Day 2: Script Coach (30초 + 60초)

#### 스타일 가이드 규칙

| Grade Band | 30초 문장 수 | 60초 문장 수 | 단어/문장 | 필수 연결어 |
|-----------|------------|------------|---------|-----------|
| MID/A2 | 5-6 | 10-12 | 최대 12 | First, Second, For example, In conclusion |
| HIGH/B1 | 6-7 | 12-15 | 최대 15 | First, Second, For example, However, In conclusion |

### Day 3: Judge (5문항 + 반대 의견 1개)

#### Judge 질문 예시

```json
{
  "questions": [
    { "q": "What is your main argument?", "intent": "thesis" },
    { "q": "What is your first reason?", "intent": "body1_reason" },
    { "q": "What is your second reason?", "intent": "body2_reason" },
    { "q": "Some people might disagree. What would you say?", "intent": "counterargument", "difficulty": "hard" },
    { "q": "Can you restate your main point?", "intent": "conclusion" }
  ]
}
```

**특징:**
- 5문항 (4개 기본 + 1개 반대 의견)
- 반대 의견 질문: "Some people might disagree..." (짧게)
- HIGH만 반대 의견 질문 포함

### 주차별 주제 (8주)

| Week | Topic | Essay Type | Grammar Focus |
|------|-------|------------|---------------|
| 1 | Why Exercise is Important | Persuasive | First, Second, For example |
| 2 | Online vs Offline Learning | Compare/Contrast | Similarly, However, On the other hand |
| 3 | My Most Memorable Trip | Narrative | First, Then, Finally |
| 4 | How to Be a Good Friend | Expository | First, Also, Moreover |
| 5 | The Benefits of Reading | Persuasive | First, Second, In addition |
| 6 | Technology: Good or Bad? | Argumentative | First, However, Nevertheless |
| 7 | My Role Model | Descriptive | First, Furthermore, Most importantly |
| 8 | Looking Back and Moving Forward | Reflective | First, Then, In conclusion |

---

## 📋 Level 3: Writing Ladder Level 3 (에세이5 10주)

### 기본 정보

| 항목 | 값 |
|------|-----|
| course_id | `writing_ladder_level3` |
| name_ko | Writing Ladder Level 3 (에세이5) |
| subtitle_ko | 5단락 에세이 + 긴 스피치 |
| duration_weeks | 10주 |
| grade_bands | HIGH |
| cefr_levels | B1, B2 |
| task_type_id | `writing.essay5` |
| state | COMING_SOON |

### Day 1: Write + Fix (5단락 구조)

#### Writing Template

```json
{
  "type": "essay5",
  "min_paragraphs": 5,
  "max_paragraphs": 5,
  "structure": {
    "intro": {
      "hook": "Engaging opening",
      "background": "Context",
      "thesis": "Clear thesis statement"
    },
    "body1": {
      "topic_sentence": "First main point",
      "reason": "Supporting reason",
      "evidence": "Evidence or example",
      "analysis": "Why this matters"
    },
    "body2": {
      "topic_sentence": "Second main point",
      "reason": "Supporting reason",
      "evidence": "Evidence or example",
      "analysis": "Why this matters"
    },
    "body3": {
      "topic_sentence": "Third main point",
      "reason": "Supporting reason",
      "evidence": "Evidence or example",
      "analysis": "Why this matters"
    },
    "conclusion": {
      "restate_thesis": "Restate thesis",
      "summary": "Summarize main points",
      "final_thought": "Call to action or reflection"
    }
  },
  "min_sentences": 15,
  "max_sentences": 25,
  "required_patterns": ["First", "Second", "Third", "Furthermore", "Moreover", "However", "In conclusion"]
}
```

#### 루브릭 규칙 (Level 3)

```typescript
{
  course_id: "writing_ladder_level3",
  week: 1,
  grade_band: "HIGH",
  min_sentences: 15,
  max_sentences: 25,
  required_patterns: [
    { pattern: "First", description_ko: "첫째 (First)" },
    { pattern: "Second", description_ko: "둘째 (Second)" },
    { pattern: "Third", description_ko: "셋째 (Third)" },
    { pattern: "Furthermore", description_ko: "게다가 (Furthermore)" },
    { pattern: "Moreover", description_ko: "더욱이 (Moreover)" },
    { pattern: "However", description_ko: "그러나 (However)" },
    { pattern: "In conclusion", description_ko: "결론적으로 (In conclusion)" }
  ],
  grammar: {
    max_clause_depth: 4,
    allowed_tenses: ["present_simple", "present_continuous", "past_simple", "past_continuous", "present_perfect", "future_will"]
  }
}
```

### Day 2: Script Coach (60초~90초 스피치)

#### 스타일 가이드 규칙

| Grade Band | 60초 문장 수 | 90초 문장 수 | 단어/문장 | 필수 연결어 |
|-----------|------------|------------|---------|-----------|
| HIGH/B1 | 12-15 | 18-22 | 최대 18 | First, Second, Third, Furthermore, However, In conclusion |
| HIGH/B2 | 15-18 | 22-28 | 최대 20 | 모든 전환어 자유롭게 사용 |

**특징:**
- 30초 스크립트 비활성화 (너무 짧음)
- 60초~90초 스피치 옵션 제공
- 구조 중심 (전환어 강조)

### Day 3: Judge (7문항)

#### Judge 질문 예시

```json
{
  "questions": [
    { "q": "What is your thesis statement?", "intent": "thesis" },
    { "q": "What is your first main point?", "intent": "body1" },
    { "q": "What is your second main point?", "intent": "body2" },
    { "q": "What is your third main point?", "intent": "body3" },
    { "q": "What evidence supports your argument?", "intent": "evidence" },
    { "q": "What might critics say about your position?", "intent": "counterargument" },
    { "q": "How would you conclude your argument?", "intent": "conclusion" }
  ]
}
```

**특징:**
- 7문항 (구조 중심)
- 반대 의견 심화 ("What might critics say?")
- 증거 요구 ("What evidence supports?")

### 주차별 주제 (10주)

| Week | Topic | Essay Type | Focus |
|------|-------|------------|-------|
| 1 | The Impact of Social Media | Argumentative | Thesis + 3 Arguments |
| 2 | Climate Change Solutions | Problem-Solution | Problem + 3 Solutions |
| 3 | Education in the Future | Persuasive | Vision + 3 Changes |
| 4 | Cultural Differences | Compare/Contrast | 3 Differences + Analysis |
| 5 | Overcoming Challenges | Narrative + Reflective | Story + 3 Lessons |
| 6 | The Role of Technology | Argumentative | Thesis + 3 Perspectives |
| 7 | What Makes a Leader? | Expository | Definition + 3 Qualities |
| 8 | The Power of Creativity | Persuasive | Claim + 3 Examples |
| 9 | Looking to the Future | Reflective | Goals + 3 Plans |
| 10 | My Growth Journey | Personal | Past + Present + Future |

---

## 🎫 개발 티켓 분할 (Jira/Linear)

### Epic: Writing Ladder Level 1-3 확장

#### Milestone 1: Level 1 (단락 6주) - 2주 소요

**Ticket 1.1: Level 1 타입 정의 및 루브릭 규칙**
- [ ] `app/types/writingladder.ts`에 Level 1 타입 추가
- [ ] `lib/rubricValidator.ts`에 Level 1 루브릭 규칙 추가 (6개)
- [ ] `lib/styleGuides.ts`에 Level 1 스타일 가이드 추가 (3개)
- **예상 시간:** 4시간

**Ticket 1.2: Level 1 콘텐츠 시드 데이터 작성**
- [ ] `seed/writingladder/level1_topics.json` (6개 주제)
- [ ] `seed/writingladder/level1_judge_questions.json` (6개 × 10문항)
- [ ] `seed/writingladder/level1_content_packs.json` (6주차 콘텐츠)
- **예상 시간:** 8시간

**Ticket 1.3: Level 1 시드 스크립트 및 API**
- [ ] `scripts/seed-writingladder-level1.js` 생성
- [ ] `app/api/v1/courses/writing_ladder_level1/weeks/[week]/route.ts` 생성
- [ ] `lib/courseDefinitions.ts`에 Level 1 추가
- **예상 시간:** 4시간

**Ticket 1.4: Level 1 진행 계산 로직**
- [ ] `lib/courseProgressHelper.ts`에 Level 1 진행 계산 추가
- [ ] `course_instances` API에 Level 1 통합
- **예상 시간:** 4시간

**Ticket 1.5: Level 1 테스트 및 QA**
- [ ] 시드 스크립트 실행 및 검증
- [ ] Week 1-6 모든 Day 테스트
- [ ] 루브릭 검증 테스트
- [ ] 문서 업데이트
- **예상 시간:** 8시간

**Total: 28시간 (약 3.5일)**

---

#### Milestone 2: Level 2 (에세이3 8주) - 2주 소요

**Ticket 2.1: Level 2 타입 정의 및 루브릭 규칙**
- [ ] Level 2 타입 추가 (3단락 구조)
- [ ] 루브릭 규칙 추가 (8개)
- [ ] 스타일 가이드 추가 (2개)
- **예상 시간:** 4시간

**Ticket 2.2: Level 2 콘텐츠 시드 데이터 작성**
- [ ] `level2_topics.json` (8개 주제)
- [ ] `level2_judge_questions.json` (8개 × 10문항 + 반대 의견)
- [ ] `level2_content_packs.json` (8주차 콘텐츠)
- **예상 시간:** 12시간

**Ticket 2.3: Level 2 시드 스크립트 및 API**
- [ ] 시드 스크립트 생성
- [ ] API 엔드포인트 생성
- [ ] 코스 정의 추가
- **예상 시간:** 4시간

**Ticket 2.4: Level 2 진행 계산 로직**
- [ ] 진행 계산 추가
- [ ] API 통합
- **예상 시간:** 4시간

**Ticket 2.5: Level 2 테스트 및 QA**
- [ ] 전체 테스트
- [ ] 반대 의견 질문 테스트
- [ ] 3단락 구조 검증
- **예상 시간:** 8시간

**Total: 32시간 (약 4일)**

---

#### Milestone 3: Level 3 (에세이5 10주) - 3주 소요

**Ticket 3.1: Level 3 타입 정의 및 루브릭 규칙**
- [ ] Level 3 타입 추가 (5단락 구조)
- [ ] 루브릭 규칙 추가 (10개)
- [ ] 스타일 가이드 추가 (60~90초 스피치)
- **예상 시간:** 6시간

**Ticket 3.2: Level 3 콘텐츠 시드 데이터 작성**
- [ ] `level3_topics.json` (10개 주제)
- [ ] `level3_judge_questions.json` (10개 × 12문항)
- [ ] `level3_content_packs.json` (10주차 콘텐츠)
- **예상 시간:** 16시간

**Ticket 3.3: Level 3 60~90초 스피치 기능**
- [ ] 스타일 가이드 90초 지원 추가
- [ ] Script Coach API 확장
- [ ] TTS 60초+ 지원
- **예상 시간:** 8시간

**Ticket 3.4: Level 3 시드 스크립트 및 API**
- [ ] 시드 스크립트 생성
- [ ] API 엔드포인트 생성
- [ ] 코스 정의 추가
- **예상 시간:** 4시간

**Ticket 3.5: Level 3 진행 계산 로직**
- [ ] 진행 계산 추가
- [ ] API 통합
- **예상 시간:** 4시간

**Ticket 3.6: Level 3 테스트 및 QA**
- [ ] 전체 테스트
- [ ] 60~90초 스피치 테스트
- [ ] 5단락 구조 검증
- **예상 시간:** 10시간

**Total: 48시간 (약 6일)**

---

#### Milestone 4: Level 간 연결 및 통합 - 1주 소요

**Ticket 4.1: Level 0 → Level 1 전환**
- [ ] Level 0 완료 시 Level 1 시작 CTA 추가
- [ ] 코스 인스턴스 잠금 해제 로직
- [ ] UI 업데이트
- **예상 시간:** 6시간

**Ticket 4.2: Level 1 → Level 2 전환**
- [ ] Level 1 완료 시 Level 2 시작 CTA 추가
- [ ] 잠금 해제 로직
- **예상 시간:** 4시간

**Ticket 4.3: Level 2 → Level 3 전환**
- [ ] Level 2 완료 시 Level 3 시작 CTA 추가
- [ ] 잠금 해제 로직
- **예상 시간:** 4시간

**Ticket 4.4: 전체 통합 테스트**
- [ ] Level 0~3 순차 진행 테스트
- [ ] 잠금/해제 규칙 검증
- [ ] 성능 테스트
- [ ] 문서 업데이트
- **예상 시간:** 8시간

**Total: 22시간 (약 2.75일)**

---

## 📊 전체 일정 요약

| Milestone | 소요 기간 | 예상 시간 | 우선순위 |
|-----------|---------|---------|---------|
| Level 1 (단락 6주) | 2주 | 28시간 | P0 (최우선) |
| Level 2 (에세이3 8주) | 2주 | 32시간 | P1 (높음) |
| Level 3 (에세이5 10주) | 3주 | 48시간 | P2 (중간) |
| Level 간 연결 | 1주 | 22시간 | P0 (최우선) |
| **총계** | **8주** | **130시간** | - |

**개발 리소스:**
- 1명 풀타임: 약 8주
- 2명 풀타임: 약 4주
- 3명 풀타임: 약 2.5주

---

## 🔑 핵심 재사용 요소

### 1. 엔진 재사용 (변경 없음)

✅ **Day 1: Write + Fix**
- OCR / Typing 입력
- AI 교정 (GPT-4)
- 루브릭 자동 검증

✅ **Day 2: Script Coach + Shadowing**
- AI Script Coach (GPT-4)
- 스타일 가이드 적용
- TTS + Shadowing

✅ **Day 3: Rehearsal + Judge**
- Rehearsal 2회
- Judge 질문 랜덤 선택
- 포트폴리오 생성

### 2. 콘텐츠만 교체

✅ **Topics** - 주차별 주제 (6/8/10개)
✅ **Judge Questions** - 질문 세트 (6/8/10개)
✅ **Content Packs** - 주차별 콘텐츠 (6/8/10개)

### 3. 확장 요소

🆕 **루브릭 규칙** - Level별 문장 수, 필수 패턴
🆕 **스타일 가이드** - Level별 스크립트 길이
🆕 **Judge 질문** - Level별 난이도 (5문항 → 7문항)

---

## 📝 체크리스트 (개발팀용)

### Level 1 출시 전

- [ ] Level 1 시드 데이터 작성 완료
- [ ] Level 1 루브릭 규칙 추가
- [ ] Level 1 스타일 가이드 추가
- [ ] Level 1 API 엔드포인트 생성
- [ ] Level 1 진행 계산 로직 통합
- [ ] Level 0 → Level 1 전환 CTA 추가
- [ ] 시드 스크립트 실행 및 검증
- [ ] Week 1-6 전체 테스트
- [ ] 문서 업데이트

### Level 2 출시 전

- [ ] Level 2 시드 데이터 작성 완료 (반대 의견 질문 포함)
- [ ] Level 2 루브릭 규칙 추가
- [ ] Level 2 스타일 가이드 추가
- [ ] Level 1 → Level 2 전환 CTA 추가
- [ ] 3단락 구조 검증
- [ ] Week 1-8 전체 테스트

### Level 3 출시 전

- [ ] Level 3 시드 데이터 작성 완료
- [ ] Level 3 루브릭 규칙 추가
- [ ] 60~90초 스피치 기능 구현
- [ ] Level 2 → Level 3 전환 CTA 추가
- [ ] 5단락 구조 검증
- [ ] Week 1-10 전체 테스트

---

## 🎉 8단계 로드맵 완료!

**다음 작업:**
1. Level 1 티켓 생성 (Jira/Linear)
2. Level 1 콘텐츠 작성 시작
3. 2주 후 Level 1 출시
4. Level 2, Level 3 순차 진행

**예상 완료 시점:**
- Level 1: +2주
- Level 2: +4주
- Level 3: +7주
- 전체 통합: +8주

---

**작성 완료 일시:** 2025년 12월 28일  
**작성자:** Cursor AI + User


