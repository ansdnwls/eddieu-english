# 프로젝트 구조 및 코드 컨벤션 분석 리포트

## 📁 프로젝트 개요

**프로젝트명**: 아이 영어일기 AI 첨삭 웹앱  
**기술 스택**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Firebase + Framer Motion  
**목적**: 아이들의 영어 일기를 AI가 따뜻하고 정확하게 첨삭해주는 교육 서비스

---

## 🏗️ 프로젝트 구조

### 디렉토리 구조 패턴

```
nextjs-project/
├── app/                          # Next.js App Router 메인 디렉토리
│   ├── (auth)/                   # 라우트 그룹 - 인증 관련 페이지
│   │   ├── login/
│   │   │   └── page.tsx         # 로그인 페이지
│   │   └── signup/
│   │       └── page.tsx         # 회원가입 페이지
│   ├── api/                     # API Routes
│   │   ├── correct-diary/
│   │   │   └── route.ts        # 일기 첨삭 API
│   │   ├── generate-vocabulary/
│   │   │   └── route.ts        # 단어장 생성 API
│   │   └── ocr-diary/
│   │       └── route.ts        # OCR 처리 API
│   ├── components/              # 페이지 내부 컴포넌트
│   │   ├── ImageUpload.tsx     # 이미지 업로드
│   │   ├── CorrectionResult.tsx # 첨삭 결과 표시
│   │   ├── LoadingSpinner.tsx  # 로딩 스피너
│   │   └── ...
│   ├── admin/                   # 관리자 페이지 (보호된 라우트)
│   ├── dashboard/               # 대시보드
│   ├── types/
│   │   └── index.ts            # 타입 정의 중앙 관리
│   ├── utils/
│   │   ├── koreanHelper.ts     # 한글 유틸리티
│   │   └── pdfGenerator.ts     # PDF 생성
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 메인 페이지
│   └── globals.css             # 글로벌 스타일
├── components/                  # 전역 공유 컴포넌트
│   ├── AuthGuard.tsx           # 인증 가드
│   └── Providers.tsx           # Context Providers
├── contexts/                    # React Context
│   └── AuthContext.tsx         # 인증 Context
├── lib/                        # 외부 라이브러리 설정
│   └── firebase.ts             # Firebase 초기화
├── public/                     # 정적 파일
├── scripts/                    # 유틸리티 스크립트
└── package.json
```

### 핵심 구조 패턴

#### 1. **라우트 그룹 패턴** `(auth)`
```typescript
// 폴더명을 괄호로 감싸면 URL에 영향을 주지 않고 그룹화 가능
app/(auth)/login/page.tsx → /login
app/(auth)/signup/page.tsx → /signup
```

**용도**:
- 공통 레이아웃 공유
- 관련 페이지 그룹화
- URL 구조에 영향 없음

#### 2. **컴포넌트 분리 전략**
```
app/components/     → 페이지 내부 컴포넌트 (재사용 낮음)
components/         → 전역 공유 컴포넌트 (재사용 높음)
```

**결정 기준**:
- `app/components/`: 특정 기능에 종속된 컴포넌트
- `components/`: 여러 페이지에서 사용하는 범용 컴포넌트

#### 3. **타입 중앙 관리**
```typescript
// app/types/index.ts에서 모든 타입 정의
export interface CorrectionResult { ... }
export interface DiaryEntry { ... }
export type EnglishLevel = "Lv.1" | "Lv.2" | ...
```

---

## 💻 코드 컨벤션

### 1. 파일 명명 규칙

#### 파일 타입별 네이밍

| 파일 타입 | 규칙 | 예시 |
|---------|------|------|
| 페이지 | `page.tsx` | `app/dashboard/page.tsx` |
| 레이아웃 | `layout.tsx` | `app/admin/layout.tsx` |
| API Route | `route.ts` | `app/api/correct-diary/route.ts` |
| 컴포넌트 | PascalCase + `.tsx` | `ImageUpload.tsx`, `LoadingSpinner.tsx` |
| 유틸리티 | camelCase + `.ts` | `koreanHelper.ts`, `pdfGenerator.ts` |
| Context | PascalCase + `Context.tsx` | `AuthContext.tsx` |
| 타입 정의 | `index.ts` | `app/types/index.ts` |

