/**
 * 테스트 계정 생성 스크립트 (JavaScript 버전)
 * 
 * 사용법:
 * node scripts/create-test-account.js
 * 
 * 또는 환경 변수와 함께:
 * node scripts/create-test-account.js
 */

// dotenv를 사용하여 .env.local 파일 로드
require("dotenv").config({ path: ".env.local" });

const { initializeApp } = require("firebase/app");
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require("firebase/auth");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

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

async function createTestAccount(account) {
  try {
    console.log(`\n📝 계정 생성 중: ${account.email}`);

    // Firebase 초기화
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // 계정 생성 시도
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(
        auth,
        account.email,
        account.password
      );
      console.log(`✅ 계정 생성 성공: ${account.email}`);
    } catch (error) {
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
  } catch (error) {
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
  console.log("=".repeat(50));

  // 환경 변수 확인
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "dummy-key") {
    console.error("❌ Firebase 환경 변수가 설정되지 않았습니다!");
    console.log("\n.env.local 파일에 Firebase 설정을 추가해주세요:");
    console.log("NEXT_PUBLIC_FIREBASE_API_KEY=...");
    console.log("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...");
    console.log("등등...\n");
    process.exit(1);
  }

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
      console.log(
        `   비밀번호: ${
          testAccounts.find((a) => a.email === result.email)?.password
        }`
      );
      console.log(`   UID: ${result.uid}\n`);
    } else {
      console.log(`❌ ${result.email}: ${result.error}\n`);
    }
  });

  console.log("=".repeat(50));
  console.log(
    "\n✨ 완료! 이제 로그인 페이지에서 테스트 계정으로 로그인할 수 있습니다."
  );
}

main().catch(console.error);

