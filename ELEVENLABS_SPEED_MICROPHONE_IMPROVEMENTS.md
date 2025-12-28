# ElevenLabs 속도 조절 & 마이크 권한 안내 개선 ✅

## 📋 변경 사항

### 1️⃣ ElevenLabs TTS 속도 조절 가능하게 개선 ✅

**문제**: TTS 속도가 너무 빨라서 어린이가 따라하기 어려움

**해결**: ElevenLabs API에 `speed` 파라미터 추가 (레벨별 조절 가능)

---

## 🎤 1. ElevenLabs 속도 조절 구현

### 수정 파일: `app/api/generate-voice/route.ts`

**Before**:
```typescript
async function generateVoiceWithElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<Buffer> {
  // ...
  body: JSON.stringify({
    text: text,
    model_id: "eleven_turbo_v2_5",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      // speed 없음!
    },
  }),
}
```

**After**:
```typescript
async function generateVoiceWithElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string,
  speed: number = 0.85 // 기본값: 어린이용 느린 속도
): Promise<Buffer> {
  // ...
  console.log("⚡ 속도:", speed);
  
  body: JSON.stringify({
    text: text,
    model_id: "eleven_turbo_v2_5",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      speed: speed, // 속도 설정 (0.25 ~ 4.0)
    },
  }),
}
```

---

### POST 엔드포인트 수정

**Before**:
```typescript
const { text, voiceOption = "default", userId } = body;
```

**After**:
```typescript
const { text, voiceOption = "default", userId, speed = 0.85 } = body;

// speed 검증 (0.25 ~ 4.0)
const validSpeed = Math.max(0.25, Math.min(4.0, speed));

const audioBuffer = await generateVoiceWithElevenLabs(
  text,
  voiceId,
  apiKeys.elevenlabs,
  validSpeed // speed 전달
);
```

---

### 수정 파일: `app/showtell/components/Day2Shadowing.tsx`

**Before**:
```typescript
body: JSON.stringify({
  text: sentence,
  voiceOption: "rachel_us",
  // speed 없음
}),

// 브라우저에서 재생 속도 조절
audio.playbackRate = 0.9;
```

**After**:
```typescript
body: JSON.stringify({
  text: sentence,
  voiceOption: "rachel_us",
  speed: 0.85, // 어린이용 느린 속도 (ElevenLabs API 레벨)
}),

// 브라우저 재생 속도는 1.0 (이미 ElevenLabs에서 0.85로 생성됨)
audio.playbackRate = 1.0;
```

---

## 🎯 속도 가이드 (레벨별 권장)

| 레벨 | Speed | 대상 | 특징 |
|-----|-------|------|------|
| **0.75** | 매우 느림 | 유치부 (5-6세) | 또박또박, 천천히 |
| **0.85** | 느림 | 초등 저학년 (7-9세) | ✅ **현재 기본값** |
| **1.0** | 보통 | 초등 고학년 (10-12세) | 자연스러운 속도 |
| **1.15** | 빠름 | 중학생 이상 | 원어민 수준 |

**ElevenLabs API 제한**: 0.25 ~ 4.0

---

## 🎤 2. 마이크 권한 안내 UI 추가

**문제**: `NotAllowedError: Permission denied` - 사용자가 마이크 권한 거부

**해결**: 녹음 전 명확한 안내 메시지 추가

---

### 수정 파일: `app/showtell/components/Day2Shadowing.tsx`

**추가된 UI**:
```tsx
<div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
  <p className="text-sm text-blue-700 dark:text-blue-300">
    🎤 <strong>녹음을 시작하면 브라우저에서 마이크 권한을 요청합니다.</strong><br/>
    팝업이 나타나면 <strong className="text-blue-900 dark:text-blue-100">"허용"</strong>을 클릭해주세요!
  </p>
</div>
```

**표시 위치**: 
- Day 2 Shadowing 제목 아래
- Day 3 Rehearsal 제목 아래

---

### 수정 파일: `app/showtell/components/Day3Rehearsal.tsx`

동일한 안내 메시지 추가 ✅

---

## 🧪 테스트 방법

### ✅ 테스트 1: 속도 조절 확인

```bash
# 1. 서버 재시작
npm run dev

# 2. Day 2 Shadowing 접속
http://localhost:3002/showtell/week/1/day2

# 3. "원어민 음성 듣기" 클릭

# 콘솔 로그 확인:
🎤 ElevenLabs API 호출 시작...
⚡ 속도: 0.85
✅ ElevenLabs API 호출 성공

# 4. 음성이 더 느리게 재생되는지 확인
```

---

### ✅ 테스트 2: 마이크 권한 안내 확인

```bash
# 1. Day 2 Shadowing 접속

# 2. 화면 상단에 파란색 안내 박스 표시 확인:
┌─────────────────────────────────────────────┐
│ 🎤 녹음을 시작하면 브라우저에서 마이크      │
│    권한을 요청합니다.                       │
│    팝업이 나타나면 "허용"을 클릭해주세요!   │
└─────────────────────────────────────────────┘

# 3. "녹음 시작" 클릭

# 4. 브라우저 권한 팝업:
┌─────────────────────────────────┐
│ localhost:3002이(가) 다음 권한을 │
│ 사용하려고 합니다:               │
│                                 │
│ 🎤 마이크                        │
│                                 │
│ [차단]  [허용]                   │
└─────────────────────────────────┘

# 5. "허용" 클릭 → 녹음 시작
```

