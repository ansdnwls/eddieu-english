# Writing Ladder Level 0 구현 완료 ✅

## 📋 개요

**Writing Ladder**는 Show & Tell과 동일한 엔진(Write+Fix / Script / Rehearsal / Judge)을 재사용하며, **콘텐츠(DB seed)와 진행 규칙만 추가**한 새로운 코스입니다.

### Level 0: 문장 쓰기 (4주 코스)
- **대상**: 초등 중학년
- **레벨**: A1 (CEFR)
- **목표**: 4가지 문장 패턴 익히기

---

## 🎯 구현 범위 (MVP)

### ✅ 완료된 작업

1. **타입 정의 추가**
   - `app/types/writingladder.ts` 생성
   - `WritingLadderTopic`, `WritingLadderContentPack` 등 타입 정의
   - `app/types/index.ts`에서 export

2. **DB Seed 데이터 생성**
   - `seed/writingladder/topics.json` (4개)
   - `seed/writingladder/judge_question_sets.json` (4개, 각 10문항)
   - `seed/writingladder/content_packs.json` (4개)

3. **Seed 스크립트 생성**
   - `scripts/seed-writingladder.js`

4. **UI 추가**
   - `/courses` 페이지에 Writing Ladder 카탈로그 추가
   - `/writingladder` 랜딩 페이지 생성
   - Level 1-3 "준비 중" 섹션 추가

---

## 📂 파일 구조

```
app/
├── types/
│   ├── index.ts                    # 타입 export (Writing Ladder 추가됨)
│   ├── showtell.ts                 # Show & Tell 타입
│   └── writingladder.ts            # ✨ Writing Ladder 타입 (NEW)
├── courses/
│   └── page.tsx                    # ✅ Writing Ladder 카탈로그 추가됨
└── writingladder/
    └── page.tsx                    # ✨ Writing Ladder 랜딩 페이지 (NEW)

seed/
├── showtell/                       # Show & Tell 콘텐츠
│   ├── topics.json
│   ├── judge_question_sets.json
│   └── content_packs.json
└── writingladder/                  # ✨ Writing Ladder 콘텐츠 (NEW)
    ├── topics.json                 # 4주 주제
    ├── judge_question_sets.json    # 질문 세트 (각 10문항)
    └── content_packs.json          # Day1-Day2-Day3 콘텐츠

scripts/
├── seed-showtell.js                # Show & Tell 시드
└── seed-writingladder.js           # ✨ Writing Ladder 시드 (NEW)
```

---

## 🚀 사용법

### 1. Firestore에 콘텐츠 업로드

```bash
# Writing Ladder Level 0 콘텐츠를 Firestore에 업로드
node scripts/seed-writingladder.js
```

**업로드되는 컬렉션:**
- `writingladder_topics` (4개 문서)
- `writingladder_judge_questions` (4개 문서)
- `writingladder_content_packs` (4개 문서)

### 2. 코스 시작

1. `/courses` 페이지 접속
2. "전체 코스" 탭 클릭
3. "Writing Ladder Level 0" 카드에서 "코스 시작하기" 클릭
4. Week 1-4 중 원하는 주차 선택
5. Day 1 → Day 2 → Day 3 순서로 진행

---

## 📚 4주 커리큘럼

| Week | 주제 | 패턴 | 학습 목표 |
|------|------|------|-----------|
| Week 1 | Things I Like | `I like...` | 좋아하는 것 표현하기 |
| Week 2 | Things I Can Do | `I can...` | 능력 표현하기 |
| Week 3 | Things I Have | `I have...` | 소유 표현하기 |
| Week 4 | Things I Want | `I want...` | 소망 표현하기 |

---

## 🔧 엔진 재사용 전략

Writing Ladder는 Show & Tell의 **모든 엔진을 그대로 재사용**합니다:

### 재사용되는 엔진

| Day | 엔진 | API 엔드포인트 | 설명 |
|-----|------|----------------|------|
| Day 1 | Write + Fix | `/api/correct-composition` | 글쓰기 + AI 교정 |
| Day 2 | Script Coach | `/api/showtell/script` | AI 대본 생성 |
| Day 2 | TTS | `/api/generate-voice` | 음성 합성 |
| Day 2 | Shadowing | 클라이언트 녹음 | 따라말하기 녹음 |
| Day 3 | Rehearsal | 클라이언트 녹음 | 리허설 녹음 |
| Day 3 | Judge Q&A | `/api/showtell/judge` | AI Judge 질문/답변 |

