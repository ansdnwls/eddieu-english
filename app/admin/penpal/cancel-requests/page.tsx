"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PenpalCancelRequest } from "@/app/types";

export default function AdminCancelRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cancelRequests, setCancelRequests] = useState<PenpalCancelRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    const loadCancelRequests = async () => {
      if (!db || !user) {
        setLoading(false);
        return;
      }

      // db를 로컬 변수에 할당하여 TypeScript 타입 체크 통과
      const firestore = db;

      try {
        // 관리자 확인
        const adminDoc = await getDoc(doc(firestore, "admins", user.uid));
        if (!adminDoc.exists() || adminDoc.data()?.isAdmin !== true) {
          alert("관리자 권한이 필요합니다.");
          router.push("/dashboard");
          return;
        }

        // 모든 취소 요청 로드
        const requestsQuery = query(collection(firestore, "penpalCancelRequests"));
        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsList: PenpalCancelRequest[] = [];

        requestsSnapshot.forEach((doc) => {
          requestsList.push({
            id: doc.id,
            ...doc.data(),
          } as PenpalCancelRequest);
        });

        // 최신순 정렬
        requestsList.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setCancelRequests(requestsList);
      } catch (error) {
        console.error("❌ Error loading cancel requests:", error);
        alert("취소 요청을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadCancelRequests();
  }, [user, router]);

  const toggleSelection = (requestId: string) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const toggleSelectAll = () => {
    const filteredList = filterStatus === "all"
      ? cancelRequests
      : cancelRequests.filter((r) => r.status === filterStatus);
    
    if (selectedRequests.size === filteredList.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(filteredList.map((r) => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRequests.size === 0) {
      alert("삭제할 항목을 선택해주세요.");
      return;
    }

    if (!confirm(`선택한 ${selectedRequests.size}개의 취소 요청을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      if (!db) {
        alert("데이터베이스 연결 오류");
        return;
      }

      // db를 로컬 변수에 할당하여 TypeScript 타입 체크 통과
      const firestore = db;

      const deletePromises = Array.from(selectedRequests).map((requestId) =>
        deleteDoc(doc(firestore, "penpalCancelRequests", requestId))
      );

      await Promise.all(deletePromises);

      alert(`✅ ${selectedRequests.size}개의 취소 요청이 삭제되었습니다.`);
      
      // 목록 업데이트
      setCancelRequests((prev) => prev.filter((r) => !selectedRequests.has(r.id)));
      setSelectedRequests(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error("삭제 중 오류:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleApprove = async (request: PenpalCancelRequest) => {
    if (!db || !user) return;

    const confirmed = confirm(
      `${request.requesterChildName}의 취소 요청을 승인하시겠습니까?\n\n사유: ${request.reason}\n\n승인 시 펜팔 매칭이 취소되며, 신뢰도 점수가 조정됩니다.`
    );

    if (!confirmed) return;

    // db를 로컬 변수에 할당하여 TypeScript 타입 체크 통과
    const firestore = db;

    try {
      // 1. 취소 요청 승인
      await updateDoc(doc(firestore, "penpalCancelRequests", request.id), {
        status: "approved",
        processedAt: new Date().toISOString(),
        processedBy: user.uid,
        updatedAt: new Date().toISOString(),
      });

      // 2. 매칭 상태를 cancelled로 변경
      await updateDoc(doc(firestore, "penpalMatches", request.matchId), {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelledBy: request.requesterId,
        cancelReason: request.reason,
        updatedAt: new Date().toISOString(),
      });

      // 3. 신뢰도 점수 업데이트 (요청자)
      await fetch("/api/penpal/reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: request.requesterId,
          action: "cancel_by_user",
          points: 10, // 취소 패널티
          reason: `펜팔 취소: ${request.reason}`,
          matchId: request.matchId,
        }),
      });

      // 4. 상대방 신뢰도 업데이트 (취소 당한 경우는 패널티 없음)
      await fetch("/api/penpal/reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: request.partnerId,
          action: "cancel_by_partner",
          matchId: request.matchId,
        }),
      });

      // 5. 상대방에게 취소 알림 발송
      await addDoc(collection(firestore, "letterNotifications"), {
        userId: request.partnerId,
        matchId: request.matchId,
        type: "penpal_cancelled",
        title: "⚠️ 펜팔이 취소되었습니다",
        message: `${request.requesterChildName}님이 펜팔 취소를 요청하여 관리자가 승인했습니다. 사유: ${request.reason}`,
        link: `/penpal/manage`,
        isRead: false,
        createdAt: new Date().toISOString(),
        expiresAt: null,
      });

      console.log("✅ 상대방에게 취소 알림 발송 완료");

      // 6. 양쪽 펜팔 프로필을 recruiting 상태로 복원
      const requesterProfileQuery = query(
        collection(firestore, "penpalProfiles"),
        where("userId", "==", request.requesterId)
      );
      const requesterProfileSnapshot = await getDocs(requesterProfileQuery);
      
      if (!requesterProfileSnapshot.empty) {
        const profileDoc = requesterProfileSnapshot.docs[0];
        await updateDoc(doc(firestore, "penpalProfiles", profileDoc.id), {
          status: "recruiting",
          updatedAt: new Date().toISOString(),
        });
        console.log("✅ 요청자 프로필 상태 복원 (recruiting)");
      }

      const partnerProfileQuery = query(
        collection(firestore, "penpalProfiles"),
        where("userId", "==", request.partnerId)
      );
      const partnerProfileSnapshot = await getDocs(partnerProfileQuery);
      
      if (!partnerProfileSnapshot.empty) {
        const profileDoc = partnerProfileSnapshot.docs[0];
        await updateDoc(doc(firestore, "penpalProfiles", profileDoc.id), {
          status: "recruiting",
          updatedAt: new Date().toISOString(),
        });
        console.log("✅ 상대방 프로필 상태 복원 (recruiting)");
      }

      alert("✅ 취소 요청이 승인되었습니다.\n양쪽 모두 다시 펜팔 모집 가능합니다.");

      // 목록 새로고침
      setCancelRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, status: "approved" as const } : r
        )
      );
    } catch (error) {
      console.error("❌ Error approving cancel request:", error);
      alert("승인 중 오류가 발생했습니다.");
    }
  };

  const handleReject = async (request: PenpalCancelRequest) => {
    if (!db || !user) return;

    const reason = prompt(
      `${request.requesterChildName}의 취소 요청을 거절하시겠습니까?\n\n거절 사유를 입력해주세요:`
    );

    if (!reason || reason.trim() === "") return;

    // db를 로컬 변수에 할당하여 TypeScript 타입 체크 통과
    const firestore = db;

    try {
      await updateDoc(doc(firestore, "penpalCancelRequests", request.id), {
        status: "rejected",
        rejectionReason: reason.trim(),
        processedAt: new Date().toISOString(),
        processedBy: user.uid,
        updatedAt: new Date().toISOString(),
      });

      alert("❌ 취소 요청이 거절되었습니다.");

      // 목록 새로고침
      setCancelRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, status: "rejected" as const } : r
        )
      );
    } catch (error) {
      console.error("❌ Error rejecting cancel request:", error);
      alert("거절 중 오류가 발생했습니다.");
    }
  };

  const filteredRequests =
    filterStatus === "all"
      ? cancelRequests
      : cancelRequests.filter((r) => r.status === filterStatus);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                펜팔 취소 요청 관리
              </h1>
            </div>
            <button
              onClick={() => router.push("/admin/penpal")}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              ← 펜팔 관리
            </button>
          </div>
        </header>

        {/* 필터 버튼 */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "pending"
                  ? "bg-orange-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              ⏳ 대기 중 (
              {cancelRequests.filter((r) => r.status === "pending").length})
            </button>
            <button
              onClick={() => setFilterStatus("approved")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "approved"
                  ? "bg-orange-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              ✅ 승인됨 (
              {cancelRequests.filter((r) => r.status === "approved").length})
            </button>
            <button
              onClick={() => setFilterStatus("rejected")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "rejected"
                  ? "bg-orange-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              ❌ 거절됨 (
              {cancelRequests.filter((r) => r.status === "rejected").length})
            </button>
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "all"
                  ? "bg-orange-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              전체 ({cancelRequests.length})
            </button>
            </div>
            
            {/* 선택/삭제 버튼 */}
            <div className="flex items-center gap-3">
              {!isSelectionMode ? (
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all text-sm font-semibold"
                >
                  선택
                </button>
              ) : (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedRequests.size}개 선택
                  </span>
                  <button
                    onClick={toggleSelectAll}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all text-sm font-semibold"
                  >
                    전체 선택/해제
                  </button>
                  <button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedRequests(new Set());
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all text-sm font-semibold"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedRequests.size === 0}
                    className={`px-4 py-2 rounded-lg transition-all text-sm font-semibold ${
                      selectedRequests.size === 0
                        ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                  >
                    삭제 ({selectedRequests.size})
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 취소 요청 목록 */}
          {filteredRequests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
            >
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                해당 상태의 취소 요청이 없습니다.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-all border-2 ${
                    selectedRequests.has(request.id)
                      ? "border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20"
                      : "border-transparent"
                  }`}
                >
                  {/* 상태 배지 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {isSelectionMode && (
                        <button
                          onClick={() => toggleSelection(request.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            selectedRequests.has(request.id)
                              ? "bg-purple-500 border-purple-500"
                              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {selectedRequests.has(request.id) && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}
                      <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        request.status === "pending"
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                          : request.status === "approved"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {request.status === "pending"
                        ? "⏳ 대기 중"
                        : request.status === "approved"
                        ? "✅ 승인됨"
                        : "❌ 거절됨"}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      요청일:{" "}
                      {new Date(request.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>

                  {/* 요청 정보 */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          요청자
                        </p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                          {request.requesterChildName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          상대방
                        </p>
                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                          {request.partnerChildName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 취소 사유 */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-4 border-2 border-yellow-300 dark:border-yellow-700">
                    <h3 className="font-bold text-sm text-gray-800 dark:text-white mb-2">
                      취소 사유
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {request.reason}
                    </p>
                  </div>

                  {/* 액션 버튼 */}
                  {request.status === "pending" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(request)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-lg"
                      >
                        ✅ 승인하기
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-lg"
                      >
                        ❌ 거절하기
                      </button>
                    </div>
                  )}

                  {request.status === "approved" && (
                    <div className="text-center py-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <p className="text-green-700 dark:text-green-300 font-semibold">
                        ✅ 승인 완료 - 펜팔 매칭이 취소되었습니다
                      </p>
                    </div>
                  )}

                  {request.status === "rejected" && (
                    <div className="text-center py-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <p className="text-red-700 dark:text-red-300 font-semibold">
                        ❌ 거절됨 - 펜팔 매칭이 유지됩니다
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

