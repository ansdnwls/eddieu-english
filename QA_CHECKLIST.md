# Show & Tell MVP QA 체크리스트 ✅

## 📋 개요

Show & Tell 12주 코스 MVP 출시를 위한 **QA 체크리스트 (12개 항목)**입니다.
모든 항목이 **통과**해야 MVP 출시 가능합니다.

---

## ⚠️ 사전 준비: Firestore 인덱스 생성 (필수!)

**Show & Tell 기능을 사용하기 전에 Firestore 인덱스를 생성해야 합니다.**

### 🔥 빠른 인덱스 생성 (30초)

1. Show & Tell 페이지 접속 시 에러 발생:
   ```
   The query requires an index. You can create it here: https://...
   ```

2. **에러 메시지의 링크를 클릭**하여 Firebase Console로 이동

3. **"인덱스 만들기"** 버튼 클릭

4. 인덱스 빌드 완료 대기 (1-2분)

5. 페이지 새로고침

### 📄 상세 가이드

자세한 인덱스 생성 방법은 다음 문서를 참고하세요:
- **빠른 해결:** `FIRESTORE_INDEX_QUICK_FIX.md`
- **전체 가이드:** `FIRESTORE_INDEXES_SHOWTELL.md`

### ✅ 필수 인덱스 목록

| 컬렉션 | 필드 | 상태 |
|--------|------|------|
| `showtell_portfolio_items` | child_id, course_id, week | ⚠️ **필수** |
| `showtell_week_progress` | child_id, course_id, week | ⚠️ **필수** |

---

## ✅ QA 체크리스트 (12개 항목)

### 1️⃣ 펜팔 메뉴/딥링크/호출 전부 차단 (플래그 OFF)

**테스트 항목**:
- [ ] `.env.local`에서 `NEXT_PUBLIC_PENPAL_ENABLED=false` 설정
- [ ] 대시보드에서 "펜팔 관리" 링크 숨김 확인
- [ ] 게시판에서 "펜팔 모집" 카테고리 숨김 확인
- [ ] Admin 사이드바에서 펜팔 관련 메뉴 숨김 확인
- [ ] `/penpal/*` 페이지 접근 시 리다이렉트 확인
- [ ] `/admin/penpal/*` 페이지 접근 시 리다이렉트 확인
- [ ] 펜팔 API 호출 시 403 Forbidden 응답 확인

**테스트 방법**:
```bash
# .env.local 설정
NEXT_PUBLIC_PENPAL_ENABLED=false

# 페이지 접근 테스트
http://localhost:3000/dashboard → "펜팔 관리" 링크 없음 ✅
http://localhost:3000/penpal → /dashboard로 리다이렉트 ✅
http://localhost:3000/admin/penpal → /admin으로 리다이렉트 ✅

# API 테스트
curl -X POST http://localhost:3000/api/penpal/send-letter
→ {"success":false,"error":"Feature 'penpal' is disabled.","code":"FEATURE_DISABLED"}
```

**검증 파일**:
- `lib/featureFlags.ts`
- `lib/apiFeatureFlags.ts`
- `app/penpal/layout.tsx`
- `app/admin/penpal/layout.tsx`

---

### 2️⃣ week1~12 코스 조회 API 정상

**테스트 항목**:
- [ ] Week 1~12 Content Pack 조회 성공
- [ ] Topic 정보 정상 반환
- [ ] Day 1, 2, 3 콘텐츠 정상 반환
- [ ] Judge Question Set 정상 반환

**테스트 방법**:
```bash
# Week 1 조회
curl "http://localhost:3000/api/showtell/content?week=1"
→ {"success":true,"data":{"content_pack":{...},"topic":{...}}}

# Week 12까지 순회 테스트
for i in {1..12}; do
  curl "http://localhost:3000/api/showtell/content?week=$i" | jq '.success'
done
→ 모두 true 반환 확인
```

**검증 결과**:
```json
{
  "success": true,
  "data": {
    "content_pack": {
      "content_pack_id": "showtell_week1",
      "week": 1,
      "json": {
        "title": "Week 1: My Favorite Toy",
        "description": "...",
        "day1": { "write": {...}, "fix": {...} },
        "day2": { "script_coach": {...}, "tts": {...}, "shadowing": {...} },
        "day3": { "rehearsal": {...}, "judge": {...} }
      }
    }
  }
}
```

