/**
 * 테스트 계정 생성 스크립트
 * 
 * 사용법:
 * npx tsx scripts/create-test-account.ts
 * 
 * 또는 Node.js 환경에서:
 * node -r ts-node/register scripts/create-test-account.ts
 */

import * as dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// .env.local 파일 로드
dotenv.config({ path: ".env.local" });

// 환경 변수에서 Firebase 설정 로드 (없으면 기본값 사용)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB3BDHNQRU-UvohshvC_ZeA60TprRe6vMc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mflow-englishdiary.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mflow-englishdiary",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mflow-englishdiary.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "734680651368",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:734680651368:web:2053debcbbb39dedde8ddd",
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 테스트 계정 정보
const testAccounts = [
  {
    email: "test@example.com",
    password: "test123456",
    childInfo: {
      name: "테스트",
      age: 8,
      grade: "2학년",
      englishLevel: "초급",
      arScore: "2.5",
      avatar: "👦",
    },
  },
  {
    email: "admin@example.com",
    password: "admin123456",
    childInfo: {
      name: "관리자",
      age: 10,
      grade: "4학년",
      englishLevel: "중급",
      arScore: "4.0",
      avatar: "🧑‍🎓",
    },
  },
];

async function createTestAccount(account: typeof testAccounts[0]) {
  try {
    console.log(`\n📝 계정 생성 중: ${account.email}`);

    // 계정 생성 시도
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(
        auth,
        account.email,
        account.password
      );
      console.log(`✅ 계정 생성 성공: ${account.email}`);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        console.log(`⚠️  계정이 이미 존재합니다. 로그인 시도 중...`);
        userCredential = await signInWithEmailAndPassword(
          auth,
          account.email,
          account.password
        );
        console.log(`✅ 로그인 성공: ${account.email}`);
      } else {
        throw error;
      }
    }

    const user = userCredential.user;

    // 아이 정보 저장
    const childData = {
      ...account.childInfo,
      createdAt: new Date().toISOString(),
      userId: user.uid,
    };

    await setDoc(doc(db, "children", user.uid), childData);
    console.log(`✅ 아이 정보 저장 완료: ${account.childInfo.name}`);

    return {
      success: true,
      email: account.email,
      password: account.password,
      uid: user.uid,
    };
  } catch (error: any) {
    console.error(`❌ 오류 발생: ${error.message}`);
    return {
      success: false,
      email: account.email,
      error: error.message,
    };
  }
}

async function main() {
  console.log("🚀 테스트 계정 생성 스크립트 시작\n");
  console.log("=" .repeat(50));

  // 환경 변수 확인 (기본값이 있으면 계속 진행)
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "dummy-key") {
    console.error(
      "❌ Firebase 환경 변수가 설정되지 않았습니다!"
    );
    console.log("\n.env.local 파일에 Firebase 설정을 추가해주세요:");
    console.log("NEXT_PUBLIC_FIREBASE_API_KEY=...");
    console.log("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...");
    console.log("등등...\n");
    process.exit(1);
  }
  
  console.log("✅ Firebase 설정 확인 완료");
  console.log(`   Project ID: ${firebaseConfig.projectId}`);
  console.log(`   Auth Domain: ${firebaseConfig.authDomain}\n`);

  const results = [];

  for (const account of testAccounts) {
    const result = await createTestAccount(account);
    results.push(result);
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 생성 결과 요약\n");

  results.forEach((result) => {
    if (result.success) {
      console.log(`✅ ${result.email}`);
      console.log(`   비밀번호: ${testAccounts.find((a) => a.email === result.email)?.password}`);
      console.log(`   UID: ${result.uid}\n`);
    } else {
      console.log(`❌ ${result.email}: ${result.error}\n`);
    }
  });

  console.log("=".repeat(50));
  console.log("\n✨ 완료! 이제 로그인 페이지에서 테스트 계정으로 로그인할 수 있습니다.");
}

main().catch(console.error);

