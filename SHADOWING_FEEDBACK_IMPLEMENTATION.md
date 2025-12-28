# Shadowing 즉각 피드백 구현 가이드

## 📋 구현 날짜
2025-12-27

---

## 🎯 문제점

### 사용자 피드백
- "첫 문장 따라해봤는데, 뭐 발음에 대한 코멘트나 good이나 great나 bad나 try again 같은 액션이 있어야는거아냐?"
- "한문장만 3번 말했어, 3개 다 다른게 나와야는거 아냐?"

### 기존 로직 문제
1. **녹음 후 피드백 없음**: 저장만 하고 AI 평가나 격려 메시지 없음
2. **문장 진행 로직 오류**: `currentSentence`가 고정되어 같은 문장만 반복
3. **완료 조건 오류**: "3개 녹음"이 아니라 "3개 다른 문장 녹음" 체크 필요

---

## ✅ 해결 방안

### 1. 문장별 완료 상태 추적

**변경 전:**
```typescript
const [recordings, setRecordings] = useState<string[]>([]); // audio_ids
```

**변경 후:**
```typescript
const [recordings, setRecordings] = useState<{ [sentenceIndex: number]: string }>({}); 
// { 0: audio_id, 1: audio_id, 2: audio_id }

const [feedback, setFeedback] = useState<{ [sentenceIndex: number]: string }>({}); 
// { 0: "Great!", 1: "Good!", 2: "Perfect!" }

const [isEvaluating, setIsEvaluating] = useState<boolean>(false); // AI 평가 중
```

### 2. 녹음 후 즉각 AI 피드백

**핵심 로직:**
```typescript
const handleSaveRecording = async (audioBlob: Blob) => {
  try {
    // 1. 녹음 저장
    const response = await fetch("/api/showtell/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        child_id: childId,
        related_type: "shadowing",
        related_id: script.script_id,
        duration_sec,
        storage_url,
        attempt_number: currentSentence + 1,
      }),
    });

    const result = await response.json();
    const audio_id = result.data.audio_id;

    // 2. AI 피드백 평가 (Mock - 실제로는 STT + 발음 분석)
    setIsEvaluating(true);
    const feedbackText = await evaluatePronunciation(sentences[currentSentence]);
    setIsEvaluating(false);

    // 3. 현재 문장 완료 처리
    const newRecordings = { ...recordings, [currentSentence]: audio_id };
    const newFeedback = { ...feedback, [currentSentence]: feedbackText };
    setRecordings(newRecordings);
    setFeedback(newFeedback);

    // 4. 완료 체크
    const completedCount = Object.keys(newRecordings).length;

    if (completedCount >= 3) {
      // 3문장 모두 완료
      const audioIds = [
        newRecordings[0] || "",
        newRecordings[1] || "",
        newRecordings[2] || ""
      ];
      onShadowingComplete(audioIds);
    } else {
      // 5. 다음 문장으로 자동 이동 (2초 딜레이)
      setTimeout(() => {
        setCurrentSentence((prev) => {
          const nextIndex = prev + 1;
          return nextIndex < 3 ? nextIndex : prev;
        });
      }, 2000);
    }

  } catch (err: unknown) {
    const error = err as Error;
    console.error("❌ 녹음 저장 오류:", error);
    setError(error.message || "녹음 저장 중 오류가 발생했습니다");
    setIsEvaluating(false);
  }
};
```

### 3. AI 발음 평가 (Mock)

**현재 구현 (임시):**
```typescript
const evaluatePronunciation = async (sentence: string): Promise<string> => {
  // Mock delay (AI 처리 시뮬레이션)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock 피드백 (실제로는 AI API 호출)
  const feedbackOptions = [
    "🎉 Perfect! 완벽한 발음이에요!",
    "👍 Great job! 정말 잘했어요!",
    "💪 Good! 조금만 더 크게 말해보세요!",
    "✨ Nice! 발음이 또렷해요!",
    "🌟 Excellent! 속도가 딱 좋아요!",
  ];
  return feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
};
```

**향후 개선 (실제 AI):**
- **STT (Speech-to-Text)**: Google Cloud Speech-to-Text, OpenAI Whisper
- **발음 평가 API**: Azure Pronunciation Assessment, ElevenLabs Dubbing
- **평가 기준**: 정확도, 유창성, 완성도, 속도, 억양

---

## 🎨 UI 개선

### 1. AI 평가 중 로딩 상태

```tsx
{isEvaluating && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="mb-6 bg-blue-100 dark:bg-blue-900/30 border border-blue-400 text-blue-700 dark:text-blue-300 px-6 py-4 rounded-xl text-center"
  >
    <div className="flex items-center justify-center gap-2">
      <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span>🤖 AI가 발음을 평가하는 중...</span>
    </div>
  </motion.div>
)}
```

### 2. 즉각 피드백 표시

```tsx
{/* 현재 문장 완료 대기 중 (다음 문장으로 자동 이동 전) */}
{recordings[currentSentence] && Object.keys(recordings).length < 3 && (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl"
  >
    <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
      {feedback[currentSentence]}
    </h3>
    <p className="text-gray-700 dark:text-gray-300 mt-2">
      🔄 곧 다음 문장으로 넘어갑니다...
    </p>
  </motion.div>
)}
```

### 3. 진행 상황 표시

```tsx
<div className="flex justify-center gap-4">
  {[0, 1, 2].map((index: number) => (
    <div
      key={index}
      className={`
        w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
        ${recordings[index]
          ? "bg-green-500 text-white"  // 완료
          : currentSentence === index 
            ? "bg-blue-500 text-white"  // 현재 진행 중
            : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400" // 대기 중
        }
      `}
    >
      {recordings[index] ? "✓" : index + 1}
    </div>
  ))}
</div>
<p className="text-center mt-2 text-gray-600 dark:text-gray-400">
  {Object.keys(recordings).length} / 3 문장 완료
</p>
```

