# Show & Tell Day 3 구현 완료 ✅

## 📋 개요

Show & Tell 12주 코스의 **Day 3 (Rehearsal + Judge Q&A)** 구현이 완료되었습니다.

---

## 🎯 구현된 기능

### 1️⃣ Rehearsal Session API

**흐름**: 세션 생성 → Attempt 1 → Feedback → Attempt 2 → 완료

#### A. 세션 생성 (`POST /api/showtell/rehearsals`)

**요청**:
```http
POST /api/showtell/rehearsals
Content-Type: application/json

{
  "script_id": "script_...",
  "child_id": "child_demo_001"
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "rehearsal_id": "rehearsal_script_..._1234567890",
    "script_id": "script_...",
    "child_id": "child_demo_001",
    "week": 1,
    "status": "created",
    "started_at": "2025-12-27T..."
  }
}
```

#### B. Attempt 1 업로드 (`POST /api/showtell/rehearsals/{id}/attempt1`)

**요청**:
```http
POST /api/showtell/rehearsals/{rehearsal_id}/attempt1
Content-Type: application/json

{
  "audio_id": "audio_...",
  "transcript": "..." // 옵션
}
```

**상태 전환**: `created` → `attempt1_uploaded`

#### C. 피드백 생성 (`POST /api/showtell/rehearsals/{id}/feedback`)

**응답 (고정 형식: 칭찬 1 + 팁 2 + 개선 문장 1)**:
```json
{
  "success": true,
  "data": {
    "praise": "발음이 정말 좋았어요! 특히 'exciting'이라는 단어를 자신감 있게 말했어요. 👍",
    "tip1": "조금 더 천천히 말하면 더 좋을 것 같아요. 숨을 한 번 쉬고 다시 시작해보세요!",
    "tip2": "문장의 끝을 올려서 말하면 더 자연스러워요. 'I like it.' 대신 'I like it↗️'처럼 말해보세요!",
    "improved_sentence": "Try saying: 'I really love my toy robot because it can walk and dance!' (강조를 넣어서 말해보세요!)"
  }
}
```

**상태 전환**: `attempt1_uploaded` → `feedback_given`

#### D. Attempt 2 업로드 (`POST /api/showtell/rehearsals/{id}/attempt2`)

**요청**:
```http
POST /api/showtell/rehearsals/{rehearsal_id}/attempt2
Content-Type: application/json

{
  "audio_id": "audio_..."
}
```

**상태 전환**: `feedback_given` → `completed`

**완료 조건**:
- ✅ attempt1 → feedback → attempt2 순서대로만 진행
- ✅ 피드백이 길어지지 않음 (칭찬 1 + 팁 2 + 개선 문장 1 고정)
- ✅ `day3_rehearsal_session_id` 자동 업데이트

---

### 2️⃣ Judge Session API

**핵심 원칙**:
- content_pack의 judge_question_set (10문항)에서 **5개 랜덤 선택**
- 질문은 **1개씩 순차 진행**
- 매 턴 피드백 형식 고정: **칭찬 1 + 교정 1 + 더 좋은 표현 1**
- **개인정보 요구 질문 필터링** (학교명, 주소, 연락처, 실명 등)

#### A. 세션 생성 + 질문 랜덤 선택 (`POST /api/showtell/judge-sessions`)

**요청**:
```http
POST /api/showtell/judge-sessions
Content-Type: application/json

{
  "child_id": "child_demo_001",
  "script_id": "script_...",
  "question_set_id": "judge_week1",
  "n_questions": 5
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "judge_session_id": "judge_script_..._1234567890",
    "selected_questions": [
      {
        "question_id": "q1",
        "text": "What is your favorite thing about it?",
        "difficulty": "easy"
      },
      // ... 4개 더
    ],
    "current_question_index": 0,
    "total_questions": 5
  }
}
```

**개인정보 필터링 로직**:
```typescript
const forbiddenKeywords = [
  "school name", "your school", "which school",
  "address", "where do you live", "your home",
  "phone", "number", "contact",
  "real name", "your name", "full name",
  "email", "parent",
];
```

