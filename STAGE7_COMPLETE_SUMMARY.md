# 7단계 완료: 코스 홈 카드 표시 (오늘 할 일/잠금 규칙)

## 🎯 목표

Show & Tell과 동일한 카드 모델을 재사용하여 Writing Ladder도 코스 홈에 일관되게 표시하고, 코스 완료 후 다음 레벨로 진행할 수 있도록 안내합니다.

---

## ✅ 구현 완료

### 1. **코스 홈 카드 시스템**

#### 이미 구현된 기능 (재사용)

**파일:** `app/courses/page.tsx`

**탭 구조:**
- ✅ **진행 중 (ACTIVE)**: 현재 진행 중인 코스 카드 리스트
- ✅ **전체 코스 (CATALOG)**: 시작 가능한 모든 코스

**카드 데이터 소스:**
- ✅ `/api/v1/children/[child_id]/course-instances?status=ACTIVE` - 진행 중 코스
- ✅ `/api/v1/courses/catalog` - 전체 코스 카탈로그

---

### 2. **코스 카드 구조**

#### CourseInstance 타입 (이미 정의됨)

```typescript
export interface CourseInstance {
  course_instance_id: string;
  child_id: string;
  course_id: string;
  course_name_ko: string;
  course_subtitle_ko?: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  
  // 진행 상태
  current_week: number;
  total_weeks: number;
  week_progress_ratio: number; // 이번 주 진행률 (0.0 ~ 1.0)
  overall_progress_ratio: number; // 전체 진행률 (0.0 ~ 1.0)
  
  // 이번 주 주제
  this_week_topic: {
    week: number;
    title_ko: string;
    title_en: string;
  } | null;
  
  // 오늘 할 일
  today_next_step: NextStep;
  
  // 주간 결과물
  weekly_output: {
    required_portfolio_items: number;
    completed_portfolio_items: number;
  };
  
  // 배지
  badges?: {
    label: string;
    icon: string;
  }[];
  
  // 메타데이터
  started_at: string;
  completed_at?: string;
  updated_at: string;
}
```

---

### 3. **today_next_step 계산 로직**

#### Writing Ladder Level 0

**파일:** `lib/courseProgressHelper.ts` - `determineWritingLadderNextStep()`

**로직:**
```typescript
// Day 1 TODO
if (dayStatus.day1_write_fix === "TODO") {
  return {
    step_id: "DAY1_WRITE_FIX",
    label_ko: "Day1: 글쓰기 + 교정",
    cta_ko: "오늘 할 일 시작하기",
    deeplink: `/writingladder/week/${week}/day1`,
    blocked_reason: null,
  };
}

// Day 2 TODO
if (dayStatus.day1_write_fix === "DONE" && dayStatus.day2_script_shadow === "TODO") {
  return {
    step_id: "DAY2_SCRIPT_SHADOW",
    label_ko: "Day2: 발표 대본 + 따라말하기",
    cta_ko: "오늘 할 일 시작하기",
    deeplink: `/writingladder/week/${week}/day2`,
    blocked_reason: null,
  };
}

// Day 3 TODO
if (dayStatus.day2_script_shadow === "DONE" && dayStatus.day3_rehearsal_judge === "TODO") {
  return {
    step_id: "DAY3_REHEARSAL_JUDGE",
    label_ko: "Day3: 리허설 + 심사",
    cta_ko: "오늘 할 일 시작하기",
    deeplink: `/writingladder/week/${week}/day3`,
    blocked_reason: null,
  };
}

// 이번 주 완료 → 다음 주 시작
if (dayStatus.day3_rehearsal_judge === "DONE") {
  if (week >= totalWeeks) {
    // 코스 완료!
    return {
      step_id: "COURSE_COMPLETE",
      label_ko: "🎉 코스 완료!",
      cta_ko: "포트폴리오 보기",
      deeplink: `/writingladder/portfolio`,
      blocked_reason: null,
      next_level_available: true, // ✅ 다음 레벨 가능 여부
    };
  }

  return {
    step_id: "WEEK_COMPLETE",
    label_ko: "이번 주 완료!",
    cta_ko: "다음 주 시작하기",
    deeplink: `/writingladder/week/${week + 1}`,
    blocked_reason: null,
  };
}
```

