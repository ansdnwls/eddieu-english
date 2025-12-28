# Writing Ladder Level 0 HIGH(A2) 콘텐츠 시드 완료

## 🎯 목표

Writing Ladder Level 0에 **HIGH(A2)** 버전 콘텐츠 추가
- LOW(A1): 저학년/초보용 (이미 완료)
- HIGH(A2): 고학년/조금 더 하는 아이용 (본 작업)

---

## 📊 차이점 요약

### Level0-LOW(A1)
- **Day1**: 3~5문장, 문장당 5~8단어
- **Judge**: 3문항 (선택지 포함)
- **Script**: 30초만, 2~3문장

### Level0-HIGH(A2)
- **Day1**: 4~6문장, 문장당 8~10단어
- **Judge**: 5문항 (자유답)
- **Script**: 30초(3~4문장) + 60초 옵션

---

## ✅ 완료 작업

### 1. Judge Questions (HIGH/A2) 생성

**파일**: `seed/writingladder/level0_high_judge_questions.json`

**내용**:
- 4개 주차별 질문셋 (Week 1-4)
- 각 10문항 (세션에서 랜덤 5개 선택)
- 자유답 허용 (선택지 없음)

**Question Set IDs**:
- `wl0.jq.likes.high.v1` (Week 1)
- `wl0.jq.can_have.high.v1` (Week 2)
- `wl0.jq.describe_place.high.v1` (Week 3)
- `wl0.jq.past_mini.high.v1` (Week 4)

**특징**:
- 더 개방형 질문 (예: "What is one thing you want to improve?")
- 메타인지 질문 포함 (예: "What did you learn?", "What would you change?")
- 문법 응용 요구 (예: "Give one example sentence with 'can'.")

---

### 2. Content Packs (HIGH/A2) 생성

**파일**: `seed/writingladder/level0_high_content_packs.json`

**내용**:
- 4개 주차별 콘텐츠 팩 (Week 1-4)
- HIGH/A2 규칙 적용

**Content Pack IDs**:
- `cp_wl0_w1_high_a2` (Week 1: Things I Like)
- `cp_wl0_w2_high_a2` (Week 2: I Can / I Have)
- `cp_wl0_w3_high_a2` (Week 3: Describe a Place)
- `cp_wl0_w4_high_a2` (Week 4: Last Weekend)

**Day 1 규칙**:
```json
{
  "min_sentences": 4,
  "max_sentences": 6,
  "max_words_per_sentence": 10,
  "required_connectors": ["because"]
}
```

**Day 2 규칙**:
```json
{
  "sec30": {
    "min_sentences": 3,
    "max_sentences": 4,
    "max_words_per_sentence": 10
  },
  "sec60": {
    "enabled": true,
    "min_sentences": 6,
    "max_sentences": 8,
    "max_words_per_sentence": 12
  }
}
```

**Day 3 규칙**:
```json
{
  "judge": {
    "n_questions": 5,
    "question_bank_ref": "wl0.jq.*.high.v1",
    "answer_limits": { "max_sentences": 2 }
  }
}
```

---

### 3. 시드 스크립트 생성

**파일**: `scripts/seed-writingladder-level0-high.js`

**기능**:
- HIGH/A2 Judge Questions 업로드
- HIGH/A2 Content Packs 업로드
- Firestore 컬렉션 확인 및 요약

**실행 방법**:
```bash
npm run seed-writingladder-level0-high
```

**또는**:
```bash
node scripts/seed-writingladder-level0-high.js
```

---

### 4. package.json 업데이트

**추가된 스크립트**:
```json
{
  "scripts": {
    "seed-writingladder-level0-high": "node scripts/seed-writingladder-level0-high.js"
  }
}
```

---

## 🚀 실행 순서

### Step 1: LOW(A1) 시드 실행 (이미 완료됨)
```bash
npm run seed-writingladder-level0
```

