# Show & Tell Day 2 구현 완료 ✅

## 📋 개요

Show & Tell 12주 코스의 **Day 2 (Script Coach + TTS + Shadowing)** 구현이 완료되었습니다.

---

## 🎯 구현된 기능

### 1️⃣ Script Coach API (`POST /api/showtell/submissions/{submission_id}/script`)

**엔드포인트**: `/api/showtell/submissions/{submission_id}/script`

**기능**:
- Day 1에서 작성한 글을 기반으로 30초/60초 발표 대본 생성
- HIGH/A2 기준 강제:
  - 30초 대본: 3~4문장
  - 60초 대본: 6~8문장
- Keywords 3개 항상 제공
- Simplified Sentences (어려운 표현 → 쉬운 표현)
- 대본 구조 (Intro, Body, Conclusion) 자동 분리

**요청**:
```http
POST /api/showtell/submissions/{submission_id}/script
Content-Type: application/json
```

**응답**:
```json
{
  "success": true,
  "data": {
    "script_id": "script_sub_..._1234567890",
    "script_30s": "Hi, I'm Min. I like my toy robot...",
    "script_60s": "Hi, I'm Min. I like my toy robot very much...",
    "keywords": ["exciting", "practice", "because"],
    "simplified_sentences": [
      "I was extremely excited. → I was very excited.",
      "It was absolutely amazing. → It was very good."
    ]
  }
}
```

**완료 조건**:
- ✅ 30초 대본: 3~4문장
- ✅ 60초 대본: 6~8문장
- ✅ Keywords 3개 제공
- ✅ `showtell_week_progress`의 `day2_script_id` 자동 업데이트

---

### 2️⃣ TTS API + 캐싱 (`POST /api/showtell/tts`)

**엔드포인트**: `/api/showtell/tts`

**기능**:
- Text-to-Speech 음성 생성
- 캐시 시스템 (hash(text+voice+speed))
- 같은 문장 재생 시 캐시 히트로 재생 URL 반환 (재생성 X)
- Google Cloud TTS 또는 OpenAI TTS 사용 (현재는 Mock)

**요청**:
```http
POST /api/showtell/tts
Content-Type: application/json

{
  "text": "Hi, I'm Min.",
  "voice_id": "default_en",
  "speed": 1.0
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "audio_url": "https://storage.googleapis.com/showtell-tts/abc123...mp3",
    "duration_sec": 5,
    "cached": false
  }
}
```

**캐싱 로직**:
1. 캐시 키 생성: `SHA256(text + voice_id + speed)`
2. Firestore `showtell_tts_cache` 컬렉션에서 캐시 확인
3. 캐시 히트 시: 기존 URL 반환 + `access_count` 증가
4. 캐시 미스 시: TTS 생성 + 캐시에 저장

**완료 조건**:
- ✅ 캐시 히트 시 재생성하지 않음
- ✅ `access_count` 추적
- ✅ `last_accessed_at` 업데이트

---

### 3️⃣ Shadowing 녹음 API (`POST /api/showtell/audio`)

**엔드포인트**: `/api/showtell/audio`

**기능**:
- 따라말하기 녹음 파일 메타데이터 저장
- 3문장만 수행 (부담 낮게)
- 최소 1개 녹음 완료해야 Day 3 진행 가능

**요청**:
```http
POST /api/showtell/audio
Content-Type: application/json

{
  "child_id": "child_demo_001",
  "related_type": "shadowing",
  "related_id": "script_123",
  "duration_sec": 5,
  "storage_url": "https://storage.googleapis.com/...",
  "attempt_number": 1
}
```

**응답**:
```json
{
  "success": true,
  "data": {
    "audio_id": "audio_child_demo_001_shadowing_1234567890",
    "child_id": "child_demo_001",
    "related_type": "shadowing",
    "related_id": "script_123",
    "duration_sec": 5,
    "storage_url": "https://storage.googleapis.com/...",
    "attempt_number": 1,
    "created_at": "2025-12-27T..."
  }
}
```

**완료 조건**:
- ✅ 최소 1개 shadowing 오디오 저장
- ✅ `showtell_week_progress`의 `day2_shadowing_audio_ids` 배열에 추가
- ✅ 3문장 완료 시 자동으로 Day 2 완료 처리 가능

---

### 4️⃣ Day 2 완료 API (`POST /api/showtell/submissions/{submission_id}/complete-day2`)

**엔드포인트**: `/api/showtell/submissions/{submission_id}/complete-day2`

**기능**:
- Day 2 완료 조건 체크
- 완료 시 `showtell_week_progress` 업데이트

**완료 조건 체크**:
- ✅ Script 생성 완료 (`day2_script_id` 존재)
- ✅ 최소 1개 Shadowing 녹음 완료 (`day2_shadowing_audio_ids.length >= 1`)

