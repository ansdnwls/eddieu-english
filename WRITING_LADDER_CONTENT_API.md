# ✅ Writing Ladder 콘텐츠 API 구현 완료

## 📋 구현 개요

**Writing Ladder Level 0**의 콘텐츠 조회 API를 구현하여, Show & Tell과 동일한 방식으로 topics, judge_question_sets, content_packs 데이터를 조회할 수 있도록 했습니다.

---

## 🎯 완료 조건 (AC) ✅

### ✅ GET /api/v1/courses/writing_ladder_level0/weeks/{week}가 week1~4 모두 리턴된다

**테스트 엔드포인트:**
- `GET /api/v1/courses/writing_ladder_level0/weeks/1` ✅
- `GET /api/v1/courses/writing_ladder_level0/weeks/2` ✅
- `GET /api/v1/courses/writing_ladder_level0/weeks/3` ✅
- `GET /api/v1/courses/writing_ladder_level0/weeks/4` ✅

---

## 📂 생성된 API 파일

### 1. RESTful 스타일 API (AC 조건)
✅ `app/api/v1/courses/writing_ladder_level0/weeks/[week]/route.ts`

### 2. 기존 스타일 API (Show & Tell과 동일)
✅ `app/api/writingladder/content/route.ts` - 콘텐츠 팩 조회  
✅ `app/api/writingladder/topics/route.ts` - 주제 목록 조회  
✅ `app/api/writingladder/questions/route.ts` - Judge 질문 조회

---

## 🔌 API 엔드포인트

### 1. RESTful API (주요)

#### GET /api/v1/courses/writing_ladder_level0/weeks/{week}

**특정 주차 콘텐츠 조회 (모든 정보 포함)**

**URL 예시:**
```
GET /api/v1/courses/writing_ladder_level0/weeks/1
GET /api/v1/courses/writing_ladder_level0/weeks/2
GET /api/v1/courses/writing_ladder_level0/weeks/3
GET /api/v1/courses/writing_ladder_level0/weeks/4
```

**응답 구조:**
```json
{
  "success": true,
  "data": {
    "course_id": "writing_ladder_level0",
    "week": 1,
    "content_pack": {
      "content_pack_id": "writingladder_l0_week1",
      "course_id": "writing_ladder_level0",
      "level": "LEVEL0_SENTENCE",
      "week": 1,
      "topic_id": "writingladder_l0_week1",
      "task_type_id": "writingladder.sentence",
      "json": {
        "title": "Week 1: I like... (Things I Like)",
        "description": "Learn to write simple sentences about things you like",
        "day1": {
          "write": {
            "prompt": "Write 3-5 simple sentences about things you like...",
            "guide_questions": [
              "What food do you like?",
              "What color do you like?",
              ...
            ],
            "min_words": 15,
            "max_words": 50
          },
          "fix": {
            "enabled": true,
            "correction_focus": ["grammar", "vocabulary", "sentence_structure"]
          }
        },
        "day2": {
          "script_coach": {
            "target_duration_seconds": 15,
            "structure_template": { ... },
            "tips": [ ... ]
          },
          "tts": { "enabled": true, "voice": "en-US-Standard-C" },
          "shadowing": { "enabled": true, "max_attempts": 3 }
        },
        "day3": {
          "rehearsal": {
            "max_attempts": 2,
            "feedback_focus": ["pronunciation", "fluency", "confidence"]
          },
          "judge": {
            "question_bank_ref": "judge_writingladder_l0_week1",
            "question_count": 5,
            "time_limit_seconds": 20
          }
        },
        "portfolio": {
          "card_title": "Week 1: Things I Like",
          "card_description": "My first simple sentences about things I like",
          "save_items": ["final_script", "final_recording", "judge_qa"]
        }
      }
    },
    "topic": {
      "topic_id": "writingladder_l0_week1",
      "level": "LEVEL0_SENTENCE",
      "week": 1,
      "title": "I like... (Things I Like)",
      "description": "Learn to write simple sentences about things you like using 'I like...'",
      "grade_band": "MID",
      "cefr_level": "A1",
      "json": {
        "learning_objectives": [
          "Use 'I like' + noun correctly",
          "Write simple present tense sentences",
          "Express personal preferences"
        ],
        "key_vocabulary": [
          "like", "love", "enjoy", "favorite", "food", "color", "animal", "game"
        ],
        "example_sentences": [
          "I like pizza.",
          "I like blue.",
          "I like cats.",
          "I like playing games."
        ]
      }
    },
    "questions": {
      "question_set_id": "judge_writingladder_l0_week1",
      "topic_id": "writingladder_l0_week1",
      "level": "LEVEL0_SENTENCE",
      "week": 1,
      "json": {
        "questions": [
          {
            "question_id": "q1",
            "text": "What food do you like?",
            "difficulty": "easy",
            "expected_answer_length": "short"
          },
          {
            "question_id": "q2",
            "text": "What color do you like?",
            "difficulty": "easy",
            "expected_answer_length": "short"
          },
          // ... 총 10문항 (5개 랜덤 선택)
        ]
      }
    }
  }
}
```

