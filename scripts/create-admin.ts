/**
 * 관리자 계정 생성 스크립트
 * 
 * 사용법:
 * npx tsx scripts/create-admin.ts <user-uid>
 * 
 * 예시:
 * npx tsx scripts/create-admin.ts abc123xyz456
 * 
 * 사용자 UID 확인 방법:
 * 1. Firebase Console → Authentication → Users에서 확인
 * 2. 또는 관리자 페이지(/admin)에서 "내 UID 확인" 기능 사용
 */

import * as dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// .env.local 파일 로드
dotenv.config({ path: ".env.local" });

// Firebase 설정
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
const db = getFirestore(app);

async function createAdmin(userUID: string) {
  try {
    console.log(`\n🔐 관리자 권한 부여 중...`);
    console.log(`UID: ${userUID}\n`);

    // Firestore에 관리자 정보 저장
    const adminRef = doc(db, "admins", userUID);
    await setDoc(adminRef, {
      isAdmin: true,
      createdAt: new Date().toISOString(),
      createdBy: "script",
    });

    console.log("✅ 관리자 권한이 성공적으로 부여되었습니다!");
    console.log(`\n📋 설정된 정보:`);
    console.log(`   - UID: ${userUID}`);
    console.log(`   - isAdmin: true`);
    console.log(`   - 생성일: ${new Date().toLocaleString("ko-KR")}`);
    console.log(`\n🎉 이제 해당 계정으로 로그인하여 /admin 페이지에 접근할 수 있습니다.`);
    
  } catch (error: any) {
    console.error(`\n❌ 오류 발생: ${error.message}`);
    console.error(`\n💡 해결 방법:`);
    console.error(`   1. Firebase 프로젝트가 올바르게 설정되었는지 확인`);
    console.error(`   2. UID가 올바른지 확인 (Firebase Console → Authentication → Users)`);
    console.error(`   3. Firestore Database가 활성화되어 있는지 확인`);
    process.exit(1);
  }
}

async function main() {
  const userUID = process.argv[2];
  
  if (!userUID) {
    console.error("❌ 사용법: npx tsx scripts/create-admin.ts <user-uid>");
    console.error("\n예시:");
    console.error("  npx tsx scripts/create-admin.ts abc123xyz456");
    console.error("\n📝 사용자 UID 확인 방법:");
    console.error("  1. Firebase Console → Authentication → Users");
    console.error("  2. 사용자 이메일 클릭 → User UID 복사");
    console.error("  3. 또는 관리자 페이지(/admin)에서 '내 UID 확인' 기능 사용");
    process.exit(1);
  }

  console.log("🚀 관리자 계정 생성 스크립트");
  console.log("=".repeat(50));
  
  await createAdmin(userUID);
  
  console.log("\n" + "=".repeat(50));
}

main().catch(console.error);





