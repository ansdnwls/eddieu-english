# Writing Ladder Level 0 - 시작 가이드

## 🚀 빠른 시작

Writing Ladder Level 0 (4주차)를 앱에 추가하는 3단계 프로세스입니다.

---

## 1단계: 콘텐츠 시드 (DB 업로드)

### 준비사항

**Firebase Admin SDK 인증 설정:**

Option A: Service Account Key 사용 (권장)
```bash
# Firebase Console에서 서비스 계정 키 다운로드
# 프로젝트 루트에 serviceAccountKey.json 배치
```

Option B: 환경변수 사용
```bash
export FIREBASE_PROJECT_ID=your-project-id
```

### 시드 실행

```bash
# Writing Ladder Level 0 콘텐츠 업로드
npm run seed-writingladder-level0

# 또는 직접 실행
node scripts/seed-writingladder-level0.js
```

### 업로드되는 데이터

- **Topics**: 4개 (Week 1-4)
- **Judge Questions**: 4개 세트 (각 10문항)
- **Content Packs**: 4개 (Week 1-4, 완전한 Day 1-2-3 구조)

### 검증

Firestore Console에서 다음 컬렉션 확인:
- `writingladder_topics` (4개 문서)
- `writingladder_judge_questions` (4개 문서)
- `writingladder_content_packs` (4개 문서)

---

## 2단계: API 테스트

### 콘텐츠 API 테스트

```bash
# Week 1 콘텐츠 조회
curl http://localhost:3002/api/v1/courses/writing_ladder_level0/weeks/1

# 예상 응답:
{
  "success": true,
  "data": {
    "content_pack": { "content_pack_id": "cp_wl0_w1", ... },
    "topic": { "topic_id": "wl0.topic.likes", ... },
    "judge_question_set": { "question_set_id": "wl0.jq.likes.v1", ... }
  }
}
```

### 카탈로그 API 테스트

```bash
# 코스 카탈로그 조회
curl http://localhost:3002/api/v1/courses/catalog

# Writing Ladder Level 0이 AVAILABLE로 표시되어야 함
```

---

## 3단계: 앱에서 확인

### 3-1. 코스 홈 접속

```
http://localhost:3002/courses
```

**확인사항:**
- ✅ "전체 코스" 탭에 "Writing Ladder Level 0 (문장)" 카드 표시
- ✅ "문장부터 탄탄하게" 부제 표시
- ✅ "코스 시작하기" 버튼 활성화

### 3-2. 코스 시작

1. "코스 시작하기" 클릭
2. `course_instance` 생성 확인 (Firestore)
3. Week 1 Day 1로 자동 리다이렉트

### 3-3. Day 1 (Write + Fix) 테스트

**Week 1: Things I Like**

1. 프롬프트 확인:
   - "Write about something you like!"
   - Guide Questions: "What do you like?", "Why do you like it?", "How do you feel?"

2. 문장 프레임 확인:
   - "I like ___."
   - "I like it because ___."
   - "I feel ___ when I ___."

3. 샘플 텍스트 입력:
   ```
   I like drawing. I like it because it is fun. I feel happy when I draw.
   ```

4. "교정 받기" 클릭

5. 교정 결과 확인:
   - 최대 2개 교정
   - `because` 문법 포커스
   - 한 줄 설명 (한국어)

### 3-4. Day 2 (Script + Shadowing) 테스트

1. "스크립트 생성" 클릭

2. 생성된 스크립트 확인:
   - 30초 대본 (스타일 가이드 적용)
   - LOW/A1: 2-3문장, 최대 6단어/문장
   - HIGH/A2: 3-4문장, 최대 10단어/문장
   - "because" 포함 (필수)

3. Shadowing 3문장 TTS 재생

4. 녹음 및 제출

### 3-5. Day 3 (Rehearsal + Judge) 테스트

1. **Rehearsal (2회)**:
   - 1차 시도 → 피드백 받기
   - 2차 시도 (최종)

2. **Judge Session**:
   - LOW: 3문항 랜덤 출제
   - HIGH: 5문항 랜덤 출제
   - 예시 질문:
     - "What do you like?"
     - "Why do you like it?"
     - "How do you feel?"

3. Judge 완료 후 포트폴리오 생성 확인

### 3-6. 포트폴리오 확인

**위치:** `/writingladder` (Writing Ladder 홈)

**확인사항:**
- ✅ "Week 1: Things I Like" 카드 표시
- ✅ Final Script 포함
- ✅ Final Recording 포함
- ✅ Judge Q&A 로그 포함

