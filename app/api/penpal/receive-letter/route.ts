import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db as clientDb } from "@/lib/firebase";
import firebaseApp from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    console.log("📬 편지 수령 인증 API 시작");

    // FormData 파싱
    const formData = await request.formData();
    const proofId = formData.get("proofId") as string;
    const receiverId = formData.get("receiverId") as string;
    const image = formData.get("image") as File;

    // 입력 검증
    if (!proofId || !receiverId || !image) {
      console.error("❌ 필수 필드 누락:", { proofId, receiverId, hasImage: !!image });
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

    // 3. 이미 인증되었는지 확인
    if (proofData.status === "received" || proofData.status === "auto_verified") {
      return NextResponse.json(
        { success: false, error: "이미 인증된 편지입니다." },
        { status: 400 }
      );
    }

    // 4. 이미지 업로드 (Firebase Storage)
    console.log("📸 수령 이미지 업로드 중...");
    
    if (!firebaseApp) {
      throw new Error("Firebase app not initialized");
    }
    
    const storage = getStorage(firebaseApp);
    const imageBuffer = await image.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: image.type });
    const imagePath = `penpal/letters/${proofData.matchId}/step${proofData.stepNumber}_received_${Date.now()}.jpg`;
    const imageRef = ref(storage, imagePath);
    
    await uploadBytes(imageRef, imageBlob);
    const imageUrl = await getDownloadURL(imageRef);
    console.log("✅ 수령 이미지 업로드 완료:", imageUrl);

    // 5. LetterProof 업데이트 (수령 완료)
    await updateDoc(proofRef, {
      receiverImageUrl: imageUrl,
      receiverUploadedAt: new Date().toISOString(),
      status: "received",
      verifiedAt: new Date().toISOString(),
    });

    console.log("✅ 편지 수령 인증 완료");

    // 6. 미션 진행도 업데이트
    const missionRef = doc(clientDb, "letterMissions", proofData.matchId);
    const missionDoc = await getDoc(missionRef);

    if (missionDoc.exists()) {
      const missionData = missionDoc.data();
      const newCurrentStep = proofData.stepNumber;
      const newCompletedSteps = [...missionData.completedSteps];
      newCompletedSteps[proofData.stepNumber - 1] = true;

      const isCompleted = newCurrentStep >= missionData.totalSteps;

      await updateDoc(missionRef, {
        currentStep: newCurrentStep,
        completedSteps: newCompletedSteps,
        isCompleted: isCompleted,
        updatedAt: new Date().toISOString(),
        ...(isCompleted && { completedAt: new Date().toISOString() }),
      });

      console.log(`✅ 미션 진행도 업데이트: ${newCurrentStep}/${missionData.totalSteps}`);
    }

    // 7. 보낸 사람에게 알림 발송
    const senderNotificationData = {
      userId: proofData.senderId,
      matchId: proofData.matchId,
      proofId: proofId,
      type: "letter_received",
      title: "🎉 편지가 도착했어요!",
      message: `${proofData.receiverChildName}님이 편지를 받고 인증했어요! ${proofData.receiverChildName} 캐릭터 도장이 찍혔습니다 🎊`,
      link: `/penpal/mission/${proofData.matchId}`,
      isRead: false,
      createdAt: new Date().toISOString(),
      expiresAt: null,
    };

    await addDoc(collection(clientDb, "letterNotifications"), senderNotificationData);
    console.log("✅ 발신자 알림 발송 완료");

    return NextResponse.json({
      success: true,
      data: {
        proofId: proofId,
        stepNumber: proofData.stepNumber,
        message: "편지 수령 인증이 완료되었습니다! 🎉 도장이 찍혔어요!",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 편지 수령 인증 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "편지 수령 인증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

