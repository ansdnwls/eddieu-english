# Writing Ladder Level 0 실행 순서 (진짜 순차)

## 🎯 목표
Writing Ladder Level 0을 **이 순서대로만 따라가면** 작동하도록 단계별 가이드 제공

**예상 소요 시간:** 30분 (시드 포함)

---

## ✅ Step 1: course_definitions에 writing_ladder_level0 추가 + catalog 노출

### 1-1. 코스 정의 확인

**파일:** `lib/courseDefinitions.ts`

**확인 사항:**
```typescript
export const COURSE_DEFINITIONS: CourseDefinition[] = [
  // ...Show & Tell...
  
  // Writing Ladder Level 0 추가 확인
  {
    course_id: "writing_ladder_level0",
    name_ko: "Writing Ladder Level 0 (문장)",
    subtitle_ko: "문장부터 탄탄하게",
    description_ko: "기초 문장 패턴을 익히고 AI와 함께 문장 단위로 글쓰기, 말하기를 연습합니다.",
    duration_weeks: 4,
    grade_bands: ["LOW", "HIGH"],
    cefr_levels: ["A1", "A2"],
    state: "AVAILABLE", // ✅ 중요: AVAILABLE로 설정
    default_weekly_routine: ["DAY1_WRITE_FIX", "DAY2_SCRIPT_SHADOW", "DAY3_REHEARSAL_JUDGE"],
    portfolio_output: ["writing", "script", "rehearsal_audio2", "judge_log"],
    thumbnail_url: "/course-thumbnails/writing_ladder_l0.png",
    deeplink: "/writingladder",
    catalog_order: 2,
  },
];
```

**검증:**
```bash
# 1. 파일 존재 확인
ls lib/courseDefinitions.ts

# 2. course_id 검색
grep -n "writing_ladder_level0" lib/courseDefinitions.ts

# 3. state 확인
grep -A 5 "writing_ladder_level0" lib/courseDefinitions.ts | grep "state"
```

**기대 출력:**
```
state: "AVAILABLE",
```

---

### 1-2. Catalog API 확인

**API:** `GET /api/v1/courses/catalog`

**테스트:**
```bash
curl http://localhost:3002/api/v1/courses/catalog
```

**기대 응답:**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "course_id": "show_tell_12w",
        "name_ko": "Show & Tell (12주)",
        "state": "AVAILABLE"
      },
      {
        "course_id": "writing_ladder_level0",
        "name_ko": "Writing Ladder Level 0 (문장)",
        "state": "AVAILABLE" // ✅ 여기 확인
      }
    ]
  }
}
```

**검증 포인트:**
- ✅ `writing_ladder_level0`이 목록에 포함됨
- ✅ `state: "AVAILABLE"`
- ✅ `name_ko: "Writing Ladder Level 0 (문장)"`

---

### 1-3. 코스 홈 UI 확인

**URL:** `http://localhost:3002/courses`

**확인 사항:**
1. "전체 코스" 탭 클릭
2. "Writing Ladder Level 0 (문장)" 카드 표시 확인
3. "문장부터 탄탄하게" 부제 확인
4. "코스 시작하기" 버튼 활성화 확인

**스크린샷 체크리스트:**
- [ ] 카드가 표시됨
- [ ] 제목과 부제가 정확함
- [ ] 버튼이 클릭 가능함

---

## ✅ Step 2: 코스 시작 API로 course_instance 생성 가능하게 연결

### 2-1. 코스 시작 API 테스트

**API:** `POST /api/v1/courses/start`

**테스트 (cURL):**
```bash
curl -X POST http://localhost:3002/api/v1/courses/start \
  -H "Content-Type: application/json" \
  -d '{
    "child_id": "test_child_123",
    "course_id": "writing_ladder_level0",
    "grade_band": "LOW",
    "cefr_level": "A1"
  }'
```

**기대 응답:**
```json
{
  "success": true,
  "message": "Course started successfully",
  "data": {
    "course_instance_id": "ci_test_child_123_writing_ladder_level0_...",
    "course_id": "writing_ladder_level0",
    "status": "ACTIVE",
    "current_week": 1,
    "redirect_url": "/writingladder/week/1/day1"
  }
}
```

**검증 포인트:**
- ✅ `success: true`
- ✅ `course_instance_id` 생성됨
- ✅ `current_week: 1`
- ✅ `redirect_url` 정확함