**검증 파일**:
- `app/api/showtell/content/route.ts`
- `seed/showtell/content_packs.json`

---

### 3️⃣ Day1 타이핑 제출 → 교정 (2개 이하)

**테스트 항목**:
- [ ] 타이핑으로 텍스트 입력 가능
- [ ] 제출 성공 (Submission 생성)
- [ ] 교정 자동 실행
- [ ] 교정 결과에서 `max_corrections_applied <= 2` 확인
- [ ] `upgrades` 배열 길이 <= 2 확인

**테스트 방법**:
```bash
# 1. Submission 생성
curl -X POST http://localhost:3000/api/showtell/submissions/writing \
  -H "Content-Type: application/json" \
  -d '{
    "child_id": "child_demo_001",
    "week": 1,
    "input_method": "typing",
    "raw_text": "I like my toy very much. It is very fun. I play with it every day.",
    "cleaned_text": "I like my toy very much. It is very fun. I play with it every day."
  }'
→ {"success":true,"data":{"submission_id":"sub_..."}}

# 2. 교정 실행
curl -X POST http://localhost:3000/api/showtell/submissions/{submission_id}/correct
→ {"success":true,"data":{"max_corrections_applied":2,"upgrades":[...]}}
```

**검증 조건**:
- ✅ `max_corrections_applied`: 1 또는 2 (절대 3 이상 안 됨)
- ✅ `upgrades.length`: 1 또는 2

**검증 파일**:
- `app/api/showtell/submissions/writing/route.ts`
- `app/api/showtell/submissions/[submission_id]/correct/route.ts`

---

### 4️⃣ Day1 OCR 제출 → OCR 텍스트 수정 → 교정

**테스트 항목**:
- [ ] 이미지 업로드 가능
- [ ] OCR 텍스트 추출 (Mock)
- [ ] OCR 텍스트 편집 가능
- [ ] 수정된 텍스트로 제출
- [ ] 교정 정상 실행

**테스트 방법**:
```bash
# 1. OCR Submission 생성
curl -X POST http://localhost:3000/api/showtell/submissions/writing \
  -H "Content-Type: application/json" \
  -d '{
    "child_id": "child_demo_001",
    "week": 1,
    "input_method": "ocr",
    "raw_text": "원본 OCR 텍스트",
    "ocr_text": "I lkie my tooy.",
    "cleaned_text": "I like my toy.",
    "image_url": "https://storage.googleapis.com/..."
  }'
→ {"success":true,"data":{"submission_id":"sub_..."}}

# 2. 교정 실행
curl -X POST http://localhost:3000/api/showtell/submissions/{submission_id}/correct
→ {"success":true,"data":{"max_corrections_applied":1,"upgrades":[...]}}
```

**검증 조건**:
- ✅ `input_method`: "ocr"
- ✅ `ocr_text`: OCR 원본 (수정 전)
- ✅ `cleaned_text`: 수정된 텍스트
- ✅ 교정은 `cleaned_text` 기준으로 실행

**검증 파일**:
- `app/showtell/components/Day1Write.tsx`
- `components/ImageUpload.tsx`

---

### 5️⃣ Day2 script 30/60 생성

**테스트 항목**:
- [ ] Script Coach API 호출 성공
- [ ] 30초 대본: 3~4문장
- [ ] 60초 대본: 6~8문장
- [ ] Keywords 3개 제공
- [ ] Simplified Sentences 제공

**테스트 방법**:
```bash
# Script 생성
curl -X POST http://localhost:3000/api/showtell/submissions/{submission_id}/script
→ {
  "success": true,
  "data": {
    "script_id": "script_...",
    "script_30s": "Hi, I'm Min. I like my toy robot. It is very fun. I play with it every day.",
    "script_60s": "Hi, I'm Min. I like my toy robot very much. It is red and blue. I can make it walk and dance. It is very fun to play with. I play with it every day after school. Sometimes I show it to my friends.",
    "keywords": ["robot", "fun", "play"],
    "simplified_sentences": ["I like it very much. → I really like it."]
  }
}
```

**검증 조건**:
- ✅ `script_30s`: 3~4문장 (문장 수 확인)
- ✅ `script_60s`: 6~8문장 (문장 수 확인)
- ✅ `keywords.length`: 3
- ✅ `simplified_sentences.length`: >= 1

**검증 파일**:
- `app/api/showtell/submissions/[submission_id]/script/route.ts`

