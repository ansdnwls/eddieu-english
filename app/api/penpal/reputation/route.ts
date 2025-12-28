import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { UserPenpalReputation } from "@/app/types";
import { checkPenpalFeature } from "@/lib/apiFeatureFlags";

export async function GET(request: NextRequest) {
  // Feature Flag 확인
  const featureCheck = checkPenpalFeature();
  if (!featureCheck.allowed) {
    return featureCheck.response!;
  }

  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log("📊 Fetching reputation for user:", userId);

    // 신뢰도 정보 조회
    const reputationRef = doc(db, "userPenpalReputations", userId);
    const reputationDoc = await getDoc(reputationRef);

    if (reputationDoc.exists()) {
      const reputation = {
        id: reputationDoc.id,
        ...reputationDoc.data(),
      } as unknown as UserPenpalReputation;

      return NextResponse.json({
        success: true,
        data: reputation,
      });
    }

    // 신뢰도 정보가 없으면 초기화
    const initialReputation: UserPenpalReputation = {
      userId,
      totalMatches: 0,
      completedMatches: 0,
      cancelledByUser: 0,
      cancelledByPartner: 0,
      reputationScore: 100, // 초기 점수 100
      penalties: [],
      lastUpdated: new Date().toISOString(),
    };

    await setDoc(reputationRef, initialReputation);

    console.log("✅ Initialized reputation for user:", userId);

    return NextResponse.json({
      success: true,
      data: initialReputation,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Error fetching reputation:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch reputation" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Feature Flag 확인
  const featureCheck = checkPenpalFeature();
  if (!featureCheck.allowed) {
    return featureCheck.response!;
  }

  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userId, action, points, reason, matchId } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("📊 Updating reputation:", { userId, action, points });

    // 현재 신뢰도 정보 조회
    const reputationRef = doc(db, "userPenpalReputations", userId);
    const reputationDoc = await getDoc(reputationRef);

    let reputation: UserPenpalReputation;

    if (reputationDoc.exists()) {
      reputation = reputationDoc.data() as UserPenpalReputation;
    } else {
      // 초기화
      reputation = {
        userId,
        totalMatches: 0,
        completedMatches: 0,
        cancelledByUser: 0,
        cancelledByPartner: 0,
        reputationScore: 100,
        penalties: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    // 액션에 따른 업데이트
    switch (action) {
      case "match_created":
        reputation.totalMatches += 1;
        break;

      case "match_completed":
        reputation.completedMatches += 1;
        reputation.reputationScore = Math.min(100, reputation.reputationScore + 5); // 완료 시 +5점 (최대 100)
        break;

      case "cancel_by_user":
        reputation.cancelledByUser += 1;
        reputation.reputationScore = Math.max(0, reputation.reputationScore - (points || 10)); // 취소 시 -10점 (최소 0)
        
        // 패널티 기록 추가
        reputation.penalties.push({
          id: `penalty_${Date.now()}`,
          type: "cancel_request",
          severity: "medium",
          points: points || 10,
          reason: reason || "펜팔 취소",
          createdAt: new Date().toISOString(),
          matchId,
        });
        break;

      case "cancel_by_partner":
        reputation.cancelledByPartner += 1;
        // 상대방이 취소한 경우는 점수 감점 없음
        break;

      case "late_response":
        reputation.reputationScore = Math.max(0, reputation.reputationScore - 3); // 늦은 응답 -3점
        
        reputation.penalties.push({
          id: `penalty_${Date.now()}`,
          type: "late_response",
          severity: "low",
          points: 3,
          reason: reason || "답장 지연",
          createdAt: new Date().toISOString(),
          matchId,
        });
        break;

      case "no_address":
        reputation.reputationScore = Math.max(0, reputation.reputationScore - 5); // 주소 미제출 -5점
        
        reputation.penalties.push({
          id: `penalty_${Date.now()}`,
          type: "no_address",
          severity: "medium",
          points: 5,
          reason: reason || "주소 미제출",
          createdAt: new Date().toISOString(),
          matchId,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }

    reputation.lastUpdated = new Date().toISOString();

    // 업데이트
    await setDoc(reputationRef, reputation);

    console.log("✅ Reputation updated:", {
      score: reputation.reputationScore,
      totalMatches: reputation.totalMatches,
      completed: reputation.completedMatches,
      cancelledByUser: reputation.cancelledByUser,
    });

    return NextResponse.json({
      success: true,
      data: reputation,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Error updating reputation:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update reputation" },
      { status: 500 }
    );
  }
}

