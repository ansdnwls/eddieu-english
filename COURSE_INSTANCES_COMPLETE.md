# ✅ 코스 인스턴스 & 진행 상태 시스템 완료

## 📋 구현 개요

**코스 인스턴스(Course Instances)** 및 **주차/Day 진행 상태** 시스템을 구축하여, Writing Ladder와 Show & Tell 모두 동일한 API로 진행 상태를 조회하고 카드로 표시할 수 있도록 구현했습니다.

---

## 🎯 완료 조건 (AC) ✅

### ✅ `/v1/children/{child_id}/course-instances?status=ACTIVE`에서 Writing Ladder도 Show & Tell과 같은 카드 필드로 표시 가능

- Show & Tell 코스 인스턴스 표시
- Writing Ladder 코스 인스턴스 표시
- 동일한 `CourseInstance` 타입 사용
- 동일한 진행 상태 계산 로직 (Day 상태, 다음 단계 등)

---

## 📂 수정된 파일

### 1. 진행 상태 계산 헬퍼 확장
- ✅ `lib/courseProgressHelper.ts`
  - `calculateWritingLadderProgress()` 함수 추가
  - `calculateWritingLadderDayStatus()` 함수 추가
  - `determineWritingLadderNextStep()` 함수 추가
  - `getWritingLadderWeekTopic()` 함수 추가

### 2. API 업데이트
- ✅ `app/api/v1/children/[child_id]/course-instances/route.ts`
  - `course_instances` 컬렉션에서 사용자 코스 조회
  - 코스별 진행 상태 계산 (Show & Tell / Writing Ladder)
  - 배지 계산 함수 추가

---

## 🗂️ Firestore 컬렉션 구조

### 1. `course_instances`

**코스 인스턴스 (사용자가 시작한 코스)**

```typescript
{
  course_instance_id: string;   // "ci_child_demo_001_writing_ladder_level0_1735380000000"
  child_id: string;             // "child_demo_001"
  course_id: string;            // "writing_ladder_level0" | "show_tell_12w"
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  grade_band: "LOW" | "MID" | "HIGH";
  cefr_level: "A1" | "A2" | "B1" | "B2";
  start_date: string;           // "2025-12-28"
  start_week: number;           // 1
  current_week: number;         // 1~4 (Writing Ladder) or 1~12 (Show & Tell)
  completed_weeks: number[];    // [1, 2] (완료한 주차들)
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

**생성 시점**: `POST /api/v1/courses/start` 호출 시

---

### 2. `writingladder_week_progress`

**Writing Ladder 주차별 진행 상태**

```typescript
{
  progress_id: string;          // "progress_child_demo_001_writing_ladder_level0_week1"
  child_id: string;             // "child_demo_001"
  course_id: string;            // "writing_ladder_level0"
  level: "LEVEL0_SENTENCE";
  week: number;                 // 1~4
  
  // Day별 완료 상태
  day1_completed: boolean;
  day1_submission_id?: string;  // FK: writing_submissions
  day1_correction_id?: string;  // FK: corrections
  
  day2_completed: boolean;
  day2_script_id?: string;      // FK: scripts
  day2_shadowing_audio_ids?: string[]; // FK: audio_records[]
  
  day3_completed: boolean;
  day3_rehearsal_session_id?: string;  // FK: rehearsal_sessions
  day3_judge_session_id?: string;      // FK: judge_sessions
  
  // 포트폴리오
  portfolio_completed: boolean;
  portfolio_id?: string;        // FK: portfolio_items
  
  // 현재 진행 Day
  current_day: 1 | 2 | 3 | null;
  
  // 메타데이터
  started_at: string;
  completed_at?: string;
  updated_at: string;
}
```

**생성/업데이트 시점**:
- Day 1 완료: `day1_submission_id`, `day1_correction_id` 저장
- Day 2 완료: `day2_script_id`, `day2_shadowing_audio_ids` 저장
- Day 3 완료: `day3_rehearsal_session_id`, `day3_judge_session_id` 저장

---

### 3. `showtell_week_progress`

**Show & Tell 주차별 진행 상태 (기존)**

동일한 구조, 단 `course_id: "show_tell_12w"`, `week: 1~12`

---

## 🔍 Day 완료 조건

### Day 1: Write + Fix ✅

**조건**:
- `writing_submissions` 컬렉션에 submission 생성
- `corrections` 컬렉션에 correction 생성

**확인 로직**:
```typescript
const day1_done = 
  !!currentWeekProgress?.day1_submission_id && 
  !!currentWeekProgress?.day1_correction_id;