**요청**:
```http
POST /api/showtell/submissions/{submission_id}/complete-day2
```

**응답 (성공)**:
```json
{
  "success": true,
  "message": "Day 2 completed! You can now proceed to Day 3.",
  "data": {
    "day2_completed": true,
    "current_day": 3
  }
}
```

**응답 (실패 - Shadowing 미완료)**:
```json
{
  "success": false,
  "error": "At least 1 shadowing recording required to complete Day 2."
}
```

---

## 🎨 UI 컴포넌트

### 1️⃣ Day2ScriptCoach.tsx

**위치**: `app/showtell/components/Day2ScriptCoach.tsx`

**기능**:
- "발표 대본 만들기" 버튼 클릭 시 Script 생성
- 30초/60초 대본 표시
- Keywords 표시 (초록색 뱃지)
- Simplified Sentences 표시

**Props**:
```typescript
interface Day2ScriptCoachProps {
  submissionId: string;
  onScriptGenerated: (script: Script) => void;
}
```

**UI 특징**:
- 📝 Emoji로 시각적 가이드
- 30초/60초 대본 구분 (파란색/보라색 배경)
- Keywords 뱃지 디자인
- 쉬운 표현 비교 표시

---

### 2️⃣ Day2Shadowing.tsx

**위치**: `app/showtell/components/Day2Shadowing.tsx`

**기능**:
- 3문장만 따라말하기 (부담 낮게)
- 문장별 TTS 재생
- 녹음 시작/중지
- 진행 상황 표시 (1/3, 2/3, 3/3)

**Props**:
```typescript
interface Day2ShadowingProps {
  script: Script;
  childId: string;
  onShadowingComplete: (audioIds: string[]) => void;
}
```

**UI 특징**:
- 🎧 진행 상황 원형 인디케이터 (회색 → 파란색 → 초록색 체크)
- 현재 문장 큰 글씨로 표시
- "🔊 TTS 듣기" / "🎙️ 녹음 시작" 버튼
- 녹음 중 버튼 애니메이션 (pulse)
- 3문장 완료 시 축하 메시지

---

### 3️⃣ Day2 메인 페이지

**위치**: `app/showtell/week/[week]/day2/page.tsx`

**기능**:
- Script Coach → Shadowing → Complete 3단계 진행
- URL에서 `submissionId` 받아서 전달
- 완료 시 Day 3으로 이동

**진행 흐름**:
```
[Script Coach] → [Shadowing] → [Complete]
      ↓               ↓              ↓
  대본 생성       3문장 녹음      Day 3로 이동
```

**URL 파라미터**:
- `week`: 주차 (1~12)
- `submissionId`: Day 1에서 생성된 제출 ID (Query Parameter)

**라우팅**:
```typescript
// Day 1 완료 후
router.push(`/showtell/week/${week}/day2?submissionId=${submissionId}`);

// Day 2 완료 후
router.push(`/showtell/week/${week}/day3?submissionId=${submissionId}`);
```

---

## 📊 데이터 흐름

### Day 2 전체 흐름

```
1. Day 1 완료 → submissionId 전달
    ↓
2. Day 2 페이지 진입
    ↓
3. Script Coach 단계
    ├─ POST /submissions/{id}/script
    ├─ Script 생성 (30s/60s)
    └─ day2_script_id 저장
    ↓
4. Shadowing 단계
    ├─ TTS 재생 (POST /tts + 캐싱)
    ├─ 녹음 (3문장)
    ├─ POST /audio (각 녹음마다)
    └─ day2_shadowing_audio_ids 배열에 추가
    ↓
5. Day 2 완료 처리
    ├─ POST /submissions/{id}/complete-day2
    ├─ 완료 조건 체크 (Script + 최소 1 Shadowing)
    ├─ day2_completed = true
    ├─ current_day = 3
    └─ Day 3로 이동
```

---

## 🗄️ Firestore 컬렉션

### 1. `showtell_scripts`

**문서 ID**: `script_{submission_id}_{timestamp}`

```typescript
{
  script_id: string;
  submission_id: string;
  script_30s: string;
  script_60s?: string;
  keywords: string[];
  simplified_sentences: string[];
  structure: {
    intro: string;
    body: string;
    conclusion: string;
  };
  estimated_duration_seconds: number;
  created_at: string;
}
```

### 2. `showtell_tts_cache`

**문서 ID**: `SHA256(text + voice_id + speed)`

```typescript
{
  cache_key: string;
  text: string;
  voice_id: string;
  speed: number;
  audio_url: string;
  duration_sec: number;
  created_at: string;
  last_accessed_at: string;
  access_count: number;
}
```

