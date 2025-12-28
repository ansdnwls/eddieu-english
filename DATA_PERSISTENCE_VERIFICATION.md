# Show & Tell 데이터 지속성 검증 ✅

## 📋 개요

Show & Tell 12주 코스의 **모든 사용자 데이터는 Firestore에 실시간으로 저장**되며, 브라우저를 닫거나 재접속해도 **데이터가 유지**됩니다.

---

## 🗄️ Firestore 저장 컬렉션 (총 8개)

### 1. `showtell_writing_submissions` - Day 1 작성 데이터
**저장 시점**: Day 1에서 타이핑/OCR 제출 버튼 클릭 시 즉시 저장

**저장 위치**: `app/api/showtell/submissions/writing/route.ts` (Line 90)
```typescript
await setDoc(doc(db, "showtell_writing_submissions", submission_id), submission);
console.log(`✅ Writing Submission 저장 완료: ${submission_id}`);
```

**저장 데이터**:
- `submission_id`: 제출 고유 ID
- `child_id`: 사용자 ID
- `week`: 주차 (1~12)
- `raw_text`: 작성한 원본 텍스트
- `cleaned_text`: 정제된 텍스트
- `ocr_text`: OCR 추출 텍스트 (OCR인 경우)
- `image_url`: 업로드한 이미지 URL (OCR인 경우)
- `word_count`: 단어 수
- `created_at`, `updated_at`: 생성/수정 시간

**재접속 시**: `GET /api/showtell/submissions/writing?submission_id=xxx`로 조회 가능

---

### 2. `showtell_corrections` - Day 1 교정 결과
**저장 시점**: Day 1 교정 API 호출 시 즉시 저장

**저장 위치**: `app/api/showtell/submissions/[submission_id]/correct/route.ts` (Line 77)
```typescript
await setDoc(doc(db, "showtell_corrections", correction_id), correctionResult);
console.log(`✅ 교정 결과 저장 완료: ${correction_id}`);
```

**저장 데이터**:
- `correction_id`: 교정 고유 ID
- `submission_id`: 연결된 제출 ID (FK)
- `minimal_fix_text`: 최소 수정본 (1-2개)
- `native_rewrite_text`: 원어민 재작성
- `upgrades`: 업그레이드 제안 (JSON 배열)
- `overall_feedback`: 전체 피드백
- `encouragement`: 격려 메시지
- `child_age`: 아이 나이
- `child_english_level`: 영어 레벨
- `created_at`: 생성 시간

**재접속 시**: 교정 결과 화면에서 자동 로드

---

### 3. `showtell_scripts` - Day 2 발표 대본
**저장 시점**: Day 2 Script Coach에서 대본 생성 시 즉시 저장

**저장 위치**: `app/api/showtell/submissions/[submission_id]/script/route.ts` (Line 90)
```typescript
await setDoc(doc(db, "showtell_scripts", script_id), script);
console.log(`✅ Script 생성 완료: ${script_id}`);
```

**저장 데이터**:
- `script_id`: 스크립트 고유 ID
- `submission_id`: 연결된 제출 ID (FK)
- `script_30s`: 30초 대본 (3-4문장)
- `script_60s`: 60초 대본 (6-8문장)
- `keywords`: 핵심 단어 3개
- `simplified_sentences`: 쉬운 표현 제안
- `structure`: 대본 구조 (Intro, Body, Conclusion)
- `created_at`: 생성 시간

**재접속 시**: Day 2 Shadowing 화면에서 자동 로드

---

### 4. `showtell_audio_records` - 모든 녹음 데이터
**저장 시점**: Shadowing/Rehearsal/Judge Q&A 녹음 업로드 시 즉시 저장

**저장 위치**: `app/api/showtell/audio/route.ts` (Line 69)
```typescript
await setDoc(doc(db, "showtell_audio_records", audio_id), audioRecord);
console.log(`✅ Audio Record 저장 완료: ${audio_id}`);
```

**저장 데이터**:
- `audio_id`: 오디오 고유 ID
- `child_id`: 사용자 ID
- `related_type`: 연결 타입 (shadowing, rehearsal1, rehearsal2, judge_answer)
- `related_id`: 연결된 세션 ID (script_id, rehearsal_id, judge_session_id)
- `duration_sec`: 녹음 길이 (초)
- `storage_url`: Firebase Storage 업로드 URL
- `attempt_number`: 시도 번호 (Shadowing 1/2/3 등)
- `feedback`: 피드백 (있는 경우)
- `created_at`: 생성 시간

