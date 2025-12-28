# Show & Tell Week Home & 화면 전환 로직 구현 완료 ✅

## 📋 개요

Show & Tell 12주 코스의 **Week Home 페이지 + FE 화면 전환 로직 (강제 동선)** 구현이 완료되었습니다.

---

## 🎯 구현된 기능

### 1️⃣ Week Home 페이지 (`/showtell/week/[week]`)

**위치**: `app/showtell/week/[week]/page.tsx`

**구성 요소**:
- ✅ **상단**: Topic Title + Description
- ✅ **진행 상태 표시**: Day 1, 2, 3 완료 체크
- ✅ **Day 버튼 3개**: Day 1 / Day 2 / Day 3
- ✅ **완료 섹션**: Portfolio 보기 + 다음 주차 시작

**화면 구조**:
```
┌─────────────────────────────────────┐
│  Week 1                             │
│  Week 1: My Favorite Toy      🎭    │
│  Topic Description                  │
│  [⏳ Day 1] [⏳ Day 2] [⏳ Day 3]    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [✅ 1] Day 1: Write + Fix     📝  │
│  영어 글쓰기 + AI 교정               │
│  ✅ 완료! 다시 보기 →                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [2] Day 2: Script + Shadowing 🎬  │
│  발표 대본 + 따라말하기               │
│  시작하기 →                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [2] Day 3: Rehearsal + Judge  🎭  │
│  리허설 + Q&A                        │
│  🔒 Day 2를 먼저 완료해주세요         │
└─────────────────────────────────────┘
```

---

### 2️⃣ 전환 규칙 (강제 동선)

#### ✅ Day 1 → Day 2 전환
- **조건**: Day 1 저장/교정 완료 (`day1_completed: true`)
- **활성화**: Day 2 CTA 버튼 활성화
- **비활성화 시**: 🔒 "Day 1을 먼저 완료해주세요" 메시지 + 클릭 불가

```typescript
// Day 2 활성화 조건
const day2Enabled = weekProgress.day1_completed;

// 클릭 핸들러
if (!weekProgress.day1_completed) {
  alert("⚠️ Day 1을 먼저 완료해주세요!");
  return;
}
router.push(`/showtell/week/${week}/day2?submissionId=${weekProgress.day1_submission_id}`);
```

#### ✅ Day 2 → Day 3 전환
- **조건**: Day 2 shadowing 1회 이상 완료 (`day2_completed: true`)
- **활성화**: Day 3 CTA 버튼 활성화
- **비활성화 시**: 🔒 "Day 2를 먼저 완료해주세요" 메시지 + 클릭 불가

```typescript
// Day 3 활성화 조건
const day3Enabled = weekProgress.day2_completed;

// 클릭 핸들러
if (!weekProgress.day2_completed) {
  alert("⚠️ Day 2를 먼저 완료해주세요!");
  return;
}
router.push(`/showtell/week/${week}/day3?submissionId=${weekProgress.day1_submission_id}`);
```

#### ✅ Day 3 완료 → Portfolio 생성 + 다음 주차
- **조건**: Day 3 Judge 완료 (`portfolio_completed: true`)
- **표시**: 🎉 완료 섹션 (Portfolio 보기 + 다음 주차 시작 버튼)

```typescript
// 다음 주차 활성화 조건
const nextWeekEnabled = weekProgress.portfolio_completed;

// 완료 섹션
{nextWeekEnabled && (
  <div className="완료-섹션">
    <button onClick={() => router.push(`/showtell/portfolio/portfolio_${childId}_week${week}`)}>
      📂 Portfolio 보기
    </button>
    <button onClick={() => router.push(`/showtell/week/${week + 1}`)}>
      다음 주차 시작하기 (Week {week + 1}) →
    </button>
  </div>
)}
```

---

### 3️⃣ Week Progress 조회 API

**엔드포인트**: `GET /api/showtell/progress?child_id=xxx&week=1`

**응답**:
```json
{
  "success": true,
  "data": {
    "progress_id": "progress_child_demo_001_week1",
    "child_id": "child_demo_001",
    "course_id": "show_tell_12w",
    "week": 1,
    "day1_completed": true,
    "day1_submission_id": "sub_...",
    "day1_correction_id": "corr_...",
    "day2_completed": false,
    "day2_script_id": null,
    "day2_shadowing_audio_ids": [],
    "day3_completed": false,
    "day3_rehearsal_session_id": null,
    "day3_judge_session_id": null,
    "portfolio_completed": false,
    "portfolio_id": null,
    "current_day": 2,
    "started_at": "2025-12-27T...",
    "updated_at": "2025-12-27T..."
  }
}
```

---

## 🎨 UI 특징

### Day 버튼 상태별 디자인