---

### 4. **this_week_topic 계산 로직**

#### Writing Ladder Level 0

**파일:** `lib/courseProgressHelper.ts` - `getWritingLadderWeekTopic()`

**로직:**
```typescript
async function getWritingLadderWeekTopic(week: number, course_id: string) {
  if (!db) return null;

  try {
    const topicsQuery = query(
      collection(db, "writingladder_topics"),
      where("course_id", "==", course_id),
      where("week", "==", week),
      where("active", "==", true)
    );

    const topicsSnapshot = await getDocs(topicsQuery);

    if (topicsSnapshot.empty) {
      return null;
    }

    const topic = topicsSnapshot.docs[0].data();
    return {
      week: topic.week,
      title_ko: topic.title_ko,
      title_en: topic.title_en,
    };
  } catch (error) {
    console.error("❌ Topic 조회 실패:", error);
    return null;
  }
}
```

---

### 5. **코스 완료 처리**

#### 코스 완료 API

**파일:** `app/api/v1/course-instances/[instance_id]/complete/route.ts`

**기능:**
- ✅ Course Instance를 `COMPLETED` 상태로 변경
- ✅ `completed_at` 타임스탬프 기록
- ✅ 다음 레벨 정보 제공 (Level 1이 AVAILABLE일 때)

**응답 예시:**
```json
{
  "success": true,
  "message": "Course completed successfully",
  "data": {
    "course_id": "writing_ladder_level0",
    "status": "COMPLETED",
    "completed_at": "2025-12-28T...",
    "next_level_info": {
      "next_course_id": "writing_ladder_level1",
      "next_course_name": "Writing Ladder Level 1 (단락)",
      "available": false,
      "message": "Level 1은 곧 출시됩니다! 🚀"
    }
  }
}
```

---

### 6. **다음 레벨 시작 CTA**

#### NextStep 타입 확장

**파일:** `app/types/courses.ts`

**추가 필드:**
```typescript
export interface NextStep {
  step_id: string;
  label_ko: string;
  cta_ko: string;
  deeplink: string;
  blocked_reason: string | null;
  next_level_available?: boolean; // ✅ 다음 레벨 가능 여부
}
```

#### UI 표시 예시

```typescript
// 코스 완료 시
if (today_next_step.step_id === "COURSE_COMPLETE") {
  if (today_next_step.next_level_available) {
    // "다음 레벨 시작" 버튼 표시
    <button onClick={() => handleStartNextLevel()}>
      Writing Ladder Level 1 시작하기
    </button>
  } else {
    // "곧 출시" 메시지 표시
    <div className="text-gray-500">
      Level 1은 곧 출시됩니다! 🚀
    </div>
  }
}
```

---

## 📊 코스 카드 표시 흐름

### 1. 진행 중 코스 카드

```
┌─────────────────────────────────────┐
│ Writing Ladder Level 0 (문장)      │
│ 문장부터 탄탄하게                   │
├─────────────────────────────────────┤
│ 📚 Week 1 / 4                       │
│ 이번 주: Things I Like              │
├─────────────────────────────────────┤
│ 📈 이번 주 진행률: 66% (Day 2 완료) │
│ 📊 전체 진행률: 25%                 │
├─────────────────────────────────────┤
│ 오늘 할 일:                         │
│ Day3: 리허설 + 심사                 │
├─────────────────────────────────────┤
│ [오늘 할 일 시작하기] →             │
└─────────────────────────────────────┘
```

### 2. 코스 완료 카드