**결과**:
- `writingladder_topics`: 4개 (Week 1-4, 공통)
- `writingladder_judge_questions`: 4개 (LOW/A1용)
- `writingladder_content_packs`: 4개 (LOW/A1용)

---

### Step 2: HIGH(A2) 시드 실행 (신규)
```bash
npm run seed-writingladder-level0-high
```

**결과**:
- `writingladder_judge_questions`: 4개 추가 (HIGH/A2용)
- `writingladder_content_packs`: 4개 추가 (HIGH/A2용)

**기대 출력**:
```
🚀 Writing Ladder Level 0 HIGH/A2 콘텐츠 시드 시작
================================================

=== Writing Ladder Level 0 HIGH/A2 Judge Questions 시드 시작 ===
✅ Judge Questions 추가: wl0.jq.likes.high.v1 (Week 1, HIGH/A2, 10문항)
✅ Judge Questions 추가: wl0.jq.can_have.high.v1 (Week 2, HIGH/A2, 10문항)
✅ Judge Questions 추가: wl0.jq.describe_place.high.v1 (Week 3, HIGH/A2, 10문항)
✅ Judge Questions 추가: wl0.jq.past_mini.high.v1 (Week 4, HIGH/A2, 10문항)

✅ Judge Questions 시드 완료: 4개 추가

=== Writing Ladder Level 0 HIGH/A2 Content Packs 시드 시작 ===
✅ Content Pack 추가: cp_wl0_w1_high_a2 (Week 1, HIGH/A2: Week 1: Things I Like (HIGH/A2))
✅ Content Pack 추가: cp_wl0_w2_high_a2 (Week 2, HIGH/A2: Week 2: I Can / I Have (HIGH/A2))
✅ Content Pack 추가: cp_wl0_w3_high_a2 (Week 3, HIGH/A2: Week 3: Describe a Place (HIGH/A2))
✅ Content Pack 추가: cp_wl0_w4_high_a2 (Week 4, HIGH/A2: Week 4: Last Weekend (HIGH/A2))

✅ Content Packs 시드 완료: 4개 추가

================================================
🎉 Writing Ladder Level 0 HIGH/A2 콘텐츠 시드 완료!

📊 요약:
   - Judge Questions: 4개 세트 (각 10문항, HIGH/A2용)
   - Content Packs: 4개 (Week 1-4, HIGH/A2용)
```

---

## 🔍 Firestore 확인

### writingladder_judge_questions 컬렉션

**LOW(A1) 문서** (기존):
- [ ] `wl0.jq.likes.v1` (LOW, 3문항 선택)
- [ ] `wl0.jq.can_have.v1` (LOW, 3문항 선택)
- [ ] `wl0.jq.describe_place.v1` (LOW, 3문항 선택)
- [ ] `wl0.jq.past_mini.v1` (LOW, 3문항 선택)

**HIGH(A2) 문서** (신규):
- [ ] `wl0.jq.likes.high.v1` (HIGH, 5문항 선택)
- [ ] `wl0.jq.can_have.high.v1` (HIGH, 5문항 선택)
- [ ] `wl0.jq.describe_place.high.v1` (HIGH, 5문항 선택)
- [ ] `wl0.jq.past_mini.high.v1` (HIGH, 5문항 선택)

**총 8개 문서**

---

### writingladder_content_packs 컬렉션

**LOW(A1) 문서** (기존):
- [ ] `cp_wl0_w1` (Week 1, LOW/A1)
- [ ] `cp_wl0_w2` (Week 2, LOW/A1)
- [ ] `cp_wl0_w3` (Week 3, LOW/A1)
- [ ] `cp_wl0_w4` (Week 4, LOW/A1)

**HIGH(A2) 문서** (신규):
- [ ] `cp_wl0_w1_high_a2` (Week 1, HIGH/A2)
- [ ] `cp_wl0_w2_high_a2` (Week 2, HIGH/A2)
- [ ] `cp_wl0_w3_high_a2` (Week 3, HIGH/A2)
- [ ] `cp_wl0_w4_high_a2` (Week 4, HIGH/A2)