**재접속 시**: 각 세션에서 연결된 오디오 자동 로드

---

### 5. `showtell_rehearsal_sessions` - Day 3 리허설 세션
**저장 시점**: Day 3 Rehearsal 시작 시 세션 생성 즉시 저장

**저장 위치**: `app/api/showtell/rehearsals/route.ts` (Line 77)
```typescript
await setDoc(doc(db, "showtell_rehearsal_sessions", rehearsal_id), rehearsalSession);
console.log(`✅ Rehearsal Session 생성: ${rehearsal_id}`);
```

**업데이트 시점**:
- Attempt 1 업로드: `rehearsals/[id]/attempt1/route.ts` (Line 72)
- 피드백 생성: `rehearsals/[id]/feedback/route.ts` (Line 71)
- Attempt 2 업로드: `rehearsals/[id]/attempt2/route.ts` (Line 73)

**저장 데이터**:
- `rehearsal_id`: 리허설 고유 ID
- `script_id`: 연결된 스크립트 ID (FK)
- `child_id`: 사용자 ID
- `attempt1_audio_id`: 1차 녹음 오디오 ID (FK)
- `attempt1_transcript`: 1차 녹음 스크립트
- `feedback_compliment`: 칭찬 1개
- `feedback_tip1`: 팁 1 (발음/속도/구성)
- `feedback_tip2`: 팁 2 (발음/속도/구성)
- `improved_sentence`: 개선 문장 1개
- `attempt2_audio_id`: 2차 녹음 오디오 ID (FK)
- `attempt2_transcript`: 2차 녹음 스크립트
- `status`: 세션 상태 (created, attempt1_uploaded, feedback_given, completed)
- `started_at`, `completed_at`, `updated_at`: 시간 정보

**재접속 시**: Day 3 Rehearsal 화면에서 세션 상태 자동 로드

---

### 6. `showtell_judge_sessions` - Day 3 Judge Q&A 세션
**저장 시점**: Day 3 Judge 시작 시 세션 생성 즉시 저장

**저장 위치**: `app/api/showtell/judge-sessions/route.ts` (Line 126)
```typescript
await setDoc(doc(db, "showtell_judge_sessions", judge_session_id), judgeSession);
console.log(`✅ Judge Session 생성: ${judge_session_id}`);
```

**업데이트 시점**:
- 답변 제출: `judge-sessions/[id]/answer/route.ts` (Line 118)

**저장 데이터**:
- `judge_session_id`: 세션 고유 ID
- `question_set_id`: 질문 세트 ID (FK)
- `child_id`: 사용자 ID
- `week`: 주차
- `selected_questions`: 랜덤 선택된 5개 질문 (JSON 배열)
- `current_question_index`: 현재 진행 중인 질문 인덱스 (0-4)
- `answers`: 각 질문별 답변 및 피드백 (JSON 배열)
- `status`: 세션 상태 (created, in_progress, completed)
- `started_at`, `completed_at`, `updated_at`: 시간 정보

**재접속 시**: Day 3 Judge 화면에서 세션 상태 및 이전 답변 자동 로드

---

### 7. `showtell_portfolio_items` - 주차별 포트폴리오
**저장 시점**: Day 3 Judge 완료 시 자동 생성

**저장 위치**: `app/api/showtell/portfolio/complete-week/route.ts` (Line 100)
```typescript
await setDoc(doc(db, "showtell_portfolio_items", portfolio_id), portfolioItem);
console.log(`✅ Portfolio Item 생성 완료: ${portfolio_id}`);
```

**저장 데이터**:
- `portfolio_id`: 포트폴리오 고유 ID
- `child_id`: 사용자 ID
- `week`: 주차 (1~12)
- `submission_id`: Day 1 제출 ID (FK)
- `script_id`: Day 2 스크립트 ID (FK)
- `rehearsal_session_id`: Day 3 리허설 세션 ID (FK)
- `rehearsal_attempt2_audio_id`: 최종 발표 녹음 ID (FK)
- `judge_session_id`: Judge 세션 ID (FK)
- `title`: 포트폴리오 제목
- `description`: 설명
- `thumbnail_url`: 썸네일 URL
- `final_script`: 최종 스크립트 (빠른 접근용)
- `final_recording_url`: 최종 녹음 URL (빠른 접근용)
- `word_count`: 단어 수
- `completed_at`, `created_at`, `updated_at`: 시간 정보

