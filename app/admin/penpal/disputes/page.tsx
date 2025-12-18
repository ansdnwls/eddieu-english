"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { collection, query, getDocs, doc, updateDoc, getDoc, addDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface DisputedLetter {
  id: string;
  matchId: string;
  stepNumber: number;
  senderId: string;
  senderChildName: string;
  senderImageUrl: string;
  receiverId: string;
  receiverChildName: string;
  disputeReason: string;
  disputedAt: string;
  senderUploadedAt: string;
}

export default function AdminDisputesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<DisputedLetter[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    if (!db) return;

    try {
      console.log("📋 분쟁 목록 로딩 중...");

      const disputesQuery = query(
        collection(db, "letterProofs"),
        where("status", "==", "disputed")
      );

      const snapshot = await getDocs(disputesQuery);
      const disputesList: DisputedLetter[] = [];

      snapshot.forEach((doc) => {
        disputesList.push({
          id: doc.id,
          ...doc.data(),
        } as DisputedLetter);
      });

      // 최신순 정렬
      disputesList.sort((a, b) => 
        new Date(b.disputedAt).getTime() - new Date(a.disputedAt).getTime()
      );

      setDisputes(disputesList);
      console.log("✅ 분쟁 목록 로딩 완료:", disputesList.length);
    } catch (error) {
      console.error("❌ 분쟁 목록 로딩 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDispute = async (dispute: DisputedLetter) => {
    if (!db || !user) return;
    if (!confirm(`${dispute.receiverChildName}님의 신고를 승인하시겠습니까?\n편지가 실제로 도착하지 않은 것으로 처리됩니다.`)) {
      return;
    }

    setProcessing(dispute.id);

    try {
      // 1. LetterProof 삭제 또는 무효 처리
      await updateDoc(doc(db, "letterProofs", dispute.id), {
        status: "cancelled",
        resolvedAt: new Date().toISOString(),
        resolvedBy: user.uid,
      });

      // 2. 발신자에게 알림
      await addDoc(collection(db, "letterNotifications"), {
        userId: dispute.senderId,
        matchId: dispute.matchId,
        proofId: dispute.id,
        type: "letter_not_arrived",
        title: "📮 편지 미도착 확인",
        message: `관리자가 확인한 결과, ${dispute.receiverChildName}님에게 편지가 도착하지 않았습니다. 다시 보내주세요.`,
        link: `/penpal/mission/${dispute.matchId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // 3. 수신자에게 알림
      await addDoc(collection(db, "letterNotifications"), {
        userId: dispute.receiverId,
        matchId: dispute.matchId,
        proofId: dispute.id,
        type: "letter_not_arrived",
        title: "✅ 신고 처리 완료",
        message: `관리자가 확인했습니다. ${dispute.senderChildName}님에게 편지를 다시 보내달라고 요청했어요.`,
        link: `/penpal/mission/${dispute.matchId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      alert("분쟁이 승인되었습니다. 발신자에게 재발송 요청이 전송되었습니다.");
      loadDisputes();
    } catch (error) {
      console.error("❌ 분쟁 승인 오류:", error);
      alert("오류가 발생했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectDispute = async (dispute: DisputedLetter) => {
    if (!db || !user) return;
    if (!confirm(`${dispute.receiverChildName}님의 신고를 거부하시겠습니까?\n편지가 정상적으로 발송된 것으로 처리됩니다.`)) {
      return;
    }

    setProcessing(dispute.id);

    try {
      // 1. LetterProof 자동 인증 처리
      await updateDoc(doc(db, "letterProofs", dispute.id), {
        status: "auto_verified",
        autoVerifiedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        resolvedBy: user.uid,
      });

      // 2. 미션 진행도 업데이트
      const missionRef = doc(db, "letterMissions", dispute.matchId);
      const missionDoc = await getDoc(missionRef);

      if (missionDoc.exists()) {
        const missionData = missionDoc.data();
        const newCompletedSteps = [...missionData.completedSteps];
        newCompletedSteps[dispute.stepNumber - 1] = true;

        await updateDoc(missionRef, {
          currentStep: dispute.stepNumber,
          completedSteps: newCompletedSteps,
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. 수신자에게 경고 알림
      await addDoc(collection(db, "letterNotifications"), {
        userId: dispute.receiverId,
        matchId: dispute.matchId,
        proofId: dispute.id,
        type: "letter_not_arrived",
        title: "⚠️ 신고 거부됨",
        message: `관리자가 확인한 결과, 편지가 정상적으로 발송되었습니다. 편지를 확인해주세요. 악의적 신고 시 패널티가 부과될 수 있습니다.`,
        link: `/penpal/mission/${dispute.matchId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // TODO: 악의적 신고 횟수 체크 (3회 이상 시 패널티)

      alert("분쟁이 거부되었습니다. 수신자에게 경고가 전송되었습니다.");
      loadDisputes();
    } catch (error) {
      console.error("❌ 분쟁 거부 오류:", error);
      alert("오류가 발생했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📮 편지 분쟁 관리
            </h1>
            <Link
              href="/admin/penpal"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              ← 돌아가기
            </Link>
          </div>

          {disputes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                처리할 분쟁이 없습니다
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                모든 편지가 순조롭게 진행되고 있어요!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {disputes.map((dispute, index) => (
                <motion.div
                  key={dispute.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
                >
                  <div className="flex items-start gap-6">
                    {/* 발송 이미지 */}
                    <div className="flex-shrink-0">
                      <img
                        src={dispute.senderImageUrl}
                        alt="발송 편지"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <p className="text-xs text-gray-500 text-center mt-2">
                        발송 사진
                      </p>
                    </div>

                    {/* 정보 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full text-sm font-semibold">
                          분쟁 중
                        </span>
                        <span className="text-sm text-gray-500">
                          Step {dispute.stepNumber}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-gray-800 dark:text-white">
                          {dispute.senderChildName} → {dispute.receiverChildName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>발송일:</strong> {new Date(dispute.senderUploadedAt).toLocaleDateString("ko-KR")}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>신고일:</strong> {new Date(dispute.disputedAt).toLocaleDateString("ko-KR")}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>신고 사유:</strong> {dispute.disputeReason}
                        </p>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          onClick={() => handleApproveDispute(dispute)}
                          disabled={processing === dispute.id}
                          className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all font-semibold disabled:opacity-50"
                        >
                          ✅ 신고 승인 (재발송 요청)
                        </button>
                        <button
                          onClick={() => handleRejectDispute(dispute)}
                          disabled={processing === dispute.id}
                          className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-all font-semibold disabled:opacity-50"
                        >
                          ⚠️ 신고 거부 (자동 인증)
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

