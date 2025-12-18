"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
import { PenpalMatch, LetterMission } from "@/app/types";
import Link from "next/link";

interface MatchWithMission extends PenpalMatch {
  partnerChildName: string;
  partnerUserId: string;
  myChildName: string;
  mission?: LetterMission;
}

export default function PenpalManagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchWithMission[]>([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchWithMission | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  useEffect(() => {
    const loadMyMatches = async () => {
      if (!db || !user) {
        setLoading(false);
        return;
      }

      try {
        console.log("📬 Loading my penpal matches...");

        // 승인 완료된 매칭만 조회
        const matchesQuery = query(
          collection(db, "penpalMatches"),
          or(
            where("user1Id", "==", user.uid),
            where("user2Id", "==", user.uid)
          )
        );

        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesList: MatchWithMission[] = [];

        for (const matchDoc of matchesSnapshot.docs) {
          const matchData = matchDoc.data() as PenpalMatch;

          // 승인 완료된 매칭만 포함 (completed 상태)
          if (matchData.status !== "completed") {
            continue;
          }

          const isUser1 = matchData.user1Id === user.uid;
          const partnerUserId = isUser1 ? matchData.user2Id : matchData.user1Id;
          const partnerChildName = isUser1
            ? matchData.user2ChildName
            : matchData.user1ChildName;
          const myChildName = isUser1
            ? matchData.user1ChildName
            : matchData.user2ChildName;

          // 미션 정보 로드
          let mission: LetterMission | undefined;
          try {
            const missionDoc = await getDoc(
              doc(db, "letterMissions", matchDoc.id)
            );
            if (missionDoc.exists()) {
              mission = {
                id: missionDoc.id,
                ...missionDoc.data(),
              } as LetterMission;
            }
          } catch (err) {
            console.log("⚠️ No mission found for match:", matchDoc.id);
          }

          matchesList.push({
            id: matchDoc.id,
            ...matchData,
            partnerChildName,
            partnerUserId,
            myChildName,
            mission,
          });
        }

        // 최신순 정렬
        matchesList.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        console.log("✅ Active matches loaded:", matchesList.length);
        setMatches(matchesList);
      } catch (error) {
        console.error("❌ Error loading matches:", error);
        alert("펜팔 목록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadMyMatches();
  }, [user]);

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
        alert(
          `✅ 취소 요청이 접수되었습니다.\n\n관리자 검토 후 처리됩니다.\n\n⚠️ 주의: 일방적인 취소는 신뢰도 점수에 영향을 줄 수 있습니다.`
        );

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
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📝</span>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  내 펜팔 관리
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/penpal/rules"
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all font-semibold"
                >
                  📖 규칙
                </Link>
                <Link
                  href="/penpal"
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  ← 펜팔 찾기
                </Link>
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

        {/* 메인 콘텐츠 */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {matches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
            >
              <div className="text-6xl mb-4">📭</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                아직 진행 중인 펜팔이 없습니다
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                펜팔 친구를 찾아 영어 편지를 주고받아보세요!
              </p>
              <Link
                href="/penpal"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-lg"
              >
                ✉️ 펜팔 친구 찾기
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* 안내 메시지 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">✉️</span>
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                      진행 중인 펜팔: {matches.length}개
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      각 펜팔의 편지 인증을 진행하고, 10회 완료 시 특별한 보상을 받으세요!
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* 펜팔 목록 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {matches.map((match, index) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all"
                  >
                    {/* 펜팔 정보 */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                          {match.partnerChildName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          매칭일:{" "}
                          {new Date(match.createdAt).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <span className="text-4xl">🤝</span>
                    </div>

                    {/* 진행 상황 */}
                    {match.mission ? (
                      <div className="space-y-3">
                        {/* 진행률 바 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              편지 진행 상황
                            </span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {match.mission.currentStep} / {match.mission.totalSteps}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${
                                  (match.mission.currentStep /
                                    match.mission.totalSteps) *
                                  100
                                }%`,
                              }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                            />
                          </div>
                        </div>

                        {/* 상태 표시 */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {match.mission.isCompleted
                              ? "🎉 완료!"
                              : `📮 ${
                                  match.mission.totalSteps -
                                  match.mission.currentStep
                                }개 남음`}
                          </span>
                          {match.mission.extended && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">
                              연장됨 🔄
                            </span>
                          )}
                        </div>

                        {/* 액션 버튼 */}
                        <div className="space-y-2">
                          <Link
                            href={`/penpal/mission/${match.id}`}
                            className="block w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-lg text-center"
                          >
                            {match.mission.isCompleted
                              ? "🎁 완료 확인하기"
                              : "✉️ 편지 인증하기"}
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedMatch(match);
                              setCancelModalOpen(true);
                              setCancelReason("");
                            }}
                            className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all font-semibold text-sm"
                          >
                            ❌ 펜팔 취소 요청
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                          미션 정보를 불러오는 중...
                        </p>
                        <div className="space-y-2">
                          <Link
                            href={`/penpal/mission/${match.id}`}
                            className="block w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-semibold text-center"
                          >
                            미션 시작하기 →
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedMatch(match);
                              setCancelModalOpen(true);
                              setCancelReason("");
                            }}
                            className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all font-semibold text-sm"
                          >
                            ❌ 펜팔 취소 요청
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* 취소 요청 모달 */}
        <AnimatePresence>
          {cancelModalOpen && selectedMatch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => {
                setCancelModalOpen(false);
                setSelectedMatch(null);
                setCancelReason("");
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  ❌ 펜팔 취소 요청
                </h3>

                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold mb-2">
                    ⚠️ 주의사항
                  </p>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1 list-disc list-inside">
                    <li>일방적인 취소는 신뢰도 점수에 영향을 줄 수 있습니다</li>
                    <li>취소 사유는 관리자가 검토합니다</li>
                    <li>정당한 사유가 아닌 경우 패널티가 부과될 수 있습니다</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    펜팔 상대: {selectedMatch.partnerChildName}
                  </label>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    취소 사유 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="예: 답장이 너무 늦어서, 마음이 안 맞아서, 개인적인 사정으로..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCancelRequest}
                    disabled={cancelSubmitting || !cancelReason.trim()}
                    className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelSubmitting ? "제출 중..." : "취소 요청 제출"}
                  </button>
                  <button
                    onClick={() => {
                      setCancelModalOpen(false);
                      setSelectedMatch(null);
                      setCancelReason("");
                    }}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
                  >
                    취소
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthGuard>
  );
}