#### 1. 활성화 (접근 가능)
```
┌─────────────────────────────────────┐
│  [1] Day 1: Write + Fix        📝  │  ← 파란색 배경 (bg-blue-500)
│  영어 글쓰기 + AI 교정               │  ← 흰색 배경 카드
│  시작하기 →                          │  ← 파란색 텍스트
└─────────────────────────────────────┘
```

#### 2. 완료 (다시 보기 가능)
```
┌─────────────────────────────────────┐
│  [✅] Day 1: Write + Fix       📝  │  ← 초록색 배경 (bg-green-500)
│  영어 글쓰기 + AI 교정               │  ← 흰색 배경 카드
│  ✅ 완료! 다시 보기 →                │  ← 초록색 텍스트
└─────────────────────────────────────┘
```

#### 3. 비활성화 (조건 미충족)
```
┌─────────────────────────────────────┐
│  [2] Day 2: Script + Shadowing 🎬  │  ← 회색 배경 (bg-gray-400)
│  발표 대본 + 따라말하기               │  ← 회색 배경 카드 (opacity-50)
│  🔒 Day 1을 먼저 완료해주세요         │  ← 회색 텍스트 + 클릭 불가
└─────────────────────────────────────┘
```

### 진행 상태 뱃지
```
[✅ Day 1] [⏳ Day 2] [⏳ Day 3]
   ↓          ↓          ↓
초록색     회색       회색
```

---

## 📊 데이터 흐름

### 사용자 진행 흐름

```
1. Show & Tell 메인 페이지
    ↓
2. Week 1 카드 클릭 (또는 "Week 1 시작하기")
    ↓
3. Week 1 Home (/showtell/week/1)
    ├─ Content Pack 로드 (Topic 정보)
    ├─ Week Progress 로드 (진행 상태)
    └─ Day 버튼 활성화/비활성화 결정
    ↓
4. Day 1 버튼 클릭 (항상 가능)
    ↓ /showtell/week/1/day1
5. Day 1 완료 (Write + Fix)
    ├─ day1_completed: true
    ├─ day1_submission_id: "sub_..."
    └─ current_day: 2
    ↓
6. Week 1 Home으로 돌아가기 (또는 자동 이동)
    ├─ Day 1: ✅ 완료 (초록색)
    └─ Day 2: 활성화 (파란색)
    ↓
7. Day 2 버튼 클릭 (Day 1 완료 후 가능)
    ↓ /showtell/week/1/day2?submissionId=sub_...
8. Day 2 완료 (Script + Shadowing)
    ├─ day2_completed: true
    ├─ day2_script_id: "script_..."
    ├─ day2_shadowing_audio_ids: ["audio_1", "audio_2", "audio_3"]
    └─ current_day: 3
    ↓
9. Week 1 Home으로 돌아가기
    ├─ Day 1, 2: ✅ 완료
    └─ Day 3: 활성화
    ↓
10. Day 3 버튼 클릭 (Day 2 완료 후 가능)
    ↓ /showtell/week/1/day3?submissionId=sub_...
11. Day 3 완료 (Rehearsal + Judge)
    ├─ day3_completed: true
    ├─ portfolio_completed: true
    ├─ portfolio_id: "portfolio_child_demo_001_week1"
    └─ completed_at: "2025-12-27T..."
    ↓
12. Week 1 Home으로 돌아가기
    ├─ Day 1, 2, 3: ✅ 완료
    ├─ 🎉 완료 섹션 표시
    ├─ [📂 Portfolio 보기] 버튼
    └─ [다음 주차 시작하기 (Week 2)] 버튼
```

---

## ✅ 완료 조건 (AC) 체크

### Week Home 페이지
- ✅ 상단에 Topic Title 표시
- ✅ 아래에 Day 1, 2, 3 버튼 배치
- ✅ 완료 체크 표시 (✅ 완료 / ⏳ 진행 중)

### 전환 규칙 (강제 동선)
- ✅ Day 1 저장/교정 완료 → Day 2 CTA 활성화
- ✅ Day 2 shadowing 1회 이상 → Day 3 CTA 활성화
- ✅ Day 3 완료 → Portfolio 카드 생성 + Week 2로 "다음 주 시작" 버튼

### UI/UX
- ✅ 비활성화 버튼: 회색 + 클릭 불가 + 🔒 메시지
- ✅ 활성화 버튼: 색상 구분 (파란/보라/핑크) + hover 효과
- ✅ 완료 버튼: 초록색 + "✅ 완료! 다시 보기" 텍스트

---

## 📁 생성/수정된 파일

### 신규 페이지 (1개)
```
app/showtell/week/[week]/page.tsx     (Week Home)
```

