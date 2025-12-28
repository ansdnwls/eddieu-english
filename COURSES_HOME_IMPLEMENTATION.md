# 코스 홈 화면(Courses Home) 구현 가이드

## 📋 구현 날짜
2025-12-27

---

## 🎯 구현 목적

사용자가 **진행 중인 코스**와 **오늘 할 일**을 한눈에 확인하고, **CTA 버튼 클릭만으로 바로 시작**할 수 있는 "코스 홈 화면"을 제공합니다.

### 핵심 요구사항
1. **진행 중(My Courses)** 탭: 현재 진행 중인 코스 카드 리스트
2. **전체 코스(Catalog)** 탭: 시작 가능한 모든 코스 (현재는 Show & Tell만)
3. 각 카드에서 **다음 액션(오늘 할 일)** 버튼 제공
4. 코스 진행률/주차/이번 주 주제/오늘 단계(Day1~3) 표시

---

## 📁 파일 구조

```
app/
├── types/
│   └── courses.ts                   # 타입 정의 (신규)
├── courses/
│   └── page.tsx                     # 코스 홈 페이지 (신규)
├── api/
│   └── v1/
│       └── children/
│           └── [child_id]/
│               └── course-instances/
│                   └── route.ts     # API 엔드포인트 (신규)
└── dashboard/
    └── page.tsx                     # 대시보드 (수정: "내 코스 보기" 버튼 추가)

components/
└── CourseCard.tsx                   # 코스 카드 컴포넌트 (신규)

lib/
└── courseProgressHelper.ts          # 진행 상태 계산 헬퍼 (신규)
```

---

## 1️⃣ 타입 정의 (`app/types/courses.ts`)

### 핵심 타입

#### `CourseInstance` (코스 인스턴스)
```typescript
export interface CourseInstance {
  course_instance_id: string; // 인스턴스 ID
  course_id: string; // 코스 ID (예: "show_tell_12w")
  course_title: string; // 코스 제목
  course_subtitle: string; // 코스 부제목
  thumbnail_url: string; // 썸네일 이미지
  status: CourseInstanceStatus; // "ACTIVE" | "PAUSED" | "COMPLETED"
  start_date: string; // 시작일 (ISO 8601)
  target_grade_band: string; // 학년대 (예: "HIGH")
  cefr_level: string; // CEFR 레벨 (예: "A2")
  
  progress: CourseProgress; // 진행 상태
  badges: Badge[]; // 배지 리스트
}
```

#### `CourseProgress` (진행 상태)
```typescript
export interface CourseProgress {
  current_week: number; // 현재 진행 중인 주차 (1~12)
  total_weeks: number; // 전체 주차 (12)
  week_progress_ratio: number; // 이번 주 진행률 (0.0 ~ 1.0)
  overall_progress_ratio: number; // 전체 코스 진행률 (0.0 ~ 1.0)
  
  this_week_topic: WeekTopic; // 이번 주 주제
  today_next_step: NextStep; // 오늘 할 일
  day_status: DayStatusMap; // Day별 상태
  weekly_output: WeeklyOutput; // 주간 결과물
}
```

#### `NextStep` (다음 단계)
```typescript
export interface NextStep {
  step_id: string; // "DAY1_WRITE_FIX" | "DAY2_SCRIPT_SHADOW" | "DAY3_REHEARSAL_JUDGE" | "WEEK_COMPLETE"
  label_ko: string; // "Day1: 글쓰기 + 교정"
  cta_ko: string; // "오늘 할 일 시작하기"
  deeplink: string; // "/showtell/week/1/day1"
  blocked_reason: string | null; // "Day1을 먼저 완료해야 Day2가 열려요" or null
}
```

#### `DayStatusMap` (Day별 상태)
```typescript
export type DayStatus = "DONE" | "TODO" | "LOCKED";

export interface DayStatusMap {
  day1_write_fix: DayStatus;
  day2_script_shadow: DayStatus;
  day3_rehearsal_judge: DayStatus;
}
```

---

## 2️⃣ 진행 상태 계산 로직 (`lib/courseProgressHelper.ts`)

### 핵심 함수: `calculateShowTellProgress()`