### 차이점

| 항목 | Show & Tell | Writing Ladder Level 0 |
|------|-------------|------------------------|
| **대상 학년** | 초등 고학년 | 초등 중학년 |
| **CEFR 레벨** | A2 | A1 |
| **기간** | 12주 | 4주 |
| **발표 길이** | 30초 | 15초 (짧음) |
| **단어 수** | 50-150 words | 15-50 words (짧음) |
| **주제 타입** | 발표 주제 (My Favorite Toy) | 문장 패턴 (I like...) |
| **task_type_id** | `showtell.presentation` | `writingladder.sentence` |
| **컬렉션 이름** | `showtell_*` | `writingladder_*` |

---

## 🎨 UI/UX 차이점

### 색상 테마
- **Show & Tell**: Blue-Purple 그라데이션 (`from-blue-500 to-purple-500`)
- **Writing Ladder**: Green-Teal 그라데이션 (`from-green-500 to-teal-500`)

### 이모지
- **Show & Tell**: 🎭 (연극 가면)
- **Writing Ladder**: 📝 (노트)

### 주차별 이모지
- Week 1: 👍 (I like...)
- Week 2: 💪 (I can...)
- Week 3: 🎁 (I have...)
- Week 4: ✨ (I want...)

---

## 🔍 진행 규칙 (Show & Tell과 동일)

### Day 진행 규칙
1. **순차 진행**: Day 1 → Day 2 → Day 3 순서 필수
2. **잠금 해제**: 이전 Day 완료해야 다음 Day 시작 가능
3. **포트폴리오**: Day 3 완료 시 자동 생성

### Week 진행 규칙
1. **자유 선택**: Week 1-4 중 원하는 주차부터 시작 가능
2. **순서 무관**: Week 2 → Week 1도 가능
3. **재도전 가능**: 같은 Week 여러 번 할 수 있음

---

## 📊 Firestore 구조 (Show & Tell과 동일 패턴)

### Collections

#### 1. `writingladder_topics`
```typescript
{
  topic_id: "writingladder_l0_week1",
  level: "LEVEL0_SENTENCE",
  week: 1,
  title: "I like... (Things I Like)",
  description: "...",
  grade_band: "MID",
  cefr_level: "A1",
  json: {
    learning_objectives: [...],
    key_vocabulary: [...],
    example_sentences: [...]
  }
}
```

#### 2. `writingladder_judge_questions`
```typescript
{
  question_set_id: "judge_writingladder_l0_week1",
  topic_id: "writingladder_l0_week1",
  level: "LEVEL0_SENTENCE",
  week: 1,
  json: {
    questions: [
      {
        question_id: "q1",
        text: "What food do you like?",
        difficulty: "easy",
        expected_answer_length: "short"
      },
      // ... 9개 더 (총 10문항, 5개 랜덤 선택)
    ]
  }
}
```

#### 3. `writingladder_content_packs`
```typescript
{
  content_pack_id: "writingladder_l0_week1",
  course_id: "writing_ladder_level0_4w",
  level: "LEVEL0_SENTENCE",
  week: 1,
  topic_id: "writingladder_l0_week1",
  task_type_id: "writingladder.sentence",
  json: {
    title: "Week 1: I like... (Things I Like)",
    day1: { write: {...}, fix: {...} },
    day2: { script_coach: {...}, tts: {...}, shadowing: {...} },
    day3: { rehearsal: {...}, judge: {...} },
    portfolio: { card_title: "...", ... }
  }
}
```

#### 4. 사용자 진행 데이터 (Show & Tell과 공유 가능)
- `writing_submissions` (Day 1 글쓰기)
- `corrections` (Day 1 교정 결과)
- `scripts` (Day 2 대본)
- `audio_records` (Day 2, 3 녹음)
- `rehearsal_sessions` (Day 3 리허설)
- `judge_sessions` (Day 3 Judge Q&A)
- `portfolio_items` (완성된 포트폴리오)

**Note**: 기존 Show & Tell 엔진이 사용하는 컬렉션을 그대로 재사용하며, `course_id` 필드로 구분합니다.

---

## ⚠️ 주의사항

### 1. 기존 엔진 수정 금지
- Show & Tell API는 수정하지 말 것
- 새로운 `task_type_id`를 조건문으로 처리하되, 로직은 동일하게 유지

### 2. 컬렉션 이름 규칙
- Show & Tell: `showtell_*`
- Writing Ladder: `writingladder_*`

