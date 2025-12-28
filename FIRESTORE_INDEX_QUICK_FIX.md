# 🔥 Firestore 인덱스 생성 - Show & Tell

## 🚨 현재 발생한 에러

```
The query requires an index. You can create it here:
https://console.firebase.google.com/v1/r/project/mflow-englishdiary/firestore/indexes?create_composite=...
```

**해결 방법: 아래 링크를 클릭하여 인덱스를 자동 생성하세요!**

---

## ⚡ 빠른 해결 방법 (30초)

### 1단계: 에러 메시지의 링크 클릭

에러 메시지에 있는 **Firebase Console 링크**를 클릭하면 자동으로 인덱스 생성 화면이 열립니다:

```
https://console.firebase.google.com/v1/r/project/mflow-englishdiary/firestore/indexes?create_composite=CmNwcm9qZWN0cy9tZmxvdy1lbmdsaXNoZGlhcnkvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3Nob3d0ZWxsX3BvcnRmb2xpb19pdGVtcy9pbmRleGVzL18QARoMCghjaGlsZF9pZBABGg0KCWNvdXJzZV9pZBABGggKBHdlZWsQARoMCghfX25hbWVfXxAB
```

### 2단계: "인덱스 만들기" 버튼 클릭

Firebase Console에서 **"인덱스 만들기"** 또는 **"Create Index"** 버튼을 클릭합니다.

### 3단계: 인덱스 빌드 완료 대기 (1-2분)

- 상태: **빌드 중** → **사용 설정됨** (초록색)
- 소량 데이터는 1-2분이면 완료됩니다.

### 4단계: 페이지 새로고침

인덱스 빌드가 완료되면 Show & Tell 페이지를 **새로고침**하세요!

---

## 📋 필요한 인덱스 전체 목록 (Show & Tell)

Show & Tell 12주 코스를 위해 **5개의 인덱스**가 필요합니다:

| 번호 | 컬렉션 | 필드 | 필수 여부 | 용도 |
|------|--------|------|-----------|------|
| 1 | `showtell_portfolio_items` | child_id, course_id, week | ⚠️ **필수** | Portfolio 목록 조회 |
| 2 | `showtell_week_progress` | child_id, course_id, week | ⚠️ **필수** | 진행 상태 조회 |
| 3 | `showtell_content_packs` | course_id, active, week | 선택 | 콘텐츠 조회 |
| 4 | `showtell_topics` | active, week | 선택 | 주제 목록 조회 |
| 5 | `showtell_judge_question_sets` | active, week | 선택 | 질문 세트 조회 |

---

## 🛠️ 수동 인덱스 생성 방법

에러 링크가 작동하지 않거나, 다른 인덱스도 미리 생성하고 싶다면:

### 인덱스 1: Portfolio 조회 (⚠️ 필수)

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **Firestore Database** → **인덱스** 탭 클릭
3. **"복합 인덱스 추가"** 버튼 클릭
4. 다음 정보 입력:

```
컬렉션 ID: showtell_portfolio_items

필드 추가:
  - 필드 경로: child_id    | 쿼리 범위: 오름차순
  - 필드 경로: course_id   | 쿼리 범위: 오름차순
  - 필드 경로: week        | 쿼리 범위: 오름차순
```

5. **"만들기"** 클릭
6. 빌드 완료 대기 (1-2분)

---

### 인덱스 2: Week Progress 조회 (⚠️ 필수)

```
컬렉션 ID: showtell_week_progress

필드 추가:
  - 필드 경로: child_id    | 쿼리 범위: 오름차순
  - 필드 경로: course_id   | 쿼리 범위: 오름차순
  - 필드 경로: week        | 쿼리 범위: 오름차순
```

---

### 인덱스 3: Content Packs 조회 (선택)

