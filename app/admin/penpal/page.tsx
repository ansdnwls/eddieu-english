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
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PenpalMatch } from "@/app/types";
import Link from "next/link";

interface MatchWithAddresses extends PenpalMatch {
  user1ParentName?: string;
  user1Address?: string;
  user1PostalCode?: string;
  user1Email?: string;
  user1Phone?: string;
  user2ParentName?: string;
  user2Address?: string;
  user2PostalCode?: string;
  user2Email?: string;
  user2Phone?: string;
}

export default function AdminPenpalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allMatches, setAllMatches] = useState<MatchWithAddresses[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("admin_review");
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    const loadMatches = async () => {
      if (!db || !user) {
        setLoading(false);
        return;
      }

      try {
        // 관리자 확인
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (!adminDoc.exists() || adminDoc.data()?.isAdmin !== true) {
          alert("관리자 권한이 필요합니다.");
          router.push("/dashboard");
          return;
        }

        // 모든 매칭 데이터 로드
        const matchesQuery = query(collection(db, "penpalMatches"));
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesList: MatchWithAddresses[] = [];

        for (const matchDoc of matchesSnapshot.docs) {
          const matchData = {
            id: matchDoc.id,
            ...matchDoc.data(),
          } as MatchWithAddresses;

          // user1의 주소 정보 가져오기
          if (matchData.user1AddressSubmitted) {
            const user1AddressQuery = query(
              collection(db, "parentAddresses"),
              where("userId", "==", matchData.user1Id),
              where("matchId", "==", matchDoc.id)
            );
            const user1AddressSnapshot = await getDocs(user1AddressQuery);
            if (!user1AddressSnapshot.empty) {
              const addressData = user1AddressSnapshot.docs[0].data();
              matchData.user1ParentName = addressData.parentName;
              matchData.user1Address = addressData.address;
              matchData.user1PostalCode = addressData.postalCode;
              matchData.user1Email = addressData.email;
              matchData.user1Phone = addressData.phone;
            }
          }

          // user2의 주소 정보 가져오기
          if (matchData.user2AddressSubmitted) {
            const user2AddressQuery = query(
              collection(db, "parentAddresses"),
              where("userId", "==", matchData.user2Id),
              where("matchId", "==", matchDoc.id)
            );
            const user2AddressSnapshot = await getDocs(user2AddressQuery);
            if (!user2AddressSnapshot.empty) {
              const addressData = user2AddressSnapshot.docs[0].data();
              matchData.user2ParentName = addressData.parentName;
              matchData.user2Address = addressData.address;
              matchData.user2PostalCode = addressData.postalCode;
              matchData.user2Email = addressData.email;
              matchData.user2Phone = addressData.phone;
            }
          }

          matchesList.push(matchData);
        }

        // 최신순 정렬
        matchesList.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setAllMatches(matchesList);
      } catch (error) {
        console.error("❌ Error loading matches:", error);
        alert("매칭 데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, [user, router]);

  const handleApprove = async (matchId: string) => {
    if (!db) return;

    const confirmed = confirm(
      "이 펜팔 매칭을 승인하시겠습니까?\n\n승인 시 양쪽 보호자에게 상대방 주소가 공개됩니다."
    );

    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "penpalMatches", matchId), {
        status: "completed",
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      alert("✅ 승인되었습니다!\n\n양쪽 보호자가 상대방 주소를 확인할 수 있습니다.");

      // 목록 새로고침
      setAllMatches((prev) =>
        prev.map((match) =>
          match.id === matchId
            ? { ...match, status: "completed" as const }
            : match
        )
      );
    } catch (error) {
      console.error("❌ Error approving match:", error);
      alert("승인 중 오류가 발생했습니다.");
    }
  };

  const handleReject = async (matchId: string) => {
    if (!db) return;

    const reason = prompt(
      "거절 사유를 입력해주세요.\n(보호자에게 전달됩니다)"
    );

    if (!reason || reason.trim() === "") return;

    try {
      await updateDoc(doc(db, "penpalMatches", matchId), {
        status: "cancelled",
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason.trim(),
        updatedAt: new Date().toISOString(),
      });

      alert("❌ 거절되었습니다.");

      // 목록 새로고침
      setAllMatches((prev) =>
        prev.map((match) =>
          match.id === matchId
            ? { ...match, status: "cancelled" as const }
            : match
        )
      );
    } catch (error) {
      console.error("❌ Error rejecting match:", error);
      alert("거절 처리 중 오류가 발생했습니다.");
    }
  };

  const toggleSelection = (matchId: string) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(matchId)) {
      newSelected.delete(matchId);
    } else {
      newSelected.add(matchId);
    }
    setSelectedMatches(newSelected);
  };

  const toggleSelectAll = () => {
    const filteredList = filterStatus === "all" 
      ? allMatches 
      : allMatches.filter((m) => m.status === filterStatus);
    
    if (selectedMatches.size === filteredList.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(filteredList.map((m) => m.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMatches.size === 0) {
      alert("삭제할 항목을 선택해주세요.");
      return;
    }

    if (!confirm(`선택한 ${selectedMatches.size}개의 매칭을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      if (!db) {
        alert("데이터베이스 연결 오류");
        return;
      }

      const deletePromises = Array.from(selectedMatches).map((matchId) =>
        deleteDoc(doc(db, "penpalMatches", matchId))
      );

      await Promise.all(deletePromises);

      alert(`✅ ${selectedMatches.size}개의 매칭이 삭제되었습니다.`);
      
      // 목록 업데이트
      setAllMatches((prev) => prev.filter((m) => !selectedMatches.has(m.id)));
      setSelectedMatches(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error("삭제 중 오류:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSendAddressReminder = async (match: MatchWithAddresses) => {
    if (!db) return;

    const usersToNotify: Array<{ userId: string; childName: string; submitted: boolean }> = [];
    
    if (!match.user1AddressSubmitted) {
      usersToNotify.push({
        userId: match.user1Id,
        childName: match.user1ChildName,
        submitted: false,
      });
    }
    
    if (!match.user2AddressSubmitted) {
      usersToNotify.push({
        userId: match.user2Id,
        childName: match.user2ChildName,
        submitted: false,
      });
    }

    if (usersToNotify.length === 0) {
      alert("모든 사용자가 주소를 제출했습니다.");
      return;
    }

    const confirmed = confirm(
      `다음 사용자에게 주소 입력 알림을 보내시겠습니까?\n\n${usersToNotify.map(u => `- ${u.childName}`).join("\n")}`
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/penpal/send-address-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          usersToNotify,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ 알림이 전송되었습니다!\n\n${result.data.notificationCount}개의 알림이 생성되었습니다.`);
      } else {
        alert(`오류: ${result.error}`);
      }
    } catch (error) {
      console.error("❌ Error sending reminder:", error);
      alert("알림 전송 중 오류가 발생했습니다.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "address_pending":
        return (
          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-semibold">
            ⏳ 주소 입력 대기
          </span>
        );
      case "admin_review":
        return (
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
            🔍 검토 대기
          </span>
        );
      case "completed":
        return (
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
            ✅ 승인 완료
          </span>
        );
      case "cancelled":
        return (
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
            ❌ 취소됨
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold">
            {status}
          </span>
        );
    }
  };

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
              <span className="text-3xl">✉️</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                펜팔 매칭 관리
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/penpal/cancel-requests"
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all font-semibold"
              >
                ⚠️ 취소 요청
              </Link>
              <button
                onClick={() => router.push("/admin")}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                ← 관리자 홈
              </button>
            </div>
          </div>
        </header>

        {/* 필터 버튼 */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilterStatus("admin_review")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "admin_review"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              🔍 검토 대기 ({allMatches.filter((m) => m.status === "admin_review").length})
            </button>
            <button
              onClick={() => setFilterStatus("address_pending")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "address_pending"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              ⏳ 주소 대기 ({allMatches.filter((m) => m.status === "address_pending").length})
            </button>
            <button
              onClick={() => setFilterStatus("completed")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "completed"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              ✅ 승인 완료 ({allMatches.filter((m) => m.status === "completed").length})
            </button>
            <button
              onClick={() => setFilterStatus("cancelled")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "cancelled"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              ❌ 취소됨 ({allMatches.filter((m) => m.status === "cancelled").length})
            </button>
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "all"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              전체 ({allMatches.length})
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
                    {selectedMatches.size}개 선택
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
                      setSelectedMatches(new Set());
                    }}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-all text-sm font-semibold"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedMatches.size === 0}
                    className={`px-4 py-2 rounded-lg transition-all text-sm font-semibold ${
                      selectedMatches.size === 0
                        ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                  >
                    삭제 ({selectedMatches.size})
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 매칭 목록 */}
          {(() => {
            const filteredMatches = filterStatus === "all" 
              ? allMatches 
              : allMatches.filter((m) => m.status === filterStatus);
            
            return filteredMatches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
            >
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                해당 상태의 매칭이 없습니다.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match, index) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-all border-2 ${
                    selectedMatches.has(match.id)
                      ? "border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20"
                      : "border-transparent"
                  }`}
                >
                  {/* 상태 & 날짜 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {isSelectionMode && (
                        <button
                          onClick={() => toggleSelection(match.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            selectedMatches.has(match.id)
                              ? "bg-purple-500 border-purple-500"
                              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {selectedMatches.has(match.id) && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}
                      {getStatusBadge(match.status)}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      매칭일: {new Date(match.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>

                  {/* 매칭 정보 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* User 1 */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-3">
                        👦 {match.user1ChildName}
                      </h3>
                      {match.user1AddressSubmitted ? (
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">보호자:</span> {match.user1ParentName}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">우편번호:</span> {match.user1PostalCode}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">주소:</span> {match.user1Address}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">이메일:</span> {match.user1Email}
                          </p>
                          {match.user1Phone && (
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-semibold">연락처:</span> {match.user1Phone}
                            </p>
                          )}
                          <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                            <span className="text-green-600 dark:text-green-400 font-semibold">
                              ✅ 주소 제출 완료
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-yellow-600 dark:text-yellow-400 font-semibold">
                          ⏳ 주소 미제출
                        </p>
                      )}
                    </div>

                    {/* User 2 */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-3">
                        👧 {match.user2ChildName}
                      </h3>
                      {match.user2AddressSubmitted ? (
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">보호자:</span> {match.user2ParentName}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">우편번호:</span> {match.user2PostalCode}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">주소:</span> {match.user2Address}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">이메일:</span> {match.user2Email}
                          </p>
                          {match.user2Phone && (
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-semibold">연락처:</span> {match.user2Phone}
                            </p>
                          )}
                          <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                            <span className="text-green-600 dark:text-green-400 font-semibold">
                              ✅ 주소 제출 완료
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-yellow-600 dark:text-yellow-400 font-semibold">
                          ⏳ 주소 미제출
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  {match.status === "address_pending" && (
                    <div className="space-y-3">
                      <div className="text-center py-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <p className="text-yellow-700 dark:text-yellow-300 font-semibold">
                          ⏳ 주소 입력을 기다리고 있습니다
                        </p>
                      </div>
                      {(!match.user1AddressSubmitted || !match.user2AddressSubmitted) && (
                        <button
                          onClick={() => handleSendAddressReminder(match)}
                          className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-lg"
                        >
                          📮 주소 입력 알림 보내기
                        </button>
                      )}
                    </div>
                  )}

                  {match.status === "admin_review" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(match.id)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-lg"
                      >
                        ✅ 승인하기
                      </button>
                      <button
                        onClick={() => handleReject(match.id)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-lg"
                      >
                        ❌ 거절하기
                      </button>
                    </div>
                  )}

                  {match.status === "completed" && (
                    <div className="text-center py-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <p className="text-green-700 dark:text-green-300 font-semibold">
                        ✅ 승인 완료 - 양쪽 보호자가 주소를 확인할 수 있습니다
                      </p>
                    </div>
                  )}

                  {match.status === "cancelled" && (
                    <div className="text-center py-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <p className="text-red-700 dark:text-red-300 font-semibold">
                        ❌ 취소된 매칭입니다
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          );
          })()}
        </div>
      </div>
    </AuthGuard>
  );
}