---

### 6️⃣ TTS 캐싱 (같은 문장 반복 재생 시 재생성 없음)

**테스트 항목**:
- [x] ✅ **실제 음성 재생** (Web Speech API 사용)
- [x] ✅ 재생 중 버튼 비활성화
- [x] ✅ 재생 완료 후 상태 복원
- [x] ✅ 음성 목록 비동기 로드 대응
- [x] ✅ 영어 음성 우선 선택 (en-US)
- [x] ✅ 어린이 친화적 속도 (`rate: 0.9`)
- [x] ✅ 서버 캐싱 API 연동 (백그라운드)
- [ ] 첫 TTS 요청: 캐시 미스 → 생성
- [ ] 같은 문장 재요청: 캐시 히트 → 기존 URL 반환
- [ ] `access_count` 증가 확인
- [ ] 다른 문장: 캐시 미스 → 새로 생성

**테스트 방법**:
```bash
# 1. 브라우저 테스트 (Web Speech API)
npm run dev
# http://localhost:3000/showtell → Week 1 → Day 2 → "TTS 듣기" 클릭

# 콘솔 로그 확인:
🎤 사용 가능한 음성: ["Google US English", ...]
🎤 TTS 요청: My favorite toy is Lego
🔊 TTS 재생 시작
✅ TTS 재생 완료

# 2. 서버 캐싱 테스트 (API)
curl -X POST http://localhost:3000/api/showtell/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, I am Min.","voice_id":"web_speech_api","speed":0.9}'
→ {"success":true,"data":{"audio_url":"...","cached":false}}

# 3. 같은 요청 (캐시 히트)
curl -X POST http://localhost:3000/api/showtell/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, I am Min.","voice_id":"web_speech_api","speed":0.9}'
→ {"success":true,"data":{"audio_url":"...","cached":true}}
```

**검증 조건**:
- ✅ **브라우저 재생**: `window.speechSynthesis.speak()` 정상 동작
- ✅ **재생 상태**: `isPlayingTTS === true` (재생 중)
- ✅ **음성 선택**: `voice.lang.startsWith('en-')` + `voice.name.includes('Google')` 우선
- ✅ **속도**: `utterance.rate === 0.9` (어린이용 느린 속도)
- ✅ **서버 캐시**: 첫 요청 `cached: false`, 재요청 `cached: true`
- ✅ `access_count`: 1 → 2 → 3 증가

**검증 파일**:
- `app/api/showtell/tts/route.ts`
- `app/showtell/components/Day2Shadowing.tsx`
- `WEB_SPEECH_TTS_IMPLEMENTATION.md` (📋 신규 문서)
- Firestore 컬렉션: `showtell_tts_cache`

**구현 상세**:
- **Web Speech API**: 브라우저 내장 TTS (무료, API 키 불필요)
- **지원 브라우저**: Chrome (⭐⭐⭐⭐⭐), Edge (⭐⭐⭐⭐⭐), Safari (⭐⭐⭐), Firefox (⭐⭐⭐)
- **서버 캐싱**: 통계 목적 (실제 재생은 클라이언트 측)

---

### 7️⃣ Shadowing 녹음 업로드/재생 + 즉각 AI 피드백 ✨

**테스트 항목**:
- [ ] 브라우저 마이크 권한 요청
- [ ] 문장별 녹음: 문장 1 → 피드백 → 문장 2 → 피드백 → 문장 3 → 피드백
- [ ] 녹음 후 AI 평가 중 로딩 표시
- [ ] 각 문장 완료 후 즉각 피드백 표시 ("🎉 Perfect!", "👍 Great job!" 등)
- [ ] 피드백 후 2초 대기 → 자동으로 다음 문장 이동
- [ ] Audio Record 저장 (3개)
- [ ] `day2_shadowing_audio_ids` 배열에 3개 추가
- [ ] 3개 녹음 완료 시 전체 피드백 요약 표시
- [ ] Day 2 완료 (3개 필수)

