# Firebase 빠른 설정 가이드

## 🚨 현재 오류 해결

현재 `dummy-key` 오류가 발생하는 이유는 Firebase 설정이 없기 때문입니다.

## ✅ 해결 방법

### 방법 1: Firebase 프로젝트 생성 및 설정 (권장)

1. **Firebase Console 접속**
   - https://console.firebase.google.com/ 접속
   - Google 계정으로 로그인

2. **프로젝트 생성**
   - "프로젝트 추가" 클릭
   - 프로젝트 이름 입력 (예: `english-diary-app`)
   - Google Analytics 설정 (선택사항)

3. **Authentication 활성화**
   - 좌측 메뉴에서 **Authentication** 클릭
   - "시작하기" 버튼 클릭
   - **Sign-in method** 탭에서 **이메일/비밀번호** 활성화

4. **Firestore Database 생성**
   - 좌측 메뉴에서 **Firestore Database** 클릭
   - "데이터베이스 만들기" 클릭
   - **테스트 모드로 시작** 선택
   - 위치 선택 (예: `asia-northeast3` - 서울)

5. **웹 앱 등록**
   - 프로젝트 설정 (톱니바퀴 아이콘) 클릭
   - **내 앱** 섹션에서 웹 아이콘 (</>) 클릭
   - 앱 닉네임 입력
   - **앱 등록** 클릭

6. **설정 값 복사**
   - Firebase 설정 화면에서 다음 값들을 복사:
     ```
     apiKey: "AIza..."
     authDomain: "your-project.firebaseapp.com"
     projectId: "your-project-id"
     storageBucket: "your-project.appspot.com"
     messagingSenderId: "123456789"
     appId: "1:123456789:web:abcdef"
     ```

7. **`.env.local` 파일 수정**
   - 프로젝트 루트의 `.env.local` 파일 열기
   - 복사한 값들을 입력:
     ```env
     NEXT_PUBLIC_FIREBASE_API_KEY=AIza... (복사한 apiKey 값)
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
     NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
     ```

8. **개발 서버 재시작**
   ```bash
   # Ctrl+C로 서버 중지 후
   npm run dev
   ```

### 방법 2: 임시로 오류 메시지 개선 (개발 중)

Firebase 설정 없이도 개발을 계속할 수 있도록 오류 메시지가 개선되었습니다.
하지만 실제 로그인/회원가입 기능을 사용하려면 Firebase 설정이 필요합니다.

## 🔍 확인 사항

### `.env.local` 파일 위치
```
nextjs-project/
└── .env.local  ← 여기에 있어야 합니다
```

### 환경 변수 형식
```env
# 올바른 형식
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC... (실제 값)

# 잘못된 형식
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_API_KEY=dummy-key
```

### 개발 서버 재시작
환경 변수를 변경한 후에는 **반드시 개발 서버를 재시작**해야 합니다:
```bash
# 터미널에서 Ctrl+C로 중지
# 그 다음 다시 시작
npm run dev
```

## 📝 체크리스트

- [ ] Firebase 프로젝트 생성 완료
- [ ] Authentication 활성화 (이메일/비밀번호)
- [ ] Firestore Database 생성
- [ ] 웹 앱 등록 완료
- [ ] `.env.local` 파일에 실제 Firebase 값 입력
- [ ] 개발 서버 재시작

## 🆘 여전히 오류가 발생하면

1. **브라우저 콘솔 확인**
   - F12 키를 눌러 개발자 도구 열기
   - Console 탭에서 오류 메시지 확인

2. **환경 변수 확인**
   ```bash
   # .env.local 파일 내용 확인
   cat .env.local
   ```

3. **서버 재시작**
   - 완전히 종료 후 다시 시작

4. **브라우저 캐시 삭제**
   - Ctrl+Shift+Delete
   - 캐시된 이미지 및 파일 삭제

## 📚 더 자세한 내용

- `FIREBASE_SETUP.md` - 상세한 Firebase 설정 가이드
- `QUICK_START.md` - 빠른 시작 가이드

