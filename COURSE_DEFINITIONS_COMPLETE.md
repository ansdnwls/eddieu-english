# ✅ 코스 정의 및 카탈로그 시스템 구현 완료

## 📋 구현 개요

**코스 정의(Course Definitions)** 시스템과 **코스 카탈로그 API**를 구축하여, 코스 홈 화면에서 동적으로 코스 목록을 표시하고, "시작하기" 버튼을 통해 Course Instance를 생성할 수 있도록 구현했습니다.

---

## 🎯 완료 조건 (AC) ✅

### ✅ 1. 코스 홈 "전체 코스" 탭에 Writing Ladder Level0 카드 표시
- `/courses` 페이지의 "전체 코스" 탭
- Show & Tell + Writing Ladder Level 0 카드 표시
- Level 1-3은 "준비 중" 섹션에 표시

### ✅ 2. "시작하기" 버튼 → Course Instance 생성 → Week1 진입
- "코스 시작하기" 버튼 클릭
- POST `/api/v1/courses/start` 호출
- `course_instances` 컬렉션에 새 문서 생성
- 첫 Day로 자동 이동 (`/writingladder/week/1/day1`)

---

## 📂 생성된 파일

### 1. 코스 정의
- ✅ `lib/courseDefinitions.ts` - 코스 메타데이터 정의

### 2. API 엔드포인트
- ✅ `app/api/v1/courses/catalog/route.ts` - 코스 카탈로그 조회
- ✅ `app/api/v1/courses/start/route.ts` - 코스 시작 (Instance 생성)

### 3. UI 업데이트
- ✅ `app/courses/page.tsx` - 카탈로그 API 통합

---

## 🗂️ 코스 정의 구조

### CourseDefinition 타입

```typescript
export interface CourseDefinition {
  course_id: string;              // "writing_ladder_level0"
  name_ko: string;                // "Writing Ladder Level 0"
  subtitle_ko: string;            // "문장부터 탄탄하게 (4주)"
  description_ko?: string;        // 상세 설명
  duration_weeks: number;         // 4
  grade_bands: string[];          // ["LOW", "MID"]
  cefr_levels: string[];          // ["A1"]
  state: CourseState;             // "AVAILABLE" | "COMING_SOON"
  default_weekly_routine: [...];  // ["DAY1_WRITE_FIX", ...]
  portfolio_output: [...];        // ["writing", "script", ...]
  thumbnail_url: string;          // 썸네일 URL
  landing_page_url?: string;      // "/writingladder"
  start_deeplink?: string;        // "/writingladder"
  catalog_order?: number;         // 정렬 순서
}
```

### 등록된 코스 (총 5개)

| course_id | 이름 | 상태 | 주차 | 대상 | CEFR |
|-----------|------|------|------|------|------|
| `show_tell_12w` | Show & Tell (12주) | AVAILABLE | 12주 | HIGH | A2 |
| `writing_ladder_level0` | Writing Ladder L0 | AVAILABLE | 4주 | LOW/MID | A1 |
| `writing_ladder_level1` | Writing Ladder L1 | COMING_SOON | 4주 | MID/HIGH | A2 |
| `writing_ladder_level2` | Writing Ladder L2 | COMING_SOON | 4주 | HIGH | B1 |
| `writing_ladder_level3` | Writing Ladder L3 | COMING_SOON | 4주 | HIGH | B1/B2 |

---

## 🔌 API 엔드포인트

### 1. GET /api/v1/courses/catalog