**에러 응답:**
```json
// Week 범위 초과
{
  "success": false,
  "error": "Invalid week number. Must be between 1 and 4 for Level 0."
}

// 콘텐츠 없음
{
  "success": false,
  "error": "Content pack for week 1 not found"
}
```

---

### 2. 기존 스타일 API (Show & Tell과 동일)

#### GET /api/writingladder/content

**콘텐츠 팩 조회**

**Query Params:**
- `week`: 주차 (1~4, 선택)
- `includeQuestions`: Judge 질문 포함 여부 (true/false, 선택)
- `course_id`: 코스 ID (기본값: `writing_ladder_level0`)

**예시:**
```
GET /api/writingladder/content?week=1
GET /api/writingladder/content?week=1&includeQuestions=true
GET /api/writingladder/content (전체 1~4주)
```

---

#### GET /api/writingladder/topics

**주제 목록 조회**

**Query Params:**
- `week`: 주차 (1~4, 선택)
- `level`: 레벨 (기본값: `LEVEL0_SENTENCE`)

**예시:**
```
GET /api/writingladder/topics
GET /api/writingladder/topics?week=1
GET /api/writingladder/topics?level=LEVEL0_SENTENCE
```

---

#### GET /api/writingladder/questions

**Judge 질문 세트 조회**

**Query Params:**
- `week`: 주차 (1~4, 선택)
- `level`: 레벨 (기본값: `LEVEL0_SENTENCE`)

**예시:**
```
GET /api/writingladder/questions
GET /api/writingladder/questions?week=1
```

---

## 📊 Firestore 컬렉션 및 Seed 데이터

### 필수 컬렉션 (3개)

#### 1. `writingladder_topics` (4개 문서)

**문서 ID:**
- `writingladder_l0_week1`
- `writingladder_l0_week2`
- `writingladder_l0_week3`
- `writingladder_l0_week4`