```

---

### Day 2: Script + Shadowing ✅

**조건**:
- `scripts` 컬렉션에 script 생성
- `audio_records` 컬렉션에 shadowing audio 1개 이상 생성

**확인 로직**:
```typescript
const day2_done = 
  !!currentWeekProgress?.day2_script_id && 
  (currentWeekProgress?.day2_shadowing_audio_ids?.length || 0) >= 1;
```

**차이점**:
- Show & Tell: Shadowing 3개 필요
- Writing Ladder: Shadowing 1개로 충분 (발표 시간이 짧음)

---

### Day 3: Rehearsal + Judge ✅

**조건**:
- `rehearsal_sessions` 컬렉션에 rehearsal session 생성 (attempt2 완료)
- `judge_sessions` 컬렉션에 judge session 생성 (5문항 완료)
- `day3_completed` 플래그가 `true`

**확인 로직**:
```typescript
const day3_done = 
  !!currentWeekProgress?.day3_rehearsal_session_id && 
  !!currentWeekProgress?.day3_judge_session_id &&
  currentWeekProgress?.day3_completed === true;
```

---

## 🔌 API 엔드포인트

### GET /api/v1/children/{child_id}/course-instances

**Query Params**:
- `status`: `"ACTIVE"` | `"PAUSED"` | `"COMPLETED"` (default: `"ACTIVE"`)

**응답 구조**:
```json
{
  "success": true,
  "data": {
    "child_id": "child_demo_001",
    "server_time": "2025-12-28T10:00:00.000Z",
    "active_course_instances": [
      {
        "course_instance_id": "ci_child_demo_001_show_tell_12w_...",
        "course_id": "show_tell_12w",
        "course_title": "Show & Tell (12주)",
        "course_subtitle": "매주 발표 1개 완성",
        "thumbnail_url": "/course-thumbnails/showtell.png",
        "status": "ACTIVE",
        "start_date": "2025-12-01",
        "target_grade_band": "HIGH",
        "cefr_level": "A2",
        "progress": {
          "current_week": 3,
          "total_weeks": 12,
          "week_progress_ratio": 0.33,
          "overall_progress_ratio": 0.17,
          "this_week_topic": {
            "topic_id": "showtell_week3",
            "title_ko": "내 가족",
            "title_en": "My Family"
          },
          "today_next_step": {
            "step_id": "DAY2_SCRIPT_SHADOW",
            "label_ko": "Day2: 발표 대본 + 따라말하기",
            "cta_ko": "오늘 할 일 시작하기",
            "deeplink": "/showtell/week/3/day2",
            "blocked_reason": null
          },
          "day_status": {
            "day1_write_fix": "DONE",
            "day2_script_shadow": "TODO",
            "day3_rehearsal_judge": "LOCKED"
          },
          "weekly_output": {
            "required_portfolio_items": 1,
            "completed_portfolio_items": 0
          }
        },
        "badges": [
          { "type": "STREAK", "label": "2일 연속" }
        ]
      },
      {
        "course_instance_id": "ci_child_demo_001_writing_ladder_level0_...",
        "course_id": "writing_ladder_level0",
        "course_title": "Writing Ladder Level 0",
        "course_subtitle": "문장부터 탄탄하게 (4주)",
        "thumbnail_url": "/course-thumbnails/writingladder-level0.png",
        "status": "ACTIVE",
        "start_date": "2025-12-28",
        "target_grade_band": "MID",
        "cefr_level": "A1",
        "progress": {
          "current_week": 1,
          "total_weeks": 4,
          "week_progress_ratio": 0.0,
          "overall_progress_ratio": 0.0,
          "this_week_topic": {
            "topic_id": "writingladder_l0_week1",
            "title_ko": "I like... (Things I Like)",
            "title_en": "I like... (Things I Like)"
          },
          "today_next_step": {
            "step_id": "DAY1_WRITE_FIX",
            "label_ko": "Day1: 글쓰기 + 교정",
            "cta_ko": "오늘 할 일 시작하기",
            "deeplink": "/writingladder/week/1/day1",
            "blocked_reason": null
          },
          "day_status": {
            "day1_write_fix": "TODO",
            "day2_script_shadow": "LOCKED",
            "day3_rehearsal_judge": "LOCKED"
          },
          "weekly_output": {
            "required_portfolio_items": 1,
            "completed_portfolio_items": 0
          }
        },
        "badges": []
      }
    ],
    "ui_hints": {
      "tabs": [
        { "id": "ACTIVE", "label_ko": "진행 중" },
        { "id": "CATALOG", "label_ko": "전체 코스" }
      ],
      "empty_state": {
        "title_ko": "진행 중인 코스가 없어요",
        "subtitle_ko": "새로운 코스를 시작해볼까요?",
        "primary_cta": {
          "label_ko": "코스 시작하기",
          "deeplink": "/courses"
        }
      }
    }
  }
}
```

---

## 🎨 코스 카드 UI

### Show & Tell 카드
- **색상**: Blue-Purple
- **이모지**: 🚀
- **제목**: "Show & Tell (12주)"
- **부제**: "매주 발표 1개 완성"
- **진행률**: "Week 3 / 12" (25%)
- **다음 단계**: "Day2: 발표 대본 + 따라말하기"

### Writing Ladder 카드
- **색상**: Green-Teal
- **이모지**: 📝
- **제목**: "Writing Ladder Level 0"
- **부제**: "문장부터 탄탄하게 (4주)"
- **진행률**: "Week 1 / 4" (0%)
- **다음 단계**: "Day1: 글쓰기 + 교정"

---

## 📊 진행 상태 계산 로직

### 1. 현재 주차 결정

```typescript
let current_week = 1;
for (let i = 0; i < allProgress.length; i++) {
  if (allProgress[i].portfolio_completed) {
    current_week = allProgress[i].week + 1; // 완료된 주차 + 1
  } else {
    current_week = allProgress[i].week;
    break;
  }
}
```

**규칙**: 포트폴리오 완료한 주차의 다음 주차로 이동

---

### 2. Day 상태 계산

```typescript
const day1_done = !!submission_id && !!correction_id;
const day2_done = !!script_id && (shadowing_count >= 1);
const day3_done = !!rehearsal_id && !!judge_id && day3_completed;