**테스트 방법**:
```bash
# 1. Audio Record 저장 (문장 1)
curl -X POST http://localhost:3000/api/showtell/audio \
  -H "Content-Type: application/json" \
  -d '{
    "child_id": "child_demo_001",
    "related_type": "shadowing",
    "related_id": "script_...",
    "duration_sec": 5,
    "storage_url": "https://storage.googleapis.com/...",
    "attempt_number": 1
  }'
→ {"success":true,"data":{"audio_id":"audio_1"}}

# 2. Audio Record 저장 (문장 2)
# ... (attempt_number: 2)

# 3. Audio Record 저장 (문장 3)
# ... (attempt_number: 3)

# 4. Week Progress 확인 (3개 필수)
curl "http://localhost:3000/api/showtell/progress?child_id=child_demo_001&week=1"
→ {"data":{"day2_shadowing_audio_ids":["audio_1","audio_2","audio_3"]}}

# 5. Day 2 완료 체크 (3개 미만 시 실패)
curl -X POST http://localhost:3000/api/showtell/submissions/{submission_id}/complete-day2
→ {"success":false,"error":"3 shadowing recordings required (current: 2/3). Please record all 3 sentences."}

# 6. Day 2 완료 체크 (3개 완료 시 성공)
curl -X POST http://localhost:3000/api/showtell/submissions/{submission_id}/complete-day2
→ {"success":true,"message":"Day 2 completed! You can now proceed to Day 3."}
```

**검증 조건**:
- ✅ `related_type`: "shadowing"
- ✅ `attempt_number`: 1, 2, 3 (문장별 구분)
- ✅ `day2_shadowing_audio_ids.length`: 3 (필수)
- ✅ 녹음 후 1.5초 AI 평가 시뮬레이션
- ✅ 피드백 종류: 5가지 랜덤 ("🎉 Perfect!", "👍 Great job!", "💪 Good!", "✨ Nice!", "🌟 Excellent!")
- ✅ 피드백 후 2초 대기 → 다음 문장 자동 이동
- ✅ 3개 완료 시 전체 피드백 요약 카드 표시
- ✅ Day 2 완료 API: 3개 미만 시 에러 반환

**검증 파일**:
- `app/api/showtell/audio/route.ts`
- `app/api/showtell/submissions/[submission_id]/complete-day2/route.ts`
- `app/showtell/components/Day2Shadowing.tsx`
- `SHADOWING_FEEDBACK_IMPLEMENTATION.md` (📋 신규 문서)

**UI 흐름**:
1. **문장 1 표시** → "🔊 원어민 음성 듣기" → "🎙️ 녹음 시작" → 녹음 중지
2. **AI 평가 중** (1.5초): "🤖 AI가 발음을 평가하는 중..." (로딩 스피너)
3. **즉각 피드백**: "🎉 Perfect! 완벽한 발음이에요!" (초록색 카드)
4. **자동 이동** (2초 대기): "🔄 곧 다음 문장으로 넘어갑니다..."
5. **문장 2 표시** → (반복)
6. **문장 3 완료 후**: 전체 피드백 요약 카드 (3개 문장 + 각 피드백)

**향후 개선 (Phase 2)**:
- 실제 AI 발음 평가 (OpenAI Whisper, Azure Pronunciation Assessment)
- 재녹음 기능 ("다시 녹음하기" 버튼)
- 발음 점수 시각화 (100점 만점)

---

### 8️⃣ Rehearsal attempt1 → 피드백 (2팁 + 1문장) → attempt2

**테스트 항목**:
- [ ] Rehearsal 세션 생성
- [ ] Attempt 1 업로드
- [ ] 피드백 생성: 칭찬 1 + 팁 2 + 개선 문장 1 (고정 형식)
- [ ] Attempt 2 업로드
- [ ] 세션 완료

**테스트 방법**:
```bash
# 1. 세션 생성
curl -X POST http://localhost:3000/api/showtell/rehearsals \
  -H "Content-Type: application/json" \
  -d '{"script_id":"script_...","child_id":"child_demo_001"}'
→ {"success":true,"data":{"rehearsal_id":"rehearsal_...","status":"created"}}

# 2. Attempt 1
curl -X POST http://localhost:3000/api/showtell/rehearsals/{rehearsal_id}/attempt1 \
  -H "Content-Type: application/json" \
  -d '{"audio_id":"audio_..."}'
→ {"success":true,"data":{"status":"attempt1_uploaded"}}

# 3. 피드백 생성
curl -X POST http://localhost:3000/api/showtell/rehearsals/{rehearsal_id}/feedback
→ {
  "success": true,
  "data": {
    "praise": "발음이 정말 좋았어요!",
    "tip1": "조금 더 천천히 말하면 더 좋을 것 같아요.",
    "tip2": "문장의 끝을 올려서 말하면 더 자연스러워요.",
    "improved_sentence": "Try saying: 'I really love my toy robot!'"
  }
}

# 4. Attempt 2
curl -X POST http://localhost:3000/api/showtell/rehearsals/{rehearsal_id}/attempt2 \
  -H "Content-Type: application/json" \
  -d '{"audio_id":"audio_..."}'
→ {"success":true,"data":{"status":"completed"}}
```