**총 8개 문서**

---

## 🎨 사용 방법

### 코스 시작 시 grade_band 선택

**API**: `POST /api/v1/courses/start`

**LOW(A1) 코스 시작**:
```json
{
  "child_id": "test_child_123",
  "course_id": "writing_ladder_level0",
  "grade_band": "LOW",
  "cefr_level": "A1"
}
```

**HIGH(A2) 코스 시작**:
```json
{
  "child_id": "test_child_456",
  "course_id": "writing_ladder_level0",
  "grade_band": "HIGH",
  "cefr_level": "A2"
}
```

---

### Week 조회 시 자동 grade_band 매칭

**API**: `GET /api/v1/courses/writing_ladder_level0/weeks/{week}`

**로직**:
1. `course_instance`에서 `grade_band` 조회
2. `grade_band`에 맞는 `content_pack` 선택:
   - `LOW` → `cp_wl0_w{week}`
   - `HIGH` → `cp_wl0_w{week}_high_a2`
3. `grade_band`에 맞는 `judge_question_set` 선택:
   - `LOW` → `wl0.jq.*.v1`
   - `HIGH` → `wl0.jq.*.high.v1`

---

## ✅ 완료조건(AC)

### 1. 시드 데이터 확인
- [ ] LOW(A1) 시드 8개 문서 존재 (4 questions + 4 packs)
- [ ] HIGH(A2) 시드 8개 문서 존재 (4 questions + 4 packs)
- [ ] 총 16개 문서 (topics 4 + LOW 8 + HIGH 8)

### 2. API 테스트
- [ ] LOW 코스 시작 → LOW content_pack 반환
- [ ] HIGH 코스 시작 → HIGH content_pack 반환
- [ ] Week 1-4 모두 grade_band에 맞게 로딩됨

### 3. Day 1-3 테스트
- [ ] LOW Day1: 3~5문장, 루브릭 통과
- [ ] HIGH Day1: 4~6문장, 루브릭 통과
- [ ] LOW Judge: 3문항 랜덤 선택
- [ ] HIGH Judge: 5문항 랜덤 선택
- [ ] LOW Script: 30초만
- [ ] HIGH Script: 30초 + 60초 옵션

### 4. 루브릭 검증
```javascript
// LOW(A1) 루브릭
{
  "min_sentences": 3,
  "max_sentences": 5,
  "max_words_per_sentence": 8
}

// HIGH(A2) 루브릭
{
  "min_sentences": 4,
  "max_sentences": 6,
  "max_words_per_sentence": 10
}
```

---

## 📝 예시 콘텐츠 샘플

### Week 1 HIGH(A2) Example Text
```
I like drawing cartoons. I usually draw on weekends. I like it because it is creative and fun. It makes me feel relaxed. My favorite part is making funny characters. That's why I like it.
```

**문장 수**: 6개 ✅  
**최대 단어/문장**: 8~10단어 ✅  
**필수 패턴**: "I like", "because" ✅  

---

### Week 1 HIGH(A2) Judge Questions (5개 중 샘플)
1. "What do you like the most?"
2. "Why do you like it? Use 'because'."
3. "What is your favorite part?"
4. "What is one thing you want to improve?"
5. "Can you say it in one strong sentence?"

**특징**: 개방형, 메타인지, 문법 응용 ✅

---

## 🎉 완료!

**Writing Ladder Level 0 HIGH(A2) 콘텐츠 시드 완료!**

**다음 작업**:
1. 시드 스크립트 실행 (`npm run seed-writingladder-level0-high`)
2. Firestore에서 데이터 확인
3. API 테스트 (LOW vs HIGH)
4. QA: Week 1-4 완주 (LOW/HIGH 각각)

**레벨 업 시점**:
- Level 0 (문장) 완료 → **Level 1 (문단)**으로 진행

---

**작성 완료 일시**: 2025년 12월 28일  
**작성자**: Cursor AI + User


