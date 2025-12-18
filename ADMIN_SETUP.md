# 관리자 페이지 설정 가이드

## 🔐 관리자 계정 생성 방법

관리자 계정을 생성하는 방법은 총 3가지가 있습니다. 가장 편리한 방법부터 순서대로 안내합니다.

---

### 방법 1: 스크립트 사용 (가장 빠름) ⚡

이 방법은 터미널에서 명령어 한 줄로 관리자 권한을 부여할 수 있어 가장 빠릅니다.

#### 1단계: 사용자 UID 확인

**옵션 A: 관리자 페이지에서 확인 (가장 쉬움)**
1. 관리자로 지정할 계정으로 로그인
2. `/admin/settings` 페이지 접속
3. "내 사용자 UID 확인" 섹션에서 UID 복사

**옵션 B: Firebase Console에서 확인**
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 (`mflow-englishdiary`)
3. 좌측 메뉴에서 **Authentication** 클릭
4. **Users** 탭에서 사용자 이메일 클릭
5. **User UID** 복사

#### 2단계: 스크립트 실행

터미널에서 다음 명령어 실행:

```bash
npx tsx scripts/create-admin.ts YOUR_USER_UID
```

**예시:**
```bash
npx tsx scripts/create-admin.ts abc123xyz456def789
```

#### 3단계: 확인

스크립트가 성공적으로 실행되면:
- ✅ "관리자 권한이 성공적으로 부여되었습니다!" 메시지 표시
- 해당 계정으로 로그인하여 `/admin` 페이지 접근 가능

---

### 방법 2: Firebase Console에서 직접 설정 (시각적 방법) 🖱️

이 방법은 Firebase Console의 웹 인터페이스를 사용하여 시각적으로 설정할 수 있습니다.

#### 1단계: 사용자 UID 확인

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 (`mflow-englishdiary`)
3. 좌측 메뉴에서 **Authentication** 클릭
4. **Users** 탭에서 관리자로 지정할 사용자 찾기
5. 사용자 이메일 클릭
6. **User UID** 복사 (예: `abc123xyz456def789`)

#### 2단계: Firestore Database 열기

1. 좌측 메뉴에서 **Firestore Database** 클릭
2. **데이터** 탭이 선택되어 있는지 확인

#### 3단계: `admins` 컬렉션 생성

1. **컬렉션 시작** 버튼 클릭 (또는 기존 컬렉션이 없으면 자동으로 표시됨)
2. 컬렉션 ID 입력: `admins`
3. **다음** 클릭

#### 4단계: 문서 생성

1. 문서 ID 입력: **1단계에서 복사한 사용자 UID** (예: `abc123xyz456def789`)
   - ⚠️ 중요: 문서 ID는 반드시 사용자의 UID와 정확히 일치해야 합니다!
2. **문서 ID 자동 생성** 체크 해제 (직접 입력해야 함)
3. **다음** 클릭

#### 5단계: 필드 추가

1. **필드 추가** 클릭
2. 필드 이름: `isAdmin`
3. 타입: `boolean` 선택
4. 값: `true` 입력
5. **저장** 클릭

#### 6단계: 확인

Firestore에 다음과 같은 구조가 생성되었는지 확인:

```
admins (컬렉션)
  └── [사용자 UID] (문서)
      └── isAdmin: true (필드)
```

---

### 방법 3: 브라우저 콘솔 사용 (개발자용) 💻

이 방법은 개발자가 브라우저 콘솔에서 직접 확인할 때 유용합니다.

1. **웹 앱에서 로그인**
   - 관리자로 지정할 계정으로 로그인

2. **브라우저 개발자 도구 열기**
   - Windows/Linux: `F12` 또는 `Ctrl + Shift + I`
   - Mac: `Cmd + Option + I`