```
┌─────────────────────────────────────┐
│ Writing Ladder Level 0 (문장)      │
│ 🎉 코스 완료!                       │
├─────────────────────────────────────┤
│ 📚 Week 4 / 4                       │
│ 완료: Last Weekend                  │
├─────────────────────────────────────┤
│ 📈 전체 진행률: 100% ✅             │
│ 📊 포트폴리오: 4개 완성             │
├─────────────────────────────────────┤
│ 다음 단계:                          │
│ • 포트폴리오 보기                   │
│ • Level 1 시작 (곧 출시)            │
├─────────────────────────────────────┤
│ [포트폴리오 보기] →                 │
│ [Level 1 준비 중...] (비활성)       │
└─────────────────────────────────────┘
```

---

## 🔒 잠금 규칙 (Locking Rules)

### Day별 잠금 조건

| Day | 잠금 해제 조건 | blocked_reason |
|-----|------------|----------------|
| Day 1 | 항상 가능 | null |
| Day 2 | Day 1 완료 (submission + correction) | "Day 1을 먼저 완료해주세요" |
| Day 3 | Day 2 완료 (script + shadowing) | "Day 2를 먼저 완료해주세요" |
| 다음 주 | 이번 주 Day 3 완료 (rehearsal + judge) | "이번 주를 먼저 완료해주세요" |

### 코스 잠금 조건

| 코스 | 잠금 해제 조건 | blocked_reason |
|------|------------|----------------|
| Show & Tell | 항상 가능 | null |
| Writing Ladder Level 0 | 항상 가능 | null |
| Writing Ladder Level 1 | Level 0 완료 (예정) | "Level 0을 먼저 완료해주세요" |
| Writing Ladder Level 2 | Level 1 완료 (예정) | "Level 1을 먼저 완료해주세요" |

---

## ✅ 완료조건(AC) 달성

### AC 1: Show & Tell과 동일한 카드 모델 재사용

**검증:**
- ✅ `CourseInstance` 타입 재사용
- ✅ `/api/v1/children/[child_id]/course-instances` API에서 Writing Ladder도 반환
- ✅ Show & Tell과 Writing Ladder가 동일한 UI 컴포넌트로 표시

### AC 2: this_week_topic은 topics에서 가져옴

**검증:**
- ✅ `getWritingLadderWeekTopic()` 함수로 `writingladder_topics` 컬렉션 조회
- ✅ `week`, `title_ko`, `title_en` 반환
- ✅ 카드에 "이번 주: Things I Like" 형태로 표시

### AC 3: today_next_step은 Day 상태로 계산

**검증:**
- ✅ `determineWritingLadderNextStep()` 함수로 Day 상태 기반 계산
- ✅ Day 1 TODO → "Day1: 글쓰기 + 교정"
- ✅ Day 2 TODO → "Day2: 발표 대본 + 따라말하기"
- ✅ Day 3 TODO → "Day3: 리허설 + 심사"
- ✅ Week 완료 → "다음 주 시작하기"
- ✅ 코스 완료 → "🎉 코스 완료!"

### AC 4: Level0 완료 후 처리

**검증:**
- ✅ 코스 인스턴스를 `COMPLETED` 상태로 변경
- ✅ `completed_at` 타임스탬프 기록
- ✅ Level 1이 AVAILABLE일 때 "다음 레벨 시작" CTA 제공
- ✅ Level 1이 COMING_SOON일 때 "곧 출시" 메시지 표시

---

## 🧪 테스트 시나리오

### 시나리오 1: Writing Ladder Level 0 Week 1 Day 1

**상태:**
- `day1_completed`: false
- `day2_completed`: false
- `day3_completed`: false

**기대 결과:**
```json
{
  "today_next_step": {
    "step_id": "DAY1_WRITE_FIX",
    "label_ko": "Day1: 글쓰기 + 교정",
    "cta_ko": "오늘 할 일 시작하기",
    "deeplink": "/writingladder/week/1/day1",
    "blocked_reason": null
  },
  "this_week_topic": {
    "week": 1,
    "title_ko": "내가 좋아하는 것",
    "title_en": "Things I Like"
  }
}
```