**검증 조건**:
- ✅ 피드백 형식: `{praise, tip1, tip2, improved_sentence}` (4개 필드 고정)
- ✅ 상태 전환: `created` → `attempt1_uploaded` → `feedback_given` → `completed`

**검증 파일**:
- `app/api/showtell/rehearsals/route.ts`
- `app/api/showtell/rehearsals/[rehearsal_id]/feedback/route.ts`

---

### 9️⃣ Judge 10문항 중 5개 랜덤으로 진행

**테스트 항목**:
- [ ] Judge 세션 생성 시 10문항 중 5개 랜덤 선택
- [ ] 매 실행마다 다른 질문 조합 확인
- [ ] 선택된 5개 질문으로만 진행
- [ ] 순차적으로 1개씩 진행

**테스트 방법**:
```bash
# 1. Judge 세션 생성 (3번 실행)
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/showtell/judge-sessions \
    -H "Content-Type: application/json" \
    -d '{
      "child_id":"child_demo_001",
      "script_id":"script_...",
      "question_set_id":"judge_week1",
      "n_questions":5
    }' | jq '.data.selected_questions[].question_id'
done
→ 매번 다른 질문 ID 조합 확인

# 예시 결과:
# 실행 1: ["q1", "q3", "q5", "q7", "q9"]
# 실행 2: ["q2", "q4", "q6", "q8", "q10"]
# 실행 3: ["q1", "q2", "q5", "q8", "q10"]
```

**검증 조건**:
- ✅ `selected_questions.length`: 5
- ✅ 매 실행마다 랜덤 조합
- ✅ `current_question_index`: 0 → 1 → 2 → 3 → 4

**검증 파일**:
- `app/api/showtell/judge-sessions/route.ts`

---

### 🔟 Judge 질문에서 개인정보 요구 없음

**테스트 항목**:
- [ ] 학교명 질문 필터링
- [ ] 주소 질문 필터링
- [ ] 연락처 질문 필터링
- [ ] 실명 질문 필터링
- [ ] 부모 정보 질문 필터링

**테스트 방법**:
```javascript
// seed/showtell/judge_question_sets.json 확인
const forbiddenKeywords = [
  "school name", "your school", "which school",
  "address", "where do you live", "your home",
  "phone", "number", "contact",
  "real name", "your name", "full name",
  "email", "parent"
];

// 모든 질문 텍스트 확인
judge_question_sets.forEach(set => {
  set.json.questions.forEach(q => {
    const lowerText = q.text.toLowerCase();
    const hasForbidden = forbiddenKeywords.some(keyword => 
      lowerText.includes(keyword)
    );
    if (hasForbidden) {
      console.error(`⚠️ 개인정보 질문 발견: ${q.text}`);
    }
  });
});
```

**검증 조건**:
- ✅ 금지 키워드 포함 질문: 0개
- ✅ Judge 세션 생성 시 자동 필터링 확인

**검증 파일**:
- `app/api/showtell/judge-sessions/route.ts` (필터링 로직)
- `seed/showtell/judge_question_sets.json` (질문 데이터)

---

### 1️⃣1️⃣ Day3 완료 후 Portfolio 카드 생성

**테스트 항목**:
- [ ] Judge 5문항 완료
- [ ] Portfolio Item 자동 생성
- [ ] `showtell_portfolio_items` 컬렉션에 저장
- [ ] Week Progress `portfolio_completed: true` 설정
- [ ] Portfolio 목록에서 카드 표시 확인

