"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { collection, query, where, getDocs, orderBy, doc, getDoc, or } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PenpalProfile, PenpalMatch } from "@/app/types";
import Link from "next/link";

export default function PenpalListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [penpalProfiles, setPenpalProfiles] = useState<PenpalProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<PenpalProfile | null>(null);
  const [myMatches, setMyMatches] = useState<PenpalMatch[]>([]);

  useEffect(() => {
    const loadPenpalProfiles = async () => {
      if (!db || !user) {
        setLoading(false);
        return;
      }

      try {
        // 내 펜팔 프로필 확인
        const myProfileQuery = query(
          collection(db, "penpalProfiles"),
          where("userId", "==", user.uid),
          where("status", "==", "recruiting")
        );
        const myProfileSnapshot = await getDocs(myProfileQuery);
        if (!myProfileSnapshot.empty) {
          const profileDoc = myProfileSnapshot.docs[0];
          setMyProfile({
            id: profileDoc.id,
            ...profileDoc.data(),
          } as PenpalProfile);
        }

        // 모든 모집 중인 펜팔 프로필 로드 (내 것 제외)
        // orderBy 제거하여 인덱스 에러 방지
        const q = query(
          collection(db, "penpalProfiles"),
          where("status", "==", "recruiting")
        );
        const snapshot = await getDocs(q);
        const profiles: PenpalProfile[] = [];
        
        console.log("📊 Penpal profiles found:", snapshot.size);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log("Profile:", {
            id: doc.id,
            childName: data.childName,
            status: data.status,
            userId: data.userId,
            isMyProfile: data.userId === user.uid,
          });
          
          // 내 프로필은 제외
          if (data.userId !== user.uid) {
            profiles.push({
              id: doc.id,
              ...data,
            } as PenpalProfile);
          }
        });

        console.log("✅ Profiles after filtering:", profiles.length);

        // 클라이언트 사이드에서 날짜순 정렬
        profiles.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setPenpalProfiles(profiles);

        // 내 매칭 정보 로드
        const matchesQuery = query(
          collection(db, "penpalMatches"),
          or(
            where("user1Id", "==", user.uid),
            where("user2Id", "==", user.uid)
          )
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesList: PenpalMatch[] = [];
        
        matchesSnapshot.forEach((doc) => {
          matchesList.push({
            id: doc.id,
            ...doc.data(),
          } as PenpalMatch);
        });

        setMyMatches(matchesList);
      } catch (error) {
        console.error("Error loading penpal profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPenpalProfiles();
  }, [user]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">펜팔 목록을 불러오는 중...</p>
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✉️</span>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  펜팔 모집 게시판
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/penpal/manage"
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 transition-all font-semibold shadow-md"
                >
                  📝 내 펜팔 관리
                </Link>
                <Link
                  href="/penpal/rules"
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all font-semibold"
                >
                  📖 규칙
                </Link>
                {!myProfile && (
                  <Link
                    href="/penpal/register"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                  >
                    ✏️ 나도 펜팔 등록하기
                  </Link>
                )}
                <button
                  onClick={() => router.back()}
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

        {/* 메인 콘텐츠 */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* 내 펜팔 프로필 (있는 경우) */}
          {myProfile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-xl p-6 mb-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    ✨ 내 펜팔 모집 중
                  </h2>
                  <p className="text-white/90 text-sm">
                    {myProfile.childName} • {myProfile.age}세 • {myProfile.englishLevel}
                  </p>
                  <p className="text-white/80 text-sm mt-2 line-clamp-2">
                    {myProfile.introduction}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/penpal/applications"
                    className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-all font-semibold text-sm"
                  >
                    📬 신청 목록
                  </Link>
                  <Link
                    href="/penpal/inbox"
                    className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-all font-semibold text-sm"
                  >
                    📭 내 펜팔함
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* 진행 중인 매칭 (있는 경우) - cancelled 제외 */}
          {myMatches.filter(m => m.status !== "cancelled").length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                📬 진행 중인 펜팔 매칭
              </h2>
              <div className="space-y-3">
                {myMatches.filter(m => m.status !== "cancelled").map((match) => {
                  const isUser1 = match.user1Id === user?.uid;
                  const partnerName = isUser1 ? match.user2ChildName : match.user1ChildName;
                  const myName = isUser1 ? match.user1ChildName : match.user2ChildName;
                  const myAddressSubmitted = isUser1 ? match.user1AddressSubmitted : match.user2AddressSubmitted;
                  
                  let statusBadge = null;
                  let statusMessage = "";
                  let actionButton = null;

                  if (match.status === "address_pending") {
                    if (!myAddressSubmitted) {
                      statusBadge = (
                        <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                          ⚠️ 주소 입력 필요
                        </span>
                      );
                      statusMessage = "주소를 입력해주세요";
                      actionButton = (
                        <Link
                          href={`/penpal/address/${match.id}`}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:scale-105 transition-all font-semibold text-sm"
                        >
                          📮 주소 입력하기
                        </Link>
                      );
                    } else {
                      statusBadge = (
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-semibold">
                          ⏳ 상대방 주소 대기
                        </span>
                      );
                      statusMessage = "상대방이 주소를 입력하면 관리자 검토가 시작됩니다";
                    }
                  } else if (match.status === "admin_review") {
                    statusBadge = (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                        🔍 관리자 검토 중
                      </span>
                    );
                    statusMessage = "관리자 승인 후 상대방 주소를 받을 수 있습니다";
                  } else if (match.status === "completed") {
                    statusBadge = (
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold">
                        ✅ 승인 완료
                      </span>
                    );
                    statusMessage = "펜팔 활동을 시작할 수 있습니다!";
                    actionButton = (
                      <Link
                        href="/penpal/inbox"
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 transition-all font-semibold text-sm"
                      >
                        📭 내 펜팔함 보기
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={match.id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border-2 border-purple-200 dark:border-purple-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-gray-800 dark:text-white">
                            {myName} 🤝 {partnerName}
                          </span>
                          {statusBadge}
                        </div>
                        {actionButton}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {statusMessage}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* 펜팔 목록 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              🔍 펜팔 친구 찾기
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              영어 편지를 주고받을 친구를 찾아보세요! {myProfile && "(내 프로필 제외)"} (총 {penpalProfiles.length}명 모집 중)
            </p>
          </div>

          {penpalProfiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
            >
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {myProfile 
                  ? "현재 다른 친구의 펜팔 모집이 없습니다" 
                  : "현재 모집 중인 펜팔이 없습니다"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {myProfile 
                  ? "다른 친구들이 펜팔을 등록하면 여기에 표시됩니다." 
                  : "첫 번째로 펜팔 친구를 모집해보세요!"}
              </p>
              {!myProfile && (
                <Link
                  href="/penpal/register"
                  className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:scale-105 transition-all"
                >
                  펜팔 등록하기 →
                </Link>
              )}
            </motion.div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {penpalProfiles.map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-600"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">🧒</div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                          {profile.childName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {profile.age}세 • {profile.englishLevel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      📚 AR 점수: <span className="font-semibold">{profile.arScore}</span>
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      🗒 {profile.introduction}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {new Date(profile.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>

                  <Link
                    href={`/penpal/${profile.id}`}
                    className="mt-4 w-full block text-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                  >
                    📩 신청하기
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

