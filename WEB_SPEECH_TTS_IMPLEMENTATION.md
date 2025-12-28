# ElevenLabs TTS API 연동 완료 ✅

## 📋 목차
1. [변경 사항 요약](#변경-사항-요약)
2. [기술 스택](#기술-스택)
3. [구현 상세](#구현-상세)
4. [테스트 방법](#테스트-방법)
5. [ElevenLabs vs Web Speech API](#elevenlabs-vs-web-speech-api)
6. [API 키 설정](#api-키-설정)

---

## 변경 사항 요약

**문제**: Day 2 Shadowing에서 "TTS 듣기" 버튼 클릭 시 Mock `alert()`만 표시되고 실제 음성이 재생되지 않음

**해결**: 기존에 구현된 **ElevenLabs API** (`/api/generate-voice`)를 Show & Tell Day 2에 연동

**변경 파일**:
- `app/showtell/components/Day2Shadowing.tsx` ✅

---

## 기술 스택

### ElevenLabs API
```typescript
// 고품질 원어민 TTS API
const response = await fetch("/api/generate-voice", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "My favorite toy is Lego.",
    voiceOption: "rachel_us", // 어린이 친화적 음성
  }),
});
```

**장점**:
- ✅ **고품질 원어민 음성** (자연스러운 억양)
- ✅ **일관된 품질** (브라우저 무관)
- ✅ **다양한 음성 선택** (미국/영국 영어, 남성/여성)
- ✅ **어린이 친화적 음성** (Rachel, Domi, Elli 등)
- ✅ **이미 프로젝트에 구현됨** (`app/api/generate-voice/route.ts`)

**비용**:
- 🆓 **무료 플랜**: 월 10,000자
- 💰 **유료 플랜**: $5/월 ~ (30,000자)

---

## 구현 상세

### 1. TTS 재생 함수 (`handlePlayTTS`)

```typescript
// app/showtell/components/Day2Shadowing.tsx
const handlePlayTTS = async (sentence: string, index: number) => {
  setIsPlayingTTS(true);
  setError(null);
  setCurrentSentence(index);

  try {
    console.log("🎤 ElevenLabs TTS 요청:", sentence);

    // 기존 오디오 정리
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    // ElevenLabs API 호출
    const response = await fetch("/api/generate-voice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: sentence,
        voiceOption: "rachel_us", // 어린이 친화적 음성
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "음성 생성 실패");
    }

    // MP3 파일을 Blob으로 받기
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    audioUrlRef.current = audioUrl;

    // 오디오 재생
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    // 속도 조정 (어린이용 느리게)
    audio.playbackRate = 0.9;

    audio.onended = () => {
      console.log("✅ TTS 재생 완료");
      setIsPlayingTTS(false);
    };

    audio.onerror = () => {
      console.error("❌ 오디오 재생 오류");
      setError("음성 재생 중 오류가 발생했습니다.");
      setIsPlayingTTS(false);
    };

    await audio.play();
    console.log("🔊 TTS 재생 시작 (ElevenLabs)");

  } catch (err: unknown) {
    const error = err as Error;
    console.error("❌ TTS 오류:", error);
    setError(error.message || "음성 생성 중 오류가 발생했습니다");
    setIsPlayingTTS(false);
  }
};
```

**핵심 로직**:
1. **기존 오디오 정리**: 중복 재생 방지
2. **ElevenLabs API 호출**: `/api/generate-voice`
3. **MP3 Blob 생성**: `URL.createObjectURL(blob)`
4. **오디오 재생**: `new Audio(audioUrl)` + `audio.play()`
5. **속도 조절**: `audio.playbackRate = 0.9` (어린이용 느린 속도)
6. **이벤트 처리**: `onended`, `onerror`로 상태 관리

---

### 2. 오디오 정리 (`useEffect`)

```typescript
// 컴포넌트 언마운트 시 오디오 정리
useEffect(() => {
  return () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };
}, []);
```

**역할**:
- 메모리 누수 방지 (`URL.revokeObjectURL`)
- 컴포넌트 언마운트 시 오디오 정리

---

### 3. UI 버튼

```typescript
<button
  onClick={() => handlePlayTTS(sentences[currentSentence], currentSentence)}
  disabled={isPlayingTTS || isRecording}
  className={`
    px-8 py-4 
    bg-blue-500 hover:bg-blue-600 
    text-white font-bold text-lg 
    rounded-xl shadow-lg 
    transition-all
    ${(isPlayingTTS || isRecording) ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
  `}
>
  {isPlayingTTS ? "🔊 재생 중..." : "🔊 원어민 음성 듣기"}
</button>
```

**버튼 상태**:
- `isPlayingTTS`: "🔊 재생 중..." (재생 중)
- 기본: "🔊 원어민 음성 듣기"

---

## 테스트 방법

### 1. API 키 설정 확인
```bash
# 1. .env.local 파일 확인
cat .env.local | grep ELEVENLABS

# 예상 출력:
ELEVENLABS_API_KEY=sk_xxxxx...
```

### 2. 기본 동작 테스트
```bash
# 1. 개발 서버 시작
npm run dev

# 2. 브라우저에서 http://localhost:3000/showtell 접속
# 3. Week 1 → Day 2 → Script Coach 실행
# 4. "원어민 음성 듣기" 버튼 클릭
```

**예상 결과**:
- ✅ 고품질 원어민 음성으로 문장 재생 (Rachel 음성)
- ✅ 재생 중 버튼 "🔊 재생 중..." 표시
- ✅ 재생 완료 후 버튼 "🔊 원어민 음성 듣기"로 복원

### 3. 콘솔 로그 확인
```javascript
// 정상 실행 시
🎤 ElevenLabs TTS 요청: My favorite toy is Lego
🎤 ElevenLabs API 호출 시작...
텍스트: My favorite toy is Lego...
음성 ID: 21m00Tcm4TlvDq8ikWAM
✅ ElevenLabs API 호출 성공
🔊 TTS 재생 시작 (ElevenLabs)
✅ TTS 재생 완료
```

---

## ElevenLabs vs Web Speech API

| 항목 | ElevenLabs API | Web Speech API |
|-----|---------------|----------------|
| **음성 품질** | ⭐⭐⭐⭐⭐ (원어민급) | ⭐⭐⭐ (기계음) |
| **일관성** | ✅ 일관됨 | ⚠️ 브라우저마다 다름 |
| **비용** | 💰 $0~5/월 | 🆓 완전 무료 |
| **API 키** | ✅ 필요 | ❌ 불필요 |
| **오프라인** | ❌ 불가 | ✅ 가능 (일부) |
| **캐싱** | ✅ 서버 캐싱 가능 | ❌ 클라이언트만 |
| **음성 선택** | ✅ 10+ 원어민 음성 | ⚠️ OS 기본 음성 |
| **적합성** | ✅ 교육용 앱 권장 | ⚠️ 프로토타입용 |

**결론**: Show & Tell은 **교육용 앱**이므로 **ElevenLabs API**가 더 적합합니다! ✅

---

## API 키 설정

### 1. ElevenLabs 가입 및 API 키 발급

1. [ElevenLabs 웹사이트](https://elevenlabs.io) 접속
2. 무료 계정 가입 (Google/GitHub 로그인 가능)
3. [프로필 → API Keys](https://elevenlabs.io/api) 페이지 이동
4. `Create New API Key` 버튼 클릭
5. API 키 복사 (`sk_xxxxx...`)

### 2. 환경 변수 설정

```bash
# .env.local 파일 편집
ELEVENLABS_API_KEY=sk_xxxxx...
```

### 3. 서버 재시작

```bash
# Ctrl+C로 서버 종료 후 재시작
npm run dev
```

### 4. 관리자 페이지에서 설정 (선택사항)

```bash
# http://localhost:3000/admin/api-keys 접속
# ElevenLabs API Key 입력
# "저장" 버튼 클릭
```

---

## 사용 가능한 음성 옵션

| 음성 ID | 이름 | 성별 | 특징 | 추천 용도 |
|--------|-----|-----|-----|---------|
| `rachel_us` | Rachel | 여성 🇺🇸 | 명확하고 친절한 | ✅ **기본 (어린이용)** |
| `domi_us` | Domi | 여성 🇺🇸 | 밝고 활기찬 | 재미있는 콘텐츠 |
| `elli_us` | Elli | 여성 🇺🇸 | 부드럽고 따뜻한 | 차분한 학습 |
| `antoni_us` | Antoni | 남성 🇺🇸 | 깊고 따뜻한 | 스토리텔링 |
| `josh_us` | Josh | 남성 🇺🇸 | 명확하고 친근한 | 설명형 콘텐츠 |
| `adam_us` | Adam | 남성 🇺🇸 | 자연스럽고 편안한 | 일상 대화 |
| `sam_us` | Sam | 남성 🇺🇸 | 젊고 활기찬 | 게임/퀴즈 |
| `bella_uk` | Bella | 여성 🇬🇧 | 우아한 영국식 | 영국 영어 학습 |
| `arnold_uk` | Arnold | 남성 🇬🇧 | 클래식한 영국식 | 격식 있는 내용 |

**현재 Day 2 설정**: `rachel_us` (어린이 친화적, 명확한 발음)

---

## 향후 개선 방향

### 1. 음성 선택 UI 추가
```typescript
// 사용자가 음성 선택
const [selectedVoice, setSelectedVoice] = useState<string>("rachel_us");

<select onChange={(e) => setSelectedVoice(e.target.value)}>
  <option value="rachel_us">🇺🇸 Rachel (여성)</option>
  <option value="josh_us">🇺🇸 Josh (남성)</option>
  <option value="bella_uk">🇬🇧 Bella (영국)</option>
</select>
```

### 2. TTS 캐싱 구현 (비용 절감)
```typescript
// app/api/showtell/tts/route.ts 활용
// 같은 문장 재생 시 ElevenLabs API 재호출 없이 캐시된 MP3 반환
```

### 3. Day 3 Rehearsal/Judge에도 적용
```typescript
// app/showtell/components/Day3Rehearsal.tsx
// app/showtell/components/Day3Judge.tsx
// 위와 동일한 ElevenLabs API 로직 적용
```

---

## 완료 조건 체크 ✅

- [x] ElevenLabs API 연동 (`/api/generate-voice`)
- [x] 고품질 원어민 음성 재생 (Rachel)
- [x] 재생 중 버튼 비활성화
- [x] 재생 완료 시 자동으로 상태 복원
- [x] 오디오 메모리 누수 방지 (`URL.revokeObjectURL`)
- [x] 어린이 친화적 속도 조절 (`playbackRate: 0.9`)
- [x] 에러 처리 및 사용자 친화적 메시지
- [x] TypeScript 타입 안전성 보장
- [x] Linter 오류 없음

---

## 참고 자료

- [ElevenLabs API 문서](https://docs.elevenlabs.io/api-reference/text-to-speech)
- [ElevenLabs 가격 정보](https://elevenlabs.io/pricing)
- 프로젝트 내 구현: `app/api/generate-voice/route.ts`

---

**작성일**: 2025-12-27  
**작성자**: Cursor AI Assistant  
**상태**: ✅ 완료 (Day 2 ElevenLabs TTS 연동 완료)