Show & Tell 코스의 진행 상태를 계산하는 메인 함수입니다.

#### 계산 로직

##### 1. 현재 주차 결정
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
if (current_week > 12) current_week = 12; // 최대 12주
```

**원칙:**
- 완료된 week 수 + 1 = 현재 주차
- Week 1 완료되면 Week 2가 `current_week`

##### 2. Day별 상태 계산

**Day1 완료 조건:**
- `WritingSubmission` 존재 + `CorrectionResult` 존재

**Day2 완료 조건:**
- `Script` 존재 + `AudioRecord` (shadowing) 3개 존재

**Day3 완료 조건:**
- `RehearsalSession` attempt2 존재 + `JudgeSession` 완료

**LOCKED 조건:**
- Day2는 Day1 `DONE`이 아니면 `LOCKED`
- Day3는 Day2 `DONE`이 아니면 `LOCKED`

##### 3. 다음 단계 결정

**우선순위:**
1. Day1 `TODO` → Day1 CTA
2. Day1 `DONE` & Day2 `TODO` → Day2 CTA
3. Day2 `DONE` & Day3 `TODO` → Day3 CTA
4. Day3 `DONE` → "이번 주 완료" → 다음 주 시작 CTA

**예시: Day3 완료 시**
```typescript
return {
  step_id: "WEEK_COMPLETE",
  label_ko: "이번 주 완료!",
  cta_ko: "다음 주 시작하기",
  deeplink: `/showtell/week/${week + 1}`,
  blocked_reason: null,
};
```

##### 4. 진행률 계산

**주간 진행률:**
```typescript
function calculateWeekProgressRatio(dayStatus: DayStatusMap, weeklyOutput): number {
  if (weeklyOutput.completed_portfolio_items > 0) {
    return 1.0; // 포트폴리오 완료 = 100%
  }

  let completedDays = 0;
  if (dayStatus.day1_write_fix === "DONE") completedDays++;
  if (dayStatus.day2_script_shadow === "DONE") completedDays++;
  if (dayStatus.day3_rehearsal_judge === "DONE") completedDays++;

  return completedDays / 3; // 3 Days 기준
}
```

**전체 진행률:**
```typescript
const overall_progress_ratio = allProgress.filter(p => p.portfolio_completed).length / 12;
```

---

## 3️⃣ API 엔드포인트 (`app/api/v1/children/[child_id]/course-instances/route.ts`)

### `GET /api/v1/children/{child_id}/course-instances`

#### Query Params
- `status`: `"ACTIVE"` | `"PAUSED"` | `"COMPLETED"` (optional, default: `"ACTIVE"`)

#### 응답 구조
```json
{
  "success": true,
  "data": {
    "child_id": "child_demo_001",
    "server_time": "2025-12-27T10:05:00Z",
    "active_course_instances": [
      {
        "course_instance_id": "ci_child_demo_001_show_tell_12w",
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
          "overall_progress_ratio": 0.25,
          "this_week_topic": {
            "topic_id": "topic.my_family",
            "title_ko": "우리 가족",
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
      }
    ],
    "ui_hints": {
      "tabs": [
        { "id": "ACTIVE", "label_ko": "진행 중" },
        { "id": "CATALOG", "label_ko": "전체 코스" }
      ],
      "empty_state": {
        "title_ko": "진행 중인 코스가 없어요",
        "subtitle_ko": "Show & Tell 코스를 시작해볼까요?",
        "primary_cta": {
          "label_ko": "코스 시작하기",
          "deeplink": "/showtell"
        }
      }
    }
  }
}
```

#### 처리 로직
1. `child_id`로 Show & Tell 진행 상태 계산 (`calculateShowTellProgress()`)
2. 배지 계산 (연속 학습, 새 주제 시작, 마일스톤)
3. 코스 인스턴스 객체 생성
4. `ui_hints` 추가 (탭, Empty State)

---

## 4️⃣ 코스 카드 컴포넌트 (`components/CourseCard.tsx`)

### 주요 기능
- 코스 썸네일 + 배지 표시
- 전체 진행률 + 이번 주 진행률 표시
- 이번 주 주제 (한글 + 영문)
- Day1/Day2/Day3 상태 (✅/🔵/🔒)
- 주간 결과물 (0/1)
- **CTA 버튼**: "오늘 할 일 시작하기"
- **잠긴 이유** 표시 (Day2/Day3 LOCKED 시)

### Day 아이콘
```typescript
const getDayIcon = (status: DayStatus): string => {
  switch (status) {
    case "DONE":
      return "✅";
    case "TODO":
      return "🔵";
    case "LOCKED":
      return "🔒";
    default:
      return "⚪";
  }
};
```

### CTA 버튼 핸들러
```typescript
const handleCTAClick = () => {
  if (today_next_step.blocked_reason) {
    alert(today_next_step.blocked_reason);
    return;
  }
  router.push(today_next_step.deeplink);
};
```

---

## 5️⃣ 코스 홈 페이지 (`app/courses/page.tsx`)

### 화면 구성
1. **헤더**: "📚 내 코스"
2. **탭**: "진행 중" / "전체 코스"
3. **탭 컨텐츠**:
   - **진행 중 탭**:
     - 코스가 있으면: 코스 카드 그리드 (최대 3개)
     - 코스가 없으면: Empty State (CTA: "코스 시작하기")
   - **전체 코스 탭**:
     - Show & Tell 카드 (CTA: "코스 시작하기")

### 상태 관리
```typescript
const [activeTab, setActiveTab] = useState<Tab>("ACTIVE");
const [courseData, setCourseData] = useState<CourseInstancesResponse | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
```

### API 호출
```typescript
const fetchCourses = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch(
      `/api/v1/children/${childId}/course-instances?status=ACTIVE`
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "코스 조회 실패");
    }

    setCourseData(result.data);

  } catch (err: unknown) {
    const error = err as Error;
    setError(error.message || "코스를 불러오는 중 오류가 발생했습니다");
  } finally {
    setLoading(false);
  }
};
```

---

## 6️⃣ 대시보드 통합 (`app/dashboard/page.tsx`)

### "내 코스 보기" 버튼 추가

```tsx
{/* 코스 홈 버튼 (NEW!) */}
<Link href="/courses">
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold py-6 px-8 rounded-2xl shadow-lg text-center text-xl cursor-pointer mb-4"
  >
    <span className="absolute top-2 right-3 bg-yellow-300 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full rotate-6">
      NEW! 🎉
    </span>
    <div className="text-4xl mb-2">📚</div>
    <div>내 코스 보기</div>
    <p className="text-sm font-normal mt-1 opacity-90">진행 중인 코스와 오늘 할 일을 확인하세요!</p>
  </motion.div>