---

### 2-2. Firestore에서 course_instance 확인

**Firestore Console 접속:**
1. Firebase Console → Firestore Database
2. `course_instances` 컬렉션 선택
3. 방금 생성된 문서 찾기 (child_id로 검색)

**확인 사항:**
```javascript
{
  course_instance_id: "ci_test_child_123_writing_ladder_level0_...",
  child_id: "test_child_123",
  course_id: "writing_ladder_level0",
  grade_band: "LOW",
  cefr_level: "A1",
  status: "ACTIVE",
  current_week: 1,
  created_at: "2025-12-28T...",
  updated_at: "2025-12-28T..."
}
```

**검증 포인트:**
- ✅ 문서가 생성됨
- ✅ 모든 필드가 정확함
- ✅ `status: "ACTIVE"`

---

### 2-3. 코스 홈에서 "시작하기" 버튼 클릭 테스트

**수동 테스트:**
1. `http://localhost:3002/courses` 접속
2. "Writing Ladder Level 0" 카드의 "코스 시작하기" 버튼 클릭
3. `/writingladder/week/1/day1`로 리다이렉트 확인

**기대 결과:**
- ✅ 버튼 클릭 시 로딩 표시
- ✅ `/writingladder/week/1/day1`로 이동
- ✅ 오류 없이 페이지 로딩

---

## ✅ Step 3: Writing Ladder Level0용 시드 데이터 삽입

### 3-1. 시드 파일 확인

**확인할 파일:**
```bash
ls seed/writingladder/level0_topics.json
ls seed/writingladder/level0_judge_questions.json
ls seed/writingladder/level0_content_packs.json
```

**기대 출력:**
```
seed/writingladder/level0_topics.json (4개 토픽)
seed/writingladder/level0_judge_questions.json (4개 질문셋)
seed/writingladder/level0_content_packs.json (4주차 콘텐츠)
```

---

### 3-2. 시드 스크립트 실행

**명령어:**
```bash
npm run seed-writingladder-level0
```

**또는:**
```bash
node scripts/seed-writingladder-level0.js
```

**기대 출력:**
```
🚀 Writing Ladder Level 0 콘텐츠 시드 시작
================================================

=== Writing Ladder Level 0 Topics 시드 시작 ===
✅ Topic 추가: wl0.topic.likes (Week 1: Things I Like)
✅ Topic 추가: wl0.topic.can_have (Week 2: I Can / I Have)
✅ Topic 추가: wl0.topic.describe_place (Week 3: Describe a Place)
✅ Topic 추가: wl0.topic.past_mini (Week 4: Last Weekend)

✅ Topics 시드 완료: 4개 추가

=== Writing Ladder Level 0 Judge Questions 시드 시작 ===
✅ Judge Questions 추가: wl0.jq.likes.v1 (Week 1, 10문항)
✅ Judge Questions 추가: wl0.jq.can_have.v1 (Week 2, 10문항)
✅ Judge Questions 추가: wl0.jq.describe_place.v1 (Week 3, 10문항)
✅ Judge Questions 추가: wl0.jq.past_mini.v1 (Week 4, 10문항)

✅ Judge Questions 시드 완료: 4개 추가

=== Writing Ladder Level 0 Content Packs 시드 시작 ===
✅ Content Pack 추가: cp_wl0_w1 (Week 1: Week 1: Things I Like)
✅ Content Pack 추가: cp_wl0_w2 (Week 2: Week 2: I Can / I Have)
✅ Content Pack 추가: cp_wl0_w3 (Week 3: Week 3: Describe a Place)
✅ Content Pack 추가: cp_wl0_w4 (Week 4: Week 4: Last Weekend)

✅ Content Packs 시드 완료: 4개 추가

================================================
🎉 Writing Ladder Level 0 콘텐츠 시드 완료!
```

---

### 3-3. Firestore에서 시드 데이터 확인

**Firestore Console:**

**1) writingladder_topics 컬렉션:**
- [ ] `wl0.topic.likes` (Week 1)
- [ ] `wl0.topic.can_have` (Week 2)
- [ ] `wl0.topic.describe_place` (Week 3)
- [ ] `wl0.topic.past_mini` (Week 4)

