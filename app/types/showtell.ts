// ====================================
// Show & Tell 12주 코스 타입 정의
// ====================================

/**
 * Show & Tell 주제 (Topic)
 * 12주 코스의 각 주차별 발표 주제
 */
export interface ShowTellTopic {
  topic_id: string; // 예: "showtell_week1"
  week: number; // 1~12
  title: string; // "My Favorite Toy"
  description: string; // 주제 설명
  grade_band: "HIGH"; // 고정 (초등 고학년)
  cefr_level: "A2"; // 고정
  json: {
    learning_objectives: string[]; // 학습 목표
    key_vocabulary: string[]; // 핵심 단어
    example_sentences: string[]; // 예문
  };
  active: boolean; // 활성화 여부
  version: string; // "1.0"
  created_at: string; // ISO 8601
}

/**
 * Judge 질문 세트 (Q&A 5문항)
 * 각 주차별로 5개의 질문
 */
export interface JudgeQuestionSet {
  question_set_id: string; // 예: "judge_week1"
  topic_id: string; // FK: "showtell_week1"
  week: number; // 1~12
  json: {
    questions: JudgeQuestion[];
  };
  active: boolean;
  version: string;
  created_at: string;
}

/**
 * Judge 질문 개별 문항
 */
export interface JudgeQuestion {
  question_id: string; // "q1", "q2", ...
  text: string; // "What is your favorite thing about it?"
  difficulty: "easy" | "medium" | "hard";
  expected_answer_length: "short" | "medium" | "long"; // "1-2 sentences", "2-3 sentences", etc.
}

/**
 * Show & Tell 콘텐츠 팩 (주차별 전체 콘텐츠)
 * Day1: Write + Fix
 * Day2: Script Coach + TTS + Shadowing
 * Day3: Rehearsal + Judge
 */
export interface ShowTellContentPack {
  content_pack_id: string; // 예: "showtell_week1"
  course_id: "show_tell_12w"; // 고정
  week: number; // 1~12
  grade_band: "HIGH"; // 고정
  cefr_level: "A2"; // 고정
  topic_id: string; // FK: "showtell_week1"
  task_type_id: "showtell.presentation"; // 고정
  json: ShowTellContentPackData;
  active: boolean;
  version: string;
  created_at: string;
}

/**
 * 콘텐츠 팩 데이터 (JSON 필드)
 */
export interface ShowTellContentPackData {
  // 기본 정보
  title: string; // "Week 1: My Favorite Toy"
  description: string;
  
  // Day 1: Write + Fix
  day1: {
    write: {
      prompt: string; // "Write about your favorite toy."
      guide_questions: string[]; // 작성 가이드
      min_words: number; // 최소 단어 수
      max_words: number; // 최대 단어 수
    };
    fix: {
      enabled: boolean; // 항상 true
      correction_focus: string[]; // ["grammar", "vocabulary", "structure"]
    };
  };
  
  // Day 2: Script Coach + TTS + Shadowing
  day2: {
    script_coach: {
      target_duration_seconds: number; // 30 or 60
      structure_template: {
        intro: string; // "Hello, I'm going to talk about..."
        body: string[]; // 본문 구조
        conclusion: string; // "Thank you for listening."
      };
      tips: string[]; // 대본 작성 팁
    };
    tts: {
      enabled: boolean; // TTS 듣기 가능 여부
      voice: "en-US-Standard-C" | "en-US-Standard-D"; // 음성 옵션
    };
    shadowing: {
      enabled: boolean; // 녹음 기능
      max_attempts: number; // 최대 녹음 횟수
    };
  };
  
  // Day 3: Rehearsal + Judge
  day3: {
    rehearsal: {
      max_attempts: number; // 2 (1차 녹음 → 피드백 → 2차 녹음)
      feedback_focus: string[]; // ["pronunciation", "fluency", "content"]
    };
    judge: {
      question_bank_ref: string; // FK: "judge_week1"
      question_count: number; // 5
      time_limit_seconds: number; // 각 질문당 시간 제한 (선택)
    };
  };
  
  // 결과물 저장
  portfolio: {
    card_title: string; // "Week 1: My Favorite Toy"
    card_description: string;
    save_items: string[]; // ["final_script", "final_recording", "judge_qa"]
  };
}