```
컬렉션 ID: showtell_content_packs

필드 추가:
  - 필드 경로: course_id   | 쿼리 범위: 오름차순
  - 필드 경로: active      | 쿼리 범위: 오름차순
  - 필드 경로: week        | 쿼리 범위: 오름차순
```

---

## ✅ 인덱스 생성 확인 방법

### 방법 1: Firebase Console에서 확인

1. Firebase Console → Firestore Database → **인덱스** 탭
2. 다음 인덱스가 **"사용 설정됨"** (초록색) 상태인지 확인:
   - ✅ `showtell_portfolio_items` (child_id, course_id, week)
   - ✅ `showtell_week_progress` (child_id, course_id, week)

### 방법 2: 실제 페이지 접속으로 확인

1. Show & Tell 메인 페이지 접속: `http://localhost:3000/showtell`
2. 에러 없이 Portfolio 카드가 보이면 **인덱스 생성 성공!** ✅

---

## 🎯 인덱스가 필요한 이유

Firestore는 다음 경우에 **복합 인덱스**가 필수입니다:

### 1. 여러 필드 WHERE + ORDER BY
```typescript
// ❌ 인덱스 없으면 에러
query(
  collection(db, "showtell_portfolio_items"),
  where("child_id", "==", "C123"),      // WHERE 조건 1
  where("course_id", "==", "show_tell_12w"), // WHERE 조건 2
  orderBy("week", "asc")                // ORDER BY
)
```

### 2. 범위 쿼리 + ORDER BY
```typescript
// ❌ 인덱스 없으면 에러
query(
  collection(db, "showtell_week_progress"),
  where("week", ">=", 1),
  orderBy("week", "asc")
)
```

### ✅ 인덱스 불필요한 경우
```typescript
// ✅ 단일 문서 조회는 인덱스 불필요
const docRef = doc(db, "showtell_portfolio_items", "portfolio_id");
const docSnap = await getDoc(docRef);
```

---

## 🚨 자주 발생하는 에러

### 에러 1: "The query requires an index"
```
FirebaseError: The query requires an index. You can create it here: https://...
```

**해결:** 에러 메시지의 링크 클릭 → 인덱스 생성

---

### 에러 2: 인덱스 빌드 중 (Building)
```
Index status: Building...
```

**해결:** 1-2분 대기 (소량 데이터) 또는 수십 분 대기 (대량 데이터)

---

### 에러 3: 인덱스 생성 실패
```
Index creation failed
```

**해결:** 
1. Firebase 프로젝트의 Firestore 권한 확인
2. 컬렉션 이름 오타 확인
3. 필드 이름 오타 확인
4. 다시 생성 시도

---

## 📊 인덱스 생성 상태 확인

Firebase Console → Firestore Database → **인덱스** 탭에서:

| 상태 | 의미 | 조치 |
|------|------|------|
| 🟢 **사용 설정됨** | 정상 작동 | 없음 |
| 🟡 **빌드 중** | 생성 진행 중 | 1-2분 대기 |
| 🔴 **오류** | 생성 실패 | 삭제 후 재생성 |

---

## 🎉 인덱스 생성 완료 후

**테스트:**
1. Show & Tell 메인 페이지 접속: `http://localhost:3000/showtell`
2. Portfolio 카드가 정상적으로 표시되는지 확인
3. Week Home (예: `/showtell/week/1`) 접속 가능한지 확인

**예상 결과:**
- ✅ Portfolio 그리드가 Week 1~12 카드로 채워짐
- ✅ 에러 없이 페이지 로딩 완료
- ✅ "Start Next Week" 버튼 표시 (Week 1부터 시작 가능)

---

## 📚 참고 자료

- [Firestore 인덱스 공식 문서](https://firebase.google.com/docs/firestore/query-data/indexing)
- [복합 인덱스 가이드](https://firebase.google.com/docs/firestore/query-data/index-overview)

---

**작성일**: 2025-12-27  
**상태**: ⚠️ **Portfolio 인덱스 생성 필수**