**2) writingladder_judge_questions 컬렉션:**
- [ ] `wl0.jq.likes.v1` (10문항)
- [ ] `wl0.jq.can_have.v1` (10문항)
- [ ] `wl0.jq.describe_place.v1` (10문항)
- [ ] `wl0.jq.past_mini.v1` (10문항)

**3) writingladder_content_packs 컬렉션:**
- [ ] `cp_wl0_w1` (Week 1 콘텐츠)
- [ ] `cp_wl0_w2` (Week 2 콘텐츠)
- [ ] `cp_wl0_w3` (Week 3 콘텐츠)
- [ ] `cp_wl0_w4` (Week 4 콘텐츠)

**검증 포인트:**
- ✅ 총 12개 문서 생성됨 (4+4+4)
- ✅ 각 문서의 필드가 완전함

---

## ✅ Step 4: Week 조회 API 테스트

### 4-1. Week 1 콘텐츠 조회

**API:** `GET /api/v1/courses/writing_ladder_level0/weeks/1`

**테스트:**
```bash
curl http://localhost:3002/api/v1/courses/writing_ladder_level0/weeks/1
```

**기대 응답:**
```json
{
  "success": true,
  "data": {
    "content_pack": {
      "content_pack_id": "cp_wl0_w1",
      "week": 1,
      "json": {
        "title": "Week 1: Things I Like",
        "day1": { ... },
        "day2": { ... },
        "day3": { ... }
      }
    },
    "topic": {
      "topic_id": "wl0.topic.likes",
      "week": 1,
      "title_ko": "내가 좋아하는 것",
      "title_en": "Things I Like"
    },
    "judge_question_set": {
      "question_set_id": "wl0.jq.likes.v1",
      "week": 1,
      "json": {
        "n_total": 10,
        "questions": [ ... ]
      }
    }
  }
}
```

**검증 포인트:**
- ✅ `success: true`
- ✅ `content_pack` 존재
- ✅ `topic` 존재
- ✅ `judge_question_set` 존재

---

### 4-2. Week 2-4 콘텐츠 조회

**테스트:**
```bash
curl http://localhost:3002/api/v1/courses/writing_ladder_level0/weeks/2
curl http://localhost:3002/api/v1/courses/writing_ladder_level0/weeks/3
curl http://localhost:3002/api/v1/courses/writing_ladder_level0/weeks/4
```

**검증 포인트:**
- ✅ 모든 주차가 `success: true` 반환
- ✅ Week 2: "I Can / I Have"
- ✅ Week 3: "Describe a Place"
- ✅ Week 4: "Last Weekend"

---

## ✅ Step 5: Day1/2/3 기존 엔진 연결 (Show & Tell 재사용)

### 5-1. Day 1 (Write + Fix) 테스트

#### 5-1-1. Writing Submission 생성

**API:** `POST /api/writingladder/submissions/writing`

**테스트:**
```bash
curl -X POST http://localhost:3002/api/writingladder/submissions/writing \
  -H "Content-Type: application/json" \
  -d '{
    "child_id": "test_child_123",
    "week": 1,
    "input_method": "typing",
    "raw_text": "I like drawing. I like it because it is fun. I feel happy when I draw.",
    "grade_band": "LOW",
    "cefr_level": "A1"
  }'
```

**기대 응답:**
```json
{
  "success": true,
  "data": {
    "submission_id": "wl_sub_test_child_123_week1_...",
    "rubric_result": {
      "sentences_count": 3,
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

**검증 포인트:**
- ✅ `success: true`
- ✅ `submission_id` 생성됨
- ✅ `rubric_result.pass: true`
- ✅ `required_patterns` 모두 true

---

#### 5-1-2. Correction (교정) 실행

**API:** `POST /api/writingladder/submissions/{submission_id}/correct`

**테스트:**
```bash
curl -X POST http://localhost:3002/api/writingladder/submissions/wl_sub_test_child_123_week1_.../correct \
  -H "Content-Type: application/json" \
  -d '{
    "correction_level": "minimal"
  }'
