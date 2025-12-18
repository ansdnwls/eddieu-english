import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db as clientDb } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    console.log("⚠️ 편지 미도착 신고 API 시작");

    const body = await request.json();
    const { proofId, receiverId, reason } = body;

    // 입력 검증
    if (!proofId || !receiverId || !reason) {
      console.error("❌ 필수 필드 누락:", { proofId, receiverId, reason });
      return NextResponse.json(
        { success: false, error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!clientDb) {
      throw new Error("Firestore not initialized");
    }

    // 1. LetterProof 조회
    const proofRef = doc(clientDb, "letterProofs", proofId);
    const proofDoc = await getDoc(proofRef);

    if (!proofDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "편지 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const proofData = proofDoc.data();

    // 2. 권한 확인
    if (proofData.receiverId !== receiverId) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // 3. 발송 후 2주(14일) 경과 확인
    const sentDate = new Date(proofData.senderUploadedAt);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysPassed < 14) {
      return NextResponse.json(
        { 
          success: false, 
          error: `편지가 발송된 지 ${daysPassed}일이 지났습니다. 2주(14일) 후에 신고할 수 있습니다.` 
        },
        { status: 400 }
      );
    }

    // 4. LetterProof 업데이트 (분쟁 상태)
    await updateDoc(proofRef, {
      isDisputed: true,
      disputeReason: reason,
      disputedAt: new Date().toISOString(),
      status: "disputed",
    });

    console.log("✅ 편지 미도착 신고 등록 완료");

    // 5. 관리자 알림 생성
    const adminNotificationData = {
      type: "letter_dispute",
      matchId: proofData.matchId,
      proofId: proofId,
      userId: receiverId,
      title: "📮 편지 미도착 신고",
      message: `${proofData.receiverChildName}님이 ${proofData.senderChildName}님의 편지(Step ${proofData.stepNumber})가 도착하지 않았다고 신고했습니다. 사유: ${reason}`,
      priority: "high",
      status: "pending",
      link: `/admin/penpal/disputes/${proofId}`,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
    };

    await addDoc(collection(clientDb, "adminNotifications"), adminNotificationData);
    console.log("✅ 관리자 알림 생성 완료");

    // 6. 발신자에게 알림
    const senderNotificationData = {
      userId: proofData.senderId,
      matchId: proofData.matchId,
      proofId: proofId,
      type: "letter_not_arrived",
      title: "⚠️ 편지 미도착 신고",
      message: `${proofData.receiverChildName}님이 편지가 도착하지 않았다고 신고했습니다. 관리자가 확인 중이에요.`,
      link: `/penpal/mission/${proofData.matchId}`,
      isRead: false,
      createdAt: new Date().toISOString(),
      expiresAt: null,
    };

    await addDoc(collection(clientDb, "letterNotifications"), senderNotificationData);

    return NextResponse.json({
      success: true,
      data: {
        message: "신고가 접수되었습니다. 관리자가 확인 후 처리해드릴게요.",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 편지 미도착 신고 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "신고 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