/**
 * Show & Tell 사용자 진행 상태
 */
export interface ShowTellUserProgress {
  progress_id: string;
  user_id: string;
  child_id: string;
  course_id: "show_tell_12w";
  current_week: number; // 현재 주차 (1~12)
  completed_weeks: number[]; // 완료한 주차들
  
  // 각 주차별 진행 상태
  week_progress: {
    [week: number]: ShowTellWeekProgress;
  };
  
  started_at: string;
  last_updated: string;
}

/**
 * 주차별 진행 상태
 */
export interface ShowTellWeekProgress {
  week: number;
  content_pack_id: string;
  
  // Day별 완료 상태
  day1_completed: boolean;
  day2_completed: boolean;
  day3_completed: boolean;
  
  // Day별 데이터
  day1_data?: {
    original_text: string;
    corrected_text: string;
    corrections: any[]; // CorrectionResult
    completed_at: string;
  };
  
  day2_data?: {
    script: string;
    duration_seconds: number;
    tts_url?: string;
    shadowing_recordings: string[]; // Storage URLs
    completed_at: string;
  };
  
  day3_data?: {
    rehearsal_1_url: string; // 1차 녹음
    rehearsal_1_feedback: string;
    rehearsal_2_url: string; // 2차 녹음
    judge_qa: {
      question_id: string;
      question_text: string;
      answer_text: string;
      answer_audio_url?: string;
    }[];
    completed_at: string;
  };
  
  // 포트폴리오 카드
  portfolio_card?: {
    card_id: string;
    title: string;
    thumbnail_url?: string;
    created_at: string;
  };
  
  started_at: string;
  completed_at?: string;
}

/**
 * Show & Tell 포트폴리오 카드
 */
export interface ShowTellPortfolioCard {
  card_id: string;
  user_id: string;
  child_id: string;
  course_id: "show_tell_12w";
  week: number;
  content_pack_id: string;
  
  // 카드 정보
  title: string; // "Week 1: My Favorite Toy"
  description: string;
  thumbnail_url?: string;
  
  // 저장된 콘텐츠
  final_script: string;
  final_recording_url: string; // 2차 녹음 (최종본)
  judge_qa: {
    question: string;
    answer: string;
    audio_url?: string;
  }[];
  
  // 메타데이터
  created_at: string;
  updated_at: string;
}

// ====================================
// Show & Tell 학습 진행 데이터 (User Submissions)
// ====================================

/**
 * Day 1: Writing Submission (작문 제출)
 * 유저가 작성한 영어 글 원본
 */
export interface WritingSubmission {
  submission_id: string; // PK
  child_id: string; // FK: 어떤 아이가 제출했는지
  course_id: "show_tell_12w"; // 고정
  week: number; // 1~12
  
  // 레벨 정보 (스타일 가이드 적용용)
  grade_band: "LOW" | "MID" | "HIGH"; // 학년대
  cefr_level: "A1" | "A2" | "B1" | "B2"; // CEFR 레벨
  
  // 입력 방식
  input_method: "typing" | "ocr"; // 타이핑 or OCR
  
  // 텍스트 데이터
  raw_text: string; // 원본 텍스트 (사용자가 입력한 그대로)
  ocr_text?: string; // OCR로 추출된 원본 텍스트 (OCR인 경우)
  cleaned_text: string; // 정제된 텍스트 (공백/특수문자 정리)
  
  // 이미지 (OCR인 경우)
  image_url?: string; // Firebase Storage URL
  
  // 루브릭 검증 결과 (6단계: 자동 피드백 품질 관리)
  rubric_result?: {
    sentences_count: number;
    min_sentences_required: number;
    max_sentences_allowed: number;
    sentences_ok: boolean;
    required_patterns: Record<string, boolean>; // { "because": true, "i_like": true }
    all_patterns_found: boolean;
    pii_risk: boolean;
    pii_detected?: string[];
    pass: boolean;
    issues: string[];
    checked_at: string;
  };
  
  // 메타데이터
  word_count: number; // 단어 수
  created_at: string;
  updated_at: string;
}