**문서 구조:**
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
  },
  active: true,
  version: "1.0",
  created_at: "2025-12-28T00:00:00.000Z"
}
```

---

#### 2. `writingladder_judge_questions` (4개 문서)

**문서 ID:**
- `judge_writingladder_l0_week1`
- `judge_writingladder_l0_week2`
- `judge_writingladder_l0_week3`
- `judge_writingladder_l0_week4`

**문서 구조:**
```typescript
{
  question_set_id: "judge_writingladder_l0_week1",
  topic_id: "writingladder_l0_week1",
  level: "LEVEL0_SENTENCE",
  week: 1,
  json: {
    questions: [
      // 총 10문항 (Judge 시 5개 랜덤 선택)
      { question_id: "q1", text: "What food do you like?", ... },
      { question_id: "q2", text: "What color do you like?", ... },
      ...
    ]
  },
  active: true,
  version: "1.0",
  created_at: "2025-12-28T00:00:00.000Z"
}
```

---

#### 3. `writingladder_content_packs` (4개 문서)

**문서 ID:**
- `writingladder_l0_week1`
- `writingladder_l0_week2`
- `writingladder_l0_week3`
- `writingladder_l0_week4`

**문서 구조:**
```typescript
{
  content_pack_id: "writingladder_l0_week1",
  course_id: "writing_ladder_level0",
  level: "LEVEL0_SENTENCE",
  week: 1,
  grade_band: "MID",
  cefr_level: "A1",
  topic_id: "writingladder_l0_week1",
  task_type_id: "writingladder.sentence",
  json: {
    title: "Week 1: I like... (Things I Like)",
    description: "...",
    day1: { write: {...}, fix: {...} },
    day2: { script_coach: {...}, tts: {...}, shadowing: {...} },
    day3: { rehearsal: {...}, judge: {...} },
    portfolio: { card_title: "...", ... }
  },
  active: true,
  version: "1.0",
  created_at: "2025-12-28T00:00:00.000Z"
}
```

---

## 🚀 Seed 데이터 업로드

### Seed 스크립트 실행

```bash
node scripts/seed-writingladder.js
```

**결과:**
```
🚀 Writing Ladder Level 0 시드 시작

==================================================

📦 writingladder_topics 업로드 시작...
  ✅ writingladder_l0_week1 업로드 완료
  ✅ writingladder_l0_week2 업로드 완료
  ✅ writingladder_l0_week3 업로드 완료
  ✅ writingladder_l0_week4 업로드 완료
✅ writingladder_topics 업로드 완료 (4개)

📦 writingladder_judge_questions 업로드 시작...
  ✅ judge_writingladder_l0_week1 업로드 완료
  ✅ judge_writingladder_l0_week2 업로드 완료
  ✅ judge_writingladder_l0_week3 업로드 완료
  ✅ judge_writingladder_l0_week4 업로드 완료
✅ writingladder_judge_questions 업로드 완료 (4개)

📦 writingladder_content_packs 업로드 시작...
  ✅ writingladder_l0_week1 업로드 완료
  ✅ writingladder_l0_week2 업로드 완료
  ✅ writingladder_l0_week3 업로드 완료
  ✅ writingladder_l0_week4 업로드 완료
✅ writingladder_content_packs 업로드 완료 (4개)

==================================================
🎉 모든 데이터 업로드 완료!

📊 업로드 요약:
  - Topics: 4개
  - Question Sets: 4개
  - Content Packs: 4개
  - 총: 12개