#### 컴포넌트 파일명 = 컴포넌트명
```typescript
// ✅ GOOD
// 파일: ImageUpload.tsx
export default function ImageUpload() { ... }

// ❌ BAD
// 파일: image-upload.tsx
export default function ImageUpload() { ... }
```

### 2. TypeScript 규칙

#### 엄격한 타입 지정
```typescript
// ✅ GOOD - 명시적 타입 지정
interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  selectedImage: File | null;
}

export default function ImageUpload({ 
  onImageSelect, 
  selectedImage 
}: ImageUploadProps) { ... }

// ❌ BAD - any 사용
function handleData(data: any) { ... }
```

#### Optional 체이닝 활용
```typescript
// ✅ GOOD
const userName = user?.displayName || "Guest";
const childAge = childInfo?.age;

// ❌ BAD
const userName = user && user.displayName ? user.displayName : "Guest";
```

#### 타입 vs 인터페이스
```typescript
// ✅ 객체 구조 - interface 사용
interface ChildInfo {
  childName: string;
  age: number;
  englishLevel: EnglishLevel;
}

// ✅ Union, Primitive - type 사용
export type EnglishLevel = "Lv.1" | "Lv.2" | "Lv.3" | "Lv.4" | "Lv.5";
export type PostCategory = "diary_share" | "education_qa" | "notice_mission";
```

### 3. React 컴포넌트 패턴

#### Client vs Server Component
```typescript
// ✅ Client Component - 인터랙션 필요
"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function ImageUpload() {
  const [preview, setPreview] = useState<string | null>(null);
  // ...
}

// ✅ Server Component - 정적 콘텐츠
// "use client" 없음
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "페이지 제목",
};

export default function StaticPage() {
  return <div>...</div>;
}
```

#### Props 인터페이스 네이밍
```typescript
// ✅ GOOD - 컴포넌트명 + Props
interface ImageUploadProps { ... }
interface CorrectionResultProps { ... }
interface AuthGuardProps { ... }

// ❌ BAD
interface IImageUpload { ... }
interface ImageUploadProperties { ... }
```

#### 상태 관리 패턴
```typescript
// ✅ GOOD - useState로 로컬 상태 관리
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [result, setResult] = useState<CorrectionResult | null>(null);

// ✅ GOOD - 전역 상태는 Context 사용
const { user, loading, signIn, signOut } = useAuth();
```

### 4. API Route 패턴

#### HTTP 메소드 명시적 export
```typescript
// app/api/correct-diary/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 유효성 검증
    if (!body.originalText) {
      return NextResponse.json(
        { success: false, error: "데이터가 필요합니다." },
        { status: 400 }
      );
    }

    // 비즈니스 로직
    const result = await processData(body);

    // 성공 응답
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("API 에러:", error);
    return NextResponse.json(
      { success: false, error: error.message || "서버 오류" },
      { status: 500 }
    );
  }
}
```

#### 일관된 응답 형식
```typescript
// app/types/index.ts
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 사용
return NextResponse.json({
  success: true,
  data: { ... }
});
```

#### Mock 데이터 Fallback
```typescript
// API 키가 없어도 개발 가능하도록
if (apiKeys.openai) {
  // 실제 API 호출
  result = await callOpenAI(data);
} else {
  console.log("⚠️ Mock 데이터 사용");
  result = getMockData();
}
```

### 5. Firebase 통합 패턴

#### 초기화 및 환경 변수 검증
```typescript
// lib/firebase.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "기본값",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "기본값",
  // ...
};

// 클라이언트 사이드 체크
if (typeof window !== "undefined") {
  auth = getAuth(app);
}

export { auth, db };
```

#### Firestore 데이터 작업
```typescript
// ✅ GOOD - 에러 처리 + LocalStorage 백업
try {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const docRef = doc(collection(db, "users", userId, "data"));
  await setDoc(docRef, {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 로컬 스토리지 백업
  localStorage.setItem(`data_${docRef.id}`, JSON.stringify(data));

  return { success: true, id: docRef.id };
} catch (error) {
  console.error("데이터 저장 실패:", error);
  throw error;
}
```

