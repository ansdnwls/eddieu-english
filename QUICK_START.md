# 빠른 시작 가이드

## 🚀 테스트 계정 사용 방법

### 방법 1: `/login` 페이지에서 직접 로그인 (가장 간단!)

1. 개발 서버 실행:
```bash
npm run dev
```

2. 브라우저에서 `http://localhost:3000/login` 접속

3. 로그인 페이지 하단에 **테스트 계정 정보**가 표시됩니다:
   - **일반 계정**: test@example.com / test123456
   - **관리자**: admin@example.com / admin123456

4. **"일반 계정 자동 입력"** 또는 **"관리자 계정 자동 입력"** 버튼 클릭

5. **로그인** 버튼 클릭

6. 계정이 없으면 → `/signup` 페이지로 이동하여 회원가입
   - 회원가입 페이지에서도 자동 입력 버튼 사용 가능!

### 방법 2: 스크립트로 자동 생성

**먼저 Firebase 설정이 필요합니다:**

1. `.env.local` 파일 생성 및 Firebase 설정 추가:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

2. 스크립트 실행:
```bash
npm run create-test-accounts
```

3. 스크립트가 자동으로:
   - 테스트 계정 생성
   - 아이 정보 저장
   - 결과 출력

4. 이제 `/login`에서 테스트 계정으로 로그인 가능!

## 📋 테스트 계정 정보

### 일반 테스트 계정
- **이메일**: `test@example.com`
- **비밀번호**: `test123456`
- **아이 정보**: 8세, 2학년, 초급

### 관리자 계정
- **이메일**: `admin@example.com`
- **비밀번호**: `admin123456`
- **아이 정보**: 10세, 4학년, 중급

## 🎯 추천 워크플로우

### Firebase 설정 전 (빠른 테스트)
1. `/login` 접속
2. "일반 계정 자동 입력" 클릭
3. 로그인 시도 → 계정 없으면 `/signup`으로 이동
4. 회원가입 페이지에서 "일반 계정 자동 입력" 클릭
5. 회원가입 완료
6. `/add-child`에서 아이 정보 입력
7. 완료!

### Firebase 설정 후 (자동화)
1. `.env.local`에 Firebase 설정 추가
2. `npm run create-test-accounts` 실행
3. `/login`에서 자동 입력 버튼으로 로그인
4. 바로 사용 가능!

## ⚠️ 주의사항

- **Firebase 설정 없이도** `/login`과 `/signup` 페이지에서 수동으로 계정 생성 가능
- 스크립트는 Firebase 설정이 완료된 후에만 동작
- 테스트 계정은 **개발/테스트 전용**입니다

## 🔍 문제 해결

### "계정이 존재하지 않습니다"
→ `/signup` 페이지에서 먼저 회원가입하세요

### "Firebase 환경 변수가 설정되지 않았습니다"
→ 스크립트 실행 시만 필요합니다. 웹 UI에서는 Firebase 설정 없이도 회원가입 가능합니다.

### "로그인은 되는데 아이 정보가 없습니다"
→ `/add-child` 페이지에서 아이 정보를 입력하세요

