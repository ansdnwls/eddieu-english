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
  or,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PenpalMatch } from "@/app/types";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";

interface MatchWithDetails extends PenpalMatch {
  partnerChildName: string;
  partnerUserId: string;
  myChildName: string;
  partnerParentName?: string;
  partnerAddress?: string;
  partnerPostalCode?: string;
  partnerEmail?: string;
  partnerPhone?: string;
}

export default function PenpalInboxPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchWithDetails | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  useEffect(() => {
    const loadMyPenpals = async () => {
      if (!db || !user) {
        setLoading(false);
        return;
      }

      try {
        // 내가 포함된 모든 매칭 조회
        const matchesQuery = query(
          collection(db, "penpalMatches"),
          or(
            where("user1Id", "==", user.uid),
            where("user2Id", "==", user.uid)
          )
        );

        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesList: MatchWithDetails[] = [];

        for (const matchDoc of matchesSnapshot.docs) {
          const matchData = matchDoc.data() as PenpalMatch;

          const isUser1 = matchData.user1Id === user.uid;
          const partnerUserId = isUser1 ? matchData.user2Id : matchData.user1Id;
          const partnerChildName = isUser1
            ? matchData.user2ChildName
            : matchData.user1ChildName;
          const myChildName = isUser1
            ? matchData.user1ChildName
            : matchData.user2ChildName;

          let partnerAddress = undefined;
          let partnerParentName = undefined;
          let partnerPostalCode = undefined;
          let partnerEmail = undefined;
          let partnerPhone = undefined;

          // 승인 완료된 경우에만 상대방 주소 정보 표시
          if (matchData.status === "completed") {
            const partnerAddressQuery = query(
              collection(db, "parentAddresses"),
              where("userId", "==", partnerUserId),
              where("matchId", "==", matchDoc.id)
            );
            const partnerAddressSnapshot = await getDocs(partnerAddressQuery);
            if (!partnerAddressSnapshot.empty) {
              const addressData = partnerAddressSnapshot.docs[0].data();
              partnerParentName = addressData.parentName;
              partnerAddress = addressData.address;
              partnerPostalCode = addressData.postalCode;
              partnerEmail = addressData.email;
              partnerPhone = addressData.phone;
            }
          }

          matchesList.push({
            id: matchDoc.id,
            ...matchData,
            partnerChildName,
            partnerUserId,
            myChildName,
            partnerParentName,
            partnerAddress,
            partnerPostalCode,
            partnerEmail,
            partnerPhone,
          });
        }

        // 최신순 정렬
        matchesList.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setMatches(matchesList);
      } catch (error) {
        console.error("❌ Error loading penpals:", error);
        alert("펜팔 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadMyPenpals();
  }, [user]);

  const getStatusInfo = (match: MatchWithDetails) => {
    const isUser1 = match.user1Id === user?.uid;
    const myAddressSubmitted = isUser1
      ? match.user1AddressSubmitted
      : match.user2AddressSubmitted;
    const partnerAddressSubmitted = isUser1
      ? match.user2AddressSubmitted
      : match.user1AddressSubmitted;

    switch (match.status) {
      case "address_pending":
        if (!myAddressSubmitted) {
          return {
            badge: (
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                ⚠️ 내 주소 미제출
              </span>
            ),
            message: "주소를 입력해주세요.",
            action: (
              <Link
                href={`/penpal/address/${match.id}`}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-lg text-center"
              >
                📮 주소 입력하기
              </Link>
            ),
          };
        } else if (!partnerAddressSubmitted) {
          return {
            badge: (
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-semibold">
                ⏳ 상대방 주소 대기
              </span>
            ),
            message: "상대방이 주소를 입력하면 관리자 검토가 시작됩니다.",
            action: null,
          };
        }
        break;
      case "admin_review":
        return {
          badge: (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
              🔍 관리자 검토 중
            </span>
          ),
          message: "관리자 승인 후 상대방 주소를 받을 수 있습니다.",
          action: null,
        };
      case "completed":
        const isOriginalPoster = match.user1Id === user?.uid; // 펜팔 프로필 등록자
        
        return {
          badge: (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
              ✅ 승인 완료
            </span>
          ),
          message: isOriginalPoster
            ? `🎉 매칭 완료! 첫 번째 영어 편지를 ${match.partnerChildName} 친구에게 보내보세요!`
            : `🎉 매칭 완료! ${match.partnerChildName} 친구가 먼저 편지를 보낼 거예요. 받으면 사진으로 인증해주세요!`,
          action: (
            <Link
              href={`/penpal/mission/${match.id}`}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-lg text-center"
            >
              ✉️ 편지 미션 시작하기
            </Link>
          ),
        };
      case "cancelled":
        return {
          badge: (
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
              ❌ 취소됨
            </span>
          ),
          message: "이 펜팔 매칭은 취소되었습니다.",
          action: null,
        };
      default:
        return {
          badge: (
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-semibold">
              {match.status}
            </span>
          ),
          message: "",
          action: null,
        };
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedMatch || !user) return;

    if (!cancelReason.trim()) {
      alert("취소 사유를 입력해주세요.");
      return;
    }

    setCancelSubmitting(true);

    try {
      const response = await fetch("/api/penpal/cancel-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatch.id,
          requesterId: user.uid,
          requesterChildName: selectedMatch.myChildName,
          partnerId: selectedMatch.partnerUserId,
          partnerChildName: selectedMatch.partnerChildName,
          reason: cancelReason.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ 취소 요청이 접수되었습니다.\n\n관리자 검토 후 처리됩니다.\n\n⚠️ 주의: 일방적인 취소는 신뢰도 점수에 영향을 줄 수 있습니다.`);
        
        // 모달 닫기 및 초기화
        setCancelModalOpen(false);
        setSelectedMatch(null);
        setCancelReason("");
        
        // 목록 새로고침
        window.location.reload();
      } else {
        alert(`오류: ${result.error}`);
      }
    } catch (error) {
      console.error("❌ Error submitting cancel request:", error);
      alert("취소 요청 중 오류가 발생했습니다.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  const filteredMatches =
    filterStatus === "all"
      ? matches
      : matches.filter((m) => m.status === filterStatus);

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
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📬</span>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  내 펜팔함
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/penpal/rules"
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all font-semibold"
                >
                  📖 규칙
                </Link>
                <button
                  onClick={() => router.push("/penpal")}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  ← 뒤로
                </button>
                <Link
                  href="/"
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  🏠 홈
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* 필터 버튼 */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "all"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              전체 ({matches.length})
            </button>
            <button
              onClick={() => setFilterStatus("completed")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "completed"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              ✅ 활성 펜팔 (
              {matches.filter((m) => m.status === "completed").length})
            </button>
            <button
              onClick={() => setFilterStatus("admin_review")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filterStatus === "admin_review"
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              🔍 검토 중 (
              {matches.filter((m) => m.status === "admin_review").length})
            </button>
          </div>

          {/* 펜팔 목록 */}
          {filteredMatches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
            >
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">
                {filterStatus === "all"
                  ? "아직 매칭된 펜팔이 없습니다."
                  : "해당 상태의 펜팔이 없습니다."}
              </p>
              <Link
                href="/penpal"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-lg"
              >
                ✉️ 펜팔 찾아보기
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match, index) => {
                const statusInfo = getStatusInfo(match);
                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                  >
                    {/* 상태 & 날짜 */}
                    <div className="flex items-center justify-between mb-4">
                      {statusInfo.badge}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        매칭일:{" "}
                        {new Date(match.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>

                    {/* 펜팔 정보 */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            내 아이
                          </p>
                          <p className="text-xl font-bold text-gray-800 dark:text-white">
                            {match.myChildName}
                          </p>
                        </div>
                        <div className="text-4xl">🤝</div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            펜팔 친구
                          </p>
                          <p className="text-xl font-bold text-gray-800 dark:text-white">
                            {match.partnerChildName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 안내 메시지 */}
                    {statusInfo.message && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                        {statusInfo.message}
                      </p>
                    )}

                    {/* 상대방 주소 (승인 완료 시) */}
                    {match.status === "completed" && match.partnerAddress && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4 border-2 border-green-300 dark:border-green-700">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-3">
                          📮 펜팔 친구 주소
                        </h3>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">보호자:</span>{" "}
                            {match.partnerParentName}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">우편번호:</span>{" "}
                            {match.partnerPostalCode}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">주소:</span>{" "}
                            {match.partnerAddress}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">이메일:</span>{" "}
                            {match.partnerEmail}
                          </p>
                          {match.partnerPhone && (
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-semibold">연락처:</span>{" "}
                              {match.partnerPhone}
                            </p>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-green-300 dark:border-green-700">
                          <p className="text-xs text-green-700 dark:text-green-400">
                            💡 이제 편지를 주고받을 수 있어요! 영어로 편지를
                            써서 보내보세요.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    {statusInfo.action && (
                      <div className="mt-4">{statusInfo.action}</div>
                    )}

                    {/* 취소 요청 버튼 - 진행 중인 펜팔에만 표시 */}
                    {(match.status === "address_pending" || 
                      match.status === "admin_review" || 
                      match.status === "completed") && (
                      <button
                        onClick={() => {
                          setSelectedMatch(match);
                          setCancelModalOpen(true);
                        }}
                        className="w-full mt-3 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all font-semibold border-2 border-red-300 dark:border-red-700"
                      >
                        ⚠️ 펜팔 취소 요청
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* 취소 요청 모달 */}
        <AnimatePresence>
          {cancelModalOpen && selectedMatch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                if (!cancelSubmitting) {
                  setCancelModalOpen(false);
                  setSelectedMatch(null);
                  setCancelReason("");
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 모달 헤더 */}
                <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">⚠️ 펜팔 취소 요청</h2>
                      <p className="text-red-100 text-sm">
                        {selectedMatch.partnerChildName} 친구와의 펜팔을 취소하시겠습니까?
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* 경고 메시지 */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm font-semibold mb-2">
                      ⚠️ 취소 전 확인해주세요
                    </p>
                    <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1">
                      <li>• 취소 사유가 정당하지 않으면 신뢰도 점수가 감소합니다</li>
                      <li>• 일방적인 취소는 향후 펜팔 매칭에 불이익이 있을 수 있습니다</li>
                      <li>• 상대방에게도 알림이 전송됩니다</li>
                    </ul>
                  </div>

                  {/* 취소 사유 입력 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      취소 사유 (필수)
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="예: 아이가 영어 편지 쓰기를 어려워해서 조금 더 준비하고 다시 신청하려고 합니다."
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows={4}
                      disabled={cancelSubmitting}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      💡 구체적이고 정당한 사유를 입력하면 패널티가 적용되지 않습니다.
                    </p>
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setCancelModalOpen(false);
                        setSelectedMatch(null);
                        setCancelReason("");
                      }}
                      disabled={cancelSubmitting}
                      className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCancelRequest}
                      disabled={cancelSubmitting || !cancelReason.trim()}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          제출 중...
                        </span>
                      ) : (
                        "취소 요청 제출"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthGuard>
  );
}