---

## 🎨 스타일링 규칙

### 1. Tailwind CSS 사용 패턴

#### 일관된 클래스 순서
```tsx
// 순서: 레이아웃 → 간격 → 색상 → 타이포그래피 → 효과 → 상태
<div className="
  flex items-center justify-center          // 레이아웃
  w-full max-w-4xl min-h-screen            // 크기
  px-4 py-6 gap-4                          // 간격
  bg-white dark:bg-gray-800                // 배경색
  text-gray-900 dark:text-white            // 텍스트색
  text-xl font-bold                        // 타이포그래피
  rounded-2xl shadow-xl                    // 효과
  hover:scale-105 transition-all           // 상태
">
```

#### 다크모드 지원
```tsx
// ✅ GOOD - dark: 접두사 활용
<div className="
  bg-white dark:bg-gray-800
  text-gray-900 dark:text-white
  border-gray-300 dark:border-gray-600
">
```

#### 반응형 디자인
```tsx
// ✅ GOOD - 모바일 퍼스트 + breakpoint
<div className="
  text-sm sm:text-base md:text-lg lg:text-xl     // 텍스트 크기
  grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 // 그리드
  px-4 md:px-8 lg:px-12                          // 패딩
">
```

### 2. 색상 체계

#### Primary Colors
```tsx
// Indigo/Blue - 주요 액션
bg-blue-500 hover:bg-blue-600
bg-indigo-600 hover:bg-indigo-700
bg-gradient-to-r from-blue-500 to-purple-500

// Purple - 보조 액션
bg-purple-500 hover:bg-purple-600
```

#### Semantic Colors
```tsx
// Success - 초록
bg-green-500 text-green-700 border-green-200

// Warning - 노랑/오렌지
bg-yellow-100 text-yellow-700 border-yellow-200

// Error - 빨강
bg-red-100 text-red-700 border-red-400

// Info - 파랑
bg-blue-50 text-blue-700 border-blue-200
```

#### Gradient 패턴
```tsx
// ✅ 일관된 그라데이션 사용
bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50
dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20

bg-gradient-to-r from-blue-500 to-purple-500
bg-gradient-to-r from-green-500 to-emerald-500
```

### 3. 간격 체계 (Spacing)

```tsx
// ✅ 일관된 간격 스케일 사용
gap-2  gap-3  gap-4  gap-6  gap-8     // 2, 3, 4, 6, 8
p-2    p-4    p-6    p-8    p-12      // 패딩
m-2    m-4    m-6    m-8    m-12      // 마진
space-y-4  space-y-6  space-y-8       // 수직 간격
```

### 4. 타이포그래피

#### 폰트 패밀리
```css
/* globals.css */
font-family: "Pretendard Variable", Pretendard, 
             -apple-system, BlinkMacSystemFont, system-ui, 
             "Noto Sans KR", "Malgun Gothic", sans-serif;
```

#### 텍스트 크기
```tsx
text-xs    // 12px - 보조 정보
text-sm    // 14px - 본문
text-base  // 16px - 기본
text-lg    // 18px - 강조
text-xl    // 20px - 제목
text-2xl   // 24px - 큰 제목
text-3xl   // 30px - 페이지 제목
```

#### 폰트 굵기
```tsx
font-normal    // 400 - 기본 본문
font-medium    // 500 - 약간 강조
font-semibold  // 600 - 버튼, 라벨
font-bold      // 700 - 제목
```

### 5. 애니메이션 (Framer Motion)

#### 페이지 진입 애니메이션
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.2 }}
>
  {/* 콘텐츠 */}
</motion.div>
```

#### 버튼 인터랙션
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.98 }}
  className="..."
>
  클릭하기
</motion.button>
```

#### 순차 애니메이션
```tsx
// ✅ delay로 순차 표시
<motion.div {...props} transition={{ delay: 0.1 }} />
<motion.div {...props} transition={{ delay: 0.2 }} />
<motion.div {...props} transition={{ delay: 0.3 }} />
```

