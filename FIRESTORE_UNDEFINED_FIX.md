# Firestore `undefined` 값 에러 해결 ✅

## 🔴 발생한 에러들

### 에러 1: WritingSubmission (Day 1)
```
Function setDoc() called with invalid data. 
Unsupported field value: undefined 
(found in field ocr_text in document showtell_writing_submissions/sub_...)
```

### 에러 2: AudioRecord (Day 2 Shadowing)
```
Function setDoc() called with invalid data. 
Unsupported field value: undefined 
(found in field feedback in document showtell_audio_records/audio_child_demo_001_shadowing_...)
```

---

## 🔍 원인

Firestore는 **`undefined` 값을 허용하지 않습니다**.

### 잘못된 패턴 (Before)

```typescript
// ❌ 패턴 1: undefined를 직접 할당
const submission: WritingSubmission = {
  submission_id,
  ocr_text: input_method === "ocr" ? ocr_text : undefined, // ❌ undefined!
  image_url: input_method === "ocr" ? image_url : undefined, // ❌ undefined!
};

// ❌ 패턴 2: 선택적 파라미터를 그대로 할당
const audioRecord: AudioRecord = {
  audio_id,
  attempt_number, // ❌ undefined일 수 있음!
  feedback, // ❌ undefined일 수 있음!
};

await setDoc(doc(db, "collection", "id"), data); // 💥 에러!
```

---

## ✅ 해결 방법

### 올바른 패턴 (After)

```typescript
// ✅ 패턴 1: 기본 필드만 포함하고 조건부로 추가
const submission: WritingSubmission = {
  submission_id,
  child_id,
  raw_text,
  cleaned_text,
  // ... 필수 필드
};

// 선택적 필드는 조건부로 추가
if (input_method === "ocr") {
  if (ocr_text) {
    submission.ocr_text = ocr_text;
  }
  if (image_url) {
    submission.image_url = image_url;
  }
}

await setDoc(doc(db, "collection", "id"), submission); // ✅ 성공!
```

---

## 🔧 수정된 파일

### 1. `app/api/showtell/submissions/writing/route.ts` ✅

**Before**:
```typescript
const submission: WritingSubmission = {
  submission_id,
  child_id,
  raw_text,
  ocr_text: input_method === "ocr" ? ocr_text : undefined, // ❌
  cleaned_text,
  image_url: input_method === "ocr" ? image_url : undefined, // ❌
};
```

**After**:
```typescript
const submission: WritingSubmission = {
  submission_id,
  child_id,
  raw_text,
  cleaned_text,
  // ... 필수 필드만
};

// OCR 관련 필드는 조건부로 추가
if (input_method === "ocr") {
  if (ocr_text) {
    submission.ocr_text = ocr_text;
  }
  if (image_url) {
    submission.image_url = image_url;
  }
}
```

---

### 2. `app/api/showtell/audio/route.ts` ✅ (NEW!)

**Before**:
```typescript
const audioRecord: AudioRecord = {
  audio_id,
  child_id,
  related_type,
  related_id,
  duration_sec,
  storage_url,
  attempt_number, // ❌ undefined일 수 있음!
  feedback, // ❌ undefined일 수 있음!
  created_at: new Date().toISOString(),
};
```

**After**:
```typescript
const audioRecord: AudioRecord = {
  audio_id,
  child_id,
  related_type,
  related_id,
  duration_sec,
  storage_url,
  created_at: new Date().toISOString(),
};

// 선택적 필드는 조건부로 추가
if (attempt_number !== undefined) {
  audioRecord.attempt_number = attempt_number;
}
if (feedback !== undefined) {
  audioRecord.feedback = feedback;
}
```

---

## 📊 Firestore 데이터 저장 규칙

### ❌ 허용되지 않는 값
```typescript
{
  field: undefined // ❌ 에러!
}
```

### ✅ 허용되는 값
```typescript
{
  field: null // ✅ OK
}

// 또는 필드 자체를 생략
{
  // field 없음 ✅ OK
}
```

---

## 🎯 적용된 패턴

### 패턴 1: 조건부 필드 추가 (권장)

```typescript
const obj: MyType = {
  // 필수 필드
  required1: "value",
  required2: 123,
};

// 선택적 필드 조건부 추가
if (condition && optionalValue !== undefined) {
  obj.optional1 = optionalValue;
}
```

### 패턴 2: Spread Operator

```typescript
const obj: MyType = {
  required1: "value",
  required2: 123,
  ...(condition && optionalValue !== undefined ? { optional1: optionalValue } : {}),
};
```

### 패턴 3: 필터링 함수

```typescript
function removeUndefined<T>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as T;
}

const obj = removeUndefined({
  required1: "value",
  optional1: maybeUndefined,
});
```

---

## ✅ 테스트 케이스

### 케이스 1: Day 1 Typing 방식
```typescript
{
  "input_method": "typing",
  "raw_text": "My favorite toy is a robot.",
  "cleaned_text": "My favorite toy is a robot."
  // ocr_text, image_url 필드 없음 ✅
}
```

### 케이스 2: Day 1 OCR 방식
```typescript
{
  "input_method": "ocr",
  "raw_text": "My favorite toy is a robot.",
  "ocr_text": "Ny tavorite toy is a robot.", // OCR 원본 ✅
  "cleaned_text": "My favorite toy is a robot.", // 수정본 ✅
  "image_url": "https://storage.googleapis.com/..." ✅
}
```

### 케이스 3: Day 2 Shadowing 녹음
```typescript
{
  "audio_id": "audio_child_001_shadowing_...",
  "child_id": "child_001",
  "related_type": "shadowing",
  "related_id": "script_001",
  "duration_sec": 5,
  "storage_url": "https://...",
  "attempt_number": 1, // ✅ 있음
  // feedback 필드 없음 (Shadowing은 피드백 없음) ✅
}
```

### 케이스 4: Day 3 Rehearsal 녹음 (피드백 있음)
```typescript
{
  "audio_id": "audio_child_001_rehearsal1_...",
  "related_type": "rehearsal1",
  "attempt_number": 1, // ✅
  "feedback": "Great job! Try speaking a bit slower." // ✅
}
```

---

## 🔍 관련 에러 패턴

### 패턴 1: `undefined` in object
```typescript
// ❌ 잘못된 방법
const obj = {
  field: someValue || undefined
};

// ✅ 올바른 방법
const obj = {
  ...(someValue ? { field: someValue } : {})
};
```

### 패턴 2: Optional parameters
```typescript
// ❌ 잘못된 방법
function save(required: string, optional: string | undefined) {
  await setDoc(doc(db, "collection", "id"), {
    required,
    optional // undefined일 수 있음!
  });
}

// ✅ 올바른 방법
function save(required: string, optional?: string) {
  const data: any = { required };
  if (optional !== undefined) {
    data.optional = optional;
  }
  await setDoc(doc(db, "collection", "id"), data);
}
```

---

## 📚 참고 자료

- [Firestore Data Types](https://firebase.google.com/docs/firestore/manage-data/data-types)
- [TypeScript Optional Properties](https://www.typescriptlang.org/docs/handbook/2/objects.html#optional-properties)

---

## ✅ 해결 완료

**상태**: ✅ 수정 완료  
**수정 파일**:
- `app/api/showtell/submissions/writing/route.ts` ✅ (Day 1)
- `app/api/showtell/audio/route.ts` ✅ (Day 2 Shadowing)

**Linter**: ✅ 에러 없음

---

**작성일**: 2025-12-27  
**상태**: ✅ Firestore `undefined` 에러 완전 해결


