/**
 * 단어 카운팅 방법 안내 공지사항 추가 스크립트
 * 
 * 사용법:
 * npx ts-node scripts/add-word-counting-notice.ts
 * 
 * 또는 Node.js에서:
 * node -r ts-node/register scripts/add-word-counting-notice.ts
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs } from "firebase/firestore";

// Firebase 설정 (환경 변수에서 가져오거나 직접 입력)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const noticeContent = `# 📊 단어 카운팅 방법 안내

안녕하세요! 영어 일기/작문의 단어 수가 어떻게 계산되는지 안내드립니다.

## 🔢 단어 수 계산 방법

우리 시스템은 **정확한 단어 수**를 계산하기 위해 다음과 같은 방법을 사용합니다:

### ✅ 계산 방식

1. **구두점 제거**: 문장 부호(.,!?;:()[]{}'")를 제거합니다
2. **공백으로 분리**: 공백, 탭, 줄바꿈으로 단어를 구분합니다
3. **빈 문자열 제거**: 빈 문자열은 카운트에서 제외합니다

### 📝 예시

\`\`\`
"I went to the zoo!" 
→ ["I", "went", "to", "the", "zoo"] 
→ 5개 단어 ✅

"Hello, world!" 
→ ["Hello", "world"] 
→ 2개 단어 ✅

"I'm happy!" 
→ ["I", "m", "happy"] 
→ 3개 단어 ✅
\`\`\`

## 💡 주의사항

- **구두점이 붙은 단어**: 구두점은 제거되어 별도로 카운트되지 않습니다
- **연속된 공백**: 여러 공백은 하나로 처리됩니다
- **줄바꿈**: 줄바꿈도 공백으로 처리되어 단어를 구분합니다

## 📈 통계에 반영되는 항목

- **총 단어 수**: 일기/작문 전체의 단어 개수
- **문장 수**: 마침표(.), 느낌표(!), 물음표(?)로 구분된 문장 개수
- **평균 문장 길이**: 총 단어 수 ÷ 문장 수
- **고유 단어 수**: 중복을 제외한 서로 다른 단어의 개수

## 🎯 왜 정확한 카운팅이 중요한가요?

정확한 단어 수는 다음과 같은 곳에서 사용됩니다:

1. **성장 통계**: 일자별 단어 사용량 그래프
2. **월별 리포트**: GPT가 분석하는 성장 지표
3. **학습 진도**: 아이의 영어 실력 향상 추적

## ❓ 궁금한 점이 있으신가요?

문의사항이 있으시면 언제든지 연락주세요!

---

*이 공지사항은 시스템 업데이트로 인해 추가되었습니다.*`;

async function addNotice() {
  try {
    console.log("📢 단어 카운팅 안내 공지사항 추가 중...");

    // 기존에 같은 제목의 공지사항이 있는지 확인
    const postsRef = collection(db, "posts");
    const q = query(
      postsRef,
      where("category", "==", "notice_mission"),
      where("title", "==", "📊 단어 카운팅 방법 안내")
    );

    const existingPosts = await getDocs(q);
    if (!existingPosts.empty) {
      console.log("⚠️ 이미 같은 제목의 공지사항이 존재합니다.");
      console.log("기존 공지사항 ID:", existingPosts.docs[0].id);
      return;
    }

    // 관리자 UID (실제 관리자 UID로 변경 필요)
    // 또는 환경 변수에서 가져오기
    const adminUid = process.env.ADMIN_UID || "";

    if (!adminUid) {
      console.error("❌ ADMIN_UID 환경 변수가 설정되지 않았습니다.");
      console.log("💡 환경 변수를 설정하거나, 아래 코드에서 adminUid를 직접 입력하세요.");
      return;
    }

    const postData = {
      title: "📊 단어 카운팅 방법 안내",
      content: noticeContent,
      authorId: adminUid,
      parentId: adminUid,
      authorName: "운영팀",
      authorEmail: "admin@example.com",
      childName: "운영팀", // 공지사항이므로 아이 이름은 운영팀으로 설정
      category: "notice_mission",
      views: 0,
      likes: [],
      comments: [],
      isPinned: true, // 공지사항 고정
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "posts"), postData);
    console.log("✅ 공지사항이 성공적으로 추가되었습니다!");
    console.log("📄 문서 ID:", docRef.id);
    console.log("🔗 게시판에서 확인하세요: /board");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
  }
}

// 스크립트 실행
addNotice()
  .then(() => {
    console.log("✨ 작업 완료!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 실행 중 오류:", error);
    process.exit(1);
  });