/**
 * Day 1: Correction Result (교정 결과)
 * AI가 생성한 교정 결과
 */
export interface CorrectionResult {
  correction_id: string; // PK
  submission_id: string; // FK: WritingSubmission
  
  // 교정 결과
  minimal_fix_text: string; // 최소 수정본 (문법/철자만)
  native_rewrite_text: string; // 원어민 수준 재작성
  
  // 업그레이드 제안 (JSON 배열)
  upgrades: CorrectionUpgrade[];
  
  // 피드백
  overall_feedback: string; // 전체 피드백
  encouragement: string; // 격려 메시지
  
  // 메타데이터
  created_at: string;
}

/**
 * 교정 업그레이드 항목
 */
export interface CorrectionUpgrade {
  original: string; // 원본 표현
  suggestion: string; // 제안 표현
  category: "grammar" | "vocabulary" | "structure" | "style"; // 카테고리
  explanation: string; // 설명 (한글)
  example?: string; // 예문
}

/**
 * Day 2: Script (발표 대본)
 * Script Coach가 생성한 30초/60초 대본
 */
export interface Script {
  script_id: string; // PK
  submission_id: string; // FK: WritingSubmission (원본 글 기반)
  
  // 대본 (30초 / 60초 버전)
  script_30s: string; // 30초 발표용 대본
  script_60s?: string; // 60초 발표용 대본 (옵션)
  
  // 학습 지원 데이터
  keywords: string[]; // 핵심 단어 목록
  simplified_sentences: string[]; // 쉬운 표현으로 변환된 문장들
  shadowing_sentences?: string[]; // AI가 선택한 Shadowing 핵심 3문장
  
  // 구조 정보
  structure: {
    intro: string; // 인트로 부분
    body: string; // 본문 부분
    conclusion: string; // 결론 부분
  };
  
  // TTS 음성 파일
  tts_audio_url?: string; // 생성된 TTS 음성 파일 URL
  
  // 메타데이터
  estimated_duration_seconds: number; // 예상 발표 시간
  created_at: string;
}

/**
 * Audio Record (녹음 파일)
 * Day 2 Shadowing, Day 3 Rehearsal, Judge 답변 녹음
 */
export interface AudioRecord {
  audio_id: string; // PK
  child_id: string; // FK: 어떤 아이의 녹음인지
  
  // 연관 타입 (어떤 단계의 녹음인지)
  related_type: "shadowing" | "rehearsal1" | "rehearsal2" | "judge_answer";
  related_id: string; // script_id, rehearsal_session_id, judge_question_id 등
  
  // 녹음 정보
  duration_sec: number; // 녹음 길이 (초)
  storage_url: string; // Firebase Storage URL
  
  // 추가 정보 (옵션)
  attempt_number?: number; // 몇 번째 시도인지 (Shadowing은 1-3)
  feedback?: string; // AI 피드백 (Rehearsal 1차에 대한 피드백)
  
  // 메타데이터
  created_at: string;
}

/**
 * Day 3: Rehearsal Session (리허설 세션)
 * 1차 녹음 → 피드백 → 2차 녹음 전체 세션
 */
export interface RehearsalSession {
  rehearsal_id: string; // PK
  script_id: string; // FK: Script
  child_id: string;
  week: number;
  
  // 1차 녹음
  attempt1_audio_id?: string; // FK: AudioRecord (rehearsal1)
  attempt1_transcript?: string; // 1차 녹음 transcript (STT)
  
  // 피드백 (고정 형식: 칭찬 1개 + 팁 2개 + 개선 문장 1개)
  feedback?: RehearsalFeedback;
  
  // 2차 녹음
  attempt2_audio_id?: string; // FK: AudioRecord (rehearsal2)
  
  // 세션 상태
  status: "created" | "attempt1_uploaded" | "feedback_given" | "attempt2_uploaded" | "completed";
  
  // 메타데이터
  started_at: string;
  completed_at?: string;
  updated_at: string;
}

/**
 * Rehearsal 피드백 (절대 고정 형식)
 */
