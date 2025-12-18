import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

interface RequestBody {
  matchId: string;
  requesterId: string;
  requesterChildName: string;
  partnerId: string;
  partnerChildName: string;
  reason: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const body: RequestBody = await request.json();
    const {
      matchId,
      requesterId,
      requesterChildName,
      partnerId,
      partnerChildName,
      reason,
    } = body;

    if (!matchId || !requesterId || !partnerId || !reason) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("⚠️ Cancel request received:");
    console.log("Match ID:", matchId);
    console.log("Requester:", requesterChildName);
    console.log("Partner:", partnerChildName);
    console.log("Reason:", reason);

    // 매칭 정보 확인
    const matchRef = doc(db, "penpalMatches", matchId);
    const matchDoc = await getDoc(matchRef);

    if (!matchDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    const matchData = matchDoc.data();

    // 이미 취소된 매칭인지 확인
    if (matchData.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "This match is already cancelled" },
        { status: 400 }
      );
    }

    // 취소 요청 생성
    const cancelRequest = {
      matchId,
      requesterId,
      requesterChildName,
      partnerId,
      partnerChildName,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cancelRequestDoc = await addDoc(
      collection(db, "penpalCancelRequests"),
      cancelRequest
    );

    console.log("✅ Cancel request created:", cancelRequestDoc.id);

    // 패널티 기록 생성 (임시 - 관리자 승인 후 확정)
    // 취소 사유가 정당한지는 관리자가 판단
    const penaltyRecord = {
      userId: requesterId,
      type: "cancel_request",
      severity: "medium", // 기본값, 관리자가 조정 가능
      points: 10, // 기본 감점 (관리자가 조정 가능)
      reason: `펜팔 취소 요청: ${reason}`,
      matchId,
      status: "pending", // 관리자 승인 후 confirmed
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "penaltyRecords"), penaltyRecord);

    // 신뢰도 점수 업데이트는 관리자 승인 후 처리
    // (패널티 시스템에서 처리)

    return NextResponse.json({
      success: true,
      data: {
        cancelRequestId: cancelRequestDoc.id,
        message: "Cancel request submitted successfully",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Error creating cancel request:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create cancel request" },
      { status: 500 }
    );
  }
}