#### B. 다음 질문 가져오기 (`POST /api/showtell/judge-sessions/{id}/next-question`)

**응답**:
```json
{
  "success": true,
  "data": {
    "question": {
      "question_id": "q1",
      "text": "What is your favorite thing about it?",
      "difficulty": "easy"
    },
    "question_index": 0,
    "total_questions": 5,
    "remaining_questions": 5
  }
}
```

#### C. 답변 제출 + 피드백 (`POST /api/showtell/judge-sessions/{id}/answer`)

**요청**:
```http
POST /api/showtell/judge-sessions/{judge_session_id}/answer
Content-Type: application/json

{
  "answer_text": "Because it is fun.",
  "answer_audio_id": "audio_..." // 옵션
}
```

**응답 (고정 형식: 칭찬 1 + 교정 1 + 더 좋은 표현 1)**:
```json
{
  "success": true,
  "data": {
    "answer": {
      "question_index": 0,
      "question_id": "q1",
      "question_text": "What is your favorite thing about it?",
      "answer_text": "Because it is fun.",
      "feedback": {
        "praise": "좋은 답변이에요! 자신감 있게 말해줘서 고마워요. 👍",
        "correction": "문법 교정: 'Because it is fun' → 'Because it's fun and exciting!'",
        "better_expression": "더 좋은 표현: 'I really enjoy it because it's so much fun!' (더 자연스러워요!)"
      },
      "answered_at": "2025-12-27T..."
    },
    "current_question_index": 1,
    "total_questions": 5,
    "completed": false
  }
}
```

**완료 조건**:
- ✅ 5문항 끝나면 `status: "completed"`로 종료
- ✅ `day3_judge_session_id` 자동 업데이트
- ✅ `day3_completed: true` 설정
- ✅ 개인정보 요구 질문 필터링

---

## 🎨 UI 컴포넌트

### 1️⃣ Day3Rehearsal.tsx

**위치**: `app/showtell/components/Day3Rehearsal.tsx`

**기능**:
- 1차 녹음 → 피드백 표시 → 2차 녹음 (최종 발표)
- 대본 표시
- 녹음 시작/중지 버튼
- 피드백 4가지 항목 표시 (칭찬, 팁1, 팁2, 개선 문장)

**Props**:
```typescript
interface Day3RehearsalProps {
  script: Script;
  childId: string;
  onRehearsalComplete: (rehearsalId: string) => void;
}
```

**UI 특징**:
- 🎭 대본 표시 (파란색 배경)
- 🎙️ 녹음 버튼 (빨간색, 애니메이션)
- 💬 피드백 4가지 섹션 (색상 구분: 초록/파랑/보라/노랑)
- ✅ 완료 메시지

---

### 2️⃣ Day3Judge.tsx

**위치**: `app/showtell/components/Day3Judge.tsx`

**기능**:
- 5개 질문 순차 진행
- 텍스트 답변 입력
- 답변 제출 → 즉시 피드백 표시
- 피드백 확인 후 다음 질문으로 이동

**Props**:
```typescript
interface Day3JudgeProps {
  script: Script;
  childId: string;
  week: number;
  onJudgeComplete: (judgeSessionId: string) => void;
}
```

**UI 특징**:
- 👨‍⚖️ 질문 카운터 (1/5, 2/5, ...)
- 💬 질문 표시 (그라데이션 배경)
- 📝 텍스트 입력 (textarea)
- 💬 피드백 3가지 섹션 (칭찬, 교정, 더 좋은 표현)
- 🎉 완료 메시지

---

### 3️⃣ Day3 메인 페이지

**위치**: `app/showtell/week/[week]/day3/page.tsx`

**기능**:
- Rehearsal → Judge → Portfolio 3단계 진행
- URL에서 `submissionId` 받아서 Script 로드
- Judge 완료 시 자동으로 Portfolio 생성 (Mock)

**진행 흐름**:
```
[Rehearsal] → [Judge Q&A] → [Portfolio 생성]
      ↓            ↓              ↓
   1차→피드백→2차   5문항 Q&A    Week 완료
```

