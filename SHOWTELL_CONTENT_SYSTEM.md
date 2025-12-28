# Show & Tell 12주 코스 - 콘텐츠 시스템 구축 완료 ✅

## 📋 개요

Show & Tell 12주 코스의 콘텐츠를 Firestore에 저장하고 조회하는 시스템을 구축했습니다.

---

## 🗄️ Firestore 컬렉션 구조

### 1. `showtell_topics` (12개 문서)

주차별 발표 주제

```typescript
{
  topic_id: "showtell_week1",
  week: 1,
  title: "My Favorite Toy",
  description: "Share about your favorite toy...",
  grade_band: "HIGH",
  cefr_level: "A2",
  json: {
    learning_objectives: [...],
    key_vocabulary: [...],
    example_sentences: [...]
  },
  active: true,
  version: "1.0",
  created_at: "2025-12-27T00:00:00.000Z"
}
```

**인덱스:**
- `week` (asc)
- `active` (==)

---

### 2. `showtell_judge_questions` (12개 문서)

Judge 단계 질문 세트 (주차별 5문항)

```typescript
{
  question_set_id: "judge_week1",
  topic_id: "showtell_week1",
  week: 1,
  json: {
    questions: [
      {
        question_id: "q1",
        text: "What is your favorite toy?",
        difficulty: "easy",
        expected_answer_length: "short"
      },
      // ... 5개 문항
    ]
  },
  active: true,
  version: "1.0",
  created_at: "2025-12-27T00:00:00.000Z"
}
```

**인덱스:**
- `topic_id` (==)
- `week` (asc)

---

### 3. `showtell_content_packs` (12개 문서)

주차별 전체 콘텐츠 팩 (Day1~3 전체 구성)

```typescript
{
  content_pack_id: "showtell_week1",
  course_id: "show_tell_12w",
  week: 1,
  grade_band: "HIGH",
  cefr_level: "A2",
  topic_id: "showtell_week1",
  task_type_id: "showtell.presentation",
  json: {
    title: "Week 1: My Favorite Toy",
    description: "...",
    day1: { write: {...}, fix: {...} },
    day2: { script_coach: {...}, tts: {...}, shadowing: {...} },
    day3: { rehearsal: {...}, judge: { question_bank_ref: "judge_week1", ... } },
    portfolio: { ... }
  },
  active: true,
  version: "1.0",
  created_at: "2025-12-27T00:00:00.000Z"
}
```

**복합 인덱스:**
- `course_id` (==) + `week` (asc) + `grade_band` (==) + `cefr_level` (==)
- `course_id` (==) + `active` (==) + `week` (asc)

---

## 📂 파일 구조

```
nextjs-project1217/
├── seed/
│   └── showtell/
│       ├── topics.json                    # 12개 주제
│       ├── judge_question_sets.json       # 12개 질문 세트
│       └── content_packs.json             # 12개 콘텐츠 팩
│
├── scripts/
│   └── seed-showtell.js                   # Firestore 업로드 스크립트
│
├── app/
│   ├── types/
│   │   └── showtell.ts                    # TypeScript 타입 정의
│   │
│   └── api/
│       └── showtell/
│           ├── content/route.ts           # 콘텐츠 팩 조회 API
│           ├── topics/route.ts            # 주제 목록 조회 API
│           └── questions/route.ts         # 질문 세트 조회 API
│
└── package.json                            # npm 스크립트 추가
```

---

## 🚀 사용 방법

### 1. 시드 데이터 업로드

```bash
# Firebase 콘텐츠 업로드 (처음 1회만)
npm run seed-showtell
```

**출력 예시:**
```
🚀 Show & Tell 12주 코스 시드 시작
==================================================
📦 showtell_topics 업로드 시작...
  ✅ showtell_week1 업로드 완료
  ✅ showtell_week2 업로드 완료
  ...
✅ showtell_topics 업로드 완료 (12개)

📦 showtell_judge_questions 업로드 시작...
  ✅ judge_week1 업로드 완료
  ...
✅ showtell_judge_questions 업로드 완료 (12개)

📦 showtell_content_packs 업로드 시작...
  ✅ showtell_week1 업로드 완료
  ...
✅ showtell_content_packs 업로드 완료 (12개)

==================================================
🎉 모든 데이터 업로드 완료!

📊 업로드 요약:
  - Topics: 12개
  - Question Sets: 12개
  - Content Packs: 12개
  - 총: 36개
```

---

### 2. API 사용 예시

#### 📦 특정 주차 콘텐츠 조회

```bash
# Week 1 콘텐츠 조회 (질문 세트 포함)
GET /api/showtell/content?week=1&includeQuestions=true
```

**응답:**
```json
{
  "success": true,
  "data": {
    "content_pack": {
      "content_pack_id": "showtell_week1",
      "week": 1,
      "json": {
        "title": "Week 1: My Favorite Toy",
        "day1": { "write": {...}, "fix": {...} },
        "day2": { "script_coach": {...}, "tts": {...}, "shadowing": {...} },
        "day3": { "rehearsal": {...}, "judge": {...} }
      }
    },
    "topic": {
      "topic_id": "showtell_week1",
      "title": "My Favorite Toy",
      "json": { "learning_objectives": [...], "key_vocabulary": [...] }
    },
    "questions": {
      "question_set_id": "judge_week1",
      "json": { "questions": [5개 문항] }
    }
  }
}
```