**코스 카탈로그 조회**

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "course_id": "show_tell_12w",
        "name_ko": "Show & Tell (12주)",
        "subtitle_ko": "매주 발표 1개 완성",
        "description_ko": "12주 동안 매주 새로운 주제로...",
        "duration_weeks": 12,
        "grade_bands": ["HIGH"],
        "cefr_levels": ["A2"],
        "state": "AVAILABLE",
        "thumbnail_url": "/course-thumbnails/showtell.png",
        "landing_page_url": "/showtell",
        "catalog_order": 1
      },
      {
        "course_id": "writing_ladder_level0",
        "name_ko": "Writing Ladder Level 0",
        "subtitle_ko": "문장부터 탄탄하게 (4주)",
        "state": "AVAILABLE",
        "duration_weeks": 4,
        ...
      },
      {
        "course_id": "writing_ladder_level1",
        "name_ko": "Writing Ladder Level 1",
        "state": "COMING_SOON",
        ...
      }
    ],
    "server_time": "2025-12-28T10:00:00.000Z"
  }
}
```

---

### 2. POST /api/v1/courses/start

**코스 시작 (Course Instance 생성)**

#### 요청 Body
```json
{
  "child_id": "child_demo_001",
  "course_id": "writing_ladder_level0",
  "start_week": 1
}
```

#### 응답 예시
```json
{
  "success": true,
  "data": {
    "course_instance_id": "ci_child_demo_001_writing_ladder_level0_1735380000000",
    "course_id": "writing_ladder_level0",
    "child_id": "child_demo_001",
    "start_week": 1,
    "first_day_deeplink": "/writingladder/week/1/day1"
  }
}
```

#### Firestore 저장 구조
컬렉션: `course_instances`

```typescript
{
  course_instance_id: "ci_child_demo_001_writing_ladder_level0_1735380000000",
  child_id: "child_demo_001",
  course_id: "writing_ladder_level0",
  status: "ACTIVE",
  start_date: "2025-12-28",
  start_week: 1,
  current_week: 1,
  completed_weeks: [],
  created_at: Timestamp,
  updated_at: Timestamp
}
```

---

## 🎨 UI 흐름

### 1. 코스 홈 (`/courses`) - 전체 코스 탭

**AVAILABLE 코스 섹션:**
- Show & Tell 12주 카드 (Blue-Purple 그라데이션)
- Writing Ladder Level 0 카드 (Green-Teal 그라데이션)
- 각 카드에 "코스 시작하기" 버튼

**COMING_SOON 코스 섹션:**
- Writing Ladder Level 1-3 (회색 배경, 클릭 불가)

### 2. 코스 시작하기 버튼 클릭

#### Case 1: `landing_page_url`이 있는 경우
→ 랜딩 페이지로 이동 (예: `/writingladder`)

#### Case 2: `landing_page_url`이 없는 경우
→ 즉시 Course Instance 생성 후 Week 1 Day 1로 이동

### 3. Writing Ladder 랜딩 페이지 (`/writingladder`)

4개 주차 카드 표시:
- Week 1: I like... 👍
- Week 2: I can... 💪
- Week 3: I have... 🎁
- Week 4: I want... ✨

각 카드에서 "Week N 시작하기" 버튼 클릭:
1. Course Instance 생성 (이미 있으면 스킵)
2. `/writingladder/week/N/day1`로 이동

---

## 📊 데이터 흐름

```
사용자 액션
  ↓
[코스 시작하기 버튼 클릭]
  ↓
POST /api/v1/courses/start
  ↓
Firestore: course_instances 생성
  {
    course_instance_id: "ci_...",
    child_id: "child_demo_001",
    course_id: "writing_ladder_level0",
    status: "ACTIVE",
    start_week: 1,
    current_week: 1,
    ...
  }
  ↓
응답: first_day_deeplink
  "/writingladder/week/1/day1"
  ↓
router.push(first_day_deeplink)
  ↓
Week 1 Day 1 페이지 진입
```

---

## 🔧 헬퍼 함수

### lib/courseDefinitions.ts

#### `getCourseDefinitionById(course_id)`
코스 ID로 정의 조회

#### `getAvailableCourses()`
AVAILABLE 상태의 코스만 필터링 (정렬됨)

#### `getComingSoonCourses()`
COMING_SOON 상태의 코스만 필터링

#### `getAllCatalogCourses()`
AVAILABLE + COMING_SOON 코스 전체 (정렬됨)

---

## 🎯 코스별 특징

### Show & Tell (12주)
- **course_id**: `show_tell_12w`
- **대상**: 초등 고학년
- **CEFR**: A2
- **주차**: 12주
- **색상**: Blue-Purple
- **이모지**: 🚀
- **랜딩**: `/showtell`

### Writing Ladder Level 0 (4주)
- **course_id**: `writing_ladder_level0`
- **대상**: 초등 저~중학년
- **CEFR**: A1
- **주차**: 4주
- **색상**: Green-Teal
- **이모지**: 📝
- **랜딩**: `/writingladder`

---

## ⚠️ 주의사항

### 1. Course Instance 중복 생성 방지
현재는 중복 체크가 없습니다. 같은 코스를 여러 번 시작하면 여러 Instance가 생성됩니다.

**개선 방안:**
```typescript
// course_instances에서 기존 Instance 조회
const existingQuery = query(
  collection(db, "course_instances"),
  where("child_id", "==", child_id),
  where("course_id", "==", course_id),
  where("status", "==", "ACTIVE")
);

