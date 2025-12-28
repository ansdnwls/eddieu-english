import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { checkPenpalFeature } from "@/lib/apiFeatureFlags";

interface NotifyUser {
  userId: string;
  childName: string;
  submitted: boolean;
}

interface RequestBody {
  matchId: string;
  usersToNotify: NotifyUser[];
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

    const firestoreDb = db as NonNullable<typeof db>;

    const body: RequestBody = await request.json();
    const { matchId, usersToNotify } = body;

    if (!matchId || !usersToNotify || usersToNotify.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log("📮 Sending address reminders...");
    console.log("Match ID:", matchId);
    console.log("Users to notify:", usersToNotify.length);

    // 24시간 후 만료 시간 계산
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const notificationPromises = usersToNotify
      .filter(u => !u.submitted)
      .map(async (notifyUser) => {
        const partnerUser = usersToNotify.find(u => u.userId !== notifyUser.userId);
        
        const notification = {
          userId: notifyUser.userId,
          matchId,
          partnerName: partnerUser?.childName || "펜팔 친구",
          message: `${partnerUser?.childName || "펜팔 친구"}와의 영어 펜팔을 시작하려면 주소를 입력해주세요! 📮`,
          type: "address_reminder",
          isRead: false,
          createdAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        };

        return addDoc(collection(firestoreDb, "addressNotifications"), notification);
      });

    const results = await Promise.all(notificationPromises);

    console.log("✅ Address reminders sent:", results.length);

    return NextResponse.json({
      success: true,
      data: {
        notificationCount: results.length,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ Error sending address reminder:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to send reminders" },
      { status: 500 }
    );
  }
}