export interface RehearsalFeedback {
  praise: string; // 칭찬 1개 (항상 제공)
  tip1: string; // 팁 1 (발음/속도/구성 중)
  tip2: string; // 팁 2 (발음/속도/구성 중)
  improved_sentence: string; // 개선 문장 1개
}

/**
 * Day 3: Judge Session (Q&A 세션)
 * 5개 질문 랜덤 선택 + 순차 답변
 */
export interface JudgeSession {
  judge_session_id: string; // PK
  question_set_id: string; // FK: JudgeQuestionSet (10문항 중 5개 랜덤)
  script_id: string; // FK: Script
  child_id: string;
  week: number;
  
  // 선택된 5개 질문 (랜덤)
  selected_questions: JudgeQuestion[];
  
  // 현재 진행 상황
  current_question_index: number; // 0~4 (5문항)
  
  // 각 질문별 답변
  answers: JudgeAnswer[];
  
  // 세션 상태
  status: "in_progress" | "completed";
  
  // 메타데이터
  started_at: string;
  completed_at?: string;
  updated_at: string;
}

/**
 * Judge 개별 답변
 */
export interface JudgeAnswer {
  question_index: number; // 0~4
  question_id: string; // "q1", "q2", ...
  question_text: string; // 질문 원문
  answer_text: string; // 텍스트 답변
  answer_audio_id?: string; // FK: AudioRecord (judge_answer) - 음성 답변
  
  // 개별 피드백 (고정 형식: 칭찬 1 + 교정 1 + 더 좋은 표현 1)
  feedback: JudgeFeedback;
  
  answered_at: string;
}

/**
 * Judge 피드백 (절대 고정 형식)
 */
export interface JudgeFeedback {
  praise: string; // 칭찬 1개 (항상 제공)
  correction: string; // 교정 1개 (딱 1개만)
  better_expression: string; // 더 좋은 표현 1개
}

/**
 * Portfolio Item (포트폴리오 항목)
 * 주차별 완성된 학습 결과물
 */
export interface PortfolioItem {
  portfolio_id: string; // PK
  child_id: string; // FK
  course_id: "show_tell_12w";
  week: number; // 1~12
  
  // 연관 데이터 (FK들)
  submission_id: string; // FK: WritingSubmission
  script_id: string; // FK: Script
  rehearsal_session_id: string; // FK: RehearsalSession
  rehearsal_attempt2_audio_id: string; // FK: AudioRecord (최종 발표 녹음)
  judge_session_id: string; // FK: JudgeSession
  
  // 포트폴리오 카드 정보
  title: string; // "Week 1: My Favorite Toy"
  description: string;
  thumbnail_url?: string; // 썸네일 이미지 URL
  
  // 빠른 접근을 위한 요약 데이터 (중복이지만 성능을 위해)
  final_script: string; // script.script_30s
  final_recording_url: string; // rehearsal attempt2 audio URL
  word_count: number; // submission.word_count
  
  // 메타데이터
  completed_at: string; // 주차 완료 시간
  created_at: string;
  updated_at: string;
}

/**
 * Show & Tell 주차별 진행 상태
 * 현재 어떤 Day, 어떤 단계에 있는지 추적
 */
export interface ShowTellWeekProgress {
  progress_id: string; // PK
  child_id: string; // FK
  course_id: "show_tell_12w";
  week: number; // 1~12
  
  // Day별 완료 상태
  day1_completed: boolean;
  day1_submission_id?: string; // FK: WritingSubmission
  day1_correction_id?: string; // FK: CorrectionResult
  
  day2_completed: boolean;
  day2_script_id?: string; // FK: Script
  day2_shadowing_audio_ids?: string[]; // FK: AudioRecord[] (1-3개)
  
  day3_completed: boolean;
  day3_rehearsal_session_id?: string; // FK: RehearsalSession
  day3_judge_session_id?: string; // FK: JudgeSession
  
  // 포트폴리오 완성 여부
  portfolio_completed: boolean;
  portfolio_id?: string; // FK: PortfolioItem
  
  // 현재 진행 중인 Day
  current_day: 1 | 2 | 3 | null; // null이면 아직 시작 안 함
  
  // 메타데이터
  started_at: string;
  completed_at?: string; // 3 Day 모두 완료 시간
  updated_at: string;
}

