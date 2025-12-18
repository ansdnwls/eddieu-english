# Firebase 인덱스 생성 필요 📊

## ⚠️ 필수 인덱스

프로젝트를 정상적으로 사용하려면 다음 Firebase Firestore 인덱스를 생성해야 합니다.

---

## 1️⃣ Letter Proofs 인덱스

**컬렉션**: `letterProofs`

**필드**:
- `missionId` (Ascending)
- `stepNumber` (Ascending)
- `__name__` (Ascending)

**생성 방법**:
1. 아래 링크를 클릭하면 자동으로 Firebase Console이 열립니다
2. "인덱스 만들기" 버튼 클릭

**자동 생성 링크**:
```
https://console.firebase.google.com/v1/r/project/mflow-englishdiary/firestore/indexes?create_composite=Cldwcm9qZWN0cy9tZmxvdy1lbmdsaXNoZGlhcnkvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2xldHRlclByb29mcy9pbmRleGVzL18QARoNCgltaXNzaW9uSWQQARoOCgpzdGVwTnVtYmVyEAEaDAoIX19uYW1lX18QAQ
```

**사용처**:
- 펜팔 미션 페이지에서 편지 인증 목록 조회
- `letterProofs` 컬렉션에서 `missionId`와 `stepNumber`로 정렬하여 조회할 때

---

## 2️⃣ Diaries 인덱스 (기존)

**컬렉션**: `diaries`

**필드**:
- `userId` (Ascending)
- `createdAt` (Descending)

**사용처**:
- 사용자별 일기 목록 조회 (최신순)
- 대시보드, 통계 페이지

---

## 3️⃣ Penpal Matches 인덱스

**컬렉션**: `penpalMatches`

**필드**:
- `user1Id` (Ascending)
- `status` (Ascending)
- `createdAt` (Descending)

**사용처**:
- 사용자별 펜팔 매칭 목록 조회

**필드 (추가)**:
- `user2Id` (Ascending)
- `status` (Ascending)
- `createdAt` (Descending)

---

## 📋 전체 인덱스 목록

### 필수 인덱스
| 컬렉션 | 필드 1 | 필드 2 | 필드 3 | 우선순위 |
|--------|--------|--------|--------|----------|
| `letterProofs` | `missionId` ↑ | `stepNumber` ↑ | `__name__` ↑ | ⭐⭐⭐ 높음 |
| `diaries` | `userId` ↑ | `createdAt` ↓ | - | ⭐⭐ 중간 |
| `diaries` | `userId` ↑ | `accountType` ↑ | `createdAt` ↓ | ⭐⭐ 중간 |
| `penpalMatches` | `user1Id` ↑ | `status` ↑ | `createdAt` ↓ | ⭐ 낮음 |
| `penpalMatches` | `user2Id` ↑ | `status` ↑ | `createdAt` ↓ | ⭐ 낮음 |

---

## 🔧 인덱스 생성 방법

### 방법 1: 자동 생성 링크 사용 (권장)
1. 오류 메시지에 표시된 링크 클릭
2. Firebase Console 자동 오픈
3. "인덱스 만들기" 버튼 클릭
4. 생성 완료 (2-5분 소요)

### 방법 2: 수동 생성
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택: `mflow-englishdiary`
3. 왼쪽 메뉴에서 **Firestore Database** 클릭
4. 상단 탭에서 **인덱스** 클릭
5. **복합 인덱스 추가** 버튼 클릭
6. 필드 정보 입력:
   - 컬렉션 ID: `letterProofs`
   - 필드 추가:
     - `missionId` - 오름차순
     - `stepNumber` - 오름차순
7. **인덱스 만들기** 클릭

---

## ⏱️ 인덱스 생성 시간

- **단일 인덱스**: 2-5분
- **여러 인덱스**: 5-10분
- **대용량 데이터**: 10-30분

생성 중에는 다음과 같은 상태가 표시됩니다:
- 🟡 **빌드 중** (Building)
- 🟢 **사용 가능** (Enabled)

---

## ❌ 인덱스가 없을 때 발생하는 오류

```
FirebaseError: The query requires an index. 
You can create it here: [링크]
```

**오류 발생 위치**:
- `/penpal/mission/[matchId]` - 편지 인증 목록 조회 시
- `/stats` - 통계 페이지에서 일기 조회 시
- `/admin/content` - 관리자 콘텐츠 관리 시

---

## ✅ 인덱스 생성 확인

### Firebase Console에서 확인
1. Firestore Database → 인덱스 탭
2. 상태가 **사용 가능** (초록색)인지 확인

### 앱에서 확인
1. 해당 페이지 접속
2. 오류 없이 데이터가 정상 표시되는지 확인
3. 콘솔에 인덱스 관련 오류가 없는지 확인

---

## 📚 추가 리소스

- [Firebase 인덱스 가이드](https://firebase.google.com/docs/firestore/query-data/indexing)
- [복합 인덱스 모범 사례](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [인덱스 제한 사항](https://firebase.google.com/docs/firestore/quotas#indexes)

---

## 🚨 주의사항

1. **인덱스는 한 번만 생성하면 됩니다**
   - 동일한 인덱스를 중복 생성하지 마세요

2. **인덱스 개수 제한**
   - 단일 필드 인덱스: 무제한
   - 복합 인덱스: 프로젝트당 200개

3. **인덱스 크기**
   - 인덱스도 스토리지 용량을 차지합니다
   - 불필요한 인덱스는 삭제하세요

4. **쿼리 최적화**
   - 가능하면 인덱스가 필요 없는 간단한 쿼리 사용
   - `orderBy`와 `where`를 함께 사용할 때 인덱스 필요

---

## 🎯 빠른 해결 방법

오류가 발생하면:

1. **콘솔에서 링크 복사**
   ```
   The query requires an index. You can create it here: [링크]
   ```

2. **링크 클릭** → Firebase Console 자동 열림

3. **"인덱스 만들기" 클릭** → 완료!

4. **2-5분 대기** 후 페이지 새로고침

---

**작성일**: 2025-12-17  
**프로젝트**: 영어 일기 AI 첨삭

