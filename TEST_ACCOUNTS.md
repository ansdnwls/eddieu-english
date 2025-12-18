# 테스트 계정 가이드

## 📋 기본 테스트 계정

프로젝트에는 다음 테스트 계정이 포함되어 있습니다:

### 1. 일반 테스트 계정
- **이메일**: `test@example.com`
- **비밀번호**: `test123456`
- **아이 정보**:
  - 이름: 테스트
  - 나이: 8세
  - 학년: 2학년
  - 영어 실력: 초급
  - AR 점수: 2.5
  - 아바타: 👦

### 2. 관리자 계정
- **이메일**: `admin@example.com`
- **비밀번호**: `admin123456`
- **아이 정보**:
  - 이름: 관리자
  - 나이: 10세
  - 학년: 4학년
  - 영어 실력: 중급
  - AR 점수: 4.0
  - 아바타: 🧑‍🎓

## 🚀 테스트 계정 생성 방법

### 방법 1: 스크립트 사용 (권장)

1. `.env.local` 파일에 Firebase 설정이 있는지 확인

2. 스크립트 실행:
```bash
node scripts/create-test-account.js
```

또는 TypeScript 버전:
```bash
npx tsx scripts/create-test-account.ts
```

스크립트는:
- 계정이 없으면 자동으로 생성
- 계정이 이미 있으면 로그인하여 아이 정보 업데이트
- Firestore에 아이 정보 저장

### 방법 2: 웹 UI 사용

1. 개발 서버 실행:
```bash
npm run dev
```

2. 브라우저에서 `/test-login` 접속

3. 원하는 테스트 계정 클릭하여 빠른 로그인

4. 계정이 없으면 회원가입 페이지로 이동

### 방법 3: Firebase Console에서 직접 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택
3. **Authentication** → **Users** 탭
4. **사용자 추가** 클릭
5. 이메일과 비밀번호 입력
6. **추가** 클릭

### 방법 4: 회원가입 페이지 사용

1. `/signup` 페이지 접속
2. 테스트 계정 정보로 회원가입
3. `/add-child`에서 아이 정보 입력

## 🔐 로그인 방법

### 웹 UI로 로그인

1. `/login` 또는 `/test-login` 접속
2. 테스트 계정 정보 입력
3. 로그인 후 자동으로 `/add-child` 또는 `/dashboard`로 이동

### 빠른 로그인 (테스트 페이지)

1. `/test-login` 접속
2. 원하는 테스트 계정 클릭
3. 자동 로그인

## 📝 계정 정보 수정

테스트 계정의 아이 정보를 수정하려면:

1. 로그인 후 `/dashboard` 접속
2. **정보 수정하기** 클릭
3. `/add-child`에서 정보 수정
4. 저장

## 🛠️ 스크립트 커스터마이징

`scripts/create-test-account.js` 파일을 수정하여 다른 테스트 계정을 추가할 수 있습니다:

```javascript
const testAccounts = [
  {
    email: "your-test@example.com",
    password: "your-password",
    childInfo: {
      name: "아이 이름",
      age: 8,
      grade: "2학년",
      englishLevel: "초급",
      arScore: "2.5",
      avatar: "👦",
    },
  },
  // 더 많은 계정 추가...
];
```

## ⚠️ 주의사항

1. **프로덕션 환경에서는 사용하지 마세요!**
   - 테스트 계정은 개발/테스트 전용입니다
   - 실제 서비스에서는 제거하거나 보안을 강화하세요

2. **Firebase 설정 확인**
   - `.env.local` 파일에 올바른 Firebase 설정이 있어야 합니다
   - 환경 변수 이름이 `NEXT_PUBLIC_`로 시작하는지 확인

3. **Firestore 규칙**
   - 개발 중에는 테스트 모드로 사용
   - 프로덕션에서는 보안 규칙 설정 필요

## 🔍 문제 해결

### "계정이 존재하지 않습니다"
- 스크립트를 실행하여 계정 생성
- 또는 `/signup`에서 수동으로 생성

### "Firebase 환경 변수가 설정되지 않았습니다"
- `.env.local` 파일 확인
- Firebase 설정 값이 올바른지 확인

### "로그인은 되지만 아이 정보가 없습니다"
- `/add-child` 페이지에서 아이 정보 입력
- 또는 스크립트를 다시 실행하여 아이 정보 저장

## 📚 관련 파일

- `scripts/create-test-account.js` - 계정 생성 스크립트
- `scripts/create-test-account.ts` - TypeScript 버전
- `app/test-login/page.tsx` - 빠른 로그인 페이지
- `FIREBASE_SETUP.md` - Firebase 설정 가이드

