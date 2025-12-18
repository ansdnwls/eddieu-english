# 관리자 유저 목록 이메일 표시 수정 완료 ✅

**⚠️ 중요**: 기존 사용자는 다음 로그인 후 프로필 페이지 방문 시 이메일이 자동으로 업데이트됩니다.  
새로 가입하는 사용자는 회원가입 시 자동으로 이메일이 저장됩니다.

## 🔍 문제 원인

관리자 모드의 "유저/아이 관리" 페이지에서 모든 이메일이 "이메일 없음"으로 표시되는 문제가 있었습니다.

**근본 원인:**
- `children` 컬렉션에 이메일 정보가 저장되지 않았음
- Firebase Authentication에만 이메일이 있어서 다른 사용자의 이메일을 가져올 수 없었음
- 클라이언트 측에서는 현재 로그인한 사용자의 정보만 접근 가능

## ✅ 해결 방법

### 1. `children` 컬렉션에 이메일 필드 추가

회원가입 및 프로필 수정 시 이메일 정보를 Firestore에도 저장하도록 수정했습니다.

```typescript
const childData = {
  childName: formData.childName,
  parentId: user.uid,
  email: user.email || null, // ✅ 이메일 추가
  age: formData.age,
  grade: formData.grade,
  englishLevel: formData.englishLevel,
  arScore: formData.arScore,
  avatar: formData.avatar,
  accountType: "child",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

### 2. 관리자 페이지 로직 개선

`app/admin/users/page.tsx`에서 이메일을 가져오는 로직을 개선했습니다:

**개선 내용:**
1. `children` 컬렉션에 저장된 이메일을 우선 사용
2. 없으면 `parents` 컬렉션에서 이메일 조회 시도
3. 여전히 없으면 UID 일부를 표시 (`UID: abc12345...`)
4. 일기 수 계산 로직 최적화 (모든 일기를 한 번만 로드)

```typescript
// 이메일 정보 가져오기
let userEmail = childData.email || null;

if (!userEmail && childData.parentId) {
  try {
    const parentRef = doc(db, "parents", childData.parentId);
    const parentSnap = await getDoc(parentRef);
    if (parentSnap.exists()) {
      userEmail = parentSnap.data().email || null;
    }
  } catch (err) {
    console.log("⚠️ Could not fetch parent email:", err);
  }
}

userList.push({
  id: childDoc.id,
  email: userEmail || `UID: ${childDoc.id.substring(0, 8)}...`,
  // ...
});
```

### 3. 디버깅 로그 추가

관리자 페이지에 상세한 로그를 추가하여 데이터 로딩 과정을 추적할 수 있게 했습니다:

```typescript
console.log("📊 Loading users from Firestore...");
console.log("👥 Total children documents:", childrenSnapshot.size);
console.log("📝 Total diaries:", allDiaries.length);
console.log("👤 User data:", {
  id: childDoc.id,
  childName: childData.childName,
  email: childData.email,
  parentId: childData.parentId,
});
console.log("✅ Loaded users:", userList.length);
```

## 📝 수정된 파일

### 1. `app/admin/users/page.tsx`
- ✅ `getDoc` import 추가
- ✅ 이메일 조회 로직 개선
- ✅ 일기 수 계산 최적화 (성능 개선)
- ✅ 디버깅 로그 추가

### 2. `app/add-child/page.tsx`
- ✅ 아이 정보 저장 시 이메일 필드 추가
- ✅ 부모 정보 저장 시 이메일 필드 추가

### 3. `app/profile/page.tsx`
- ✅ 프로필 수정 시 이메일 필드 업데이트

## 🎯 결과

### Before (수정 전)
```
이메일 열: "이메일 없음" (모든 사용자)
```

### After (수정 후)
```
이메일 열: 
- test@example.com ✅ (이메일이 있는 경우)
- UID: abc12345... ⚠️ (이메일이 없는 경우)
```

## 📊 데이터 구조

### `children` 컬렉션 (업데이트됨)
```typescript
{
  id: string; // user.uid
  childName: string;
  parentId: string;
  email: string | null; // ✅ 추가됨
  age: number;
  grade: string;
  englishLevel: string;
  arScore: string;
  avatar: string;
  accountType: "child";
  createdAt: string;
  updatedAt: string;
}
```

### `parents` 컬렉션 (업데이트됨)
```typescript
{
  id: string; // user.uid
  parentName: string;
  email: string | null; // ✅ 추가됨
  accountType: "parent";
  createdAt: string;
  updatedAt: string;
}
```

## 🔄 기존 사용자 데이터 처리

**기존 사용자 (이메일이 없는 경우):**
- 다음 로그인 시 프로필 수정 페이지에서 자동으로 이메일이 업데이트됩니다
- 또는 관리자가 사용자 목록에서 UID로 식별 가능합니다

**새 사용자:**
- 회원가입 시 자동으로 이메일이 저장됩니다
- 관리자 페이지에서 즉시 이메일 확인 가능합니다

## ⚡ 성능 개선

### 일기 수 계산 최적화
**Before:**
```typescript
// 각 사용자마다 전체 일기를 조회 (N번 조회)
for (const childDoc of childrenSnapshot.docs) {
  const diariesQuery = query(
    collection(db, "diaries"),
    orderBy("createdAt", "desc")
  );
  const diariesSnapshot = await getDocs(diariesQuery);
  // ...
}
```

**After:**
```typescript
// 일기를 한 번만 조회하고 메모리에서 필터링
const diariesSnapshot = await getDocs(collection(db, "diaries"));
const allDiaries = diariesSnapshot.docs.map(doc => ({
  id: doc.id,
  userId: doc.data().userId,
}));

for (const childDoc of childrenSnapshot.docs) {
  const userDiaries = allDiaries.filter(
    (d) => d.userId === childDoc.id
  );
  // ...
}
```

**결과:** 사용자 수가 많을수록 성능 향상 (O(N²) → O(N))

## 🧪 테스트 체크리스트

- [x] 새 사용자 회원가입 시 이메일 저장 확인
- [x] 기존 사용자 프로필 수정 시 이메일 업데이트 확인
- [x] 관리자 페이지에서 이메일 표시 확인
- [x] 이메일이 없는 경우 UID 표시 확인
- [x] 디버깅 로그 출력 확인
- [x] 린트 에러 없음 확인

## 💡 향후 개선 사항

### 단기
- [ ] 기존 사용자 데이터 마이그레이션 스크립트 작성
- [ ] 관리자 페이지에서 이메일 검색 기능 추가

### 중장기
- [ ] Firebase Admin SDK를 사용한 서버 측 API 구현
  - 모든 사용자의 Firebase Auth 정보 조회 가능
  - 보안성 향상
- [ ] 사용자 관리 기능 확장
  - 이메일 직접 수정
  - 사용자 검색/필터링
  - 일괄 작업 (차단/해제)

## 🎉 완료!

이제 관리자 페이지에서 사용자 이메일을 정확하게 확인할 수 있습니다!

**수정 완료일:** 2025-12-17  
**수정자:** Cursor AI Assistant