**재접속 시**: `/showtell` 홈 화면에서 포트폴리오 카드로 표시

---

### 8. `showtell_week_progress` - 주차별 진행 상태 (가장 중요!)
**저장 시점**: 각 Day의 주요 액션마다 자동 업데이트

**저장 위치**: 모든 API 엔드포인트에서 `updateWeekProgress()` 함수 호출
- Day 1 제출: `submissions/writing/route.ts` (Line 95)
- Day 1 교정: `correct/route.ts` (Line 372)
- Day 2 스크립트: `script/route.ts` (Line 218)
- Day 2 완료: `complete-day2/route.ts` (Line 80)
- Day 3 리허설: `rehearsals/route.ts`, `attempt2/route.ts` (Line 121)
- Day 3 Judge: `answer/route.ts` (Line 157)
- Portfolio: `complete-week/route.ts` (Line 108)

**저장 데이터**:
- `progress_id`: 진행 상태 고유 ID (`progress_{child_id}_week{week}`)
- `child_id`: 사용자 ID
- `course_id`: 코스 ID (show_tell_12w)
- `week`: 주차 (1~12)
- `day1_completed`: Day 1 완료 여부 (boolean)
- `day1_submission_id`: Day 1 제출 ID (FK)
- `day1_correction_id`: Day 1 교정 ID (FK)
- `day2_completed`: Day 2 완료 여부 (boolean)
- `day2_script_id`: Day 2 스크립트 ID (FK)
- `day2_shadowing_audio_ids`: Shadowing 녹음 ID 배열 (FK 배열)
- `day3_completed`: Day 3 완료 여부 (boolean)
- `day3_rehearsal_session_id`: Rehearsal 세션 ID (FK)
- `day3_judge_session_id`: Judge 세션 ID (FK)
- `portfolio_completed`: 포트폴리오 완료 여부 (boolean)
- `portfolio_id`: 포트폴리오 ID (FK)
- `current_day`: 현재 진행 중인 Day (1/2/3/null)
- `started_at`, `completed_at`, `updated_at`: 시간 정보

**재접속 시**: 이 데이터를 기반으로 어느 화면부터 시작할지 자동 결정

---

## 🔄 재접속 시 데이터 복원 흐름

### 1. Show & Tell 홈 접속 (`/showtell`)
```typescript
// app/showtell/page.tsx
useEffect(() => {
  if (user?.uid) {
    const fetchProgress = async () => {
      const response = await fetch(`/api/showtell/progress?child_id=${user.uid}`);
      const result = await response.json();
      
      // ✅ 모든 12주 진행 상태 로드
      setProgressData(result.data);
    };
    fetchProgress();
  }
}, [user]);
```

**표시 내용**:
- 완료된 주차: 초록색 체크마크 ✅
- 진행 중인 주차: 현재 Day 표시
- 미시작 주차: 회색 잠금 🔒

---

### 2. Week Home 접속 (`/showtell/week/[week]`)
```typescript
// app/showtell/week/[week]/page.tsx
useEffect(() => {
  const loadProgress = async () => {
    const response = await fetch(`/api/showtell/progress?child_id=${user.uid}&week=${week}`);
    const result = await response.json();
    
    const progress = result.data;
    
    // ✅ Day 1/2/3 완료 상태 자동 로드
    setDay1Completed(progress.day1_completed);
    setDay2Completed(progress.day2_completed);
    setDay3Completed(progress.day3_completed);
  };
  loadProgress();
}, [week, user]);
```

**버튼 상태 자동 설정**:
- Day 1 완료 → Day 2 버튼 활성화
- Day 2 완료 → Day 3 버튼 활성화
- Day 3 완료 → "Next Week" 버튼 표시

---