#### 📚 전체 주차 목록 조회

```bash
# 1~12주 전체 콘텐츠 팩 조회
GET /api/showtell/content
```

**응답:**
```json
{
  "success": true,
  "data": {
    "content_packs": [12개 콘텐츠 팩],
    "total": 12
  }
}
```

#### 🎯 주제만 조회

```bash
# 전체 주제 목록
GET /api/showtell/topics

# 특정 주차 주제
GET /api/showtell/topics?week=1
```

#### ❓ 질문 세트 조회

```bash
# Question Set ID로 조회
GET /api/showtell/questions?set_id=judge_week1

# 주차 번호로 조회
GET /api/showtell/questions?week=1
```

---

## 🔍 데이터 확인

### Firestore 콘솔에서 확인

1. Firebase Console 접속
2. Firestore Database 선택
3. 컬렉션 확인:
   - ✅ `showtell_topics` (12개 문서)
   - ✅ `showtell_judge_questions` (12개 문서)
   - ✅ `showtell_content_packs` (12개 문서)

### API 테스트

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 테스트
http://localhost:3002/api/showtell/content?week=1&includeQuestions=true
http://localhost:3002/api/showtell/topics
http://localhost:3002/api/showtell/questions?week=1
```

---

## ✅ 완료 조건 (AC) 검증

### ✅ AC 1: week=1~12 조회가 전부 가능

```bash
# 각 주차 조회 테스트
for i in {1..12}; do
  curl "http://localhost:3002/api/showtell/content?week=$i"
done
```

모든 주차에서 `"success": true` 응답 확인

### ✅ AC 2: question_bank_ref가 실제 question_set_id로 매칭

**Content Pack의 Judge 설정:**
```json
{
  "day3": {
    "judge": {
      "question_bank_ref": "judge_week1"  // FK
    }
  }
}
```

**Question Set ID:**
```json
{
  "question_set_id": "judge_week1"  // PK
}
```

**확인 방법:**
```bash
# Week 1 질문 포함 조회
curl "http://localhost:3002/api/showtell/content?week=1&includeQuestions=true"

# questions 필드에 5개 문항이 정상적으로 로드됨
```

---

## 📊 콘텐츠 상세 구조

### Day 1: Write + Fix

- **Write Prompt:** 작성 가이드 질문
- **Min/Max Words:** 50~150 단어
- **Fix:** 문법/어휘/구조 교정

### Day 2: Script Coach + TTS + Shadowing

- **Script Coach:** 30초 발표 대본 구조 템플릿
- **TTS:** 원어민 음성 듣기
- **Shadowing:** 따라 말하기 녹음 (최대 3회)

### Day 3: Rehearsal + Judge

- **Rehearsal:** 1차 녹음 → 피드백 → 2차 녹음
- **Judge:** 5개 Q&A (30초 시간 제한)

### Portfolio Card

- **저장 항목:** 최종 대본, 최종 녹음, Judge Q&A
- **표시 정보:** 주차별 카드 (썸네일, 제목, 설명)

---

## 🔧 추가 작업 (향후)

### Firestore 인덱스 생성

Firebase Console에서 필요한 복합 인덱스 생성:

```
컬렉션: showtell_content_packs
필드:
  - course_id (==)
  - active (==)
  - week (asc)
```

### 진행 상태 추적

사용자의 Show & Tell 진행 상태를 저장할 컬렉션:
- `showtell_user_progress` (사용자별 진행 상태)
- `showtell_portfolio_cards` (완성된 포트폴리오 카드)

---

## 📝 데이터 수정

시드 데이터를 수정하려면:

1. `seed/showtell/*.json` 파일 수정
2. `npm run seed-showtell` 재실행 (덮어쓰기)

또는 Firebase Console에서 직접 수정 가능.

---

## 🎯 12주 코스 주제 목록

1. **Week 1:** My Favorite Toy
2. **Week 2:** My Pet (or Dream Pet)
3. **Week 3:** My Favorite Food
4. **Week 4:** My Best Friend
5. **Week 5:** My Favorite Place
6. **Week 6:** My Hobby
7. **Week 7:** My Family
8. **Week 8:** A Special Day
9. **Week 9:** My Dream Job
10. **Week 10:** My Favorite Season
11. **Week 11:** My Favorite Book or Movie
12. **Week 12:** Something I'm Proud Of

---

## 🎉 완료!

Show & Tell 12주 코스의 콘텐츠 시스템이 완성되었습니다!

**다음 단계:**
- 사용자 진행 상태 추적 시스템 구현
- Show & Tell UI/UX 구현
- 녹음/음성 처리 기능 구현
- 포트폴리오 카드 저장/조회 기능

**문의:**
- 타입 정의: `app/types/showtell.ts`
- 시드 데이터: `seed/showtell/*.json`
- API 문서: 이 파일 참고





