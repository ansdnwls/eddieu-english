# 아이 영어일기 AI 첨삭 웹앱 (MVP)

![Project Banner](https://via.placeholder.com/800x200/4F46E5/FFFFFF?text=AI+English+Diary+Correction+for+Kids)

## 📘 프로젝트 소개

아이들의 영어 일기를 AI가 따뜻하고 정확하게 첨삭해주는 웹 서비스입니다.
- 손글씨 일기 사진 업로드 지원 (OCR)
- 아이 나이에 맞춘 맞춤형 피드백
- 교정 전/후 비교 및 상세 설명
- 응원 메시지로 학습 동기 부여

## 🎯 주요 기능

### MVP 버전
- ✅ **회원가입/로그인** (Firebase Authentication)
- ✅ **아이 정보 입력** (이름, 나이, 학년, 영어 실력, AR 점수, 아바타)
- ✅ **보호된 라우트** (로그인 필요 페이지)
- ✅ 사진 업로드 (드래그 앤 드롭 지원)
- ✅ 나이 선택 (6-13세)
- ✅ AI 첨삭 (GPT 기반)
- ✅ 교정 전후 비교
- ✅ 상세한 교정 내역 및 설명
- ✅ 응원 메시지
- ✅ Firestore 데이터 저장 및 LocalStorage 백업

### 향후 확장 기능
- 📚 단어장 생성
- 🗣️ TTS 따라 말하기
- 🧑‍🎨 아바타 피드백
- 📝 영어 펜팔 교환
- 📖 AI 동화책 생성

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion
- **Font**: Pretendard
- **Authentication**: Firebase Authentication
- **Database**: Firestore (Cloud Firestore)

### Backend (별도 구현 필요)
- **Framework**: FastAPI (Python)
- **OCR**: pytesseract 또는 Google Vision API
- **AI**: OpenAI GPT-3.5/4 또는 Claude

## 🚀 시작하기

### 1. 프론트엔드 실행

```bash
cd nextjs-project
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 2. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication 활성화 (이메일/비밀번호 방식)
3. Firestore Database 생성
4. 웹 앱 추가 후 설정 값 복사

### 3. 환경 변수 설정

`.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
```

필요한 환경 변수 설정:
```env
# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# OpenAI API (백엔드용)
OPENAI_API_KEY=your_api_key_here
BACKEND_URL=http://localhost:8000
```

## 📂 프로젝트 구조

```
nextjs-project/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # 로그인 페이지
│   │   └── signup/
│   │       └── page.tsx          # 회원가입 페이지
│   ├── add-child/
│   │   └── page.tsx              # 아이 정보 입력 페이지
│   ├── dashboard/
│   │   └── page.tsx               # 대시보드 (보호된 페이지)
│   ├── api/
│   │   └── correct-diary/
│   │       └── route.ts          # API 엔드포인트
│   ├── components/
│   │   ├── ImageUpload.tsx       # 이미지 업로드 컴포넌트
│   │   ├── AgeSelector.tsx       # 나이 선택 컴포넌트
│   │   ├── LoadingSpinner.tsx    # 로딩 스피너
│   │   ├── CorrectionResult.tsx  # 결과 표시 컴포넌트
│   │   └── AuthGuard.tsx         # 인증 보호 컴포넌트
│   ├── types/
│   │   └── index.ts              # TypeScript 타입 정의
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 메인 페이지
│   └── globals.css               # 글로벌 스타일
├── contexts/
│   └── AuthContext.tsx           # 인증 Context
├── lib/
│   └── firebase.ts               # Firebase 초기화
├── components/
│   └── AuthGuard.tsx             # 인증 가드 컴포넌트
├── public/                       # 정적 파일
├── package.json
└── README.md
```

## 🔌 백엔드 연동 가이드

### Option 1: FastAPI 백엔드 사용

1. FastAPI 서버 구축:

```python
# backend/main.py
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from PIL import Image
import openai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/correct")
async def correct_diary(
    image: UploadFile = File(...),
    age: int = Form(...)
):
    # OCR 처리
    img = Image.open(image.file)
    text = pytesseract.image_to_string(img)
    
    # GPT 첨삭
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{
            "role": "system",
            "content": f"You are a kind English teacher for a {age}-year-old child."
        }, {
            "role": "user",
            "content": f"Please correct this diary and give warm feedback: {text}"
        }]
    )
    
    # 결과 반환
    return {
        "success": True,
        "data": {
            "originalText": text,
            "correctedText": response.choices[0].message.content,
            # ... 추가 데이터
        }
    }
```

2. `app/api/correct-diary/route.ts` 수정:

```typescript
const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
const response = await fetch(`${backendUrl}/api/correct`, {
  method: "POST",
  body: formData,
});
```

### Option 2: Next.js API Route에서 직접 처리

`app/api/correct-diary/route.ts`에서 OpenAI API를 직접 호출할 수도 있습니다.

## 📱 반응형 디자인

- 모바일, 태블릿, 데스크톱 모두 지원
- Tailwind CSS의 responsive breakpoints 활용
- 터치 인터랙션 최적화

## 🎨 디자인 특징

- 아이 친화적인 밝고 따뜻한 색상
- 부드러운 애니메이션 (Framer Motion)
- 이모지를 활용한 직관적인 UI
- 깔끔한 한글 폰트 (Pretendard)

## 🧪 현재 상태

- ✅ MVP 프론트엔드 완성
- ✅ Firebase Authentication 연동
- ✅ 회원가입/로그인 기능
- ✅ 아이 정보 입력 및 저장 (Firestore + LocalStorage)
- ✅ 보호된 라우트 구현
- ✅ Mock API 구현
- ⏳ 실제 OCR 연동 필요
- ⏳ GPT API 연동 필요
- ⏳ 백엔드 서버 구축 필요

## 📝 개발 로드맵

### Phase 1: MVP (완료)
- [x] 기본 UI/UX 구현
- [x] Firebase Authentication 연동
- [x] 회원가입/로그인 페이지
- [x] 아이 정보 입력 페이지
- [x] 보호된 라우트 (AuthGuard)
- [x] 대시보드 페이지
- [x] Firestore 데이터 저장
- [x] 파일 업로드 기능
- [x] 나이 선택 기능
- [x] Mock API 응답

### Phase 2: Backend Integration
- [ ] FastAPI 서버 구축
- [ ] OCR 연동 (pytesseract or Google Vision)
- [ ] OpenAI GPT API 연동
- [ ] 에러 핸들링 개선

### Phase 3: Enhanced Features
- [ ] 회원가입/로그인
- [ ] 일기 저장 및 히스토리
- [ ] 단어장 생성
- [ ] TTS 따라 말하기

### Phase 4: Advanced Features
- [ ] 아바타 시스템
- [ ] 펜팔 매칭
- [ ] AI 동화책 생성
- [ ] 모바일 앱 (React Native)

## 🤝 기여하기

이슈와 PR은 언제나 환영합니다!

## 📄 라이선스

MIT License

## 👨‍💻 개발자

Made with ❤️ for kids learning English

---

**Note**: 이 프로젝트는 교육용으로 개발되었으며, 실제 서비스를 위해서는 백엔드 구현 및 보안 강화가 필요합니다.
