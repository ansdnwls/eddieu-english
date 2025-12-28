/**
 * Writing Ladder Level 0 시드 스크립트
 * 
 * Firestore에 콘텐츠 데이터를 업로드합니다:
 * - topics (4개)
 * - judge_question_sets (4개)
 * - content_packs (4개)
 * 
 * 사용법:
 * node scripts/seed-writingladder.js
 */

const { initializeApp, getApps } = require("firebase/app");
const { getFirestore, collection, doc, setDoc } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

// 환경변수 로드
require("dotenv").config({ path: ".env.local" });

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 초기화
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// JSON 파일 로드
function loadJSON(filename) {
  const filePath = path.join(__dirname, "..", "seed", "writingladder", filename);
  const data = fs.readFileSync(filePath, "utf8");
  return JSON.parse(data);
}

// Firestore 컬렉션에 데이터 업로드
async function uploadCollection(collectionName, data, idField) {
  console.log(`\n📦 ${collectionName} 업로드 시작...`);
  
  for (const item of data) {
    const docId = item[idField];
    try {
      await setDoc(doc(db, collectionName, docId), item);
      console.log(`  ✅ ${docId} 업로드 완료`);
    } catch (error) {
      console.error(`  ❌ ${docId} 업로드 실패:`, error.message);
    }
  }
  
  console.log(`✅ ${collectionName} 업로드 완료 (${data.length}개)`);
}

// 메인 실행 함수
async function main() {
  console.log("🚀 Writing Ladder Level 0 시드 시작\n");
  console.log("=".repeat(50));
  
  try {
    // 1. Topics 업로드
    const topics = loadJSON("topics.json");
    await uploadCollection("writingladder_topics", topics, "topic_id");
    
    // 2. Judge Question Sets 업로드
    const questionSets = loadJSON("judge_question_sets.json");
    await uploadCollection("writingladder_judge_questions", questionSets, "question_set_id");
    
    // 3. Content Packs 업로드
    const contentPacks = loadJSON("content_packs.json");
    await uploadCollection("writingladder_content_packs", contentPacks, "content_pack_id");
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 모든 데이터 업로드 완료!\n");
    console.log("📊 업로드 요약:");
    console.log(`  - Topics: ${topics.length}개`);
    console.log(`  - Question Sets: ${questionSets.length}개`);
    console.log(`  - Content Packs: ${contentPacks.length}개`);
    console.log(`  - 총: ${topics.length + questionSets.length + contentPacks.length}개\n`);
    
    console.log("💡 다음 단계:");
    console.log("  1. Firestore에서 데이터 확인");
    console.log("  2. /courses 페이지에서 Writing Ladder 카탈로그 확인");
    console.log("  3. 코스 시작 후 Day 1 테스트\n");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  }
}

// 실행
main();