---

## 📊 4주차 커리큘럼 확인

| Week | Topic | Grammar | Test URL |
|------|-------|---------|----------|
| 1 | Things I Like | because | `/api/v1/courses/writing_ladder_level0/weeks/1` |
| 2 | I Can / I Have | can, have | `/api/v1/courses/writing_ladder_level0/weeks/2` |
| 3 | Describe a Place | there is/are | `/api/v1/courses/writing_ladder_level0/weeks/3` |
| 4 | Last Weekend | past simple | `/api/v1/courses/writing_ladder_level0/weeks/4` |

---

## 🧪 스타일 가이드 테스트

```bash
# 스타일 가이드 규칙 확인
npm run test-style-guide

# 출력:
# ✅ Writing Ladder L0 - LOW/A1: 2-3문장, 최대 6단어/문장
# ✅ Writing Ladder L0 - MID/A1: 3-4문장, 최대 8단어/문장, 'because' 필수
# ✅ Writing Ladder L0 - HIGH/A2: 3-4문장, 최대 10단어/문장, 'because' 필수
```

---

## ✅ 완료조건(AC) 체크리스트

### AC 1: Level0 week1~4가 앱에서 정상 로딩됨
- [ ] Firestore에 Topics 4개 업로드 완료
- [ ] Firestore에 Judge Questions 4개 업로드 완료
- [ ] Firestore에 Content Packs 4개 업로드 완료
- [ ] `/api/v1/courses/writing_ladder_level0/weeks/{1-4}` API 정상 응답
- [ ] 코스 홈에 "Writing Ladder Level 0" 카드 표시

### AC 2: Day1~3까지 수행 가능
- [ ] Day 1: Write+Fix 페이지 정상 로딩
- [ ] Day 1: 문장 프레임 표시
- [ ] Day 1: 교정 API 호출 성공 (최대 2개)
- [ ] Day 2: Script Coach API 호출 성공 (스타일 가이드 적용)
- [ ] Day 2: Shadowing 3문장 TTS 재생
- [ ] Day 3: Rehearsal 2회 시도 가능
- [ ] Day 3: Judge 3-5문항 랜덤 출제

### AC 3: 포트폴리오에 week별 결과물 카드 생성됨
- [ ] Week 1 완료 후 포트폴리오 카드 생성
- [ ] 카드에 "Week 1: Things I Like" 제목 표시
- [ ] Final Script 저장 확인
- [ ] Final Recording 저장 확인
- [ ] Judge Q&A 로그 저장 확인

---

## 🐛 문제 해결

### 시드 스크립트 실패
```
❌ Firebase 초기화 실패: serviceAccountKey.json 또는 FIREBASE_PROJECT_ID 환경변수 필요
```

**해결:**
- `serviceAccountKey.json` 파일 경로 확인
- 또는 `export FIREBASE_PROJECT_ID=your-project-id` 설정

### API 404 에러
```
GET /api/v1/courses/writing_ladder_level0/weeks/1
{ "success": false, "error": "Content pack not found" }
```

**해결:**
- Firestore에 `writingladder_content_packs` 컬렉션 확인
- `cp_wl0_w1` 문서 존재 여부 확인
- 시드 스크립트 재실행

### 스타일 가이드 미적용
```
Script가 너무 김 (10문장 이상)
```

**해결:**
- `lib/styleGuides.ts` 파일 확인
- Script Coach API에서 `getStyleGuide()` 호출 확인
- `validateScript()` 검증 로그 확인

---

## 📚 추가 문서

- [STAGE5_COMPLETE_SUMMARY.md](./STAGE5_COMPLETE_SUMMARY.md) - 5단계 완료 요약
- [SCRIPT_COACH_STYLE_GUIDE.md](./SCRIPT_COACH_STYLE_GUIDE.md) - 스타일 가이드 상세
- [WRITING_LADDER_IMPLEMENTATION.md](./WRITING_LADDER_IMPLEMENTATION.md) - 전체 구현 개요

---

## 🎉 성공!

모든 체크리스트가 완료되었다면, Writing Ladder Level 0이 정상적으로 작동하는 것입니다!

**다음 단계:**
- Level 1-3 추가 (단락, 에세이, 창작)
- HIGH/A2 전용 질문셋 추가
- 멀티미디어 자료 추가 (이미지, 썸네일)

---

**문의:** 문제가 발생하면 이 가이드를 참고하여 단계별로 확인해주세요.