---

## 🧩 디자인 시스템

### 1. 버튼 스타일

#### Primary 버튼
```tsx
<button className="
  w-full 
  bg-gradient-to-r from-blue-500 to-purple-500 
  text-white font-bold 
  py-3 px-6 
  rounded-lg shadow-lg 
  hover:scale-105 hover:shadow-xl 
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all
">
```

#### Secondary 버튼
```tsx
<button className="
  bg-gray-200 dark:bg-gray-700 
  text-gray-800 dark:text-gray-200 
  font-semibold 
  py-2 px-4 
  rounded-lg 
  hover:bg-gray-300 dark:hover:bg-gray-600
  transition-all
">
```

#### Danger 버튼
```tsx
<button className="
  bg-red-500 hover:bg-red-600 
  text-white 
  py-2 px-4 
  rounded-lg 
  transition-all
">
```

### 2. 카드 스타일

#### 기본 카드
```tsx
<div className="
  bg-white dark:bg-gray-800 
  rounded-2xl 
  shadow-xl 
  p-6 md:p-8
">
```

#### 강조 카드 (그라데이션 배경)
```tsx
<div className="
  bg-gradient-to-br from-blue-50 to-indigo-50 
  dark:from-blue-900/30 dark:to-indigo-900/30 
  rounded-2xl 
  p-6 
  border-2 border-blue-200 dark:border-blue-700
">
```

### 3. 입력 필드

#### 텍스트 입력
```tsx
<input
  type="text"
  className="
    w-full 
    px-4 py-3 
    rounded-lg 
    border border-gray-300 dark:border-gray-600 
    bg-white dark:bg-gray-700 
    text-gray-900 dark:text-white 
    focus:ring-2 focus:ring-blue-500 focus:border-transparent
  "
  placeholder="입력하세요"
/>
```

#### Textarea
```tsx
<textarea
  className="
    w-full h-64 
    px-4 py-3 
    rounded-lg 
    border-2 border-gray-300 dark:border-gray-600 
    bg-white dark:bg-gray-700 
    text-gray-900 dark:text-white 
    focus:ring-2 focus:ring-blue-500 focus:border-transparent 
    resize-none
  "
/>
```

### 4. 로딩 상태

#### 스피너
```tsx
<div className="
  w-16 h-16 
  border-4 border-blue-200 border-t-blue-500 
  rounded-full 
  animate-spin
"></div>
```

#### 버튼 로딩
```tsx
{loading ? (
  <>
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
    <span>처리 중...</span>
  </>
) : (
  <span>제출하기</span>
)}
```

### 5. 에러/성공 메시지

#### 에러 메시지
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="
    bg-red-100 dark:bg-red-900/30 
    border border-red-400 
    text-red-700 dark:text-red-300 
    px-4 py-3 
    rounded-lg
  "
>
  {error}
</motion.div>
```

#### 성공 메시지
```tsx
<div className="
  bg-green-100 dark:bg-green-900/30 
  border border-green-400 
  text-green-700 dark:text-green-300 
  px-4 py-3 
  rounded-lg
">
  저장되었습니다!