### 수정된 파일 (1개)
```
app/showtell/components/PortfolioGrid.tsx
  - "다음 주차 시작하기" 카드 클릭 시 Week Home으로 이동
```

### 문서 (1개)
```
SHOWTELL_WEEK_HOME_COMPLETE.md
```

---

## 🚀 실행 방법

### 1. Week Home 접근
```
http://localhost:3000/showtell/week/1
```

### 2. Day 순차 진행
```
Week 1 Home → Day 1 → (완료) → Week 1 Home → Day 2 → (완료) → Week 1 Home → Day 3 → (완료) → Week 1 Home (완료 섹션)
```

### 3. 다음 주차 시작
```
Week 1 완료 섹션 → "다음 주차 시작하기 (Week 2)" 버튼 → Week 2 Home
```

---

## 📝 테스트 시나리오

### 시나리오 1: 신규 사용자 (Week 1 첫 시작)
1. Show & Tell 메인 페이지 진입
2. "Week 1 시작하기" 카드 클릭
3. **Week 1 Home** 진입
   - Day 1: 활성화 (파란색)
   - Day 2, 3: 비활성화 (회색 + 🔒)
4. Day 1 버튼 클릭 → Day 1 페이지로 이동
5. Day 1 완료 → Week 1 Home으로 돌아가기
   - Day 1: ✅ 완료 (초록색)
   - Day 2: 활성화 (보라색)
   - Day 3: 비활성화 (회색 + 🔒)

### 시나리오 2: Day 순차 진행 강제
1. Week 1 Home에서 **Day 3 버튼 클릭** (Day 2 미완료 상태)
2. Alert 표시: "⚠️ Day 2를 먼저 완료해주세요!"
3. 클릭 무시 (이동 안 됨)

### 시나리오 3: Week 완료 후 다음 주차
1. Week 1 Day 3 완료
2. Week 1 Home에 **완료 섹션** 표시
   - 🎉 Week 1 완료!
   - [📂 Portfolio 보기] 버튼
   - [다음 주차 시작하기 (Week 2)] 버튼
3. "다음 주차 시작하기" 클릭
4. **Week 2 Home** 진입
   - 모든 Day 버튼 비활성화 (아직 시작 안 함)
   - Day 1만 활성화

---

## 🔧 추후 개선 사항

### 진행 중인 Day로 자동 이동
현재는 Week Home에서 수동으로 Day를 선택하지만, `current_day`를 사용하여 자동 이동 가능:
```typescript
// Week Home 진입 시
if (weekProgress.current_day && !weekProgress[`day${weekProgress.current_day}_completed`]) {
  // 진행 중인 Day로 자동 리다이렉트
  router.push(`/showtell/week/${week}/day${weekProgress.current_day}`);
}
```

### 진행률 표시
Week Home에 전체 진행률 표시:
```typescript
const completionRate = (
  (weekProgress.day1_completed ? 1 : 0) +
  (weekProgress.day2_completed ? 1 : 0) +
  (weekProgress.day3_completed ? 1 : 0)
) / 3 * 100;

// UI
<div className="w-full bg-gray-200 rounded-full h-4">
  <div 
    className="bg-blue-500 h-4 rounded-full" 
    style={{ width: `${completionRate}%` }}
  />
</div>
```

### Breadcrumb 네비게이션
```
Show & Tell > Week 1 > Day 1 > Write
```

---

## 📚 관련 문서

- [Day 1 구현 완료](./SHOWTELL_DAY1_COMPLETE.md)
- [Day 2 구현 완료](./SHOWTELL_DAY2_COMPLETE.md)
- [Day 3 구현 완료](./SHOWTELL_DAY3_COMPLETE.md)
- [Portfolio 구현 완료](./SHOWTELL_PORTFOLIO_COMPLETE.md)

---

## 🎊 전체 구현 완료!

| Stage | 기능 | 상태 |
|-------|------|------|
| ✅ Stage 1 | Penpal Feature Flag | 완료 |
| ✅ Stage 2 | Show & Tell 콘텐츠 시스템 | 완료 |
| ✅ Stage 4 | 학습 진행 데이터 | 완료 |
| ✅ Stage 5 | Day 1 (Write + Fix) | 완료 |
| ✅ Stage 6 | Day 2 (Script + TTS + Shadowing) | 완료 |
| ✅ Stage 7 | Day 3 (Rehearsal + Judge) | 완료 |
| ✅ Stage 8 | Portfolio (Week 완료) | 완료 |
| ✅ **Stage 9** | **Week Home & 화면 전환** | **완료** |

---

**작성일**: 2025-12-27  
**작성자**: Cursor AI Assistant  
**상태**: ✅ Week Home & 화면 전환 로직 구현 완료

**Show & Tell 12주 코스 전체 구현 100% 완료!** 🎉🎊🎈🌟✨




