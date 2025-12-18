"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, orderBy, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase";
import firebaseApp from "@/lib/firebase";
import { LetterMission, LetterProof, PenpalMatch, PenpalProfile, CharacterStamp } from "@/app/types";
import { StampDisplay } from "@/app/components/CharacterStampSelector";
import Link from "next/link";

interface MissionContentProps {
  matchId: string;
}

export default function MissionContent({ matchId }: MissionContentProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mission, setMission] = useState<LetterMission | null>(null);
  const [match, setMatch] = useState<PenpalMatch | null>(null);
  const [proofs, setProofs] = useState<LetterProof[]>([]);
  const [sendingLetter, setSendingLetter] = useState(false);
  const [receivingLetter, setReceivingLetter] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedProofForReceive, setSelectedProofForReceive] = useState<LetterProof | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [user1Stamp, setUser1Stamp] = useState<CharacterStamp>("🦁");
  const [user2Stamp, setUser2Stamp] = useState<CharacterStamp>("🐰");

  useEffect(() => {
    loadMissionData();
  }, [matchId, user]);

  const loadMissionData = async () => {
    if (!db || !user) return;

    try {
      console.log("📬 미션 데이터 로딩...");

      // 1. 미션 정보
      const missionDoc = await getDoc(doc(db, "letterMissions", matchId));
      if (missionDoc.exists()) {
        const missionData = missionDoc.data();
        setMission({ id: missionDoc.id, ...missionData } as LetterMission);

        // 2. 펜팔 프로필에서 캐릭터 도장 가져오기
        try {
          // User1 프로필
          const user1ProfileQuery = query(
            collection(db, "penpalProfiles"),
            where("userId", "==", missionData.user1Id)
          );
          const user1ProfileSnapshot = await getDocs(user1ProfileQuery);
          if (!user1ProfileSnapshot.empty) {
            const user1Profile = user1ProfileSnapshot.docs[0].data() as PenpalProfile;
            if (user1Profile.characterStamp) {
              setUser1Stamp(user1Profile.characterStamp);
            }
          }

          // User2 프로필
          const user2ProfileQuery = query(
            collection(db, "penpalProfiles"),
            where("userId", "==", missionData.user2Id)
          );
          const user2ProfileSnapshot = await getDocs(user2ProfileQuery);
          if (!user2ProfileSnapshot.empty) {
            const user2Profile = user2ProfileSnapshot.docs[0].data() as PenpalProfile;
            if (user2Profile.characterStamp) {
              setUser2Stamp(user2Profile.characterStamp);
            }
          }
        } catch (err) {
          console.warn("⚠️ 캐릭터 도장 로딩 실패 (기본값 사용):", err);
        }
      }

      // 3. 매칭 정보
      const matchDoc = await getDoc(doc(db, "penpalMatches", matchId));
      if (matchDoc.exists()) {
        setMatch({ id: matchDoc.id, ...matchDoc.data() } as PenpalMatch);
      }

      // 4. 편지 인증 목록
      const proofsQuery = query(
        collection(db, "letterProofs"),
        where("matchId", "==", matchId),
        orderBy("stepNumber", "asc")
      );
      const proofsSnapshot = await getDocs(proofsQuery);
      const proofsList: LetterProof[] = [];
      
      proofsSnapshot.forEach((doc) => {
        proofsList.push({ id: doc.id, ...doc.data() } as LetterProof);
      });

      setProofs(proofsList);
      console.log("✅ 미션 데이터 로딩 완료");
    } catch (error) {
      console.error("❌ 미션 데이터 로딩 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendLetter = async () => {
    if (!selectedImage || !user || !mission || !db || !selectedStep) return;

    setSendingLetter(true);

    try {
      console.log("📮 편지 발송 시작...");

      // 1. 선택된 스텝 번호 사용
      const nextStep = selectedStep;

      if (nextStep > mission.totalSteps) {
        throw new Error("이미 모든 미션을 완료했습니다.");
      }

      // 2. 이미지 업로드 (클라이언트에서 직접)
      console.log("📸 이미지 업로드 중...");
      if (!firebaseApp) {
        throw new Error("Firebase app not initialized");
      }

      const storage = getStorage(firebaseApp);
      const imagePath = `penpal/letters/${matchId}/step${nextStep}_sent_${Date.now()}.jpg`;
      const imageRef = ref(storage, imagePath);
      
      await uploadBytes(imageRef, selectedImage);
      const imageUrl = await getDownloadURL(imageRef);
      console.log("✅ 이미지 업로드 완료:", imageUrl);

      // 3. 받는 사람 정보
      const isUser1 = mission.user1Id === user.uid;
      const receiverId = isUser1 ? mission.user2Id : mission.user1Id;
      const receiverChildName = isUser1 ? mission.user2ChildName : mission.user1ChildName;
      const senderChildName = isUser1 ? mission.user1ChildName : mission.user2ChildName;

      // 4. LetterProof 생성
      const letterProofData = {
        missionId: matchId,
        matchId: matchId,
        stepNumber: nextStep,
        senderId: user.uid,
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
        collection(db, "letterProofs"),
        letterProofData
      );

      console.log("✅ LetterProof 생성 완료:", letterProofRef.id);

      // 5. 받는 사람에게 알림 발송
      await addDoc(collection(db, "letterNotifications"), {
        userId: receiverId,
        matchId: matchId,
        proofId: letterProofRef.id,
        type: "letter_sent",
        title: "📬 편지가 발송되었어요!",
        message: `${senderChildName}님이 편지를 보냈어요! 받은 편지를 찍어서 인증하면 도장이 찍혀요! 🎉`,
        link: `/penpal/mission/${matchId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        expiresAt: null,
      });

      console.log("✅ 수신자 알림 발송 완료");

      alert("✅ 편지를 보냈습니다! 상대방이 받으면 도장이 찍혀요.");
      setSelectedImage(null);
      setSelectedStep(null);
      loadMissionData();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ 편지 발송 오류:", err);
      alert(`편지 발송 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setSendingLetter(false);
    }
  };

  const handleReceiveLetter = async () => {
    if (!selectedImage || !user || !selectedProofForReceive || !db || !mission) return;

    setReceivingLetter(true);

    try {
      console.log("📬 편지 수령 인증 시작...");

      // 1. 권한 확인
      if (selectedProofForReceive.receiverId !== user.uid) {
        throw new Error("권한이 없습니다.");
      }

      // 2. 이미 인증되었는지 확인
      if (selectedProofForReceive.status === "received" || selectedProofForReceive.status === "auto_verified") {
        throw new Error("이미 인증된 편지입니다.");
      }

      // 3. 이미지 업로드 (클라이언트에서 직접)
      console.log("📸 수령 이미지 업로드 중...");
      if (!firebaseApp) {
        throw new Error("Firebase app not initialized");
      }

      const storage = getStorage(firebaseApp);
      const imagePath = `penpal/letters/${selectedProofForReceive.matchId}/step${selectedProofForReceive.stepNumber}_received_${Date.now()}.jpg`;
      const imageRef = ref(storage, imagePath);
      
      await uploadBytes(imageRef, selectedImage);
      const imageUrl = await getDownloadURL(imageRef);
      console.log("✅ 수령 이미지 업로드 완료:", imageUrl);

      // 4. LetterProof 업데이트
      const proofRef = doc(db, "letterProofs", selectedProofForReceive.id);
      await updateDoc(proofRef, {
        receiverImageUrl: imageUrl,
        receiverUploadedAt: new Date().toISOString(),
        status: "received",
        verifiedAt: new Date().toISOString(),
      });

      console.log("✅ 편지 수령 인증 완료");

      // 5. 미션 진행도 업데이트
      const missionRef = doc(db, "letterMissions", selectedProofForReceive.matchId);
      const missionDoc = await getDoc(missionRef);

      if (missionDoc.exists()) {
        const missionData = missionDoc.data();
        const newCurrentStep = selectedProofForReceive.stepNumber;
        const newCompletedSteps = [...missionData.completedSteps];
        newCompletedSteps[selectedProofForReceive.stepNumber - 1] = true;

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

      // 6. 보낸 사람에게 알림 발송
      await addDoc(collection(db, "letterNotifications"), {
        userId: selectedProofForReceive.senderId,
        matchId: selectedProofForReceive.matchId,
        proofId: selectedProofForReceive.id,
        type: "letter_received",
        title: "🎉 편지가 도착했어요!",
        message: `${selectedProofForReceive.receiverChildName}님이 편지를 받고 인증했어요! ${selectedProofForReceive.receiverChildName} 캐릭터 도장이 찍혔습니다 🎊`,
        link: `/penpal/mission/${selectedProofForReceive.matchId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        expiresAt: null,
      });

      console.log("✅ 발신자 알림 발송 완료");

      alert("🎉 편지 수령 인증이 완료되었습니다! 도장이 찍혔어요!");
      setSelectedImage(null);
      setSelectedProofForReceive(null);
      setSelectedStep(null);
      loadMissionData();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("❌ 편지 수령 인증 오류:", err);
      alert(`편지 수령 인증 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setReceivingLetter(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">미션 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!mission || !match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            미션을 찾을 수 없습니다
          </h2>
          <Link
            href="/penpal/manage"
            className="inline-block mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
          >
            ← 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const isUser1 = mission.user1Id === user?.uid;
  const myChildName = isUser1 ? mission.user1ChildName : mission.user2ChildName;
  const partnerChildName = isUser1 ? mission.user2ChildName : mission.user1ChildName;

  // 내가 받아야 할 편지 (sent 상태) - 받는 사람이 인증해야 함
  const pendingReceiveProofs = proofs.filter(
    (proof) => proof.receiverId === user?.uid && proof.status === "sent"
  );

  // 다음 순서가 내 차례인지 확인 (받아야 할 편지가 없을 때만 발송 가능)
  const nextStep = mission.currentStep + 1;
  const canSendLetter = pendingReceiveProofs.length === 0 && !mission.isCompleted;
  const isMyTurnToSend = canSendLetter && ((nextStep % 2 === 1 && isUser1) || (nextStep % 2 === 0 && !isUser1));

  // 각 스텝의 상태 확인 함수
  const getStepStatus = (step: number) => {
    const proof = proofs.find((p) => p.stepNumber === step);
    if (!proof) {
      // 아직 편지가 없는 경우
      const isMyTurn = ((step % 2 === 1 && isUser1) || (step % 2 === 0 && !isUser1));
      return { type: "pending", isMyTurn, proof: null };
    }
    
    if (proof.status === "received" || proof.status === "auto_verified") {
      return { type: "completed", isMyTurn: false, proof };
    }
    
    if (proof.status === "sent" && proof.receiverId === user?.uid) {
      return { type: "waiting_receive", isMyTurn: true, proof };
    }
    
    return { type: "sent", isMyTurn: false, proof };
  };

  // 스텝 클릭 핸들러
  const handleStepClick = (step: number) => {
    const stepStatus = getStepStatus(step);
    
    if (stepStatus.type === "completed") {
      return; // 완료된 스텝은 클릭 불가
    }
    
    if (stepStatus.type === "waiting_receive") {
      // 받은 편지 인증
      setSelectedProofForReceive(stepStatus.proof!);
      setSelectedImage(null);
      return;
    }
    
    if (stepStatus.type === "pending" && stepStatus.isMyTurn) {
      // 편지 발송
      setSelectedStep(step);
      setSelectedImage(null);
      return;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl shadow-xl p-6 mb-6 ${
          mission.isCompleted
            ? "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700"
            : "bg-white dark:bg-gray-800"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{user1Stamp}</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {myChildName}
            </h2>
            <span className="text-2xl">↔️</span>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {partnerChildName}
            </h2>
            <div className="text-4xl">{user2Stamp}</div>
          </div>
          <span className={`px-4 py-2 rounded-full font-semibold text-lg ${
            mission.isCompleted
              ? "bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200"
              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          }`}>
            {mission.currentStep} / {mission.totalSteps}
          </span>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(mission.currentStep / mission.totalSteps) * 100}%` }}
            transition={{ duration: 0.5 }}
            className={`h-4 rounded-full ${
              mission.isCompleted
                ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                : "bg-gradient-to-r from-blue-500 to-purple-500"
            }`}
          />
        </div>

        {mission.isCompleted ? (
          <div className="text-center py-4">
            <div className="text-6xl mb-3">🎉</div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              축하합니다! 10회 미션 완료!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              두 분 모두 정말 대단해요! 10통의 영어 편지를 주고받았어요! 💌
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-semibold">
                ✅ 미션 완료
              </span>
              <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg font-semibold">
                🎁 보상 획득 가능
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {pendingReceiveProofs.length > 0 ? (
              <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                📬 편지를 받으면 받은 편지를 찍어 인증하세요!
              </p>
            ) : isMyTurnToSend ? (
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                ✏️ {myChildName}님이 편지를 보낼 차례에요!
              </p>
            ) : (
              <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                ⏳ {partnerChildName}님이 편지를 보낼 차례에요!
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* 편지 발송 모달 */}
      {selectedStep && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedStep(null);
            setSelectedImage(null);
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              📮 편지 보내기 - Step {selectedStep}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              편지를 써서 사진을 찍어서 업로드해주세요!
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg mb-4"
            />

            {selectedImage && (
              <button
                onClick={handleSendLetter}
                disabled={sendingLetter}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
              >
                {sendingLetter ? "보내는 중..." : "✉️ 편지 보내기"}
              </button>
            )}

            <button
              onClick={() => {
                setSelectedStep(null);
                setSelectedImage(null);
              }}
              className="w-full mt-3 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              취소
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* 편지 수령 인증 모달 */}
      {selectedProofForReceive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedProofForReceive(null);
            setSelectedImage(null);
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              📸 받은 편지 인증하기 - Step {selectedProofForReceive.stepNumber}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              실제로 받은 편지 사진을 찍어서 업로드해주세요!
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg mb-4"
            />

            {selectedImage && (
              <button
                onClick={handleReceiveLetter}
                disabled={receivingLetter}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
              >
                {receivingLetter ? "인증 중..." : "✅ 인증하기"}
              </button>
            )}

            <button
              onClick={() => {
                setSelectedProofForReceive(null);
                setSelectedImage(null);
              }}
              className="w-full mt-3 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              취소
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* 미션 진행 현황 - 10개씩 2줄 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center">
          🎯 미션 진행 현황
        </h3>
        
        {pendingReceiveProofs.length > 0 && (
          <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl">
            <p className="text-center text-orange-700 dark:text-orange-300 font-semibold">
              📬 편지를 받으면 받은 편지를 찍어 인증하세요!
            </p>
          </div>
        )}
        
        {/* 10개씩 2줄 그리드 */}
        <div className="space-y-4">
          {/* 첫 번째 줄 (1-10) */}
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }).map((_, index) => {
              const step = index + 1;
              const stepStatus = getStepStatus(step);
              const proof = stepStatus.proof;
              const stamp = proof && mission && (proof.status === "received" || proof.status === "auto_verified")
                ? proof.senderId === mission.user1Id
                  ? user1Stamp
                  : user2Stamp
                : null;
              
              return (
                <motion.button
                  key={step}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleStepClick(step)}
                  disabled={stepStatus.type === "completed"}
                  className={`
                    aspect-square rounded-full flex flex-col items-center justify-center
                    border-2 transition-all font-bold relative
                    ${
                      stepStatus.type === "completed" && stamp
                        ? "bg-green-500 border-green-600 text-white shadow-lg cursor-default"
                        : stepStatus.type === "waiting_receive"
                        ? "bg-orange-400 border-orange-500 text-white shadow-lg hover:scale-110 cursor-pointer animate-pulse"
                        : stepStatus.type === "pending" && stepStatus.isMyTurn
                        ? "bg-blue-400 border-blue-500 text-white shadow-lg hover:scale-110 cursor-pointer"
                        : "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    }
                  `}
                  title={
                    stepStatus.type === "completed"
                      ? `완료: ${proof?.senderChildName} → ${proof?.receiverChildName}`
                      : stepStatus.type === "waiting_receive"
                      ? "받은 편지 인증하기"
                      : stepStatus.type === "pending" && stepStatus.isMyTurn
                      ? "편지 보내기"
                      : "대기 중"
                  }
                >
                  {stepStatus.type === "completed" && stamp ? (
                    <span className="text-2xl">{stamp}</span>
                  ) : stepStatus.type === "waiting_receive" ? (
                    <>
                      <span className="text-lg mb-0.5">{step}</span>
                      <span className="text-[10px] leading-tight font-semibold text-center px-1">
                        편지<br />오는 중
                      </span>
                    </>
                  ) : (
                    <span className="text-lg">{step}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* 두 번째 줄 (11-20) */}
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }).map((_, index) => {
              const step = index + 11;
              const stepStatus = getStepStatus(step);
              const proof = stepStatus.proof;
              const stamp = proof && mission && (proof.status === "received" || proof.status === "auto_verified")
                ? proof.senderId === mission.user1Id
                  ? user1Stamp
                  : user2Stamp
                : null;
              
              return (
                <motion.button
                  key={step}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: (index + 10) * 0.05 }}
                  onClick={() => handleStepClick(step)}
                  disabled={stepStatus.type === "completed"}
                  className={`
                    aspect-square rounded-full flex flex-col items-center justify-center
                    border-2 transition-all font-bold relative
                    ${
                      stepStatus.type === "completed" && stamp
                        ? "bg-green-500 border-green-600 text-white shadow-lg cursor-default"
                        : stepStatus.type === "waiting_receive"
                        ? "bg-orange-400 border-orange-500 text-white shadow-lg hover:scale-110 cursor-pointer animate-pulse"
                        : stepStatus.type === "pending" && stepStatus.isMyTurn
                        ? "bg-blue-400 border-blue-500 text-white shadow-lg hover:scale-110 cursor-pointer"
                        : "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    }
                  `}
                  title={
                    stepStatus.type === "completed"
                      ? `완료: ${proof?.senderChildName} → ${proof?.receiverChildName}`
                      : stepStatus.type === "waiting_receive"
                      ? "받은 편지 인증하기"
                      : stepStatus.type === "pending" && stepStatus.isMyTurn
                      ? "편지 보내기"
                      : "대기 중"
                  }
                >
                  {stepStatus.type === "completed" && stamp ? (
                    <span className="text-2xl">{stamp}</span>
                  ) : stepStatus.type === "waiting_receive" ? (
                    <>
                      <span className="text-lg mb-0.5">{step}</span>
                      <span className="text-[10px] leading-tight font-semibold text-center px-1">
                        편지<br />오는 중
                      </span>
                    </>
                  ) : (
                    <span className="text-lg">{step}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