</div>
```

---

## 🔐 보안 및 인증 패턴

### 1. 인증 가드 (AuthGuard)

```tsx
// components/AuthGuard.tsx
export default function AuthGuard({
  children,
  redirectTo = "/login",
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

### 2. 보호된 페이지 사용
```tsx
// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <AuthGuard>
      {/* 로그인한 사용자만 볼 수 있는 콘텐츠 */}
    </AuthGuard>
  );
}
```

### 3. 환경 변수 관리
```env
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=...     # 클라이언트 노출 가능
OPENAI_API_KEY=...                   # 서버 전용 (NEXT_PUBLIC 없음)
```

---

## 📊 상태 관리 전략

### 1. 로컬 상태 - useState
```typescript
// 페이지 내부 상태
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<DataType | null>(null);
```

### 2. 전역 상태 - Context API
```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ...
  
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// 사용
const { user, loading } = useAuth();
```

### 3. 서버 상태 - Firestore
```typescript
// Firestore에서 실시간 데이터 구독
useEffect(() => {
  if (!user || !db) return;
  
  const docRef = doc(db, "children", user.uid);
  const unsubscribe = onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      setData(doc.data());
    }
  });
  
  return () => unsubscribe();
}, [user]);
```

---

## 🛠️ 에러 처리 패턴

### 1. Try-Catch 패턴
```typescript
const handleSubmit = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    const response = await fetch("/api/endpoint", {
      method: "POST",
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 성공 처리
      setResult(result.data);
    } else {
      setError(result.error || "오류가 발생했습니다.");
    }
  } catch (err) {
    console.error("에러:", err);
    setError("서버와 통신 중 오류가 발생했습니다.");
  } finally {
    setIsLoading(false);
  }
};
```

### 2. Firebase 에러 처리
```typescript
try {
  await signIn(email, password);
} catch (err: any) {
  let errorMessage = "로그인 중 오류가 발생했습니다.";
  
  if (err.code === "auth/invalid-credential") {
    errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
  } else if (err.code === "auth/user-not-found") {
    errorMessage = "등록되지 않은 이메일입니다.";
  } else if (err.message) {
    errorMessage = err.message;
  }
  
  setError(errorMessage);
}
```

### 3. API 에러 처리
```typescript
// API Route
export async function POST(request: NextRequest) {
  try {
    // ...
  } catch (error: any) {
    console.error("API 에러:", error);
    return NextResponse.json(
      { success: false, error: error.message || "서버 오류" },
      { status: 500 }
    );
  }
}
```

---

## 📝 주석 및 로깅 규칙

### 1. 주석 스타일
```typescript
// ✅ GOOD - 의도를 설명하는 주석
// 1단계: OCR로 텍스트 추출
const handleOCR = async () => { ... }

// 로컬 스토리지 백업 (Firestore 실패 대비)
localStorage.setItem(`data_${id}`, JSON.stringify(data));

// ❌ BAD - 코드를 그대로 반복하는 주석
// 이미지를 설정한다
setImage(file);
```

### 2. 콘솔 로깅
```typescript
// ✅ GOOD - 구조화된 로깅
console.log("=== 요청 정보 ===");
console.log("Content-Type:", contentType);
console.log("originalText:", originalText?.substring(0, 50) + "...");

console.log("📸 OCR 시작...");
console.log("✅ OCR 완료:", extractedText);
console.error("❌ OCR 오류:", error);

// ⚠️ Mock 데이터 반환 중
console.log("⚠️ Mock 데이터 반환 중 - API 키 없음");
```

---

## 🎯 접근성 (a11y) 규칙

### 1. 시맨틱 HTML
```tsx
// ✅ GOOD
<header>...</header>
<nav>...</nav>
<main>...</main>
<footer>...</footer>

// ❌ BAD
<div className="header">...</div>
<div className="nav">...</div>
```

### 2. ARIA 속성
```tsx
// ✅ GOOD
<button
  aria-label="메뉴 열기"
  aria-expanded={isOpen}
>
  <MenuIcon />
</button>

<input
  id="email"
  type="email"
  aria-describedby="email-help"
/>
<p id="email-help">이메일을 입력하세요</p>
```

### 3. 키보드 접근성
```tsx
// ✅ GOOD - 키보드로 접근 가능
<button onClick={handleClick}>클릭</button>
<Link href="/page">페이지로 이동</Link>

// ❌ BAD - 키보드로 접근 불가
<div onClick={handleClick}>클릭</div>
```

### 4. 대체 텍스트
```tsx
// ✅ GOOD
<img src="/logo.png" alt="회사 로고" />
<Image src={preview} alt="업로드된 일기 사진 미리보기" />

// ❌ BAD
<img src="/logo.png" />
```

---

## 📱 반응형 디자인 패턴

### Breakpoints
```
sm: 640px   - 모바일 가로/작은 태블릿
md: 768px   - 태블릿
lg: 1024px  - 데스크톱
xl: 1280px  - 큰 데스크톱
```

### 반응형 레이아웃 예시
```tsx
<div className="
  w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl
  px-4 sm:px-6 md:px-8
  text-base md:text-lg lg:text-xl
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
">
```

---

## 🔄 데이터 흐름 패턴

### 1. 폼 제출 흐름
```
사용자 입력 
  → 클라이언트 검증 
    → API Route 호출 
      → 서버 검증 
        → Firestore 저장 
          → LocalStorage 백업 
            → 성공 피드백
```

### 2. 인증 흐름
```
로그인 시도 
  → Firebase Auth 
    → AuthContext 업데이트 
      → AuthGuard 체크 
        → 보호된 페이지 접근
```

### 3. 일기 첨삭 흐름
```
이미지 업로드 
  → OCR 처리 (Google Vision) 
    → 텍스트 수정 
      → AI 첨삭 (OpenAI GPT) 
        → 결과 표시 
          → Firestore 저장
```

---

## 📚 Best Practices 요약

### DO ✅

1. **타입 안전성**
   - 모든 함수와 변수에 타입 지정
   - `any` 대신 `unknown` + 타입 가드
   - 타입은 `app/types/index.ts`에 중앙 관리

2. **에러 처리**
   - 모든 비동기 작업에 try-catch
   - 사용자 친화적인 에러 메시지
   - 콘솔에 상세 로그 남기기

3. **성능 최적화**
   - Next.js `Image` 컴포넌트 사용
   - 필요시 `dynamic` import
   - `useMemo`, `useCallback` 활용

4. **접근성**
   - 시맨틱 HTML 태그 사용
   - 키보드 내비게이션 지원
   - 충분한 색상 대비

5. **스타일링**
   - Tailwind 유틸리티 클래스 우선
   - 다크모드 지원
   - 모바일 퍼스트 반응형

### DON'T ❌

1. **타입 관련**
   - `any` 타입 사용 금지
   - 암시적 `any` 허용 금지

2. **상태 관리**
   - prop drilling 과도하게 하지 않기
   - 불필요한 전역 상태 만들지 않기

3. **스타일링**
   - 인라인 스타일 사용 금지
   - 중복된 스타일 패턴 반복하지 않기

4. **보안**
   - API 키를 클라이언트에 노출하지 않기
   - `NEXT_PUBLIC_` 접두사 신중하게 사용

5. **성능**
   - 불필요한 리렌더링 방지
   - 큰 번들 사이즈 주의

---

## 🚀 프로젝트 특징

### 1. 아이 친화적 UI/UX
- **밝은 색상**: 그라데이션 배경 (`from-blue-50 via-purple-50 to-pink-50`)
- **큰 버튼**: `py-4 px-12` 등 터치하기 쉬운 크기
- **이모지 활용**: `🎉`, `📝`, `✨` 등 직관적 표현
- **부드러운 애니메이션**: Framer Motion으로 전환 효과

### 2. AI 통합 (OpenAI GPT)
- **프롬프트 엔지니어링**: 아이 나이와 레벨에 맞춘 첨삭
- **JSON 응답**: 구조화된 데이터 반환
- **Fallback**: API 실패 시 Mock 데이터 사용
- **레벨별 차별화**: Lv.1~Lv.5 각각 다른 피드백 전략

### 3. OCR 기능 (Google Vision API)
- **손글씨 인식**: 아이들의 손글씨를 텍스트로 변환
- **에러 처리**: 실패 시 사용자가 직접 수정 가능
- **2단계 프로세스**: OCR → 수정 → AI 첨삭

### 4. 데이터 이중화
- **Firestore + LocalStorage**: 온라인/오프라인 모두 지원
- **실시간 동기화**: Firestore의 실시간 리스너 활용

### 5. 관리자 페이지
- **API 키 관리**: Firestore에서 중앙 관리
- **테스트 계정**: 개발용 계정 자동 입력 기능

---

## 📖 참고 문서

- [Next.js 공식 문서](https://nextjs.org/docs)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Framer Motion 문서](https://www.framer.com/motion/)
- [Firebase 공식 문서](https://firebase.google.com/docs)

---

**마지막 업데이트**: 2025-12-16  
**작성자**: AI Code Analyzer