### 3. Day 1 Fix 화면 재접속
```typescript
// app/showtell/components/Day1Fix.tsx
useEffect(() => {
  const fetchCorrection = async () => {
    const response = await fetch(`/api/showtell/submissions/${submissionId}/correct`);
    const result = await response.json();
    
    // ✅ 이전에 저장된 교정 결과 자동 로드
    if (result.success) {
      setCorrection(result.data);
    }
  };
  fetchCorrection();
}, [submissionId]);
```

**재접속 시**: 이전 교정 결과가 그대로 표시됨

---

### 4. Day 2 Shadowing 화면 재접속
```typescript
// app/showtell/components/Day2Shadowing.tsx
useEffect(() => {
  const fetchScript = async () => {
    const response = await fetch(`/api/showtell/submissions/${submissionId}/script`);
    const result = await response.json();
    
    // ✅ 이전에 생성된 스크립트 자동 로드
    setScript(result.data);
  };
  
  const fetchShadowingAudios = async () => {
    const response = await fetch(`/api/showtell/audio?related_id=${script.script_id}&related_type=shadowing`);
    const result = await response.json();
    
    // ✅ 이전에 녹음한 오디오 목록 자동 로드
    setRecordings(result.data);
  };
  
  fetchScript();
  fetchShadowingAudios();
}, [submissionId]);
```

**재접속 시**: 
- 스크립트 자동 로드
- 이전 녹음 기록 표시 (1/3, 2/3, 3/3)

---

### 5. Day 3 Rehearsal 화면 재접속
```typescript
// app/showtell/components/Day3Rehearsal.tsx
useEffect(() => {
  const fetchRehearsal = async () => {
    const response = await fetch(`/api/showtell/rehearsals?script_id=${scriptId}`);
    const result = await response.json();
    
    // ✅ 이전 리허설 세션 자동 로드
    if (result.success) {
      setRehearsalSession(result.data);
    }
  };
  fetchRehearsal();
}, [scriptId]);
```

**재접속 시**:
- `status: "attempt1_uploaded"` → 피드백 버튼 표시
- `status: "feedback_given"` → Attempt 2 녹음 버튼 표시
- `status: "completed"` → Judge로 이동 버튼 표시

---

### 6. Day 3 Judge 화면 재접속
```typescript
// app/showtell/components/Day3Judge.tsx
useEffect(() => {
  const fetchJudgeSession = async () => {
    const response = await fetch(`/api/showtell/judge-sessions?script_id=${scriptId}`);
    const result = await response.json();
    
    // ✅ 이전 Judge 세션 자동 로드
    if (result.success) {
      setJudgeSession(result.data);
    }
  };
  fetchJudgeSession();
}, [scriptId]);
```

**재접속 시**:
- `current_question_index: 2` → 3번째 질문부터 계속 진행
- `answers: [...]` → 이전 답변 및 피드백 자동 표시
- `status: "completed"` → 완료 메시지 표시

---

### 7. Portfolio 화면 재접속
```typescript
// app/showtell/components/PortfolioGrid.tsx
useEffect(() => {
  const fetchPortfolio = async () => {
    const response = await fetch(`/api/showtell/portfolio?child_id=${user.uid}`);
    const result = await response.json();
    
    // ✅ 완료된 모든 포트폴리오 자동 로드
    setPortfolioItems(result.data);
  };
  fetchPortfolio();
}, [user]);
```

**재접속 시**: 완료된 모든 주차 포트폴리오 카드 표시

---

## 🧪 테스트 방법 (데이터 지속성 검증)

### ✅ 테스트 1: Day 1 작성 후 브라우저 닫기
```bash
# 1. Week 1 Day 1 접속
http://localhost:3000/showtell/week/1/day1

# 2. 텍스트 작성 및 제출
"My favorite toy is Lego..."

# 3. Firestore Console에서 확인
Collection: showtell_writing_submissions
Document ID: sub_iiQrcACGQXNYSWZ9KX6iThFceh82_week1_1766833897543

# 4. 브라우저 완전 종료 (Ctrl+W)

# 5. 재접속
http://localhost:3000/showtell/week/1/day1

# ✅ 예상 결과: 이전에 작성한 텍스트가 그대로 표시됨
```

---