```

**기대 응답:**
```json
{
  "success": true,
  "data": {
    "correction_id": "corr_wl_sub_...",
    "minimal_fix_text": "I like drawing. I like it because it is fun. I feel happy when I draw.",
    "upgrades": [
      {
        "before": "I like it because it is fun.",
        "after": "I like it because it's fun.",
        "category": "grammar",
        "explanation_ko": "축약형을 사용하면 더 자연스러워요"
      }
    ]
  }
}
```

**검증 포인트:**
- ✅ `success: true`
- ✅ `upgrades.length <= 2` (교정 최대 2개 제한 확인) ⭐
- ✅ `explanation_ko`가 한국어로 제공됨

---

### 5-2. Day 2 (Script + Shadowing) 테스트

#### 5-2-1. Script 생성

**API:** `POST /api/writingladder/submissions/{submission_id}/script`

**테스트:**
```bash
curl -X POST http://localhost:3002/api/writingladder/submissions/wl_sub_test_child_123_week1_.../script \
  -H "Content-Type: application/json"
```

**기대 응답:**
```json
{
  "success": true,
  "data": {
    "script_id": "script_wl_sub_...",
    "script_30s": "I like drawing. I like it because it's fun. I feel happy when I draw.",
    "script_60s": null,
    "keywords": ["drawing", "fun", "happy"],
    "shadowing_sentences": [
      "I like drawing.",
      "I like it because it's fun.",
      "I feel happy when I draw."
    ]
  }
}
```

**검증 포인트:**
- ✅ `success: true`
- ✅ `script_30s` 문장 수: 2-3개 (LOW/A1 규칙) ⭐
- ✅ `script_60s: null` (LOW는 60초 비활성) ⭐
- ✅ `shadowing_sentences.length === 3`

---

#### 5-2-2. TTS 생성 (캐시 확인)

**API:** `POST /api/showtell/tts`

**1차 호출 (캐시 없음):**
```bash
curl -X POST http://localhost:3002/api/showtell/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I like drawing.",
    "voice": "en-US-Standard-C"
  }'
```

**기대 응답:**
```json
{
  "success": true,
  "data": {
    "audio_url": "https://storage.googleapis.com/.../tts_...",
    "duration_seconds": 1.5,
    "cached": false
  }
}
```

**2차 호출 (캐시 적중):**
```bash
# 동일한 text로 다시 호출
curl -X POST http://localhost:3002/api/showtell/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I like drawing.",
    "voice": "en-US-Standard-C"
  }'
```

**기대 응답:**
```json
{
  "success": true,
  "data": {
    "audio_url": "https://storage.googleapis.com/.../tts_...",
    "duration_seconds": 1.5,
    "cached": true // ✅ 캐시 적중 확인
  }
}
```

**검증 포인트:**
- ✅ 1차: `cached: false`
- ✅ 2차: `cached: true` (TTS 캐시 작동 확인) ⭐
- ✅ 동일한 `audio_url` 반환

---

### 5-3. Day 3 (Rehearsal + Judge) 테스트

#### 5-3-1. Rehearsal 세션 생성

**API:** `POST /api/writingladder/rehearsals`

**테스트:**
```bash
curl -X POST http://localhost:3002/api/writingladder/rehearsals \
  -H "Content-Type: application/json" \
  -d '{
    "script_id": "script_wl_sub_...",
    "child_id": "test_child_123"
  }'
```

**기대 응답:**
```json
{
  "success": true,
  "data": {
    "rehearsal_id": "rehearsal_script_...",
    "script_id": "script_wl_sub_...",
    "max_attempts": 2,
    "current_attempt": 0
  }
}
```

**검증 포인트:**
- ✅ `success: true`
- ✅ `max_attempts: 2` (Level 0 규칙)

---

#### 5-3-2. Judge 세션 생성

**API:** `POST /api/writingladder/judge-sessions`

**테스트:**
```bash
curl -X POST http://localhost:3002/api/writingladder/judge-sessions \
  -H "Content-Type: application/json" \
  -d '{
    "child_id": "test_child_123",
    "script_id": "script_wl_sub_...",
    "question_set_id": "wl0.jq.likes.v1",
    "n_questions": 3
  }'
