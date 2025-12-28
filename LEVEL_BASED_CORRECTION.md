# 레벨별 교정 + 상세 교정 기능 추가 ✅

## 🎯 개선 사항

### Before (❌ 문제점)
- 초2 수준 학생에게 "incredibly", "extremely" 같은 고급 단어 제안
- 교정 수준 선택 불가능 (무조건 1-2개만)
- 아이의 나이/레벨 고려하지 않음

### After (✅ 개선)
- **아이 나이별 적정 단어 수준 적용**
  - 6-8세: Grade 1-2 level (very simple words)
  - 9-10세: Grade 3-4 level (simple words)
  - 11-13세: Grade 5-6 level (elementary words)
- **교정 수준 선택 가능**
  - Minimal 모드: 1-2개만 (기본)
  - Detailed 모드: 3-5개 상세 교정
- **단어 수준 강력 제한**
  - ❌ incredibly, extremely, delighted → ✅ really, very, happy

---

## 🔧 수정된 파일 (2개)

### 1. `app/api/showtell/submissions/[submission_id]/correct/route.ts`

#### 주요 변경사항:
1. **아이 나이 조회 기능 추가**
   ```typescript
   async function getChildAge(child_id: string): Promise<number>
   ```

2. **레벨별 단어 제한**
   ```typescript
   const vocabularyLevel = childAge <= 8 ? "very simple words (Grade 1-2 level)" :
                           childAge <= 10 ? "simple words (Grade 3-4 level)" :
                           "elementary-level words (Grade 5-6 level)";
   ```

3. **교정 수준 파라미터 추가**
   ```typescript
   const correction_level: "minimal" | "detailed" = body.correction_level || "minimal";
   ```

4. **프롬프트 강화 (단어 제한)**
   ```
   **Vocabulary Level Rules:**
   - Use ONLY ${vocabularyLevel}
   - NEVER use words like: incredibly, extremely, delighted, magnificent, etc.
   - ALWAYS use simple words: very, really, happy, fun, nice, good, etc.
   ```

### 2. `app/showtell/components/Day1Fix.tsx`

#### 주요 변경사항:
1. **교정 레벨 선택 UI 추가**
   - Minimal 모드 (1-2개만)
   - Detailed 모드 (3-5개 상세)

2. **레벨 변경 시 재실행**
   ```typescript
   const handleLevelChange = (level: "minimal" | "detailed") => {
     setCorrectionLevel(level);
     runCorrection(level);
   };
   ```

---

## 📊 교정 예시 비교

### 초2 수준 (8세) - Minimal 모드

#### Before (❌ 부적절)
```
Before: "It is very fun"
After:  "It's incredibly fun"  ❌ (incredibly는 초2 수준에 너무 어려움)

Before: "I feel very proud and happy"
After:  "I feel extremely proud and happy"  ❌ (extremely는 고급 단어)
```

#### After (✅ 적절)
```
Before: "It is very fun"
After:  "It's really fun"  ✅ (really는 초2 수준에 적합)

Before: "I feel very proud and happy"
After:  "I feel very proud and happy"  ✅ (원문 유지, 문제 없음)

또는

Before: "I like play"
After:  "I like to play"  ✅ (문법 교정만, 단어 유지)
```

---

## 🎯 교정 수준별 차이

### Minimal 모드 (기본)
- **수정 개수**: 1-2개만
- **포커스**: 중요한 문법/철자 오류만
- **단어 변경**: 최소화
- **적합 대상**: 자신감 유지가 중요한 학생

**예시:**
```
Original: "I like play robot. It are very fun."

Corrections (2개):
1. "I like play" → "I like to play" (문법)
2. "It are" → "It is" (문법)

Result: "I like to play robot. It is very fun."
```

### Detailed 모드
- **수정 개수**: 3-5개
- **포커스**: 문법 + 구조 + 표현력
- **단어 변경**: 적절한 수준에서 향상
- **적합 대상**: 더 많이 배우고 싶은 학생

**예시:**
```
Original: "I like play robot. It are very fun. I play every day."

Corrections (4개):
1. "I like play" → "I like to play" (문법)
2. "It are" → "It is" (문법)
3. "very fun" → "really fun" (더 자연스러운 표현)
4. "play every day" → "play with it every day" (구조 개선)

Result: "I like to play robot. It is really fun. I play with it every day."
```

---

## 🔍 나이별 단어 수준 제한

| 나이 | 학년 | 허용 단어 | 금지 단어 |
|------|------|-----------|-----------|
| 6-8세 | 초1-2 | very, really, so, happy, fun, good, nice | incredibly, extremely, magnificent |
| 9-10세 | 초3-4 | very, really, quite, excited, interesting | incredibly, extremely, magnificent |
| 11-13세 | 초5-6 | very, really, quite, fairly, excited, wonderful | incredibly, extremely, magnificent |