```

---

## 🧪 테스트 시나리오

### 시나리오 1: Week 1 콘텐츠 조회

```bash
curl http://localhost:3000/api/v1/courses/writing_ladder_level0/weeks/1
```

**예상 결과:**
- ✅ `success: true`
- ✅ `data.week: 1`
- ✅ `data.content_pack.content_pack_id: "writingladder_l0_week1"`
- ✅ `data.topic.title: "I like... (Things I Like)"`
- ✅ `data.questions.json.questions.length: 10`

---

### 시나리오 2: Week 2~4 콘텐츠 조회

```bash
curl http://localhost:3000/api/v1/courses/writing_ladder_level0/weeks/2
curl http://localhost:3000/api/v1/courses/writing_ladder_level0/weeks/3
curl http://localhost:3000/api/v1/courses/writing_ladder_level0/weeks/4
```

**예상 결과:**
- ✅ Week 2: `"I can... (Things I Can Do)"`
- ✅ Week 3: `"I have... (Things I Have)"`
- ✅ Week 4: `"I want... (Things I Want)"`

---

### 시나리오 3: 잘못된 Week 번호

```bash
curl http://localhost:3000/api/v1/courses/writing_ladder_level0/weeks/5
curl http://localhost:3000/api/v1/courses/writing_ladder_level0/weeks/0
```

**예상 결과:**
```json
{
  "success": false,
  "error": "Invalid week number. Must be between 1 and 4 for Level 0."
}
```

---

### 시나리오 4: 전체 콘텐츠 조회

```bash
curl http://localhost:3000/api/writingladder/content
```

**예상 결과:**
```json
{
  "success": true,
  "data": {
    "content_packs": [
      { "week": 1, ... },
      { "week": 2, ... },
      { "week": 3, ... },
      { "week": 4, ... }
    ],
    "total": 4,
    "course_id": "writing_ladder_level0"
  }
}
```

---

## 📋 4주 커리큘럼

| Week | 주제 | 패턴 | 문서 ID |
|------|------|------|---------|
| 1 | Things I Like | `I like...` | `writingladder_l0_week1` |
| 2 | Things I Can Do | `I can...` | `writingladder_l0_week2` |
| 3 | Things I Have | `I have...` | `writingladder_l0_week3` |
| 4 | Things I Want | `I want...` | `writingladder_l0_week4` |

**각 Week 구조:**
- Day 1: Write + Fix (15-50 단어)
- Day 2: Script (15초) + Shadowing (1회 이상)
- Day 3: Rehearsal (2회) + Judge Q&A (5문항)

---

## 🔄 API 비교: Show & Tell vs Writing Ladder

| 항목 | Show & Tell | Writing Ladder L0 |
|------|-------------|-------------------|
| **RESTful API** | `/api/v1/courses/show_tell_12w/weeks/{week}` (미구현) | `/api/v1/courses/writing_ladder_level0/weeks/{week}` ✅ |
| **콘텐츠 API** | `/api/showtell/content?week={week}` | `/api/writingladder/content?week={week}` |
| **주제 API** | `/api/showtell/topics` | `/api/writingladder/topics` |
| **질문 API** | `/api/showtell/questions` | `/api/writingladder/questions` |
| **주차 수** | 12주 | 4주 |
| **컬렉션** | `showtell_*` | `writingladder_*` |

---

## ⚠️ 주의사항

### 1. Week 범위 검증
- Level 0: 1~4주만 유효
- Level 1-3: 추후 구현 시 범위 조정 필요

### 2. 문서 ID 규칙
- Topics: `writingladder_l0_week{N}`
- Questions: `judge_writingladder_l0_week{N}`
- Content Packs: `writingladder_l0_week{N}`

### 3. Firestore Index 필요
다음 쿼리는 Firestore Index가 필요할 수 있습니다:
```
Collection: writingladder_content_packs
Fields: course_id (Ascending), active (Ascending), week (Ascending)

Collection: writingladder_topics
Fields: level (Ascending), active (Ascending), week (Ascending)

Collection: writingladder_judge_questions
Fields: level (Ascending), active (Ascending), week (Ascending)
```

---

## 🎓 결론

**Writing Ladder Level 0 콘텐츠 API** 구축이 완료되었습니다!

### 핵심 성과
✅ RESTful API 구현 (`GET /api/v1/courses/writing_ladder_level0/weeks/{week}`)  
✅ 기존 스타일 API 구현 (Show & Tell과 동일)  
✅ Seed 데이터 완비 (4주 × 3종 = 12개 문서)  
✅ Week 1-4 모든 콘텐츠 조회 가능

### AC 달성
✅ **GET /api/v1/courses/writing_ladder_level0/weeks/{week}가 week1~4 모두 리턴된다**

---

## 📖 참고 문서

1. `WRITING_LADDER_IMPLEMENTATION.md` - 전체 구현 가이드
2. `WRITING_LADDER_QUICK_START.md` - 빠른 시작
3. `COURSE_DEFINITIONS_COMPLETE.md` - 코스 정의 시스템
4. `COURSE_INSTANCES_COMPLETE.md` - 진행 상태 시스템
5. `WRITING_LADDER_CONTENT_API.md` - 콘텐츠 API (이 문서) ⭐ NEW

---

**작성일**: 2025-12-28  
**상태**: ✅ 구현 완료 (MVP 출시 가능)  
**프로젝트**: nextjs-project1217