```

**기대 응답:**
```json
{
  "success": true,
  "data": {
    "judge_session_id": "judge_session_...",
    "selected_questions": [
      { "question_id": "q1", "text": "What do you like?" },
      { "question_id": "q2", "text": "Why do you like it?" },
      { "question_id": "q5", "text": "Who do you do it with?" }
    ]
  }
}
```

**검증 포인트:**
- ✅ `success: true`
- ✅ `selected_questions.length === 3` (LOW는 3문항)
- ✅ 10문항 중 랜덤 3개 선택됨

---

## ✅ Step 6: 루브릭 자동 체크 + 최소 UI 배지

### 6-1. 루브릭 결과 확인

**Firestore에서 Submission 문서 확인:**

```javascript
{
  submission_id: "wl_sub_test_child_123_week1_...",
  // ...
  rubric_result: {
    sentences_count: 3,
    min_sentences_required: 3,
    max_sentences_required: 5,
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

**검증 포인트:**
- ✅ `rubric_result` 필드 존재
- ✅ `pass: true`
- ✅ `issues: []` (문제 없음)

---

### 6-2. UI 배지 데이터 생성 (선택사항)

**코드 예시:**
```typescript
import { rubricToBadges } from '@/lib/rubricValidator';

const badges = rubricToBadges(submission.rubric_result);

// 결과:
// [
//   { label: "문장 수: 3개", status: "pass", icon: "✅" },
//   { label: "필수 패턴", status: "pass", icon: "✅" },
//   { label: "검증 통과", status: "pass", icon: "🎉" }
// ]
```

**UI 표시 (간단한 예시):**
```tsx
<div className="flex gap-2">
  {badges.map((badge, index) => (
    <span key={index} className={`badge ${badge.status}`}>
      {badge.icon} {badge.label}
    </span>
  ))}
</div>
```

**검증 포인트:**
- ✅ 배지 데이터 생성 성공
- ✅ 3개 배지 표시 (문장 수, 필수 패턴, 검증 통과)

---

## ✅ Step 7: Portfolio 카드 생성 확인

### 7-1. Portfolio 생성

**API:** `POST /api/writingladder/portfolio`

**테스트:**
```bash
curl -X POST http://localhost:3002/api/writingladder/portfolio \
  -H "Content-Type: application/json" \
  -d '{
    "child_id": "test_child_123",
    "week": 1,
    "submission_id": "wl_sub_test_child_123_week1_...",
    "script_id": "script_wl_sub_...",
    "rehearsal_session_id": "rehearsal_script_...",
    "rehearsal_attempt2_audio_id": "audio_...",
    "judge_session_id": "judge_session_...",
    "title": "Week 1: Things I Like",
    "description": "My first Writing Ladder portfolio!"
  }'
```

**기대 응답:**
```json
{
  "success": true,
  "data": {
    "portfolio_id": "portfolio_test_child_123_week1_...",
    "title": "Week 1: Things I Like",
    "final_script": "I like drawing. I like it because it's fun. I feel happy when I draw.",
    "final_recording_url": "https://storage.googleapis.com/.../audio_..."
  }
}
```

**검증 포인트:**
- ✅ `success: true`
- ✅ `portfolio_id` 생성됨
- ✅ `final_script` 저장됨
- ✅ `final_recording_url` 존재

---

### 7-2. Firestore에서 Portfolio 확인

**Firestore Console:**
- `writingladder_portfolios` 컬렉션 선택
- `portfolio_test_child_123_week1_...` 문서 확인

**확인 사항:**
```javascript
{
  portfolio_id: "portfolio_test_child_123_week1_...",
  child_id: "test_child_123",
  course_id: "writing_ladder_level0",
  week: 1,
  submission_id: "wl_sub_...",
  script_id: "script_...",
  rehearsal_session_id: "rehearsal_...",
  judge_session_id: "judge_...",
  title: "Week 1: Things I Like",
  final_script: "I like drawing...",
  final_recording_url: "https://...",
  completed_at: "2025-12-28T...",
  created_at: "2025-12-28T..."
}
```

**검증 포인트:**
- ✅ 문서 생성 완료
- ✅ 모든 FK(Foreign Key) 정확함

---

### 7-3. Portfolio 카드 UI 확인

**URL:** `http://localhost:3002/writingladder`

**확인 사항:**
- [ ] "Week 1: Things I Like" 카드 표시
- [ ] 카드 클릭 시 상세 페이지 이동
- [ ] Final Script 표시
- [ ] Final Recording 재생 가능

---

## ✅ Step 8: QA - Week 1~4 완주 (특히 교정 2개 제한, TTS 캐시)

### 8-1. Week 1 완전 테스트

**Day 1:**
1. ✅ Submission 생성 (루브릭 검증 pass)
2. ✅ Correction 생성 (교정 최대 2개 ⭐)

**Day 2:**
1. ✅ Script 생성 (30초, 2-3문장 ⭐)
2. ✅ TTS 생성 (3문장, 캐시 확인 ⭐)
3. ✅ Shadowing 3문장

**Day 3:**
1. ✅ Rehearsal (2회 시도)
2. ✅ Judge (3문항 랜덤)
3. ✅ Portfolio 생성

---

### 8-2. Week 2-4 반복 테스트

**Week 2: I Can / I Have**
- [ ] Day 1-3 완주
- [ ] 루브릭: "I can", "I have" 패턴 확인
- [ ] 교정 2개 제한 확인

**Week 3: Describe a Place**
- [ ] Day 1-3 완주
- [ ] 루브릭: "There is", "There are" 패턴 확인
- [ ] 교정 2개 제한 확인

**Week 4: Last Weekend**
- [ ] Day 1-3 완주
- [ ] 루브릭: "went", "played", "ate", "was" 패턴 확인
- [ ] 교정 2개 제한 확인

---

### 8-3. 중요 검증 포인트 (재확인)

**1) 교정 2개 제한:**
```bash
# Correction API 응답에서 확인
curl -X POST http://localhost:3002/api/writingladder/submissions/{submission_id}/correct \
  -H "Content-Type: application/json" \
  -d '{"correction_level": "minimal"}'

# 응답에서 upgrades.length <= 2 확인
```

**2) TTS 캐시:**
```bash
# 1차 호출
curl -X POST http://localhost:3002/api/showtell/tts \
  -d '{"text": "I like drawing.", "voice": "en-US-Standard-C"}'
# 응답: cached: false

# 2차 호출 (동일 text)
curl -X POST http://localhost:3002/api/showtell/tts \
  -d '{"text": "I like drawing.", "voice": "en-US-Standard-C"}'
# 응답: cached: true ✅
```

