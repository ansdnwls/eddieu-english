"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    // 10초 타임아웃 설정
    const timeout = setTimeout(() => {
      console.warn("⚠️ Auth initialization timeout");
      setLoading(false);
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      setUser(user);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) {
      throw new Error(
        "Firebase가 설정되지 않았습니다. .env.local 파일에 Firebase 설정을 추가해주세요.\n" +
        "자세한 내용은 FIREBASE_SETUP_QUICK.md 파일을 참고하세요."
      );
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === "auth/invalid-api-key" || error.code === "auth/api-key-not-valid") {
        throw new Error(
          "❌ Firebase API 키가 올바르지 않습니다!\n\n" +
          "해결 방법:\n" +
          "1. Firebase Console (https://console.firebase.google.com)에서 프로젝트 생성\n" +
          "2. 웹 앱 등록 후 실제 API 키 복사\n" +
          "3. .env.local 파일에서 'your_firebase_api_key_here'를 실제 값으로 변경\n" +
          "4. 개발 서버 재시작 (npm run dev)\n\n" +
          "자세한 내용: FIREBASE_SETUP_QUICK.md 파일 참고"
        );
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!auth) {
      throw new Error(
        "Firebase가 설정되지 않았습니다. .env.local 파일에 Firebase 설정을 추가해주세요.\n" +
        "자세한 내용은 FIREBASE_SETUP_QUICK.md 파일을 참고하세요."
      );
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === "auth/invalid-api-key" || error.code === "auth/api-key-not-valid") {
        throw new Error(
          "❌ Firebase API 키가 올바르지 않습니다!\n\n" +
          "해결 방법:\n" +
          "1. Firebase Console (https://console.firebase.google.com)에서 프로젝트 생성\n" +
          "2. 웹 앱 등록 후 실제 API 키 복사\n" +
          "3. .env.local 파일에서 'your_firebase_api_key_here'를 실제 값으로 변경\n" +
          "4. 개발 서버 재시작 (npm run dev)\n\n" +
          "자세한 내용: FIREBASE_SETUP_QUICK.md 파일 참고"
        );
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error(
        "Firebase가 설정되지 않았습니다. .env.local 파일에 Firebase 설정을 추가해주세요.\n" +
        "자세한 내용은 FIREBASE_SETUP_QUICK.md 파일을 참고하세요."
      );
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      
      // 사용자가 팝업을 닫은 경우는 에러로 처리하지 않음
      if (err.code === "auth/popup-closed-by-user") {
        return;
      }
      
      if (err.code === "auth/invalid-api-key" || err.code === "auth/api-key-not-valid") {
        throw new Error(
          "❌ Firebase API 키가 올바르지 않습니다!\n\n" +
          "해결 방법:\n" +
          "1. Firebase Console (https://console.firebase.google.com)에서 프로젝트 생성\n" +
          "2. 웹 앱 등록 후 실제 API 키 복사\n" +
          "3. .env.local 파일에서 'your_firebase_api_key_here'를 실제 값으로 변경\n" +
          "4. 개발 서버 재시작 (npm run dev)\n\n" +
          "자세한 내용: FIREBASE_SETUP_QUICK.md 파일 참고"
        );
      }
      
      if (err.code === "auth/unauthorized-domain") {
        const currentDomain = typeof window !== "undefined" ? window.location.hostname : "알 수 없음";
        throw new Error(
          "❌ 현재 도메인이 Firebase에 등록되지 않았습니다!\n\n" +
          `현재 도메인: ${currentDomain}\n\n` +
          "해결 방법:\n" +
          "1. Firebase Console (https://console.firebase.google.com) 접속\n" +
          "2. 프로젝트 선택 → Authentication → Settings\n" +
          "3. '승인된 도메인' 섹션에서 '도메인 추가' 클릭\n" +
          `4. 다음 도메인들을 추가:\n` +
          `   - ${currentDomain}\n` +
          `   - ${currentDomain}:3001 (포트 포함)\n` +
          `   - localhost\n` +
          `   - localhost:3000\n` +
          `   - localhost:3001\n` +
          "5. 저장 후 다시 시도\n\n" +
          "참고: 프로덕션 환경에서는 실제 도메인도 추가해야 합니다."
        );
      }
      
      throw error;
    }
  };

  const signOut = async () => {
    if (!auth) {
      throw new Error("Firebase가 초기화되지 않았습니다.");
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