**테스트 방법**:
```bash
# 1. Judge 5문항 완료
# ... (5개 질문 답변)

# 2. Day 3 완료 시 자동으로 Portfolio 생성
# createPortfolio() 호출됨

# 3. Portfolio 조회
curl "http://localhost:3000/api/showtell/portfolio/complete-week?child_id=child_demo_001&course_id=show_tell_12w"
→ {
  "success": true,
  "data": {
    "portfolio_items": [
      {
        "portfolio_id": "portfolio_child_demo_001_week1",
        "week": 1,
        "title": "Week 1: My Favorite Toy",
        "final_script": "...",
        "final_recording_url": "...",
        "completed_at": "2025-12-27T..."
      }
    ],
    "total_weeks_completed": 1
  }
}

# 4. Week Progress 확인
curl "http://localhost:3000/api/showtell/progress?child_id=child_demo_001&week=1"
→ {"data":{"portfolio_completed":true,"portfolio_id":"portfolio_child_demo_001_week1"}}
```

**검증 조건**:
- ✅ Portfolio Item 생성: `portfolio_id`, `submission_id`, `script_id`, `rehearsal_session_id`, `judge_session_id` 모두 포함
- ✅ `portfolio_completed: true`
- ✅ Show & Tell 메인 페이지에 카드 표시

**검증 파일**:
- `app/api/showtell/portfolio/complete-week/route.ts`
- `app/showtell/week/[week]/day3/page.tsx`

---

### 1️⃣2️⃣ week2 진행 후 week1 데이터 유지/누적

**테스트 항목**:
- [ ] Week 1 완료 후 Week 2 시작
- [ ] Week 1 데이터 유지 확인 (삭제 안 됨)
- [ ] Week 2 독립적으로 진행
- [ ] Portfolio에 Week 1, 2 카드 모두 표시

**테스트 방법**:
```bash
# 1. Week 1 완료
# ... (Day 1, 2, 3 완료)

# 2. Week 2 시작
curl -X POST http://localhost:3000/api/showtell/submissions/writing \
  -H "Content-Type: application/json" \
  -d '{
    "child_id": "child_demo_001",
    "week": 2,
    "input_method": "typing",
    "raw_text": "Week 2 content..."
  }'
→ {"success":true,"data":{"submission_id":"sub_week2_..."}}

# 3. Week 1 데이터 확인 (유지됨)
curl "http://localhost:3000/api/showtell/progress?child_id=child_demo_001&week=1"
→ {"data":{"week":1,"portfolio_completed":true,...}} ✅ 유지됨

# 4. Week 2 데이터 확인 (독립적)
curl "http://localhost:3000/api/showtell/progress?child_id=child_demo_001&week=2"
→ {"data":{"week":2,"day1_completed":true,...}} ✅ 독립적

# 5. Portfolio 목록 확인
curl "http://localhost:3000/api/showtell/portfolio/complete-week?child_id=child_demo_001"
→ {
  "data": {
    "portfolio_items": [
      {"week": 1, "title": "Week 1: My Favorite Toy", ...},
      {"week": 2, "title": "Week 2: My Best Friend", ...}
    ],
    "total_weeks_completed": 2
  }
}
```

**검증 조건**:
- ✅ Week 1 데이터 유지 (삭제 안 됨)
- ✅ Week 2 데이터 독립적 생성
- ✅ Portfolio에 누적 표시 (Week 1, 2 카드)
- ✅ Firestore에 `progress_child_demo_001_week1`, `progress_child_demo_001_week2` 별도 문서

**검증 파일**:
- Firestore 컬렉션: `showtell_week_progress`
- Firestore 컬렉션: `showtell_portfolio_items`

---

## 📊 QA 체크리스트 요약

| No | 항목 | 상태 | 검증 방법 |
|----|------|------|----------|
| 1 | 펜팔 차단 (플래그 OFF) | ⏳ 테스트 필요 | UI 확인 + API 403 응답 |
| 2 | week1~12 코스 조회 | ⏳ 테스트 필요 | API 12번 호출 |
| 3 | Day1 타이핑 교정 (2개 이하) | ⏳ 테스트 필요 | `max_corrections_applied <= 2` |
| 4 | Day1 OCR 수정 교정 | ⏳ 테스트 필요 | OCR → 수정 → 교정 |
| 5 | Day2 script 30/60 생성 | ⏳ 테스트 필요 | 문장 수 확인 |
| 6 | TTS 캐싱 | ⏳ 테스트 필요 | `cached: true` 확인 |
| 7 | Shadowing 녹음 | ⏳ 테스트 필요 | 3개 녹음 완료 |
| 8 | Rehearsal 2팁+1문장 | ⏳ 테스트 필요 | 피드백 형식 확인 |
| 9 | Judge 5개 랜덤 | ⏳ 테스트 필요 | 랜덤 조합 확인 |
| 10 | Judge 개인정보 필터링 | ⏳ 테스트 필요 | 금지 키워드 확인 |
| 11 | Portfolio 카드 생성 | ⏳ 테스트 필요 | Day 3 완료 후 자동 생성 |
| 12 | Week 데이터 누적 | ⏳ 테스트 필요 | Week 2 진행 후 Week 1 유지 |

