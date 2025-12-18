# Firebase 설정 단계별 가이드

## 🚨 현재 오류 해결

**오류 메시지**: `auth/api-key-not-valid.-please-pass-a-valid-api-key`

**원인**: `.env.local` 파일에 플레이스홀더 값(`your_firebase_api_key_here`)이 그대로 사용되고 있습니다.

## ✅ 해결 방법 (5분 안에 완료!)

### 1단계: Firebase 프로젝트 생성 (2분)

1. **Firebase Console 접속**
   - https://console.firebase.google.com/ 접속
   - Google 계정으로 로그인

2. **프로젝트 추가**
   - 화면 중앙의 **"프로젝트 추가"** 또는 **"Add project"** 클릭
   - 프로젝트 이름 입력 (예: `english-diary-app`)
   - **계속** 클릭

3. **Google Analytics 설정** (선택사항)
   - Analytics 사용 여부 선택
   - 사용 안 함 선택해도 됩니다
   - **프로젝트 만들기** 클릭

4. **완료 대기**
   - 프로젝트 생성 완료까지 30초~1분 소요

### 2단계: Authentication 활성화 (1분)

1. **Authentication 메뉴 클릭**
   - 좌측 사이드바에서 **Authentication** 클릭
   - 또는 **빌드(Build)** → **Authentication** 클릭

2. **시작하기 클릭**
   - "시작하기" 또는 "Get started" 버튼 클릭

3. **이메일/비밀번호 활성화**
   - **Sign-in method** 탭 클릭
   - **이메일/비밀번호** 항목 찾기
   - **사용 설정** 또는 **Enable** 클릭
   - 첫 번째 옵션(이메일/비밀번호)만 활성화하면 됩니다
   - **저장** 클릭

### 3단계: Firestore Database 생성 (1분)

1. **Firestore Database 메뉴 클릭**
   - 좌측 사이드바에서 **Firestore Database** 클릭
   - 또는 **빌드(Build)** → **Firestore Database** 클릭

2. **데이터베이스 만들기**
   - **데이터베이스 만들기** 또는 **Create database** 클릭

3. **보안 규칙 선택**
   - **테스트 모드로 시작** 선택 (개발 중이므로)
   - **다음** 클릭

4. **위치 선택**
   - 위치 선택 (예: `asia-northeast3` - 서울)
   - **완료** 클릭
   - 생성 완료까지 30초~1분 소요

### 4단계: 웹 앱 등록 및 설정 값 복사 (1분)

1. **프로젝트 설정 열기**
   - 좌측 상단 톱니바퀴 아이콘 ⚙️ 클릭
   - **프로젝트 설정** 또는 **Project settings** 클릭

2. **웹 앱 추가**
   - **내 앱** 섹션으로 스크롤
   - 웹 아이콘 `</>` 클릭

3. **앱 등록**
   - 앱 닉네임 입력 (예: `English Diary Web`)
   - **Firebase Hosting 설정**은 체크하지 않아도 됩니다
   - **앱 등록** 클릭

4. **설정 값 복사**
   - Firebase SDK 추가 화면이 나타남
   - `const firebaseConfig = { ... }` 부분의 값들을 복사:
     ```javascript
     apiKey: "AIzaSyC...",  // ← 이 값 복사
     authDomain: "your-project.firebaseapp.com",  // ← 이 값 복사
     projectId: "your-project-id",  // ← 이 값 복사
     storageBucket: "your-project.appspot.com",  // ← 이 값 복사
     messagingSenderId: "123456789",  // ← 이 값 복사
     appId: "1:123456789:web:abcdef"  // ← 이 값 복사
     ```

### 5단계: .env.local 파일 수정

1. **프로젝트 폴더에서 `.env.local` 파일 열기**
   ```
   C:\Users\y2k_w\nextjs-project\.env.local
   ```

2. **복사한 값들을 붙여넣기**
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC... (복사한 apiKey 값)
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com (복사한 authDomain)
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id (복사한 projectId)
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com (복사한 storageBucket)
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789 (복사한 messagingSenderId)
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef (복사한 appId)
   ```

   **중요**: 따옴표(`"`)는 제거하고 값만 입력하세요!

3. **파일 저장**

### 6단계: 개발 서버 재시작

1. **현재 실행 중인 서버 중지**
   - 터미널에서 `Ctrl + C` 누르기

2. **서버 다시 시작**
   ```bash
   npm run dev
   ```

3. **브라우저 새로고침**
   - `http://localhost:3000/login` 접속
   - 오류가 사라졌는지 확인

## ✅ 확인 체크리스트

- [ ] Firebase 프로젝트 생성 완료
- [ ] Authentication 활성화 (이메일/비밀번호)
- [ ] Firestore Database 생성 완료
- [ ] 웹 앱 등록 완료
- [ ] `.env.local` 파일에 **실제 값** 입력 (플레이스홀더 아님!)
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저에서 로그인 시도 → 오류 없음

## 🎯 예시: 올바른 .env.local 파일

```env
# ✅ 올바른 형식
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=english-diary-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=english-diary-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=english-diary-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# ❌ 잘못된 형식 (이렇게 하면 안 됩니다!)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyC..."
NEXT_PUBLIC_FIREBASE_API_KEY=dummy-key
```

## 🆘 여전히 오류가 발생하면

1. **`.env.local` 파일 확인**
   - 플레이스홀더 값(`your_...`)이 남아있지 않은지 확인
   - 따옴표가 없는지 확인
   - 줄바꿈이 올바른지 확인

2. **서버 완전히 재시작**
   ```bash
   # 터미널에서 Ctrl+C로 중지
   # 잠시 기다린 후
   npm run dev
   ```

3. **브라우저 캐시 삭제**
   - `Ctrl + Shift + Delete`
   - 또는 시크릿 모드로 테스트

4. **환경 변수 확인**
   - 브라우저 콘솔(F12)에서 확인:
     ```javascript
     console.log(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
     ```
   - `undefined`가 나오면 서버 재시작 필요

## 📸 스크린샷 가이드

각 단계별로 스크린샷이 필요하면:
- Firebase Console 화면 캡처
- 설정 값 복사 위치 표시
- `.env.local` 파일 내용 확인

## 🎉 완료!

Firebase 설정이 완료되면:
- ✅ 로그인/회원가입 정상 작동
- ✅ Firestore에 데이터 저장 가능
- ✅ 테스트 계정 생성 스크립트 사용 가능

이제 `/login` 페이지에서 테스트 계정으로 로그인할 수 있습니다!

