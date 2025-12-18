# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `english-diary-app`)
4. Google Analytics 설정 (선택사항)

## 2. Authentication 설정

1. 좌측 메뉴에서 **Authentication** 클릭
2. "시작하기" 버튼 클릭
3. **Sign-in method** 탭 클릭
4. **이메일/비밀번호** 활성화
   - 첫 번째 옵션 (이메일/비밀번호) 활성화
   - 두 번째 옵션 (이메일 링크)는 선택사항

## 3. Firestore Database 설정

1. 좌측 메뉴에서 **Firestore Database** 클릭
2. "데이터베이스 만들기" 클릭
3. **테스트 모드로 시작** 선택 (개발 중)
   - 프로덕션 모드로 시작하려면 보안 규칙 설정 필요
4. 위치 선택 (예: `asia-northeast3` - 서울)

## 4. 웹 앱 등록

1. 프로젝트 설정 (톱니바퀴 아이콘) 클릭
2. **내 앱** 섹션에서 웹 아이콘 (</>) 클릭
3. 앱 닉네임 입력 (예: `English Diary Web`)
4. Firebase Hosting 설정은 선택사항
5. **앱 등록** 클릭

## 5. 환경 변수 설정

Firebase 설정에서 다음 값들을 복사하여 `.env.local` 파일에 추가:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## 6. Firestore 보안 규칙 (프로덕션용)

개발 중에는 테스트 모드로 사용하지만, 프로덕션 배포 시 다음 규칙을 설정하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자는 자신의 데이터만 읽고 쓸 수 있음
    match /children/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 7. 테스트

1. 개발 서버 실행: `npm run dev`
2. `/signup` 페이지에서 회원가입
3. `/login` 페이지에서 로그인
4. `/add-child` 페이지에서 아이 정보 입력
5. `/dashboard` 페이지에서 정보 확인

## 문제 해결

### "Firebase: Error (auth/invalid-api-key)"
- `.env.local` 파일이 제대로 생성되었는지 확인
- 환경 변수 이름이 `NEXT_PUBLIC_`로 시작하는지 확인
- 서버 재시작 필요

### Firestore 접근 오류
- Firestore Database가 생성되었는지 확인
- 보안 규칙이 올바르게 설정되었는지 확인

### 로그인 후 리디렉션 문제
- `AuthContext`가 제대로 설정되었는지 확인
- 브라우저 콘솔에서 오류 확인