**URL 파라미터**:
- `week`: 주차 (1~12)
- `submissionId`: Day 1에서 생성된 제출 ID (Query Parameter)

**라우팅**:
```typescript
// Day 2 완료 후
router.push(`/showtell/week/${week}/day3?submissionId=${submissionId}`);

// Day 3 완료 후
router.push(`/showtell`); // Portfolio 보러가기
// 또는
router.push(`/showtell/week/${week + 1}/day1`); // 다음 주차
```

---

## 📊 데이터 흐름

### Day 3 전체 흐름

```
Day 2 완료 → submissionId + script_id 전달
    ↓
Day 3 페이지 진입
    ↓
1. Rehearsal 단계
    ├─ POST /rehearsals (세션 생성)
    ├─ POST /rehearsals/{id}/attempt1 (1차 녹음)
    ├─ POST /rehearsals/{id}/feedback (피드백 생성)
    ├─ POST /rehearsals/{id}/attempt2 (2차 녹음)
    └─ day3_rehearsal_session_id 저장
    ↓
2. Judge 단계
    ├─ POST /judge-sessions (세션 생성 + 5개 질문 랜덤)
    ├─ POST /judge-sessions/{id}/next-question (질문 1)
    ├─ POST /judge-sessions/{id}/answer (답변 + 피드백)
    ├─ ... (질문 2~5 반복)
    ├─ day3_judge_session_id 저장
    └─ day3_completed = true
    ↓
3. Portfolio 생성
    ├─ POST /portfolio (자동 생성)
    ├─ portfolio_id 저장
    └─ Week 완료!
```

---

## 🗄️ Firestore 컬렉션

### 1. `showtell_rehearsal_sessions`

**문서 ID**: `rehearsal_{script_id}_{timestamp}`

```typescript
{
  rehearsal_id: string;
  script_id: string;
  child_id: string;
  week: number;
  
  // 1차 녹음
  attempt1_audio_id?: string;
  attempt1_transcript?: string;
  
  // 피드백 (고정 형식)
  feedback?: {
    praise: string;
    tip1: string;
    tip2: string;
    improved_sentence: string;
  };
  
  // 2차 녹음
  attempt2_audio_id?: string;
  
  // 상태
  status: "created" | "attempt1_uploaded" | "feedback_given" | "attempt2_uploaded" | "completed";
  
  started_at: string;
  completed_at?: string;
  updated_at: string;
}
```

### 2. `showtell_judge_sessions`

**문서 ID**: `judge_{script_id}_{timestamp}`

```typescript
{
  judge_session_id: string;
  question_set_id: string;
  script_id: string;
  child_id: string;
  week: number;
  
  // 선택된 5개 질문 (랜덤)
  selected_questions: JudgeQuestion[];
  
  // 현재 진행 상황
  current_question_index: number; // 0~4
  
  // 답변 배열
  answers: JudgeAnswer[];
  
  // 상태
  status: "in_progress" | "completed";
  
  started_at: string;
  completed_at?: string;
  updated_at: string;
}
```

### 3. `showtell_week_progress` (업데이트)

**문서 ID**: `progress_{child_id}_week{week}`

```typescript
{
  // Day 3 관련 필드 추가
  day3_completed: boolean;
  day3_rehearsal_session_id?: string;
  day3_judge_session_id?: string;
  
  // Portfolio
  portfolio_completed: boolean;
  portfolio_id?: string;
  
  // ... 기타 필드
}
```

---

## ✅ 완료 조건 (AC) 체크

### Rehearsal
- ✅ attempt1 → feedback → attempt2 순서대로만 진행
- ✅ 피드백 형식 고정 (칭찬 1 + 팁 2 + 개선 문장 1)
- ✅ 피드백이 길어지지 않음
- ✅ 상태 관리 (created → attempt1_uploaded → feedback_given → completed)

### Judge
- ✅ 10문항 중 5개 랜덤 선택
- ✅ 질문 1개씩 순차 진행
- ✅ 매 턴 피드백 형식 고정 (칭찬 1 + 교정 1 + 더 좋은 표현 1)
- ✅ 5문항 완료 시 세션 "completed" 처리
- ✅ 개인정보 요구 질문 필터링 (학교명, 주소, 연락처, 실명 등)