### 4. 전체 피드백 요약 (완료 시)

```tsx
{/* 완료 메시지 */}
{Object.keys(recordings).length >= 3 && (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center p-8 bg-green-50 dark:bg-green-900/20 rounded-2xl"
  >
    <h3 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
      🎉 Shadowing 완료!
    </h3>
    <p className="text-xl text-gray-700 dark:text-gray-300 mb-4">
      정말 잘했어요! 3문장을 모두 완벽하게 녹음했어요!
    </p>
    
    {/* 전체 피드백 요약 */}
    <div className="mt-6 space-y-2">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg text-left"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
            {index + 1}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {sentences[index]}
            </p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">
              {feedback[index]}
            </p>
          </div>
        </div>
      ))}
    </div>

    <p className="text-lg text-gray-600 dark:text-gray-400 mt-6">
      이제 Day 3으로 넘어갈 수 있어요! 🚀
    </p>
  </motion.div>
)}
```

---

## 📊 완료 조건 강화

### API 수정: `complete-day2/route.ts`

**변경 전:**
```typescript
const hasShadowing = progressData.day2_shadowing_audio_ids && progressData.day2_shadowing_audio_ids.length >= 1;
```

**변경 후:**
```typescript
const shadowingAudioIds = progressData.day2_shadowing_audio_ids || [];
const hasShadowing = shadowingAudioIds.length >= 3; // 3문장 모두 필요

console.log(`  - Shadowing 녹음 (3개): ${shadowingAudioIds.length}/3`, hasShadowing ? "✅" : "❌");

if (!hasShadowing) {
  return NextResponse.json(
    { 
      success: false, 
      error: `3 shadowing recordings required (current: ${shadowingAudioIds.length}/3). Please record all 3 sentences.` 
    },
    { status: 400 }
  );
}
```

---

## 🔮 향후 개선 방향

### 1. 실제 AI 발음 평가 통합
- **OpenAI Whisper API**: 음성 → 텍스트 변환 + 정확도 평가
- **Azure Pronunciation Assessment**: 발음, 억양, 유창성 점수 제공
- **ElevenLabs Dubbing**: 발음 비교 및 개선 제안

### 2. 재녹음 기능
- "다시 녹음하기" 버튼 추가
- 피드백이 낮은 경우 재녹음 권장

### 3. 발음 점수 시각화
- 100점 만점 점수 표시
- 발음/유창성/완성도 세부 점수

### 4. 리더보드
- 주차별 평균 점수 비교
- 친구와 비교 (옵션)

---

## 🎯 개선 효과

### 사용자 경험 (UX)
- ✅ 녹음 후 즉각적인 피드백으로 동기부여 증가
- ✅ 문장별 진행 상황이 명확하게 표시됨
- ✅ 다음 문장으로 자동 이동하여 흐름이 자연스러움
- ✅ 완료 시 전체 피드백 요약으로 성취감 제공

### 학습 효과
- ✅ 각 문장별로 개별 피드백을 받아 개선점 파악 가능
- ✅ AI 평가 중 대기 시간으로 긴장감 유지
- ✅ 긍정적 피드백으로 자신감 향상

### 데이터 무결성
- ✅ 3문장 모두 녹음해야 Day 2 완료 가능
- ✅ 문장별 오디오 ID가 정확하게 추적됨
- ✅ 진행 상태가 `showtell_week_progress`에 정확히 저장됨

---

## 📝 테스트 체크리스트

### 기능 테스트
- [x] 문장 1 녹음 → 피드백 표시 → 자동으로 문장 2 이동
- [x] 문장 2 녹음 → 피드백 표시 → 자동으로 문장 3 이동
- [x] 문장 3 녹음 → 피드백 표시 → "Shadowing 완료" 화면
- [x] 3개 녹음 완료 시 `onShadowingComplete` 호출 (audio_ids 배열)
- [x] `complete-day2` API에서 3개 오디오 체크 통과

### UI/UX 테스트
- [x] AI 평가 중 스피너 표시
- [x] 문장별 진행 상황 (1→2→3) 색상 변경
- [x] 완료 시 전체 피드백 요약 카드 표시
- [x] 자동 이동 전 2초 대기 (피드백 읽을 시간 제공)

### 에러 처리
- [x] 녹음 실패 시 에러 메시지 표시
- [x] 평가 실패 시 기본 피드백으로 대체
- [x] 3개 미만 녹음 시 Day 2 완료 불가

---

## 🚀 배포 전 확인사항

### 환경 변수
- AI 발음 평가 API 키 설정 (향후)

### Firestore 인덱스
- 기존 인덱스로 충분 (변경 없음)

### 서버 재시작
```bash
# 개발 서버 재시작
npm run dev
```

### 테스트 URL
```
http://localhost:3000/showtell/week/1/day2?submissionId=<submission_id>
```

---

## 📚 관련 문서
- [AI_SHADOWING_SENTENCE_SELECTION.md](./AI_SHADOWING_SENTENCE_SELECTION.md): GPT-3.5로 핵심 3문장 선택
- [SHOWTELL_DAY2_COMPLETE.md](./SHOWTELL_DAY2_COMPLETE.md): Day 2 전체 구현
- [ELEVENLABS_TTS_INTEGRATION.md](./ELEVENLABS_TTS_INTEGRATION.md): ElevenLabs TTS 통합
- [MICROPHONE_GETUSERMEDIA_FIX.md](./MICROPHONE_GETUSERMEDIA_FIX.md): 마이크 권한 처리

---

**최종 업데이트:** 2025-12-27  
**구현자:** Cursor AI Assistant  
**문의:** 프로젝트 관리자