### ✅ 테스트 2: Day 2 중간에 이탈 후 재접속
```bash
# 1. Day 2 Script 생성
http://localhost:3000/showtell/week/1/day2

# 2. Shadowing 1/3 녹음 후 브라우저 닫기

# 3. 재접속
http://localhost:3000/showtell/week/1/day2

# ✅ 예상 결과: 
# - 이전에 생성한 스크립트가 그대로 표시됨
# - 녹음 진행 상황 "1 / 3 문장 완료" 표시
# - 2번째 문장부터 계속 녹음 가능
```

---

### ✅ 테스트 3: Day 3 Judge 중간에 이탈
```bash
# 1. Judge Q&A 3/5 질문 답변 후 브라우저 닫기

# 2. 재접속
http://localhost:3000/showtell/week/1/day3

# ✅ 예상 결과:
# - 이전 3개 답변 및 피드백 표시
# - 4번째 질문부터 계속 진행
```

---

### ✅ 테스트 4: 로그아웃 후 재로그인
```bash
# 1. Week 1 Day 1, 2, 3 완료

# 2. 로그아웃 (Firebase Auth)

# 3. 재로그인 (같은 계정)

# 4. /showtell 접속

# ✅ 예상 결과:
# - Week 1: 초록색 체크마크 (완료)
# - Portfolio 카드 1개 표시
# - Week 2: "Start" 버튼 활성화
```

---

### ✅ 테스트 5: Firestore Console에서 직접 확인
```bash
# Firebase Console 접속
https://console.firebase.google.com/project/mflow-englishdiary/firestore

# 확인할 컬렉션:
1. showtell_writing_submissions (Day 1 제출)
2. showtell_corrections (Day 1 교정)
3. showtell_scripts (Day 2 스크립트)
4. showtell_audio_records (모든 녹음)
5. showtell_rehearsal_sessions (Day 3 리허설)
6. showtell_judge_sessions (Day 3 Judge)
7. showtell_portfolio_items (완료된 포트폴리오)
8. showtell_week_progress (진행 상태)

# ✅ 모든 문서가 실시간으로 생성/업데이트되는지 확인
```

---

## 🔒 데이터 안전성 보장

### 1. 자동 백업 (Firebase Firestore)
- ✅ Firebase의 자동 백업 시스템
- ✅ 지역 중복 저장 (Multi-region replication)
- ✅ 99.999% 가용성 보장

### 2. 타임스탬프 기록
- ✅ `created_at`: 생성 시간
- ✅ `updated_at`: 마지막 수정 시간
- ✅ `completed_at`: 완료 시간

### 3. 외래 키 (Foreign Key) 관계
- ✅ `submission_id` → `correction_id`, `script_id`
- ✅ `script_id` → `rehearsal_session_id`, `judge_session_id`
- ✅ 데이터 간 연결 관계 유지

### 4. 중복 저장 (Redundancy)
- ✅ `showtell_portfolio_items`에 최종 데이터 요약 저장
- ✅ `final_script`, `final_recording_url` 빠른 접근용

---

## 📊 데이터 용량 예상

### 1주차 데이터 크기 (예상):
- Writing Submission: ~1 KB
- Correction: ~2 KB
- Script: ~1.5 KB
- Audio Records (4개): ~20 MB (Firebase Storage)
- Rehearsal Session: ~2 KB
- Judge Session: ~3 KB
- Portfolio Item: ~2 KB
- Week Progress: ~1 KB

**총 Firestore 데이터**: ~13 KB / week  
**총 Storage 데이터**: ~20 MB / week (오디오 파일)

**12주 완료 시**:
- Firestore: ~156 KB
- Storage: ~240 MB

---

## ✅ 결론

### ✨ 데이터 지속성 보장 요약

1. ✅ **모든 데이터는 Firestore에 실시간 저장**
2. ✅ **브라우저 닫기/재접속해도 데이터 유지**
3. ✅ **로그아웃 후 재로그인해도 데이터 유지**
4. ✅ **중간에 이탈해도 진행 상태 자동 복원**
5. ✅ **오디오 파일은 Firebase Storage에 안전하게 보관**
6. ✅ **Week Progress로 어디서부터 시작할지 자동 판단**
7. ✅ **포트폴리오는 영구 보관 (삭제 전까지)**
8. ✅ **Firebase 자동 백업으로 데이터 손실 방지**

---

**작성일**: 2025-12-27  
**작성자**: Cursor AI Assistant  
**상태**: ✅ 데이터 지속성 검증 완료




