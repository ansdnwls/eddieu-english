import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { db as clientDb } from "@/lib/firebase";
import { checkPenpalFeature } from "@/lib/apiFeatureFlags";

/**
 * 자동 알림 시스템
 * - 3일 후: 받는 사람에게 인증 알림
 * - 7일 후: 관리자에게 알림
 * - 10일 후: 자동 인증 (패널티 경고)
 * 
 * Cron Job으로 매일 실행 (Vercel Cron 또는 외부 스케줄러)
 */
export async function POST(request: NextRequest) {
  // Feature Flag 확인
  const featureCheck = checkPenpalFeature();
  if (!featureCheck.allowed) {
    return featureCheck.response!;
  }

  try {
    console.log("🔔 편지 인증 확인 작업 시작");

    if (!clientDb) {
      throw new Error("Firestore not initialized");
    }

    const now = new Date();
    const results = {
      reminder3Days: 0,
      adminNotify7Days: 0,
      autoVerify10Days: 0,
    };

    // 1. 발송됨 상태인 편지들 조회
    const lettersQuery = query(
      collection(clientDb, "letterProofs"),
      where("status", "==", "sent")
    );

    const lettersSnapshot = await getDocs(lettersQuery);
    console.log(`📊 확인할 편지 수: ${lettersSnapshot.size}`);

    for (const letterDoc of lettersSnapshot.docs) {
      const letterData = letterDoc.data();
      const proofId = letterDoc.id;
      const sentDate = new Date(letterData.senderUploadedAt);
      const daysPassed = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`📮 편지 ${proofId}: ${daysPassed}일 경과`);

      // 3일 경과: 받는 사람에게 알림
      if (daysPassed >= 3 && !letterData.reminderSentAt) {
        console.log("⏰ 3일 경과 - 인증 알림 발송");

        const reminderNotification = {
          userId: letterData.receiverId,
          matchId: letterData.matchId,
          proofId: proofId,
          type: "verification_reminder",
          title: "📬 편지 인증을 잊으셨나요?",
          message: `${letterData.senderChildName}님이 보낸 편지가 도착했다면 사진을 찍어서 인증해주세요! 💌`,
          link: `/penpal/mission/${letterData.matchId}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          expiresAt: null,
        };

        await addDoc(collection(clientDb, "letterNotifications"), reminderNotification);
        await updateDoc(doc(clientDb, "letterProofs", proofId), {
          reminderSentAt: new Date().toISOString(),
        });

        results.reminder3Days++;
      }

      // 7일 경과: 관리자에게 알림
      if (daysPassed >= 7 && !letterData.adminNotifiedAt) {
        console.log("⚠️ 7일 경과 - 관리자 알림 발송");

        const adminNotification = {
          type: "verification_delay",
          matchId: letterData.matchId,
          proofId: proofId,
          userId: letterData.receiverId,
          title: "📮 편지 인증 지연",
          message: `${letterData.receiverChildName}님이 ${letterData.senderChildName}님의 편지(Step ${letterData.stepNumber})를 7일째 인증하지 않고 있습니다.`,
          priority: "medium",
          status: "pending",
          link: `/admin/penpal/disputes/${proofId}`,
          createdAt: new Date().toISOString(),
          resolvedAt: null,
          resolvedBy: null,
        };

        await addDoc(collection(clientDb, "adminNotifications"), adminNotification);
        await updateDoc(doc(clientDb, "letterProofs", proofId), {
          adminNotifiedAt: new Date().toISOString(),
        });

        results.adminNotify7Days++;
      }

      // 10일 경과: 자동 인증 (패널티)
      if (daysPassed >= 10 && letterData.status === "sent") {
        console.log("🤖 10일 경과 - 자동 인증 처리");

        await updateDoc(doc(clientDb, "letterProofs", proofId), {
          status: "auto_verified",
          autoVerifiedAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        });

        // 미션 진행도 업데이트
        const missionRef = doc(clientDb, "letterMissions", letterData.matchId);
        const missionDoc = await getDocs(query(collection(clientDb, "letterMissions"), where("__name__", "==", letterData.matchId)));
        
        if (!missionDoc.empty) {
          const missionData = missionDoc.docs[0].data();
          const newCurrentStep = letterData.stepNumber;
          const newCompletedSteps = [...missionData.completedSteps];
          newCompletedSteps[letterData.stepNumber - 1] = true;

          await updateDoc(missionRef, {
            currentStep: newCurrentStep,
            completedSteps: newCompletedSteps,
            updatedAt: new Date().toISOString(),
          });
        }

        // 받는 사람에게 패널티 경고 알림
        const penaltyNotification = {
          userId: letterData.receiverId,
          matchId: letterData.matchId,
          proofId: proofId,
          type: "verification_reminder",
          title: "⚠️ 자동 인증 처리",
          message: `편지를 10일 동안 인증하지 않아 자동으로 인증 처리되었습니다. 다음에는 빨리 인증해주세요! 😢`,
          link: `/penpal/mission/${letterData.matchId}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          expiresAt: null,
        };

        await addDoc(collection(clientDb, "letterNotifications"), penaltyNotification);

        // TODO: 평판 시스템에 패널티 기록 추가
        // - 3회 이상 자동 인증 시 관리자 개입

        results.autoVerify10Days++;
      }
    }

    console.log("✅ 편지 인증 확인 작업 완료:", results);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 편지 인증 확인 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "작업 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// Vercel Cron Job용 GET 핸들러
export async function GET(request: NextRequest) {
  // Cron Secret 검증 (선택적)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // POST 핸들러 재사용
  return POST(request);
}

