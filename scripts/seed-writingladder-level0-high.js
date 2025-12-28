#!/usr/bin/env node

/**
 * Writing Ladder Level 0 HIGH(A2) 콘텐츠 시드 스크립트
 * 
 * 사용법:
 *   node scripts/seed-writingladder-level0-high.js
 * 
 * 이 스크립트는:
 * - writingladder_judge_questions 컬렉션에 4개 HIGH/A2 질문셋 추가
 * - writingladder_content_packs 컬렉션에 4주차 HIGH/A2 콘텐츠 팩 추가
 * 
 * 차이점 (LOW vs HIGH):
 * - LOW(A1): 3~5문장, 5~8단어/문장, Judge 3문항, 30초만
 * - HIGH(A2): 4~6문장, 8~10단어/문장, Judge 5문항, 30초+60초
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase Admin 초기화
if (!admin.apps.length) {
  // 환경변수에서 서비스 계정 키 경로 가져오기
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || './serviceAccountKey.json';
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin 초기화 완료 (serviceAccountKey.json)");
  } else {
    // 서비스 계정 키 파일이 없으면 환경변수로 시도
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (projectId) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId
      });
      console.log("✅ Firebase Admin 초기화 완료 (환경변수)");
    } else {
      console.error("❌ Firebase 초기화 실패: serviceAccountKey.json 또는 FIREBASE_PROJECT_ID 환경변수 필요");
      process.exit(1);
    }
  }
}

const db = admin.firestore();

/**
 * Judge Questions (HIGH/A2) 시드 데이터 업로드
 */
async function seedJudgeQuestions() {
  console.log("\n=== Writing Ladder Level 0 HIGH/A2 Judge Questions 시드 시작 ===");
  
  const questionsPath = path.join(__dirname, '../seed/writingladder/level0_high_judge_questions.json');
  const questionSets = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  
  for (const questionSet of questionSets) {
    try {
      await db.collection('writingladder_judge_questions').doc(questionSet.question_set_id).set(questionSet);
      console.log(`✅ Judge Questions 추가: ${questionSet.question_set_id} (Week ${questionSet.week}, HIGH/A2, ${questionSet.json.n_total}문항)`);
    } catch (error) {
      console.error(`❌ Judge Questions 추가 실패 (${questionSet.question_set_id}):`, error.message);
    }
  }
  
  console.log(`\n✅ Judge Questions 시드 완료: ${questionSets.length}개 추가`);
}

/**
 * Content Packs (HIGH/A2) 시드 데이터 업로드
 */
async function seedContentPacks() {
  console.log("\n=== Writing Ladder Level 0 HIGH/A2 Content Packs 시드 시작 ===");
  
  const contentPacksPath = path.join(__dirname, '../seed/writingladder/level0_high_content_packs.json');
  const contentPacks = JSON.parse(fs.readFileSync(contentPacksPath, 'utf8'));
  
  for (const pack of contentPacks) {
    try {
      await db.collection('writingladder_content_packs').doc(pack.content_pack_id).set(pack);
      console.log(`✅ Content Pack 추가: ${pack.content_pack_id} (Week ${pack.week}, HIGH/A2: ${pack.json.title})`);
    } catch (error) {
      console.error(`❌ Content Pack 추가 실패 (${pack.content_pack_id}):`, error.message);
    }
  }
  
  console.log(`\n✅ Content Packs 시드 완료: ${contentPacks.length}개 추가`);
}

/**
 * 메인 실행
 */
async function main() {
  console.log("\n🚀 Writing Ladder Level 0 HIGH/A2 콘텐츠 시드 시작");
  console.log("================================================");
  
  try {
    await seedJudgeQuestions();
    await seedContentPacks();
    
    console.log("\n================================================");
    console.log("🎉 Writing Ladder Level 0 HIGH/A2 콘텐츠 시드 완료!");
    console.log("\n📊 요약:");
    console.log("   - Judge Questions: 4개 세트 (각 10문항, HIGH/A2용)");
    console.log("   - Content Packs: 4개 (Week 1-4, HIGH/A2용)");
    console.log("\n🔍 확인 방법:");
    console.log("   - Firestore Console에서 다음 컬렉션 확인:");
    console.log("     • writingladder_judge_questions (wl0.jq.*.high.v1)");
    console.log("     • writingladder_content_packs (cp_wl0_w*_high_a2)");
    console.log("\n📋 차이점 (LOW vs HIGH):");
    console.log("   LOW(A1):");
    console.log("     - Day1: 3~5문장, 5~8단어/문장");
    console.log("     - Judge: 3문항 (선택지 포함)");
    console.log("     - Script: 30초만, 2~3문장");
    console.log("   HIGH(A2):");
    console.log("     - Day1: 4~6문장, 8~10단어/문장");
    console.log("     - Judge: 5문항 (자유답)");
    console.log("     - Script: 30초(3~4문장) + 60초 옵션");
    console.log("\n✅ 완료조건(AC):");
    console.log("   - Level0 HIGH/A2 week1~4가 앱에서 정상 로딩됨");
    console.log("   - Day1~3까지 수행 가능 (HIGH 규칙 적용)");
    console.log("   - 포트폴리오에 week별 결과물 카드 생성됨");
    
  } catch (error) {
    console.error("\n❌ 시드 실패:", error);
    process.exit(1);
  } finally {
    // Firebase Admin 종료
    await admin.app().delete();
    console.log("\n👋 Firebase 연결 종료");
  }
}

// 스크립트 실행
main();