---

### ✅ 테스트 3: 권한 거부 시 에러 메시지

```bash
# 1. "녹음 시작" 클릭
# 2. 브라우저 권한 팝업에서 "차단" 클릭

# 예상 결과:
❌ 🎤 마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.
```

---

## 📊 브라우저별 권한 팝업

| 브라우저 | 팝업 위치 | 권한 관리 |
|---------|----------|----------|
| **Chrome** | 주소창 왼쪽 | 설정 > 개인정보 및 보안 > 사이트 설정 |
| **Edge** | 주소창 왼쪽 | 설정 > 쿠키 및 사이트 권한 |
| **Firefox** | 주소창 왼쪽 | 설정 > 개인정보 및 보안 |
| **Safari** | 주소창 왼쪽 | 설정 > 웹사이트 > 마이크 |

---

## 🔧 권한 문제 해결 가이드

### 문제 1: 권한 팝업이 나타나지 않음
**원인**: 이전에 "차단" 선택
**해결**:
1. 주소창 왼쪽 자물쇠 아이콘 클릭
2. "마이크" → "허용"으로 변경
3. 페이지 새로고침 (`F5`)

---

### 문제 2: localhost:3002가 아닌 다른 주소로 접속
**현상**: `http://192.168.x.x:3002`로 접속 시 마이크 권한 차단
**해결**: 
```
❌ http://192.168.55.82:3002
↓
✅ http://localhost:3002
```

---

### 문제 3: "이 사이트에서 마이크를 사용할 수 없습니다"
**원인**: HTTP 환경 (HTTPS 필요)
**해결**: `http://localhost:3002` 사용 (localhost는 HTTPS 불필요)

---

## 🎨 UI 개선 사항

### Before (안내 없음)
```
🎧 Shadowing (따라말하기)
TTS로 문장을 듣고, 똑같이 따라 말해보세요! (3문장만)

[녹음 시작] ← 사용자가 모름
```

### After (명확한 안내)
```
🎧 Shadowing (따라말하기)
TTS로 문장을 듣고, 똑같이 따라 말해보세요! (3문장만)

┌─────────────────────────────────────────────┐
│ 🎤 녹음을 시작하면 브라우저에서 마이크      │
│    권한을 요청합니다.                       │
│    팝업이 나타나면 "허용"을 클릭해주세요!   │
└─────────────────────────────────────────────┘

[녹음 시작] ← 사용자가 준비됨
```

---

## ✅ 완료 조건 체크

- [x] ✅ ElevenLabs API에 `speed` 파라미터 추가
- [x] ✅ 기본 속도 0.85 (어린이용 느린 속도)
- [x] ✅ Speed 검증 (0.25 ~ 4.0)
- [x] ✅ Day2Shadowing에서 speed 전달
- [x] ✅ 브라우저 재생 속도 1.0으로 설정 (중복 속도 조절 제거)
- [x] ✅ 콘솔 로그에 속도 표시
- [x] ✅ 마이크 권한 안내 UI 추가 (Day2Shadowing)
- [x] ✅ 마이크 권한 안내 UI 추가 (Day3Rehearsal)
- [x] ✅ TypeScript 타입 안전성
- [x] ✅ Linter 오류 없음

---

## 📚 추가 개선 가능 사항 (향후)

### 1. 속도 선택 UI 추가
```tsx
// 사용자가 직접 속도 선택
<select onChange={(e) => setSpeed(parseFloat(e.target.value))}>
  <option value="0.75">🐢 매우 느림 (유치부)</option>
  <option value="0.85" selected>🐰 느림 (초등 저학년)</option>
  <option value="1.0">🏃 보통 (초등 고학년)</option>
  <option value="1.15">🚀 빠름 (중학생)</option>
</select>
```

### 2. 사용자 레벨 기반 자동 속도 설정
```typescript
// localStorage의 childInfo에서 레벨 가져오기
const childInfo = JSON.parse(localStorage.getItem("childInfo") || "{}");
const englishLevel = childInfo.englishLevel; // "Lv.1", "Lv.2", ...

const speedMap = {
  "Lv.1": 0.75, // 유치부
  "Lv.2": 0.85, // 초등 저학년
  "Lv.3": 1.0,  // 초등 고학년
  "Lv.4": 1.15, // 중학생
};

const speed = speedMap[englishLevel] || 0.85;
```

### 3. 음성 품질 옵션 추가
```typescript
// ElevenLabs model_id 선택
{
  model_id: "eleven_turbo_v2_5",     // 빠름, 무료
  model_id: "eleven_multilingual_v2", // 고품질, 유료
}
```

---

## 🎯 결론

### 속도 조절
- ✅ ElevenLabs API 레벨에서 0.85 속도 적용
- ✅ 브라우저 재생 속도는 1.0 (중복 조절 제거)
- ✅ 레벨별 속도 조절 가능한 구조

### 마이크 권한
- ✅ 명확한 사전 안내 메시지
- ✅ 권한 거부 시 상세 에러 메시지
- ✅ 브라우저별 해결 가이드 제공

---

**작성일**: 2025-12-27  
**작성자**: Cursor AI Assistant  
**상태**: ✅ 속도 조절 & 권한 안내 개선 완료