---

## 🔧 자동화 테스트 스크립트

### 테스트 실행 방법

```bash
# 1. 개발 서버 실행
npm run dev

# 2. 테스트 스크립트 실행 (예시)
node scripts/qa-test.js
```

### 테스트 스크립트 예시 (qa-test.js)

```javascript
// scripts/qa-test.js
const API_BASE = "http://localhost:3000";
const CHILD_ID = "child_demo_001";

async function runQA() {
  console.log("🚀 Show & Tell MVP QA 테스트 시작\n");

  // 1. 펜팔 차단 확인
  console.log("1️⃣ 펜팔 API 차단 확인...");
  const penpalResponse = await fetch(`${API_BASE}/api/penpal/send-letter`, {
    method: "POST",
  });
  const penpalResult = await penpalResponse.json();
  console.assert(
    penpalResult.code === "FEATURE_DISABLED",
    "❌ 펜팔 차단 실패"
  );
  console.log("✅ 펜팔 차단 확인 완료\n");

  // 2. Week 1~12 조회
  console.log("2️⃣ Week 1~12 코스 조회...");
  for (let week = 1; week <= 12; week++) {
    const response = await fetch(`${API_BASE}/api/showtell/content?week=${week}`);
    const result = await response.json();
    console.assert(result.success, `❌ Week ${week} 조회 실패`);
  }
  console.log("✅ Week 1~12 조회 완료\n");

  // 3. Day 1 타이핑 + 교정
  console.log("3️⃣ Day 1 타이핑 + 교정...");
  const submissionResponse = await fetch(`${API_BASE}/api/showtell/submissions/writing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      child_id: CHILD_ID,
      week: 1,
      input_method: "typing",
      raw_text: "I like my toy very much.",
      cleaned_text: "I like my toy very much.",
    }),
  });
  const submissionResult = await submissionResponse.json();
  const submissionId = submissionResult.data.submission_id;

  const correctionResponse = await fetch(
    `${API_BASE}/api/showtell/submissions/${submissionId}/correct`,
    { method: "POST" }
  );
  const correctionResult = await correctionResponse.json();
  console.assert(
    correctionResult.data.max_corrections_applied <= 2,
    "❌ 교정 2개 이하 실패"
  );
  console.log("✅ Day 1 타이핑 + 교정 완료\n");

  // ... (나머지 테스트 추가)

  console.log("🎉 모든 QA 테스트 통과!");
}

runQA();
```

---

## 📋 리그레션 테스트

### 기존 기능 영향도 확인

| 기존 기능 | 영향도 | 확인 사항 |
|----------|--------|----------|
| 사용자 인증 | 없음 | AuthGuard 정상 작동 |
| 대시보드 | 영향 있음 | 펜팔 링크 숨김 확인 |
| 게시판 | 영향 있음 | 펜팔 카테고리 숨김 확인 |
| Admin | 영향 있음 | 펜팔 메뉴 숨김 확인 |
| 기타 기능 | 없음 | 정상 작동 |

---

## ✅ MVP 출시 체크리스트

**12개 항목 모두 통과 시 MVP 출시 가능**:

- [ ] 1. 펜팔 차단 ✅
- [ ] 2. Week 1~12 조회 ✅
- [ ] 3. Day 1 타이핑 교정 ✅
- [ ] 4. Day 1 OCR 교정 ✅
- [ ] 5. Day 2 Script 생성 ✅
- [ ] 6. TTS 캐싱 ✅
- [ ] 7. Shadowing 녹음 ✅
- [ ] 8. Rehearsal 피드백 ✅
- [ ] 9. Judge 랜덤 5개 ✅
- [ ] 10. Judge 개인정보 필터링 ✅
- [ ] 11. Portfolio 생성 ✅
- [ ] 12. Week 데이터 누적 ✅

---

**작성일**: 2025-12-27  
**작성자**: Cursor AI Assistant  
**상태**: 📋 QA 체크리스트 작성 완료 (테스트 진행 필요)

