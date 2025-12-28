// ====================================
// Writing Ladder 타입 정의
// ====================================

/**
 * Writing Ladder는 Show & Tell과 동일한 엔진(Write+Fix / Script / Rehearsal / Judge)을 사용하지만,
 * 콘텐츠(주제, 템플릿)와 진행 규칙이 다릅니다.
 * 
 * Level 0: 문장 4주 (MVP)
 * - Week 1-4: 문장 레벨 학습
 * - 같은 Day1-Day2-Day3 구조 재사용
 * 
 * Level 1-3: 예정 (카탈로그에만 노출 또는 숨김)
 */

/**
 * Writing Ladder Level
 */
export type WritingLadderLevel = 
  | "LEVEL0_SENTENCE"    // Level 0: 문장 (4주)
  | "LEVEL1_PARAGRAPH"   // Level 1: 단락 (4주) - 예정
  | "LEVEL2_ESSAY"       // Level 2: 에세이 (4주) - 예정
  | "LEVEL3_CREATIVE";   // Level 3: 창작 (4주) - 예정

/**
 * Writing Ladder 코스 ID
 */
export type WritingLadderCourseId = "writing_ladder_level0_4w";

/**
 * Writing Ladder 주제 (Topic)
 * Show & Tell과 동일한 구조이지만 task_type_id가 다름
 */
export interface WritingLadderTopic {
  topic_id: string; // 예: "writingladder_l0_week1"
  level: WritingLadderLevel; // "LEVEL0_SENTENCE"
  week: number; // 1~4 (Level 0)
  title: string; // "Simple Sentence: I like..."
  description: string; // 주제 설명
  grade_band: "MID" | "HIGH"; // 학년대 (Level 0은 MID)
  cefr_level: "A1" | "A2"; // CEFR 레벨 (Level 0은 A1)
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
 * Show & Tell과 동일한 구조
 */
export interface WritingLadderJudgeQuestionSet {
  question_set_id: string; // 예: "judge_writingladder_l0_week1"
  topic_id: string; // FK: "writingladder_l0_week1"
  level: WritingLadderLevel;
  week: number; // 1~4
  json: {
    questions: WritingLadderJudgeQuestion[];
  };
  active: boolean;
  version: string;
  created_at: string;
}

/**
 * Judge 질문 개별 문항
 */
export interface WritingLadderJudgeQuestion {
  question_id: string; // "q1", "q2", ...
  text: string; // "What is one thing you like?"
  difficulty: "easy" | "medium" | "hard";
  expected_answer_length: "short" | "medium" | "long";
}

/**
 * Writing Ladder 콘텐츠 팩 (주차별 전체 콘텐츠)
 * Show & Tell과 동일한 Day1-Day2-Day3 구조 재사용
 */
export interface WritingLadderContentPack {
  content_pack_id: string; // 예: "writingladder_l0_week1"
  course_id: WritingLadderCourseId; // "writing_ladder_level0_4w"
  level: WritingLadderLevel; // "LEVEL0_SENTENCE"
  week: number; // 1~4
  grade_band: "MID" | "HIGH";
  cefr_level: "A1" | "A2";
  topic_id: string; // FK: "writingladder_l0_week1"
  task_type_id: "writingladder.sentence"; // Level 0 전용
  json: WritingLadderContentPackData;
  active: boolean;
  version: string;
  created_at: string;
}

/**
 * 콘텐츠 팩 데이터 (JSON 필드)
 * Show & Tell과 거의 동일하지만, 프롬프트와 템플릿이 다름
 */
export interface WritingLadderContentPackData {
  // 기본 정보
  title: string; // "Week 1: I like..."
  description: string;
  
  // Day 1: Write + Fix (문장 레벨)
  day1: {
    write: {
      prompt: string; // "Write 3-5 simple sentences starting with 'I like...'"
      guide_questions: string[]; // 작성 가이드
      min_words: number; // 최소 단어 수 (Level 0: 20-30)
      max_words: number; // 최대 단어 수 (Level 0: 50)
    };
    fix: {
      enabled: boolean; // 항상 true
      correction_focus: string[]; // ["grammar", "vocabulary", "structure"]
    };
  };
  
  // Day 2: Script Coach + TTS + Shadowing
  day2: {
    script_coach: {
      target_duration_seconds: number; // 15-20 (Level 0은 짧게)
      structure_template: {
        intro: string; // "Hello! I want to tell you about..."
        body: string[]; // 본문 구조
        conclusion: string; // "Thank you!"
      };
      tips: string[]; // 대본 작성 팁
    };
    tts: {
      enabled: boolean;
      voice: "en-US-Standard-C" | "en-US-Standard-D";
    };
    shadowing: {
      enabled: boolean;
      max_attempts: number; // 3
    };
  };
  
  // Day 3: Rehearsal + Judge
  day3: {
    rehearsal: {
      max_attempts: number; // 2
      feedback_focus: string[]; // ["pronunciation", "fluency", "content"]
    };
    judge: {
      question_bank_ref: string; // FK: "judge_writingladder_l0_week1"
      question_count: number; // 5
      time_limit_seconds: number; // 20 (Level 0은 짧게)
    };
  };
  
  // 결과물 저장
  portfolio: {
    card_title: string; // "Week 1: I like..."
    card_description: string;
    save_items: string[]; // ["final_script", "final_recording", "judge_qa"]
  };
}

/**
 * Writing Ladder 주차별 진행 상태
 * Show & Tell과 동일한 구조 재사용
 */
export interface WritingLadderWeekProgress {
  progress_id: string; // PK
  child_id: string; // FK
  course_id: WritingLadderCourseId;
  level: WritingLadderLevel;
  week: number; // 1~4
  
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
  current_day: 1 | 2 | 3 | null;
  
  // 메타데이터
  started_at: string;
  completed_at?: string;
  updated_at: string;
}

/**
 * Writing Ladder 포트폴리오 항목
 * Show & Tell과 동일한 구조
 */
export interface WritingLadderPortfolioItem {
  portfolio_id: string; // PK
  child_id: string; // FK
  course_id: WritingLadderCourseId;
  level: WritingLadderLevel;
  week: number; // 1~4
  
  // 연관 데이터 (FK들)
  submission_id: string; // FK: WritingSubmission
  script_id: string; // FK: Script
  rehearsal_session_id: string; // FK: RehearsalSession
  rehearsal_attempt2_audio_id: string; // FK: AudioRecord (최종 발표 녹음)
  judge_session_id: string; // FK: JudgeSession
  
  // 포트폴리오 카드 정보
  title: string; // "Week 1: I like..."
  description: string;
  thumbnail_url?: string;
  
  // 빠른 접근을 위한 요약 데이터
  final_script: string;
  final_recording_url: string;
  word_count: number;
  
  // 메타데이터
  completed_at: string;
  created_at: string;
  updated_at: string;
}