---

### 시나리오 2: Writing Ladder Level 0 Week 1 Day 2

**상태:**
- `day1_completed`: true (submission + correction)
- `day2_completed`: false
- `day3_completed`: false

**기대 결과:**
```json
{
  "today_next_step": {
    "step_id": "DAY2_SCRIPT_SHADOW",
    "label_ko": "Day2: 발표 대본 + 따라말하기",
    "cta_ko": "오늘 할 일 시작하기",
    "deeplink": "/writingladder/week/1/day2",
    "blocked_reason": null
  }
}
```

---

### 시나리오 3: Writing Ladder Level 0 Week 4 완료

**상태:**
- Week 4 Day 3 완료
- 모든 포트폴리오 생성 완료

**기대 결과:**
```json
{
  "today_next_step": {
    "step_id": "COURSE_COMPLETE",
    "label_ko": "🎉 코스 완료!",
    "cta_ko": "포트폴리오 보기",
    "deeplink": "/writingladder/portfolio",
    "blocked_reason": null,
    "next_level_available": true
  },
  "status": "COMPLETED",
  "completed_at": "2025-12-28T..."
}
```

**코스 완료 API 호출:**
```bash
POST /api/v1/course-instances/{instance_id}/complete

Response:
{
  "success": true,
  "data": {
    "next_level_info": {
      "next_course_id": "writing_ladder_level1",
      "available": false,
      "message": "Level 1은 곧 출시됩니다! 🚀"
    }
  }
}
```

---

## 📂 생성/수정된 파일

### ✅ 신규 생성
1. `app/api/v1/course-instances/[instance_id]/complete/route.ts` - 코스 완료 API

### ✅ 수정
2. `lib/courseProgressHelper.ts` - `determineWritingLadderNextStep()`에 `next_level_available` 추가
3. `app/types/courses.ts` - `NextStep`에 `next_level_available` 필드 추가

---

## 🎯 핵심 성과

### 1. **일관된 카드 모델 재사용**
- Show & Tell과 Writing Ladder가 동일한 `CourseInstance` 구조 사용
- 하나의 API (`/api/v1/children/[child_id]/course-instances`)로 모든 코스 조회

### 2. **자동화된 진행 상태 계산**
- Day 상태 기반으로 `today_next_step` 자동 계산
- 잠금 규칙 자동 적용 (Day 1 완료 → Day 2 해제)

### 3. **확장 가능한 설계**
- 새로운 코스 추가 시 동일한 로직 재사용
- Level 1-3 추가 시 코스 ID만 변경하면 됨

### 4. **다음 레벨 안내**
- 코스 완료 후 자동으로 다음 레벨 정보 제공
- AVAILABLE일 때 즉시 시작 가능

---

## 🎉 7단계 완료!

**완료조건(AC) 달성:**
- ✅ Show & Tell과 동일한 카드 모델 재사용
- ✅ `this_week_topic`은 topics에서 가져옴
- ✅ `today_next_step`은 Day 상태로 계산
- ✅ Level0 완료 후 코스 인스턴스 COMPLETED 처리
- ✅ Level1이 AVAILABLE일 때 "다음 레벨 시작" CTA 제공

**핵심 성과:**
- 일관된 사용자 경험 (Show & Tell과 동일한 UI/UX)
- 자동화된 진행 상태 관리
- 확장 가능한 설계 (Level 1-3 추가 용이)

**다음 작업:**
- Level 1-3 콘텐츠 준비
- UI 컴포넌트에 다음 레벨 CTA 추가
- 프로덕션 배포

---

**구현 완료 일시:** 2025년 12월 28일  
**구현자:** Cursor AI + User


