import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, missionId } = body;

    // 입력 검증
    if (!userId || !missionId) {
      return NextResponse.json(
        { success: false, error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not initialized" },
        { status: 500 }
      );
    }

    // 미션 확인
    const missionDoc = await getDoc(doc(db, "letterMissions", missionId));
    if (!missionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "미션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const missionData = missionDoc.data();

    // 미션 완료 확인
    if (!missionData.isCompleted) {
      return NextResponse.json(
        { success: false, error: "미션이 완료되지 않았습니다." },
        { status: 400 }
      );
    }

    // 이미 보상 받았는지 확인
    if (missionData.rewardClaimed) {
      return NextResponse.json(
        { success: false, error: "이미 포인트를 받았습니다." },
        { status: 400 }
      );
    }

    // 권한 확인 (해당 미션의 참가자인지)
    if (missionData.user1Id !== userId && missionData.user2Id !== userId) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // 포인트 지급
    const REWARD_AMOUNT = 4800;
    const pointsRef = doc(db, "userPoints", userId);
    const pointsDoc = await getDoc(pointsRef);

    const newHistory = {
      id: `${Date.now()}_${missionId}`,
      type: "earn" as const,
      amount: REWARD_AMOUNT,
      reason: "펜팔 미션 20단계 완료",
      relatedId: missionId,
      createdAt: new Date().toISOString(),
    };

    if (!pointsDoc.exists()) {
      // 새 포인트 문서 생성
      await setDoc(pointsRef, {
        userId: userId,
        totalPoints: REWARD_AMOUNT,
        earnedPoints: REWARD_AMOUNT,
        spentPoints: 0,
        history: [newHistory],
        updatedAt: new Date().toISOString(),
      });
    } else {
      // 기존 포인트 업데이트
      const currentData = pointsDoc.data();
      await updateDoc(pointsRef, {
        totalPoints: (currentData.totalPoints || 0) + REWARD_AMOUNT,
        earnedPoints: (currentData.earnedPoints || 0) + REWARD_AMOUNT,
        history: [...(currentData.history || []), newHistory],
        updatedAt: new Date().toISOString(),
      });
    }

    // 미션 보상 수령 상태 업데이트
    await updateDoc(doc(db, "letterMissions", missionId), {
      rewardClaimed: true,
      rewardClaimedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ 포인트 지급 완료: ${userId}에게 ${REWARD_AMOUNT} 포인트`);

    return NextResponse.json({
      success: true,
      data: {
        pointsAwarded: REWARD_AMOUNT,
        newTotal: pointsDoc.exists()
          ? pointsDoc.data().totalPoints + REWARD_AMOUNT
          : REWARD_AMOUNT,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 포인트 지급 에러:", err);
    return NextResponse.json(
      { success: false, error: err.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}