const day1_status = day1_done ? "DONE" : "TODO";
const day2_status = day1_done ? (day2_done ? "DONE" : "TODO") : "LOCKED";
const day3_status = day2_done ? (day3_done ? "DONE" : "TODO") : "LOCKED";
```

**규칙**: 
- Day 1은 항상 TODO
- Day 2는 Day 1 완료 후 TODO
- Day 3는 Day 2 완료 후 TODO

---

### 3. 다음 단계 결정

```typescript
if (day1_status === "TODO") return { deeplink: `/week/${week}/day1` };
if (day2_status === "TODO") return { deeplink: `/week/${week}/day2` };
if (day3_status === "TODO") return { deeplink: `/week/${week}/day3` };
if (day3_status === "DONE") {
  if (week >= totalWeeks) return { deeplink: `/portfolio` };
  return { deeplink: `/week/${week + 1}` };
}
```

---

### 4. 주간 진행률

```typescript
let completedDays = 0;
if (day1_status === "DONE") completedDays++;
if (day2_status === "DONE") completedDays++;
if (day3_status === "DONE") completedDays++;

const week_progress_ratio = completedDays / 3; // 0.0 ~ 1.0
```

---

### 5. 전체 진행률

```typescript
const completedWeeks = allProgress.filter(p => p.portfolio_completed).length;
const overall_progress_ratio = completedWeeks / totalWeeks;
```

---

## 🏗️ 시스템 흐름

```
[사용자가 코스 시작]
  ↓
POST /api/v1/courses/start
  {
    child_id: "child_demo_001",
    course_id: "writing_ladder_level0"
  }
  ↓
Firestore: course_instances 생성
  {
    course_instance_id: "ci_...",
    child_id: "child_demo_001",
    course_id: "writing_ladder_level0",
    status: "ACTIVE",
    current_week: 1,
    ...
  }
  ↓
[사용자가 Week 1 Day 1 진행]
  ↓
submission 생성 → correction 생성
  ↓
Firestore: writingladder_week_progress 업데이트
  {
    progress_id: "progress_child_demo_001_writing_ladder_level0_week1",
    day1_completed: true,
    day1_submission_id: "sub_...",
    day1_correction_id: "corr_...",
    ...
  }
  ↓
[코스 홈 접속]
  ↓
GET /api/v1/children/child_demo_001/course-instances?status=ACTIVE
  ↓