### 3. course_id 값
- Show & Tell: `"show_tell_12w"`
- Writing Ladder Level 0: `"writing_ladder_level0_4w"`

---

## 🧪 테스트 체크리스트

### 기본 기능
- [ ] Seed 스크립트 실행 확인 (`node scripts/seed-writingladder.js`)
- [ ] Firestore에 데이터 업로드 확인
- [ ] `/courses` 페이지에서 Writing Ladder 카드 표시 확인
- [ ] `/writingladder` 랜딩 페이지 접근 확인

### Day 1 (Write + Fix)
- [ ] 글쓰기 페이지 접근: `/writingladder/week/1/day1`
- [ ] 타이핑으로 3-5개 문장 작성
- [ ] AI 교정 실행 확인
- [ ] 교정 결과 표시 확인
- [ ] Firestore에 저장 확인

### Day 2 (Script + Shadowing)
- [ ] 대본 페이지 접근: `/writingladder/week/1/day2`
- [ ] AI 대본 생성 (15초 길이)
- [ ] TTS 음성 듣기
- [ ] 핵심 문장 3개 Shadowing
- [ ] 녹음 저장 확인

### Day 3 (Rehearsal + Judge)
- [ ] 리허설 페이지 접근: `/writingladder/week/1/day3`
- [ ] 1차 리허설 녹음
- [ ] AI 피드백 (칭찬 1 + 팁 2 + 개선 문장 1)
- [ ] 2차 리허설 녹음
- [ ] Judge Q&A (5문항 랜덤)
- [ ] 포트폴리오 자동 생성 확인

### 포트폴리오
- [ ] `/writingladder/portfolio` 페이지 접근
- [ ] Week 1-4 포트폴리오 카드 표시
- [ ] 카드 클릭 시 상세 보기

---

## 🚧 향후 확장 (Level 1-3)

### Level 1: 단락 쓰기 (4주) - 예정
- **학년**: 초등 고학년
- **CEFR**: A2
- **주제**: 단락 구조 (Topic sentence, Supporting details, Conclusion)

### Level 2: 에세이 (4주) - 예정
- **학년**: 중학생
- **CEFR**: B1
- **주제**: 3단락 에세이 (Introduction, Body, Conclusion)

### Level 3: 창작 (4주) - 예정
- **학년**: 중학생
- **CEFR**: B1-B2
- **주제**: 스토리텔링, 시, 편지 등 창작 글쓰기

---

## 📝 API 호출 예시

### Day 1: 교정 요청
```typescript
POST /api/correct-composition
{
  "originalText": "I like pizza. I like blue. I like cats.",
  "age": 9,
  "englishLevel": "Lv.1",
  "contentType": "composition",
  "compositionType": "other",
  "course_id": "writing_ladder_level0_4w",  // ⚠️ 추가 필드
  "task_type_id": "writingladder.sentence"  // ⚠️ 추가 필드
}
```

### Day 2: 대본 생성 요청
```typescript
POST /api/showtell/script
{
  "original_text": "I like pizza. I like blue. I like cats.",
  "corrected_text": "I like pizza. I like blue. I like cats.",
  "week": 1,
  "topic_title": "I like... (Things I Like)",
  "target_duration": 15,  // ⚠️ Writing Ladder는 15초
  "course_id": "writing_ladder_level0_4w",
  "task_type_id": "writingladder.sentence"
}
```

---

## 🎓 결론

Writing Ladder Level 0은 **Show & Tell의 모든 엔진을 재사용**하면서, **콘텐츠(seed)와 UI만 추가**한 효율적인 확장입니다.

### 핵심 장점
1. ✅ 코드 재사용 (엔진 수정 불필요)
2. ✅ 빠른 출시 (콘텐츠만 준비하면 됨)
3. ✅ 검증된 로직 (Show & Tell 안정성 그대로)
4. ✅ 확장 가능성 (Level 1-3 추가 용이)

### 다음 단계
1. **Seed 실행**: `node scripts/seed-writingladder.js`
2. **테스트**: Week 1-4 전체 플로우 확인
3. **프로덕션 배포**: Level 0만 먼저 출시
4. **피드백 수집**: 템플릿/교정 룰/스타일 검증
5. **Level 1 준비**: Level 0 안정화 후 확장

---

**작성일**: 2025-12-28  
**작성자**: AI Assistant  
**프로젝트**: nextjs-project1217


