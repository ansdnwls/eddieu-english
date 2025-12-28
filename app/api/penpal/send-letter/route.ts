import { NextRequest, NextResponse } from "next/server";
import { getFirestore, doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db as clientDb } from "@/lib/firebase";
import firebaseApp from "@/lib/firebase";
import { checkPenpalFeature } from "@/lib/apiFeatureFlags";

export async function POST(request: NextRequest) {
  // Feature Flag 확인
  const featureCheck = checkPenpalFeature();
  if (!featureCheck.allowed) {
    return featureCheck.response!;
  }

  try {
    console.log("📮 편지 발송 API 시작");

    // FormData 파싱
    const formData = await request.formData();
    const matchId = formData.get("matchId") as string;
    const senderId = formData.get("senderId") as string;
    const image = formData.get("image") as File;

    // 입력 검증
    if (!matchId || !senderId || !image) {
      console.error("❌ 필수 필드 누락:", { matchId, senderId, hasImage: !!image });
      return NextResponse.json(
        { success: false, error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!clientDb) {
      throw new Error("Firestore not initialized");
    }

    // 1. 미션 정보 조회
    const missionRef = doc(clientDb, "letterMissions", matchId);
    const missionDoc = await getDoc(missionRef);

    if (!missionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "미션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const missionData = missionDoc.data();
    const isUser1 = missionData.user1Id === senderId;

    if (!isUser1 && missionData.user2Id !== senderId) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // 2. 다음 스텝 번호 계산
    const nextStep = missionData.currentStep + 1;

    if (nextStep > missionData.totalSteps) {
      return NextResponse.json(
        { success: false, error: "이미 모든 미션을 완료했습니다." },
        { status: 400 }
      );
    }

    // 3. 이미지 업로드 (Firebase Storage)
    console.log("📸 이미지 업로드 중...");
    
    if (!firebaseApp) {
      throw new Error("Firebase app not initialized");
    }
    
    const storage = getStorage(firebaseApp);
    const imageBuffer = await image.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: image.type });
    const imagePath = `penpal/letters/${matchId}/step${nextStep}_sent_${Date.now()}.jpg`;
    const imageRef = ref(storage, imagePath);
    
    await uploadBytes(imageRef, imageBlob);
    const imageUrl = await getDownloadURL(imageRef);
    console.log("✅ 이미지 업로드 완료:", imageUrl);

    // 4. 받는 사람 정보
    const receiverId = isUser1 ? missionData.user2Id : missionData.user1Id;
    const receiverChildName = isUser1 ? missionData.user2ChildName : missionData.user1ChildName;
    const senderChildName = isUser1 ? missionData.user1ChildName : missionData.user2ChildName;

    // 5. LetterProof 생성 (발송 단계)
    const letterProofData = {
      missionId: matchId,
      matchId: matchId,
      stepNumber: nextStep,
      senderId: senderId,
      senderChildName: senderChildName,
      senderImageUrl: imageUrl,
      senderUploadedAt: new Date().toISOString(),
      receiverId: receiverId,
      receiverChildName: receiverChildName,
      receiverImageUrl: null,
      receiverUploadedAt: null,
      status: "sent",
      autoVerifiedAt: null,
      isDisputed: false,
      disputeReason: null,
      disputedAt: null,
      reminderSentAt: null,
      adminNotifiedAt: null,
      verifiedAt: null,
      createdAt: new Date().toISOString(),
    };

    const letterProofRef = await addDoc(
      collection(clientDb, "letterProofs"),
      letterProofData
    );

    console.log("✅ LetterProof 생성 완료:", letterProofRef.id);

    // 6. 받는 사람에게 알림 발송
    const notificationData = {
      userId: receiverId,
      matchId: matchId,
      proofId: letterProofRef.id,
      type: "letter_sent",
      title: "📬 새 편지가 도착했어요!",
      message: `${senderChildName}님이 편지를 보냈어요! 편지가 도착하면 사진을 찍어서 인증해주세요.`,
      link: `/penpal/mission/${matchId}`,
      isRead: false,
      createdAt: new Date().toISOString(),
      expiresAt: null,
    };

    await addDoc(collection(clientDb, "letterNotifications"), notificationData);
    console.log("✅ 수신자 알림 발송 완료");

    return NextResponse.json({
      success: true,
      data: {
        proofId: letterProofRef.id,
        stepNumber: nextStep,
        message: "편지 발송이 완료되었습니다! 상대방이 받으면 인증해줄 거예요.",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 편지 발송 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "편지 발송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