**3) 스타일 가이드 (LOW/A1):**
- 30초 스크립트: 2-3문장
- 문장당 최대 6단어
- 60초 비활성

**4) 루브릭 검증:**
- 문장 수: 3-5개
- 필수 패턴 포함
- PII 위험 없음

---

## 📋 최종 체크리스트

### ✅ Step 1: 코스 정의
- [ ] `lib/courseDefinitions.ts`에 `writing_ladder_level0` 존재
- [ ] `state: "AVAILABLE"`
- [ ] Catalog API에서 조회 가능
- [ ] 코스 홈 UI에 카드 표시

### ✅ Step 2: 코스 시작
- [ ] 코스 시작 API 호출 성공
- [ ] `course_instance` Firestore에 생성됨
- [ ] "코스 시작하기" 버튼 작동

### ✅ Step 3: 시드 데이터
- [ ] 시드 스크립트 실행 성공
- [ ] Topics 4개 생성됨
- [ ] Judge Questions 4개 생성됨
- [ ] Content Packs 4개 생성됨

### ✅ Step 4: Week 조회 API
- [ ] Week 1-4 모두 조회 가능
- [ ] `content_pack`, `topic`, `judge_question_set` 모두 반환

### ✅ Step 5: Day 1-3 테스트
- [ ] Day 1: Submission + Correction (교정 2개 제한 ✅)
- [ ] Day 2: Script + TTS (캐시 작동 ✅)
- [ ] Day 3: Rehearsal + Judge

### ✅ Step 6: 루브릭
- [ ] 루브릭 결과 Firestore에 저장됨
- [ ] UI 배지 데이터 생성 가능

### ✅ Step 7: Portfolio
- [ ] Portfolio 생성 성공
- [ ] Firestore에 저장됨
- [ ] UI에 카드 표시

### ✅ Step 8: QA
- [ ] Week 1 완전히 완주
- [ ] Week 2-4 반복 테스트
- [ ] 교정 2개 제한 확인 ✅
- [ ] TTS 캐시 작동 확인 ✅

---

## 🎉 완료!

**모든 Step을 순차적으로 완료하면 Writing Ladder Level 0이 정상 작동합니다!**

**예상 소요 시간:**
- Step 1-3: 10분 (설정 및 시드)
- Step 4-5: 10분 (API 테스트)
- Step 6-7: 5분 (루브릭 및 Portfolio)
- Step 8: 5분 (QA)
- **총: 30분**

**다음 작업:**
- Level 0 프로덕션 배포
- Level 1 개발 시작

---

**작성 완료 일시:** 2025년 12월 28일  
**작성자:** Cursor AI + User