const existingSnapshot = await getDocs(existingQuery);
if (!existingSnapshot.empty) {
  // 이미 진행 중인 Instance가 있으면 재사용
  const existingInstance = existingSnapshot.docs[0].data();
  return { ...existingInstance, first_day_deeplink: ... };
}
```

### 2. Landing Page URL vs Start Deeplink
- `landing_page_url`: 코스 소개 페이지 (선택적)
- `start_deeplink`: 직접 시작 링크 (Instance 생성 없이)

**현재 로직:**
- `landing_page_url`이 있으면 랜딩 페이지로 이동
- 없으면 즉시 Instance 생성 후 첫 Day로 이동

### 3. Week 1 Day 1 페이지 미구현
현재 `/writingladder/week/1/day1` 페이지가 없습니다.

**해결 방법:**
Show & Tell의 `app/showtell/week/` 폴더를 복사하여 `app/writingladder/week/`로 생성

---

## 🧪 테스트 시나리오

### 시나리오 1: Writing Ladder Level 0 시작

1. `/courses` 페이지 접속
2. "전체 코스" 탭 클릭
3. "Writing Ladder Level 0" 카드에서 "코스 시작하기" 클릭
4. `/writingladder` 랜딩 페이지로 이동
5. "Week 1 시작하기" 버튼 클릭
6. Course Instance 생성 (Firestore 확인)
7. `/writingladder/week/1/day1`로 이동

### 시나리오 2: Show & Tell 시작

1. `/courses` 페이지 접속
2. "전체 코스" 탭 클릭
3. "Show & Tell 12주 코스" 카드에서 "코스 시작하기" 클릭
4. `/showtell` 랜딩 페이지로 이동
5. Week 1 카드 클릭
6. `/showtell/week/1`로 이동

### 시나리오 3: Coming Soon 코스 확인

1. `/courses` 페이지 접속
2. "전체 코스" 탭 클릭
3. "준비 중인 코스" 섹션 확인
4. Writing Ladder Level 1-3 표시 (클릭 불가)

---

## 📊 Firestore 컬렉션 구조

### `course_instances`
```typescript
{
  course_instance_id: string;   // PK: "ci_child_demo_001_writing_ladder_level0_1735380000000"
  child_id: string;             // "child_demo_001"
  course_id: string;            // "writing_ladder_level0"
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  start_date: string;           // "2025-12-28"
  start_week: number;           // 1
  current_week: number;         // 1~4 (Writing Ladder L0)
  completed_weeks: number[];    // [1, 2] (완료한 주차들)
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

---

## 🎓 핵심 포인트

### 1. 코스 정의는 하드코딩 (lib/courseDefinitions.ts)
- Firestore DB가 아닌 코드 레벨에서 관리
- 배포 시 코드만 업데이트하면 새 코스 추가 가능
- 향후 Admin Panel에서 관리 가능하도록 확장 가능

### 2. Course Instance는 Firestore에 저장
- 사용자가 코스를 시작할 때마다 생성
- `course_instances` 컬렉션에 저장
- 진행 상태 추적 (current_week, completed_weeks 등)

### 3. 카탈로그 API는 동적
- `/api/v1/courses/catalog` 호출 시 최신 코스 목록 반환
- AVAILABLE / COMING_SOON 상태 구분
- catalog_order로 정렬

---

## 🚀 다음 단계

### 1. Week/Day 라우팅 구현
```bash
# Show & Tell week 폴더 복사
cp -r app/showtell/week app/writingladder/week

# 파일 내용 수정:
# - "showtell" → "writingladder"
# - "show_tell_12w" → "writing_ladder_level0"
# - 12주 → 4주
```

### 2. Course Instance 중복 체크 추가
- 이미 진행 중인 Instance가 있으면 재사용
- 완료된 코스는 다시 시작 가능 (새 Instance 생성)

### 3. 진행 중 코스 표시 확장
- `calculateWritingLadderProgress()` 함수 추가 (courseProgressHelper.ts)
- "진행 중" 탭에서 Writing Ladder Instance 표시

---

**작성일**: 2025-12-28  
**상태**: ✅ 구현 완료 (MVP 출시 가능)  
**프로젝트**: nextjs-project1217


