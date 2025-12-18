import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
// Analytics는 선택적 기능이므로 필요시에만 import
// import { getAnalytics, Analytics } from "firebase/analytics";

// Firebase 설정이 제대로 되어 있는지 확인
const isFirebaseConfigured = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const envApiKey = apiKey && 
    apiKey !== "dummy-key" && 
    apiKey !== "your_firebase_api_key_here" &&
    !apiKey.includes("your_") &&
    !apiKey.includes("example");
  
  // 환경 변수가 설정되어 있거나, 기본값이 유효한 경우 true 반환
  const defaultApiKey = "AIzaSyB3BDHNQRU-UvohshvC_ZeA60TprRe6vMc";
  const hasValidDefault = defaultApiKey.length > 0 && !defaultApiKey.includes("your_");
  
  return envApiKey || hasValidDefault;
};

// Firebase 설정 (환경 변수가 있으면 사용, 없으면 직접 설정된 값 사용)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB3BDHNQRU-UvohshvC_ZeA60TprRe6vMc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mflow-englishdiary.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mflow-englishdiary",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mflow-englishdiary.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "734680651368",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:734680651368:web:2053debcbbb39dedde8ddd",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-0VNYHPF46N",
};

// Firebase 설정 확인 및 경고 (환경 변수가 없고 기본값도 없을 때만 경고)
if (typeof window !== "undefined") {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const hasEnvConfig = apiKey && 
    apiKey !== "dummy-key" && 
    apiKey !== "your_firebase_api_key_here" &&
    !apiKey.includes("your_") &&
    !apiKey.includes("example");
  
  // 환경 변수가 없을 때만 경고 (기본값이 있으면 경고하지 않음)
  if (!hasEnvConfig) {
    // 기본값이 유효한 경우 경고하지 않음
    const defaultApiKey = "AIzaSyB3BDHNQRU-UvohshvC_ZeA60TprRe6vMc";
    const hasValidDefault = defaultApiKey.length > 0 && !defaultApiKey.includes("your_");
    
    if (!hasValidDefault) {
      console.warn(
        "⚠️ Firebase가 설정되지 않았습니다. .env.local 파일에 Firebase 설정을 추가해주세요.\n" +
        "자세한 내용은 FIREBASE_SETUP.md 파일을 참고하세요."
      );
    }
  }
}

// Firebase 초기화 (중복 초기화 방지)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
// Analytics는 선택적 기능이므로 필요시에만 초기화
// let analytics: Analytics | null = null;

// 서버 사이드와 클라이언트 사이드 모두에서 초기화
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Auth는 클라이언트 사이드에서만 사용
if (typeof window !== "undefined") {
  auth = getAuth(app);
}

// Firestore는 서버 사이드와 클라이언트 사이드 모두에서 사용 가능
db = getFirestore(app);

// Analytics는 현재 비활성화 (필요시 주석 해제)
// Analytics는 선택적 기능이므로 초기화 실패해도 앱은 정상 작동해야 함
// if (typeof window !== "undefined" && typeof document !== "undefined") {
//   try {
//     if (!(window as any).__FIREBASE_ANALYTICS_INITIALIZED__) {
//       const { getAnalytics } = await import("firebase/analytics");
//       analytics = getAnalytics(app);
//       (window as any).__FIREBASE_ANALYTICS_INITIALIZED__ = true;
//     }
//   } catch (error: any) {
//     analytics = null;
//   }
// }

export { auth, db };
export default app;

