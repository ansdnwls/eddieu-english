"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface PracticeSentenceProps {
  sentence: string;
  original?: string;
  englishLevel?: string; // 난이도별 속도 조정용
}

type AccentType = "US" | "UK";
type TTSProvider = "browser" | "elevenlabs";
type GenderType = "female" | "male";

export default function PracticeSentence({ sentence, original, englishLevel = "Lv.1" }: PracticeSentenceProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [accent, setAccent] = useState<AccentType>("US");
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>("elevenlabs"); // 기본값: ElevenLabs
  const [gender, setGender] = useState<GenderType>("female"); // 기본값: 여성
  const [speed, setSpeed] = useState<number>(0.8); // 기본 속도
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  
  // 난이도별 기본 속도 설정
  useEffect(() => {
    const levelSpeedMap: Record<string, number> = {
      "Lv.1": 0.7,  // 매우 느림
      "Lv.2": 0.75, // 느림
      "Lv.3": 0.85, // 조금 느림
      "Lv.4": 0.95, // 보통
      "Lv.5": 1.0,  // 정상
    };
    setSpeed(levelSpeedMap[englishLevel] || 0.8);
  }, [englishLevel]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [pronunciationResult, setPronunciationResult] = useState<string | null>(null);
  const [pronunciationScore, setPronunciationScore] = useState<"great" | "good" | "try_again" | null>(null);
  const [isRecordingSupported, setIsRecordingSupported] = useState(true);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(true);
  const [showPhonetics, setShowPhonetics] = useState(false);
  const [phoneticText, setPhoneticText] = useState<string>("");
  const [recognizedText, setRecognizedText] = useState<string>("");
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // 녹음 및 음성 인식 지원 확인
  useEffect(() => {
    const checkSupport = () => {
      console.log("=== 기능 지원 확인 ===");
      console.log("현재 URL:", window.location.href);
      console.log("프로토콜:", window.location.protocol);
      
      // 녹음 지원 확인
      const recordingSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      setIsRecordingSupported(recordingSupported);
      console.log("녹음 지원:", recordingSupported);
      
      // Speech Recognition 지원 확인
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const speechSupported = !!SpeechRecognition;
      setIsSpeechRecognitionSupported(speechSupported);
      console.log("음성 인식 지원:", speechSupported);
      
      if (!recordingSupported) {
        console.warn("⚠️ 음성 녹음이 지원되지 않습니다.");
      }
      if (!speechSupported) {
        console.warn("⚠️ 음성 인식이 지원되지 않습니다. Chrome 또는 Edge를 사용해주세요.");
      }
    };
    checkSupport();
  }, []);

  // 기본 발음 매핑 (흔한 단어들)
  const basicPhonetics: { [key: string]: string } = {
    // 대명사
    "i": "aɪ",
    "me": "mi",
    "my": "maɪ",
    "we": "wi",
    "he": "hi",
    "she": "ʃi",
    "you": "ju",
    "it": "ɪt",
    "they": "ðeɪ",
    "them": "ðɛm",
    "their": "ðɛr",
    
    // be동사
    "am": "æm",
    "is": "ɪz",
    "are": "ɑr",
    "was": "wɒz",
    "were": "wɜr",
    
    // 조동사
    "have": "hæv",
    "has": "hæz",
    "had": "hæd",
    "do": "du",
    "does": "dʌz",
    "did": "dɪd",
    "can": "kæn",
    "will": "wɪl",
    "would": "wʊd",
    "should": "ʃʊd",
    
    // 일반 동사 (흔한 것들)
    "go": "goʊ",
    "went": "wɛnt",
    "come": "kʌm",
    "came": "keɪm",
    "get": "gɛt",
    "got": "gɒt",
    "make": "meɪk",
    "made": "meɪd",
    "take": "teɪk",
    "took": "tʊk",
    "see": "si",
    "saw": "sɔ",
    "know": "noʊ",
    "knew": "nu",
    "think": "θɪŋk",
    "thought": "θɔt",
    "say": "seɪ",
    "said": "sɛd",
    "tell": "tɛl",
    "told": "toʊld",
    "give": "gɪv",
    "gave": "geɪv",
    "find": "faɪnd",
    "found": "faʊnd",
    "play": "pleɪ",
    "played": "pleɪd",
    "walk": "wɔk",
    "walked": "wɔkt",
    "run": "rʌn",
    "ran": "ræn",
    "eat": "it",
    "ate": "eɪt",
    
    // 전치사
    "the": "ðə",
    "a": "ə",
    "an": "æn",
    "to": "tu",
    "with": "wɪθ",
    "for": "fɔr",
    "from": "frɒm",
    "at": "æt",
    "on": "ɒn",
    "in": "ɪn",
    "of": "ɒv",
    
    // 접속사
    "and": "ænd",
    "or": "ɔr",
    "but": "bʌt",
    "so": "soʊ",
    "because": "bɪˈkɒz",
    
    // 기타 흔한 단어
    "very": "ˈvɛri",
    "good": "gʊd",
    "bad": "bæd",
    "big": "bɪg",
    "small": "smɔl",
    "new": "nu",
    "old": "oʊld",
  };

  // 발음기호 정리 함수 (모든 슬래시, 괄호 제거)
  const cleanPhonetic = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/\//g, "") // 모든 슬래시 제거
      .replace(/\[/g, "") // 모든 여는 대괄호 제거
      .replace(/\]/g, "") // 모든 닫는 대괄호 제거
      .replace(/\(/g, "") // 모든 여는 소괄호 제거
      .replace(/\)/g, "") // 모든 닫는 소괄호 제거
      .trim();
  };

  // Free Dictionary API로 실제 IPA 발음기호 가져오기
  const fetchPhonetics = async (text: string): Promise<string> => {
    const words = text.split(" ");
    const phonetics: string[] = [];
    
    for (const word of words) {
      const cleanWord = word.replace(/[.,!?]/g, "");
      if (!cleanWord) continue;
      
      const lowerWord = cleanWord.toLowerCase();
      
      // 기본 매핑에 있으면 바로 사용
      if (basicPhonetics[lowerWord]) {
        console.log(`✅ 기본 매핑: ${cleanWord} → ${basicPhonetics[lowerWord]}`);
        phonetics.push(basicPhonetics[lowerWord]);
        continue;
      }
      
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${lowerWord}`);
        if (response.ok) {
          const data = await response.json();
          
          // phonetics 배열에서 실제 발음기호 찾기
          let phonetic = "";
          if (data[0]?.phonetics && Array.isArray(data[0].phonetics)) {
            // 발음기호가 있는 첫 번째 항목 찾기
            for (const item of data[0].phonetics) {
              if (item.text && item.text.trim()) {
                const rawPhonetic = item.text;
                phonetic = cleanPhonetic(rawPhonetic);
                console.log(`🔍 API 결과: ${cleanWord} → ${rawPhonetic} → ${phonetic}`);
                break;
              }
            }
          }
          
          // phonetic이 없으면 data[0].phonetic 사용
          if (!phonetic && data[0]?.phonetic) {
            const rawPhonetic = data[0].phonetic;
            phonetic = cleanPhonetic(rawPhonetic);
            console.log(`🔍 API 대체: ${cleanWord} → ${rawPhonetic} → ${phonetic}`);
          }
          
          // 여전히 없으면 기본 매핑이나 단어 그대로
          if (!phonetic) {
            phonetic = basicPhonetics[lowerWord] || lowerWord;
            console.log(`⚠️ 폴백: ${cleanWord} → ${phonetic}`);
          }
          
          phonetics.push(phonetic);
        } else {
          // API 실패 시 기본 매핑이나 단어 그대로
          const fallback = basicPhonetics[lowerWord] || lowerWord;
          console.log(`❌ API 실패: ${cleanWord} → ${fallback}`);
          phonetics.push(fallback);
        }
      } catch (error) {
        console.error(`❌ 발음기호 가져오기 실패: ${cleanWord}`, error);
        const fallback = basicPhonetics[lowerWord] || lowerWord;
        phonetics.push(fallback);
      }
    }
    
    // 하나의 문자열로 합치기
    const result = "/" + phonetics.join(" ") + "/";
    console.log("📢 최종 발음기호:", result);
    return result;
  };

  // 발음기호를 색상으로 강조하여 렌더링
  const renderPhonetics = (phoneticText: string) => {
    const parts: React.ReactElement[] = [];
    let currentIndex = 0;
    
    // 강세 기호 찾기: ˈ (1차 강세), ˌ (2차 강세)
    const regex = /(ˈ|ˌ)([^ˈˌ\s/]+)/g;
    let match;
    let lastIndex = 0;
    
    while ((match = regex.exec(phoneticText)) !== null) {
      // 강세 전 부분
      if (match.index > lastIndex) {
        parts.push(
          <span key={`normal-${lastIndex}`} className="text-gray-600 dark:text-gray-400">
            {phoneticText.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      // 강세 부분
      const stressType = match[1];
      const stressedPart = match[1] + match[2];
      
      if (stressType === "ˈ") {
        // 1차 강세 - 빨간색, 굵게
        parts.push(
          <span key={`stress1-${match.index}`} className="text-red-600 dark:text-red-400 font-bold">
            {stressedPart}
          </span>
        );
      } else {
        // 2차 강세 - 주황색
        parts.push(
          <span key={`stress2-${match.index}`} className="text-orange-500 dark:text-orange-400 font-semibold">
            {stressedPart}
          </span>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // 남은 부분
    if (lastIndex < phoneticText.length) {
      parts.push(
        <span key={`normal-${lastIndex}`} className="text-gray-600 dark:text-gray-400">
          {phoneticText.substring(lastIndex)}
        </span>
      );
    }
    
    return <div className="text-xl font-mono leading-relaxed">{parts}</div>;
  };

  // 텍스트 유사도 계산 (Levenshtein Distance)
  const calculateTextSimilarity = (text1: string, text2: string): number => {
    const s1 = text1.toLowerCase().trim();
    const s2 = text2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    const matrix: number[][] = [];
    
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    
    return 1 - (distance / maxLength);
  };

  // 틀린 단어 찾기
  const findWrongWords = (original: string, recognized: string): string[] => {
    const originalWords = original.toLowerCase().split(" ");
    const recognizedWords = recognized.toLowerCase().split(" ");
    const wrong: string[] = [];
    
    originalWords.forEach((word, index) => {
      const cleanOriginal = word.replace(/[.,!?]/g, "");
      const cleanRecognized = recognizedWords[index]?.replace(/[.,!?]/g, "") || "";
      
      if (cleanOriginal !== cleanRecognized) {
        wrong.push(cleanOriginal);
      }
    });
    
    return wrong;
  };

  // 오디오 정리
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ElevenLabs로 음성 재생
  const handleElevenLabsSpeak = async () => {
    setIsLoadingVoice(true);
    setIsPlaying(true);
    
    try {
      // 음성 옵션 결정 (성별 및 악센트 기반)
      let voiceOption: string;
      if (gender === "female") {
        voiceOption = accent === "US" ? "rachel_us" : "bella_uk";
      } else {
        voiceOption = accent === "US" ? "antoni_us" : "arnold_uk";
      }
      
      console.log("🎤 ElevenLabs 음성 생성 시작...");
      
      // 이전 오디오 정리
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      // API 호출
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: sentence.trim(),
          voiceOption: voiceOption,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `음성 생성 실패 (HTTP ${response.status})`
        );
      }

      // MP3 파일을 Blob으로 받기
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      audioUrlRef.current = audioUrl;

      // 오디오 재생
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // 속도 조정
      audio.playbackRate = speed;

      audio.onended = () => {
        console.log("✅ ElevenLabs 음성 재생 완료");
        setIsPlaying(false);
        setIsLoadingVoice(false);
      };

      audio.onerror = (event) => {
        console.error("❌ 오디오 재생 오류:", event);
        setIsPlaying(false);
        setIsLoadingVoice(false);
        alert("오디오 재생 중 오류가 발생했습니다.");
      };

      await audio.play();
      console.log("✅ ElevenLabs 음성 재생 시작");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ ElevenLabs 음성 생성/재생 오류:", error);
      setIsPlaying(false);
      setIsLoadingVoice(false);
      
      // 에러 발생 시 브라우저 TTS로 폴백
      if (error.message.includes("API 키")) {
        alert("ElevenLabs API 키가 설정되지 않았습니다. 브라우저 음성으로 전환합니다.");
        setTtsProvider("browser");
        handleBrowserSpeak();
      } else {
        alert(`음성 생성 실패: ${error.message}`);
      }
    }
  };

  // 브라우저 TTS 재생 (미국/영국 선택 가능) - 모바일 최적화
  const handleBrowserSpeak = async () => {
    // 발음기호 가져오기 (비동기)
    setShowPhonetics(true);
    try {
      const phonetics = await fetchPhonetics(sentence);
      setPhoneticText(phonetics);
      console.log("발음기호:", phonetics);
    } catch (error) {
      console.error("발음기호 가져오기 실패:", error);
      setPhoneticText("/" + sentence + "/");
    }
    
    if ("speechSynthesis" in window) {
      setIsPlaying(true);
      
      // 기존 음성 취소
      window.speechSynthesis.cancel();
      
      // 문장 정제: 불필요한 공백 제거, 마침표 통일
      const cleanedSentence = sentence
        .replace(/\s+/g, " ") // 여러 공백을 하나로
        .replace(/\.\s*\./g, ".") // 중복 마침표 제거
        .trim();
      
      const utterance = new SpeechSynthesisUtterance(cleanedSentence);
      utterance.lang = accent === "US" ? "en-US" : "en-GB";
      
      // 속도 조정 (난이도별)
      utterance.rate = speed;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // 원어민 목소리 선택 (더 정교한 필터링)
      const voices = window.speechSynthesis.getVoices();
      console.log("Available voices:", voices.map(v => `${v.name} (${v.lang})`)); // 디버깅용
      
      let targetVoice = null;
      
      // 성별 및 악센트 기반 음성 선택
      const lang = accent === "US" ? "en-US" : "en-GB";
      
      if (gender === "female") {
        // 여성 음성 우선순위
        targetVoice = voices.find((v) => v.lang === lang && (v.name.includes("Google") || v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Kate"))) ||
                      voices.find((v) => v.lang === lang && v.name.includes("Microsoft") && !v.name.includes("Male")) ||
                      voices.find((v) => v.lang === lang && !v.localService && !v.name.includes("Male")) ||
                      voices.find((v) => v.lang.startsWith(lang) && !v.name.includes("Male"));
      } else {
        // 남성 음성 우선순위
        targetVoice = voices.find((v) => v.lang === lang && (v.name.includes("Google") || v.name.includes("Male") || v.name.includes("Alex") || v.name.includes("Daniel"))) ||
                      voices.find((v) => v.lang === lang && v.name.includes("Microsoft") && v.name.includes("Male")) ||
                      voices.find((v) => v.lang === lang && !v.localService && v.name.includes("Male")) ||
                      voices.find((v) => v.lang.startsWith(lang) && v.name.includes("Male"));
      }
      
      // 성별 필터링 실패 시 기본 선택
      if (!targetVoice) {
        targetVoice = voices.find((v) => v.lang === lang && (v.name.includes("Google") || v.name.includes("US English") || v.name.includes("UK English"))) ||
                      voices.find((v) => v.lang === lang && !v.localService) ||
                      voices.find((v) => v.lang.startsWith(lang));
      }
      
      if (targetVoice) {
        utterance.voice = targetVoice;
        console.log("Selected voice:", targetVoice.name, targetVoice.lang);
      } else {
        console.warn("No preferred voice found, using default");
      }
      
      utterance.onend = () => {
        setIsPlaying(false);
        console.log("Speech ended successfully");
      };
      
      utterance.onerror = (event) => {
        console.error("Speech error:", event);
        setIsPlaying(false);
      };
      
      // 모바일 호환성: 즉시 재생 (지연 없음)
      // iOS Safari는 사용자 인터랙션 직후에만 작동
      if (isMobile) {
        window.speechSynthesis.speak(utterance);
      } else {
        // 데스크톱: 약간의 지연
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 50);
      }
    } else {
      alert("이 브라우저는 음성 재생을 지원하지 않습니다.");
    }
  };

  // 통합 TTS 재생 핸들러
  const handleSpeak = async () => {
    if (ttsProvider === "elevenlabs") {
      await handleElevenLabsSpeak();
    } else {
      await handleBrowserSpeak();
    }
  };

  const handleStop = () => {
    if (ttsProvider === "elevenlabs") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } else {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsLoadingVoice(false);
  };

  // 음성 목록 로드 (Chrome에서 필요)
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // 녹음 시작 + 실시간 음성 인식
  const handleStartRecording = async () => {
    // 브라우저/환경 지원 확인
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("이 브라우저는 음성 녹음을 지원하지 않습니다. Chrome, Firefox, Edge 최신 버전을 사용해주세요. (HTTPS 또는 localhost에서만 작동합니다)");
      return;
    }

    if (!isSpeechRecognitionSupported) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio(audioUrl);
        
        // 스트림 정리
        stream.getTracks().forEach((track) => track.stop());
      };

      // Speech Recognition 설정
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.lang = accent === "US" ? "en-US" : "en-GB";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        console.log("✅ 인식된 텍스트:", transcript);
        console.log("📊 신뢰도:", confidence);
        
        setRecognizedText(transcript);
        
        // 텍스트 유사도 계산
        const similarity = calculateTextSimilarity(sentence, transcript);
        
        // 틀린 단어 찾기
        const wrong = findWrongWords(sentence, transcript);
        setWrongWords(wrong);
        
        // 점수 및 메시지 결정
        let score: "great" | "good" | "try_again";
        let message: string;
        
        if (similarity >= 0.9) {
          score = "great";
          message = "🎉 Great! 완벽해요! 발음이 정말 좋아요!\n✅ 모든 단어를 정확하게 발음했어요!";
        } else if (similarity >= 0.7) {
          score = "good";
          message = "👍 Good! 잘했어요! 조금만 더 연습하면 완벽할 거예요!";
          if (wrong.length > 0) {
            message += `\n💡 다시 한번: ${wrong.join(", ")}`;
          }
        } else {
          score = "try_again";
          message = "💪 Try Again! 천천히 다시 해볼까요?";
          if (wrong.length > 0) {
            message += `\n💡 연습할 단어: ${wrong.join(", ")}`;
          }
        }
        
        message += `\n\n📊 정확도: ${(similarity * 100).toFixed(1)}%`;
        message += `\n🎯 인식된 문장: "${transcript}"`;
        
        setPronunciationScore(score);
        setPronunciationResult(message);
      };
      
      recognition.onerror = (event: any) => {
        console.error("❌ 음성 인식 오류:", event.error);
        let errorMessage = "❌ 음성 인식 중 오류가 발생했습니다.";
        
        if (event.error === "no-speech") {
          errorMessage = "❌ 음성이 감지되지 않았습니다. 다시 녹음해주세요.";
        } else if (event.error === "audio-capture") {
          errorMessage = "❌ 오디오를 캡처할 수 없습니다.";
        } else if (event.error === "not-allowed") {
          errorMessage = "❌ 마이크 권한이 필요합니다.";
        }
        
        setPronunciationResult(errorMessage);
      };
      
      recognition.onend = () => {
        console.log("🔚 음성 인식 종료");
      };

      // 녹음과 음성 인식 동시 시작!
      mediaRecorder.start();
      recognition.start();
      setIsRecording(true);
      setPronunciationResult(null);
      setPronunciationScore(null);
      setWrongWords([]);
      
      console.log("🎤 녹음 및 음성 인식 시작!");
      
    } catch (error) {
      console.error("마이크 접근 오류:", error);
      alert("마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.");
    }
  };

  // 녹음 중지 + 음성 인식 중지
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Speech Recognition도 중지
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          console.log("🛑 녹음 및 음성 인식 중지");
        } catch (error) {
          console.log("음성 인식 이미 중지됨");
        }
      }
      
      setIsRecording(false);
    }
  };

  // 녹음 다시하기
  const handleRetry = () => {
    setRecordedAudio(null);
    setPronunciationResult(null);
    setPronunciationScore(null);
    setRecognizedText("");
    setWrongWords([]);
  };

  // 녹음 재생
  const handlePlayRecording = () => {
    if (recordedAudio) {
      const audio = new Audio(recordedAudio);
      audio.play();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h4 className="font-semibold text-gray-800 dark:text-white">말해볼까요?</h4>
        <div className="flex gap-2 flex-wrap">
          {/* TTS 제공자 선택 */}
          <select
            value={ttsProvider}
            onChange={(e) => setTtsProvider(e.target.value as TTSProvider)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            disabled={isPlaying || isLoadingVoice}
          >
            <option value="elevenlabs">🎤 ElevenLabs (고품질)</option>
            <option value="browser">🌐 브라우저 (기본)</option>
          </select>
          
          {/* 성별 선택 */}
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as GenderType)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            disabled={isPlaying || isLoadingVoice}
          >
            <option value="female">👩 여성</option>
            <option value="male">👨 남성</option>
          </select>
          
          {/* 악센트 선택 (브라우저 TTS일 때만) */}
          {ttsProvider === "browser" && (
            <select
              value={accent}
              onChange={(e) => setAccent(e.target.value as AccentType)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              disabled={isPlaying}
            >
              <option value="US">🇺🇸 미국</option>
              <option value="UK">🇬🇧 영국</option>
            </select>
          )}
          
          {/* 속도 조정 */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
            <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">속도:</label>
            <input
              type="range"
              min="0.5"
              max="1.2"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-20"
              disabled={isPlaying || isLoadingVoice}
            />
            <span className="text-xs text-gray-700 dark:text-gray-300 w-10 text-right">
              {speed.toFixed(2)}x
            </span>
          </div>
          
          {/* 들어보기 버튼 */}
          {!isPlaying && !isLoadingVoice ? (
            <button
              onClick={handleSpeak}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-2"
            >
              <span>🔊</span>
              <span>들어보기</span>
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {isLoadingVoice ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>생성 중...</span>
                </>
              ) : (
                <>
                  <span>⏹️</span>
                  <span>정지</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="border-l-4 border-green-500 pl-4 py-2 space-y-2">
        {/* 원본 문장 (빨간색 취소선) → 교정된 문장 (초록색) */}
        <div className="flex flex-wrap gap-2 items-center mb-2">
          {original && (
            <>
              <span className="text-red-600 dark:text-red-400 line-through text-base">
                {original}
              </span>
              <span className="text-gray-400">→</span>
            </>
          )}
          <span className="text-green-600 dark:text-green-400 font-semibold text-base">
            {sentence}
          </span>
        </div>
        
        {/* 발음기호 - 강세 강조 */}
        {showPhonetics && phoneticText && (
          <div className="space-y-2 bg-white dark:bg-gray-700/50 rounded-lg p-3 mt-2">
            <div>
              {renderPhonetics(phoneticText)}
            </div>
            <div className="flex gap-4 text-xs border-t border-gray-200 dark:border-gray-600 pt-2">
              <div className="flex items-center gap-1">
                <span className="text-red-600 dark:text-red-400 font-bold">ˈ</span>
                <span className="text-gray-600 dark:text-gray-400">강하게</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-orange-500 dark:text-orange-400 font-semibold">ˌ</span>
                <span className="text-gray-600 dark:text-gray-400">조금 세게</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 따라 말하기 섹션 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          따라 말하기:
        </label>
        
        {!isRecordingSupported ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              ⚠️ 녹음 기능은 HTTPS 환경 또는 localhost에서만 사용할 수 있습니다.
            </p>
          </div>
        ) : !isSpeechRecognitionSupported ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              ⚠️ 음성 인식 기능은 Chrome 또는 Edge 브라우저에서만 사용할 수 있습니다.
            </p>
          </div>
        ) : (
          <>
            {/* 녹음 버튼 */}
            <div className="flex gap-2">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-semibold"
                >
                  <span>🎤</span>
                  <span>녹음 시작</span>
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-semibold animate-pulse"
                >
                  <span>⏹️</span>
                  <span>녹음 중지</span>
                </button>
              )}
            </div>

            {/* 녹음 결과 */}
            {recordedAudio && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={handlePlayRecording}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all flex items-center gap-2"
                  >
                    <span>▶️</span>
                    <span>내 목소리 듣기</span>
                  </button>
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-2"
                  >
                    <span>🔄</span>
                    <span>다시 녹음하기</span>
                  </button>
                </div>

                {/* 발음 평가 결과 */}
                {pronunciationResult && (
                  <div className={`rounded-lg p-4 border-2 space-y-2 ${
                    pronunciationScore === "great" 
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
                      : pronunciationScore === "good"
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                      : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700"
                  }`}>
                    <p className={`text-sm whitespace-pre-line ${
                      pronunciationScore === "great"
                        ? "text-green-700 dark:text-green-300"
                        : pronunciationScore === "good"
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-yellow-700 dark:text-yellow-300"
                    }`}>
                      {pronunciationResult}
                    </p>
                    
                    {/* 틀린 단어 강조 표시 */}
                    {wrongWords.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                          원본과 비교:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {sentence.split(" ").map((word, index) => {
                            const cleanWord = word.toLowerCase().replace(/[.,!?]/g, "");
                            const isWrong = wrongWords.includes(cleanWord);
                            return (
                              <span
                                key={index}
                                className={`px-2 py-1 rounded text-sm ${
                                  isWrong
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold"
                                    : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                }`}
                              >
                                {word}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 안내 메시지 */}
            {!recordedAudio && !isRecording && (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  💡 먼저 "들어보기"로 원어민 발음을 듣고<br />
                  "녹음 시작"을 눌러 따라 말해보세요!<br />
                  <span className="text-red-600 dark:text-red-400 font-semibold">빨간색</span> 부분을 강하게 발음하세요!
                </p>
              </div>
            )}
            
            {/* 녹음 중 안내 */}
            {isRecording && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-400 dark:border-blue-600 animate-pulse">
                <p className="text-sm text-blue-700 dark:text-blue-300 text-center font-semibold">
                  🎤 녹음 중... 문장을 크고 명확하게 말해주세요!<br />
                  녹음이 끝나면 자동으로 발음을 분석합니다.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}




