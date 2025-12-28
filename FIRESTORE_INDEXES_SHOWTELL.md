# Firestore 인덱스 생성 가이드 - Show & Tell 코스

## 📋 필요한 인덱스

Show & Tell 콘텐츠 시스템을 위한 Firestore 복합 인덱스

---

## 🔧 인덱스 1: Content Packs 전체 조회

**컬렉션:** `showtell_content_packs`

**필드:**
1. `course_id` - Ascending (==)
2. `active` - Ascending (==)
3. `week` - Ascending

**쿼리 사용처:**
```typescript
query(
  collection(db, "showtell_content_packs"),
  where("course_id", "==", "show_tell_12w"),
  where("active", "==", true),
  orderBy("week", "asc")
)
```

**생성 방법:**

### 방법 1: Firebase Console (권장)

1. Firebase Console → Firestore Database
2. "인덱스" 탭 클릭
3. "복합 인덱스 추가" 버튼 클릭
4. 다음 정보 입력:
   ```
   컬렉션 ID: showtell_content_packs
   필드 1: course_id (오름차순)
   필드 2: active (오름차순)
   필드 3: week (오름차순)
   ```
5. "만들기" 클릭
6. 인덱스 빌드 완료 대기 (약 1-2분)

### 방법 2: 자동 생성 (API 호출 시)

1. 개발 서버 실행: `npm run dev`
2. API 호출:
   ```bash
   curl http://localhost:3002/api/showtell/content
   ```
3. 콘솔에 인덱스 생성 링크 출력:
   ```
   The query requires an index. You can create it here:
   https://console.firebase.google.com/project/.../indexes?create_composite=...
   ```
4. 링크 클릭하여 자동으로 인덱스 생성

---

## 🔧 인덱스 2: Topics 조회

**컬렉션:** `showtell_topics`

**필드:**
1. `active` - Ascending (==)
2. `week` - Ascending

**쿼리 사용처:**
```typescript
query(
  collection(db, "showtell_topics"),
  where("active", "==", true),
  orderBy("week", "asc")
)
```

**생성 방법:**

Firebase Console에서:
```
컬렉션 ID: showtell_topics
필드 1: active (오름차순)
필드 2: week (오름차순)
```

---

## 🔧 인덱스 3: Judge Questions 조회

**컬렉션:** `showtell_judge_questions`

**필드:**
1. `active` - Ascending (==)
2. `week` - Ascending

**쿼리 사용처:**
```typescript
query(
  collection(db, "showtell_judge_questions"),
  where("active", "==", true),
  orderBy("week", "asc")
)
```

**생성 방법:**

Firebase Console에서:
```
컬렉션 ID: showtell_judge_questions
필드 1: active (오름차순)
필드 2: week (오름차순)
```

---

## ✅ 인덱스 확인

### Firebase Console에서 확인

1. Firebase Console → Firestore Database
2. "인덱스" 탭
3. 다음 인덱스들이 "사용 설정됨" 상태인지 확인:
   - ✅ `showtell_content_packs` (course_id, active, week)
   - ✅ `showtell_topics` (active, week)
   - ✅ `showtell_judge_questions` (active, week)
   - ✅ `showtell_portfolio_items` (child_id, course_id, week) ⚠️ **필수**
   - ✅ `showtell_week_progress` (child_id, course_id, week) ⚠️ **필수**

### API 테스트로 확인

```bash
# 개발 서버 시작
npm run dev

# 전체 콘텐츠 조회 (인덱스 필요)
curl http://localhost:3002/api/showtell/content

# 전체 주제 조회 (인덱스 필요)
curl http://localhost:3002/api/showtell/topics

# 성공 응답이면 인덱스가 정상적으로 생성됨
```

---

## 🚨 인덱스 생성 전 주의사항

### 인덱스 없이 API 호출 시

에러 발생:
```json
{
  "success": false,
  "error": "The query requires an index..."
}
```