### 3. `showtell_audio_records`

**문서 ID**: `audio_{child_id}_{related_type}_{timestamp}`

```typescript
{
  audio_id: string;
  child_id: string;
  related_type: "shadowing" | "rehearsal1" | "rehearsal2" | "judge_answer";
  related_id: string;
  duration_sec: number;
  storage_url: string;
  attempt_number?: number;
  created_at: string;
}
```

### 4. `showtell_week_progress` (업데이트)

**문서 ID**: `progress_{child_id}_week{week}`

```typescript
{
  // Day 2 관련 필드 추가
  day2_completed: boolean;
  day2_script_id?: string;
  day2_shadowing_audio_ids?: string[];
  current_day: 1 | 2 | 3 | null;
  // ... 기타 필드
}
```

---

## ✅ 완료 조건 (AC) 체크

### Script Coach API
- ✅ HIGH/A2 기준: 30초는 3~4문장, 60초는 6~8문장
- ✅ Keywords 3개 항상 제공
- ✅ Simplified Sentences 제공
- ✅ Script 저장 후 `day2_script_id` 업데이트

### TTS API + 캐싱
- ✅ 같은 문장 재생 시 캐시 히트로 재생 URL 반환 (재생성 X)
- ✅ 캐시 키: `hash(text+voice+speed)`
- ✅ `access_count` 추적

### Shadowing 녹음 API
- ✅ 3문장만 수행 (부담 낮게)
- ✅ 녹음 파일 메타데이터 저장 (`POST /audio`)
- ✅ `day2_shadowing_audio_ids` 배열에 추가

### Day 2 완료 조건
- ✅ 최소 1개 shadowing 오디오 저장해야 Day 3 버튼 활성화
- ✅ Script + Shadowing 완료 시 `day2_completed = true`
- ✅ `current_day = 3` 자동 업데이트

---

## 🚀 다음 단계 (Day 3)

Day 3 구현 예정:
1. **Rehearsal** (리허설)
   - 1차 녹음 → AI 피드백 → 2차 녹음
   - Pronunciation, Fluency, Content 평가
2. **Judge** (Q&A)
   - 5개 질문에 대한 답변 (텍스트 or 음성)
   - 개별 피드백
3. **Portfolio** (포트폴리오)
   - 주차별 완성된 학습 결과물 카드 생성

---

## 📝 실행 방법

### 1. 로컬 개발 서버 실행
```bash
npm run dev
```

### 2. Day 2 페이지 접근
```
http://localhost:3000/showtell/week/1/day2?submissionId=sub_C123_week1_1234567890
```

### 3. 테스트 시나리오
1. Day 1 완료 (Write + Fix)
2. "발표 만들기" 버튼 클릭 → Day 2로 이동
3. "발표 대본 만들기" 클릭 → Script 생성
4. 3문장 TTS 듣기 + 녹음
5. Day 2 완료 → Day 3로 이동

---

## 🔧 추후 개선 사항

### 실제 TTS API 연동
현재는 Mock 데이터를 사용하고 있습니다. 다음을 통해 실제 TTS를 구현할 수 있습니다:
- Google Cloud Text-to-Speech API
- OpenAI TTS API
- Azure Cognitive Services Speech

### 실제 녹음 업로드
현재는 Mock URL을 사용합니다. Firebase Storage를 통해 실제 녹음 파일을 업로드해야 합니다:
```typescript
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

const audioRef = ref(storage, `showtell/audio/${audio_id}.webm`);
await uploadBytes(audioRef, audioBlob);
const storage_url = await getDownloadURL(audioRef);
```

### OpenAI GPT를 통한 Script Coach
현재는 단순히 문장을 분리하는 방식입니다. OpenAI GPT-4를 사용하면 더 자연스러운 대본 생성이 가능합니다:
```typescript
const prompt = `
당신은 ${age}살 어린이를 위한 영어 발표 코치입니다.
다음 글을 30초 발표 대본으로 만들어주세요. (3-4문장, A2 레벨)

원문:
${text}

응답 형식 (JSON):
{
  "script_30s": "...",
  "script_60s": "...",
  "keywords": ["word1", "word2", "word3"],
  "simplified_sentences": ["hard → easy"]
}
`;
```

---

## 📚 관련 문서

- [Stage 2: Show & Tell 콘텐츠 시스템](./SHOWTELL_CONTENT_SYSTEM.md)
- [Stage 4: 학습 진행 데이터](./SHOWTELL_PROGRESS_SYSTEM.md)
- [Day 1 구현 완료](./SHOWTELL_DAY1_COMPLETE.md)

---

**작성일**: 2025-12-27  
**작성자**: Cursor AI Assistant  
**상태**: ✅ Day 2 구현 완료