</Link>
```

**위치:** "Show & Tell 12주 코스" 버튼 위에 배치

---

## 🎨 UI/UX 특징

### 1. 카드 디자인
- **그라데이션 썸네일**: 시각적으로 화려하고 매력적
- **배지**: 우상단에 `"2일 연속"`, `"이번 주 주제 시작"` 등
- **전체 진행률**: 좌하단에 `"전체 25%"` 표시

### 2. Day 상태 시각화
```
✅ Day 1  🔵 Day 2  🔒 Day 3
```
- **✅ DONE**: 완료 (초록색)
- **🔵 TODO**: 진행 가능 (파란색)
- **🔒 LOCKED**: 잠김 (회색)

### 3. CTA 버튼
- **활성화**: 그라데이션 배경 (파란색 → 보라색)
- **비활성화**: 회색 배경 + `cursor-not-allowed`
- **호버**: `scale: 1.03`
- **탭**: `scale: 0.97`

### 4. Empty State
- **아이콘**: 📚 (큰 사이즈)
- **메시지**: "진행 중인 코스가 없어요"
- **부제목**: "Show & Tell 코스를 시작해볼까요?"
- **CTA**: "코스 시작하기" → `/showtell` 이동

---

## 🔮 향후 확장 방향

### 1. 다중 코스 지원
- Show & Tell 외 추가 코스 (Writing Ladder, 수행평가 15유형 등)
- 코스별 인스턴스 ID 관리
- 코스 카탈로그 페이지 확장

### 2. 코스 인스턴스 DB 테이블
현재는 `show_tell_week_progress`로 진행 상태만 추적하지만, 향후 별도 테이블 필요:

```typescript
// Firestore: course_instances
{
  course_instance_id: string; // PK
  child_id: string;
  course_id: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  start_date: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
```

### 3. 배지 시스템 확장
- 실제 연속 학습일 계산 (Firestore 쿼리)
- 성취 배지 (예: "10주 완주", "모든 포트폴리오 완성")
- 배지 히스토리 저장

### 4. 학습 통계
- 주간/월간 학습 시간
- Day별 완료율
- 코스별 평균 진행 속도

---

## 🧪 테스트 가이드

### 1. API 테스트
```bash
# 코스 인스턴스 조회
curl "http://localhost:3000/api/v1/children/child_demo_001/course-instances?status=ACTIVE"
```

**기대 결과:**
- `success: true`
- `active_course_instances` 배열 (Show & Tell 1개)
- `progress` 객체에 `current_week`, `today_next_step`, `day_status` 포함

### 2. FE 테스트
```bash
# 서버 실행
npm run dev

# 브라우저에서 접속
http://localhost:3000/courses
```

**시나리오 1: 진행 중인 코스 있음**
1. "진행 중" 탭 선택 (기본)
2. Show & Tell 코스 카드 표시 확인
3. Day 상태 (✅/🔵/🔒) 확인
4. "오늘 할 일 시작하기" 버튼 클릭
5. 해당 Day 페이지로 이동 확인

**시나리오 2: 진행 중인 코스 없음**
1. "진행 중" 탭 선택
2. Empty State 표시 확인
3. "코스 시작하기" 버튼 클릭
4. `/showtell` 페이지로 이동 확인

**시나리오 3: 전체 코스 탭**
1. "전체 코스" 탭 선택
2. Show & Tell 카탈로그 카드 표시 확인
3. "코스 시작하기" 버튼 클릭
4. `/showtell` 페이지로 이동 확인

### 3. 대시보드 통합 테스트
```bash
http://localhost:3000/dashboard
```

1. "📚 내 코스 보기" 버튼 표시 확인
2. `"NEW! 🎉"` 배지 확인
3. 버튼 클릭 → `/courses` 이동 확인

---

## 📝 체크리스트

- [x] 타입 정의 (`app/types/courses.ts`)
- [x] 진행 상태 계산 헬퍼 (`lib/courseProgressHelper.ts`)
- [x] API 엔드포인트 (`/api/v1/children/[child_id]/course-instances/route.ts`)
- [x] 코스 카드 컴포넌트 (`components/CourseCard.tsx`)
- [x] 코스 홈 페이지 (`app/courses/page.tsx`)
- [x] 대시보드 통합 (`app/dashboard/page.tsx`)
- [x] Linter 오류 해결
- [x] 문서 작성 (`COURSES_HOME_IMPLEMENTATION.md`)
- [ ] 실제 배지 시스템 구현 (연속 학습일 계산)
- [ ] 실제 코스 인스턴스 DB 테이블 생성
- [ ] 썸네일 이미지 추가 (`/public/course-thumbnails/showtell.png`)

---

## 📚 관련 문서
- [SHOWTELL_DAY1_COMPLETE.md](./SHOWTELL_DAY1_COMPLETE.md): Day 1 구현
- [SHOWTELL_DAY2_COMPLETE.md](./SHOWTELL_DAY2_COMPLETE.md): Day 2 구현
- [SHOWTELL_DAY3_COMPLETE.md](./SHOWTELL_DAY3_COMPLETE.md): Day 3 구현
- [SHOWTELL_PORTFOLIO_COMPLETE.md](./SHOWTELL_PORTFOLIO_COMPLETE.md): Portfolio 구현
- [SHOWTELL_WEEK_HOME_COMPLETE.md](./SHOWTELL_WEEK_HOME_COMPLETE.md): Week Home 구현

---

**최종 업데이트:** 2025-12-27  
**구현자:** Cursor AI Assistant  
**문의:** 프로젝트 관리자