course_instances 조회
  ↓
각 course_id별로 진행 상태 계산
  - Show & Tell → calculateShowTellProgress()
  - Writing Ladder → calculateWritingLadderProgress()
  ↓
CourseInstance 객체 생성 (progress, badges 포함)
  ↓
UI에 카드로 표시
```

---

## 🎯 배지 시스템

### 배지 타입

```typescript
type BadgeType = "STREAK" | "NEW" | "ACHIEVEMENT" | "MILESTONE";
```

### 배지 계산 로직

```typescript
// 연속 학습 배지
if (streakDays >= 2) {
  badges.push({ type: "STREAK", label: `${streakDays}일 연속` });
}

// 새 주제 시작 배지
if (day1_status === "TODO" && current_week > 1) {
  badges.push({ type: "NEW", label: "이번 주 주제 시작" });
}

// 절반 완료 배지
if (overall_progress_ratio >= 0.5 && overall_progress_ratio < 1.0) {
  badges.push({ type: "ACHIEVEMENT", label: "절반 완료!" });
}

// 코스 완료 배지
if (current_week === total_weeks && day3_status === "DONE") {
  badges.push({ type: "MILESTONE", label: "🎉 코스 완료!" });
}
```

---

## ⚠️ 주의사항

### 1. Week Progress 생성 시점

**자동 생성**: Day 1 시작 시 `writingladder_week_progress` 문서 자동 생성
- 생성 위치: Day 1 API에서 (submission 생성 시)

### 2. 컬렉션 이름 규칙

| 코스 | Week Progress 컬렉션 |
|------|---------------------|
| Show & Tell | `showtell_week_progress` |
| Writing Ladder | `writingladder_week_progress` |

### 3. 공유 컬렉션

다음 컬렉션은 모든 코스가 공유:
- `writing_submissions` (Day 1 글)
- `corrections` (Day 1 교정)
- `scripts` (Day 2 대본)
- `audio_records` (녹음)
- `rehearsal_sessions` (Day 3 리허설)
- `judge_sessions` (Day 3 Judge)
- `portfolio_items` (포트폴리오)

**구분 방법**: `course_id` 필드로 구분

---

## 🧪 테스트 시나리오

### 시나리오 1: Writing Ladder 코스 인스턴스 조회

1. Writing Ladder Level 0 코스 시작
2. Week 1 Day 1 완료 (submission + correction)
3. `/courses` 페이지 접속 → "진행 중" 탭
4. Writing Ladder 카드 확인:
   - 제목: "Writing Ladder Level 0"
   - Week 1 / 4
   - Day 1 ✅ DONE
   - Day 2 🔵 TODO
   - Day 3 🔒 LOCKED
   - CTA: "오늘 할 일 시작하기" → `/writingladder/week/1/day2`

### 시나리오 2: 다중 코스 진행

1. Show & Tell Week 3 Day 2 진행 중
2. Writing Ladder Week 1 Day 1 진행 중
3. `/courses` 페이지 → "진행 중" 탭
4. 2개 카드 모두 표시:
   - Show & Tell 카드 (Blue-Purple)
   - Writing Ladder 카드 (Green-Teal)

---

## 📈 향후 개선 사항

### 1. 연속 학습일 계산
현재는 Mock 데이터 (2일 고정). 실제 학습 기록 조회 필요.

### 2. Course Instance 상태 관리
- PAUSED: 일시 정지
- COMPLETED: 완료 후 재시작 가능

### 3. current_week 자동 업데이트
현재는 서버 계산. Week 완료 시 `course_instances` 업데이트 필요.

### 4. Week Progress 자동 정리
완료된 주차 데이터 아카이빙

---

## 🎓 결론

**코스 인스턴스 & 진행 상태 시스템**이 완성되었습니다!

### 핵심 성과
✅ Writing Ladder 진행 상태 계산 함수 구현  
✅ Course Instances API 확장 (다중 코스 지원)  
✅ Day 완료 조건 명확화  
✅ 동일한 카드 UI로 모든 코스 표시 가능

### AC 달성
✅ `/v1/children/{child_id}/course-instances?status=ACTIVE`에서 Writing Ladder도 Show & Tell과 같은 카드 필드로 표시 가능

---

**작성일**: 2025-12-28  
**상태**: ✅ 구현 완료 (MVP 출시 가능)  
**프로젝트**: nextjs-project1217