**해결 방법:**
1. 콘솔 로그의 인덱스 생성 링크 클릭
2. 또는 Firebase Console에서 수동 생성
3. 인덱스 빌드 완료 후 API 재호출

### 인덱스 빌드 시간

- **소량 데이터 (12개):** 1-2분
- **대량 데이터:** 수십 분 ~ 몇 시간
- 빌드 중에도 단일 문서 조회는 가능

---

## 🔧 인덱스 4: Portfolio 조회 (⚠️ 필수)

**컬렉션:** `showtell_portfolio_items`

**필드:**
1. `child_id` - Ascending (==)
2. `course_id` - Ascending (==)
3. `week` - Ascending
4. `__name__` - Ascending (자동 추가)

**쿼리 사용처:**
```typescript
query(
  collection(db, "showtell_portfolio_items"),
  where("child_id", "==", child_id),
  where("course_id", "==", "show_tell_12w"),
  orderBy("week", "asc")
)
```

**생성 방법:**

### 🚀 빠른 생성 (권장)

**에러 메시지에 있는 링크를 클릭하세요:**
```
https://console.firebase.google.com/v1/r/project/mflow-englishdiary/firestore/indexes?create_composite=...
```

또는 Firebase Console에서 수동 생성:

1. Firebase Console → Firestore Database → "인덱스" 탭
2. "복합 인덱스 추가" 클릭
3. 다음 정보 입력:
   ```
   컬렉션 ID: showtell_portfolio_items
   필드 1: child_id (오름차순)
   필드 2: course_id (오름차순)
   필드 3: week (오름차순)
   ```
4. "만들기" 클릭
5. 인덱스 빌드 완료 대기 (약 1-2분)

---

## 🔧 인덱스 5: Week Progress 조회

**컬렉션:** `showtell_week_progress`

**필드:**
1. `child_id` - Ascending (==)
2. `course_id` - Ascending (==)
3. `week` - Ascending

**쿼리 사용처:**
```typescript
query(
  collection(db, "showtell_week_progress"),
  where("child_id", "==", child_id),
  where("course_id", "==", "show_tell_12w"),
  orderBy("week", "asc")
)
```

**생성 방법:**

Firebase Console에서:
```
컬렉션 ID: showtell_week_progress
필드 1: child_id (오름차순)
필드 2: course_id (오름차순)
필드 3: week (오름차순)
```

---

## 📝 인덱스 요약표

| 컬렉션 | 필드 1 | 필드 2 | 필드 3 | 용도 |
|--------|--------|--------|--------|------|
| `showtell_content_packs` | course_id | active | week | 전체 주차 조회 |
| `showtell_topics` | active | week | - | 주제 목록 조회 |
| `showtell_judge_questions` | active | week | - | 질문 세트 조회 |
| `showtell_portfolio_items` | child_id | course_id | week | Portfolio 조회 ⚠️ |
| `showtell_week_progress` | child_id | course_id | week | 진행 상태 조회 ⚠️ |

---

## 🔍 인덱스가 필요한 이유

Firestore는 다음 경우에 복합 인덱스가 필요합니다:

1. **여러 필드에 where 조건 + orderBy**
   ```typescript
   where("active", "==", true) + orderBy("week", "asc")
   ```

2. **범위 쿼리 + orderBy**
   ```typescript
   where("week", ">=", 1) + orderBy("week", "asc")
   ```

단일 문서 조회 (`doc()`, `getDoc()`)는 인덱스 불필요!

---

## 🎉 완료

인덱스 생성이 완료되면 Show & Tell 콘텐츠 API가 정상 동작합니다!

**테스트:**
```bash
# 전체 조회 성공
curl http://localhost:3002/api/showtell/content
# → { "success": true, "data": { "content_packs": [12개], "total": 12 } }

# 특정 주차 조회 성공 (인덱스 불필요)
curl http://localhost:3002/api/showtell/content?week=1
# → { "success": true, "data": { "content_pack": {...}, "topic": {...} } }
```

