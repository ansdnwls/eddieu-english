import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { JudgeSession, JudgeQuestion, JudgeQuestionSet, Script, WritingSubmission } from "@/app/types/showtell";

/**
 * POST /api/showtell/judge-sessions
 * 
 * Judge Session 생성
 * - question_set에서 5개 질문 랜덤 선택
 * - 개인정보 요구 질문 필터링
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { child_id, script_id, question_set_id, n_questions = 5 } = body;

    if (!child_id || !script_id || !question_set_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: child_id, script_id, question_set_id" },
        { status: 400 }
      );
    }

    console.log("=== Judge Session 생성 ===");
    console.log("👤 Child ID:", child_id);
    console.log("📝 Script ID:", script_id);
    console.log("❓ Question Set ID:", question_set_id);
    console.log("🔢 Questions to select:", n_questions);

    // Script 존재 확인 및 week 가져오기
    const scriptRef = doc(db, "showtell_scripts", script_id);
    const scriptDoc = await getDoc(scriptRef);

    if (!scriptDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Script not found" },
        { status: 404 }
      );
    }

    const script = scriptDoc.data() as Script;
    const submissionRef = doc(db, "showtell_writing_submissions", script.submission_id);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const submission = submissionDoc.data() as WritingSubmission;
    const week = submission.week;

    // Question Set 가져오기
    const questionSetRef = doc(db, "showtell_judge_question_sets", question_set_id);
    const questionSetDoc = await getDoc(questionSetRef);

    if (!questionSetDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Question set not found" },
        { status: 404 }
      );
    }

    const questionSet = questionSetDoc.data() as JudgeQuestionSet;

    // 개인정보 요구 질문 필터링 (학교명, 주소, 연락처, 실명 등)
    const safeQuestions = questionSet.json.questions.filter((q: JudgeQuestion) => {
      const lowerText = q.text.toLowerCase();
      const forbiddenKeywords = [
        "school name", "your school", "which school",
        "address", "where do you live", "your home",
        "phone", "number", "contact",
        "real name", "your name", "full name",
        "email", "parent",
      ];
      return !forbiddenKeywords.some(keyword => lowerText.includes(keyword));
    });

    console.log(`📊 Total questions: ${questionSet.json.questions.length}, Safe questions: ${safeQuestions.length}`);

    if (safeQuestions.length < n_questions) {
      return NextResponse.json(
        { success: false, error: `Not enough safe questions. Found ${safeQuestions.length}, need ${n_questions}` },
        { status: 400 }
      );
    }

    // 랜덤으로 n_questions 개 선택
    const shuffled = [...safeQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, n_questions);

    console.log("✅ 선택된 질문들:");
    selectedQuestions.forEach((q: JudgeQuestion, i: number) => {
      console.log(`  ${i + 1}. ${q.text}`);
    });

    // Judge Session ID 생성
    const judge_session_id = `judge_${script_id}_${Date.now()}`;

    // Judge Session 데이터
    const judgeSession: JudgeSession = {
      judge_session_id,
      question_set_id,
      script_id,
      child_id,
      week,
      selected_questions: selectedQuestions,
      current_question_index: 0,
      answers: [],
      status: "in_progress",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Firestore에 저장
    await setDoc(doc(db, "showtell_judge_sessions", judge_session_id), judgeSession);

    console.log("✅ Judge Session 생성 완료:", judge_session_id);

    return NextResponse.json({
      success: true,
      data: {
        judge_session_id,
        selected_questions: selectedQuestions,
        current_question_index: 0,
        total_questions: n_questions,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Judge Session 생성 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create judge session" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/showtell/judge-sessions?judge_session_id=xxx
 * 
 * Judge Session 조회
 */
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const judge_session_id = searchParams.get("judge_session_id");

    if (!judge_session_id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: judge_session_id" },
        { status: 400 }
      );
    }

    const judgeRef = doc(db, "showtell_judge_sessions", judge_session_id);
    const judgeDoc = await getDoc(judgeRef);

    if (!judgeDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Judge session not found" },
        { status: 404 }
      );
    }

    const judgeSession = judgeDoc.data() as JudgeSession;

    return NextResponse.json({
      success: true,
      data: judgeSession,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Judge Session 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch judge session" },
      { status: 500 }
    );
  }
}