**공통 금지 단어:**
- incredibly
- extremely
- absolutely
- tremendously
- magnificent
- delightful
- extraordinary

---

## 💡 AI 프롬프트 강화

### 단어 수준 제한 예시
```
**Examples of appropriate corrections:**
✅ "very fun" → "really fun" or "so fun" (simple words only!)
✅ "I feel happy" → "I feel very happy" or "I feel so happy"
✅ "It is good" → "It is really good" or "It is very nice"

❌ DO NOT use: incredibly, extremely, absolutely, tremendously, etc.
```

### 나이별 맞춤 지침
```typescript
You are a gentle English teacher for a ${childAge}-year-old child 
(초등학교 ${childAge <= 7 ? '1-2학년' : childAge <= 9 ? '3-4학년' : '5-6학년'}).

Use ONLY ${vocabularyLevel}
```

---

## 🎨 UI 개선

### 교정 레벨 선택 UI

```
🎯 교정 수준 선택:

┌──────────────────┬──────────────────┐
│   ✏️ 최소 교정    │   📝 상세 교정    │
│  (1-2개만 고쳐요) │  (3-5개 자세히)   │
└──────────────────┴──────────────────┘

💡 레벨을 바꾸면 다시 교정해드려요!
```

**특징:**
- 클릭 한 번으로 레벨 변경
- 선택한 레벨 강조 표시
- 변경 시 자동으로 재교정
- 로딩 중에는 버튼 비활성화

---

## ✅ 테스트 케이스

### 케이스 1: 초2 학생 - Minimal 모드
```bash
POST /api/showtell/submissions/sub_xxx/correct
Body: { "correction_level": "minimal" }

# Child age: 8세
# Result:
- 교정 개수: 1-2개
- 사용 단어: very, really, so
- ❌ 금지: incredibly, extremely
```

### 케이스 2: 초5 학생 - Detailed 모드
```bash
POST /api/showtell/submissions/sub_xxx/correct
Body: { "correction_level": "detailed" }

# Child age: 11세
# Result:
- 교정 개수: 3-5개
- 사용 단어: very, really, quite, wonderful
- ❌ 금지: incredibly, extremely, magnificent
```

---

## 📊 개선 효과

### Before (문제점)
1. ❌ 초등 저학년에게 너무 어려운 단어 제안
2. ❌ 교정 수준 선택 불가
3. ❌ 모든 학생에게 동일한 교정

### After (개선)
1. ✅ 나이별 적정 단어 수준 적용
2. ✅ Minimal/Detailed 선택 가능
3. ✅ 6-13세 학생별 맞춤 교정
4. ✅ 단어 수준 강력 제한 (AI 프롬프트)

---

## 🔧 기술 구현

### API 요청 형식
```typescript
POST /api/showtell/submissions/{submission_id}/correct

Headers:
  Content-Type: application/json

Body:
{
  "correction_level": "minimal" | "detailed"  // 선택 (기본: minimal)
}

Response:
{
  "success": true,
  "data": {
    "correction_id": "corr_xxx",
    "minimal_fix_text": "...",
    "native_rewrite_text": "...",
    "upgrades": [
      {
        "original": "I like play",
        "suggestion": "I like to play",
        "category": "grammar",
        "explanation": "동사 뒤에는 'to'를 붙여요",
        "example": "I like to swim."
      }
    ],
    "overall_feedback": "정말 잘 썼어요!",
    "encouragement": "계속 연습하면 더 좋아질 거예요!"
  }
}
```

---

## 📚 참고: 학년별 권장 단어

### Grade 1-2 (6-8세)
- **사용 권장**: I, like, play, fun, happy, good, very, really
- **금지**: advanced adjectives/adverbs

### Grade 3-4 (9-10세)
- **사용 권장**: excited, interesting, because, sometimes, usually
- **금지**: incredibly, extremely, magnificent

### Grade 5-6 (11-13세)
- **사용 권장**: wonderful, amazing, although, however
- **허용 범위 확대**: 하지만 여전히 초등 수준

---

## ✅ 완료 상태

- ✅ API 수정: 레벨별 교정 + 나이 고려
- ✅ UI 추가: 교정 레벨 선택 버튼
- ✅ 프롬프트 강화: 단어 수준 제한
- ✅ Mock 데이터 업데이트
- ✅ Linter 에러 없음

---

**작성일**: 2025-12-27  
**상태**: ✅ 레벨별 교정 + 상세 교정 기능 완료