3. **콘솔 탭에서 UID 확인**
   ```javascript
   // Firebase Auth에서 현재 사용자 UID 확인
   import { getAuth } from "firebase/auth";
   const auth = getAuth();
   console.log("User UID:", auth.currentUser?.uid);
   ```
   또는 더 간단하게:
   ```javascript
   // 이미 로그인된 경우
   console.log("User UID:", firebase.auth().currentUser?.uid);
   ```

4. **확인된 UID로 방법 1 또는 방법 2 진행**

## 📋 관리자 페이지 접근

1. **관리자 계정으로 로그인**
   - 관리자 권한이 부여된 계정으로 로그인

2. **관리자 페이지 접근**
   - URL에 `/admin` 입력 (예: `http://localhost:3000/admin`)
   - 또는 대시보드에서 관리자 페이지 링크 클릭

3. **권한 확인**
   - 관리자 권한이 확인되면 대시보드 표시
   - 권한이 없으면 자동으로 `/dashboard`로 리디렉션

## 🔍 관리자 권한 확인 방법

관리자 권한이 제대로 부여되었는지 확인하려면:

1. **Firestore에서 확인**
   - Firebase Console → Firestore Database
   - `admins` 컬렉션 확인
   - 해당 UID의 문서에 `isAdmin: true` 필드가 있는지 확인

2. **웹 앱에서 확인**
   - 관리자 계정으로 로그인
   - `/admin` 페이지 접근 시도
   - 접근 가능하면 권한이 정상적으로 부여된 것입니다

## 🛡️ 보안 주의사항

- 관리자 권한은 신중하게 부여하세요
- API 키는 안전하게 관리하세요
- 정기적으로 관리자 목록을 확인하세요

## 📝 관리자 페이지 기능

### ✅ 구현 완료
- 📊 대시보드 요약 (통계)
- 👨‍👩‍👧 유저/아이 관리
- 📝 콘텐츠 검토 및 제어
- 🎁 포인트 & 리워드 관리
- 🤖 AI 피드백 모니터링
- 💌 고객 지원 / 피드백
- ⚙️ 설정/테스트 도구
- 🔑 API 키 설정

## 🚀 다음 단계

관리자 계정을 생성한 후 다음 단계를 진행하세요:

1. ✅ **관리자 계정 생성** (현재 단계)
2. 🔑 **API 키 설정** (`/admin/api-keys`)
   - OpenAI API 키 설정 (GPT 첨삭 기능)
   - Google Vision API 키 설정 (OCR 기능)
3. 🎁 **포인트 시스템 설정** (`/admin/rewards`)
   - 일기 작성, 첨삭 완료 등 포인트 설정
   - 리워드 목록 관리
4. 💌 **공지사항 등록** (`/admin/support`)
   - 사용자에게 보여줄 공지사항 작성
   - FAQ 관리

## ❓ 문제 해결

### 관리자 페이지에 접근할 수 없어요

1. **UID 확인**
   - Firestore의 `admins` 컬렉션에 올바른 UID로 문서가 생성되었는지 확인
   - 문서 ID가 사용자 UID와 정확히 일치하는지 확인

2. **필드 확인**
   - `isAdmin` 필드가 `boolean` 타입인지 확인
   - 값이 `true`인지 확인 (문자열 "true"가 아닌 boolean true)

3. **캐시 확인**
   - 브라우저를 새로고침 (Ctrl+F5 또는 Cmd+Shift+R)
   - 로그아웃 후 다시 로그인

4. **Firestore 규칙 확인**
   - Firestore 보안 규칙이 `admins` 컬렉션 읽기를 허용하는지 확인

### 스크립트 실행 시 오류가 발생해요

1. **Firebase 설정 확인**
   - `.env.local` 파일에 Firebase 설정이 올바르게 되어 있는지 확인
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`가 올바른지 확인

2. **Firestore 활성화 확인**
   - Firebase Console에서 Firestore Database가 활성화되어 있는지 확인

3. **UID 형식 확인**
   - UID에 공백이나 특수문자가 포함되지 않았는지 확인
   - 전체 UID를 정확히 복사했는지 확인