---

## 📁 생성된 파일

### API 엔드포인트 (7개)
```
app/api/showtell/
├── rehearsals/
│   ├── route.ts                                (세션 생성/조회)
│   └── [rehearsal_id]/
│       ├── attempt1/route.ts                   (1차 녹음)
│       ├── feedback/route.ts                   (피드백 생성)
│       └── attempt2/route.ts                   (2차 녹음)
└── judge-sessions/
    ├── route.ts                                (세션 생성/조회)
    └── [judge_session_id]/
        ├── next-question/route.ts              (다음 질문)
        └── answer/route.ts                     (답변 제출)
```

### UI 컴포넌트 (3개)
```
app/showtell/
├── components/
│   ├── Day3Rehearsal.tsx                       (리허설 UI)
│   └── Day3Judge.tsx                           (Judge Q&A UI)
└── week/[week]/day3/page.tsx                   (Day 3 메인 페이지)
```

### 타입 정의 (2개 수정)
```
app/types/showtell.ts
├── RehearsalSession (수정)
├── RehearsalFeedback (신규)
├── JudgeSession (수정)
├── JudgeFeedback (신규)
└── JudgeAnswer (수정)
```

---

## 🚀 다음 단계

### Portfolio API 구현 예정
```typescript
POST /api/showtell/portfolio
{
  "child_id": "...",
  "week": 1,
  "submission_id": "...",
  "script_id": "...",
  "rehearsal_session_id": "...",
  "judge_session_id": "..."
}
```

### Show & Tell 메인 페이지
- 12주 진행 상황 표시
- Portfolio 카드 목록
- 주차별 완료 상태

---

## 📝 실행 방법

### 1. 로컬 개발 서버 실행
```bash
npm run dev
```

### 2. Day 3 페이지 접근
```
http://localhost:3000/showtell/week/1/day3?submissionId=sub_C123_week1_1234567890
```

### 3. 테스트 시나리오
1. Day 2 완료 (Script Coach + Shadowing)
2. "Day 3 시작하기" 버튼 클릭
3. **Rehearsal**:
   - 1차 녹음
   - 피드백 확인 (칭찬 1 + 팁 2 + 개선 문장 1)
   - 2차 녹음 (최종 발표)
4. **Judge Q&A**:
   - 질문 1 답변 → 피드백 확인
   - 질문 2~5 반복
5. **Portfolio 생성** → Week 완료!

---

## 🔧 추후 개선 사항

### 실제 STT (Speech-to-Text)
현재는 transcript를 수동으로 입력하지만, Google Cloud Speech-to-Text 또는 OpenAI Whisper를 사용하여 자동 변환 가능:
```typescript
const transcript = await transcribeAudio(audioBlob);
```

### 실제 AI 피드백
현재는 Mock 피드백을 사용하지만, OpenAI GPT-4를 사용하여 실시간 피드백 생성:
```typescript
const feedback = await generateRehearsalFeedback(transcript, script);
const judgeFeedback = await generateJudgeFeedback(question, answer);
```

### 음성 답변 지원
Judge Q&A에서 텍스트뿐만 아니라 음성으로도 답변 가능하도록 확장:
```typescript
// 음성 녹음 → STT → 텍스트 변환 → 답변 제출
const answerText = await transcribeAudio(audioBlob);
await submitAnswer(answerText, audioId);
```

---

## 📚 관련 문서

- [Day 1 구현 완료](./SHOWTELL_DAY1_COMPLETE.md)
- [Day 2 구현 완료](./SHOWTELL_DAY2_COMPLETE.md)
- [Stage 2: Show & Tell 콘텐츠 시스템](./SHOWTELL_CONTENT_SYSTEM.md)
- [Stage 4: 학습 진행 데이터](./SHOWTELL_PROGRESS_SYSTEM.md)

---

**작성일**: 2025-12-27  
**작성자**: Cursor AI Assistant  
**상태**: ✅ Day 3 구현 완료





