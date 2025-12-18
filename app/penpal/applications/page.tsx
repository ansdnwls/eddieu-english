"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PenpalApplication, PenpalProfile } from "@/app/types";
import Link from "next/link";

interface ApplicationWithProfile extends PenpalApplication {
  applicantAge?: number;
  applicantLevel?: string;
  applicantArScore?: string;
  applicantDiaryCount?: number;
  applicantTotalWords?: number;
  applicantAvgWords?: number;
}

export default function PenpalApplicationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<PenpalProfile | null>(null);

  useEffect(() => {
    const loadApplications = async () => {
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
        
        if (myProfileSnapshot.empty) {
          // 프로필이 없으면 펜팔 페이지로 이동
          router.push("/penpal");
          return;
        }

        const profileDoc = myProfileSnapshot.docs[0];
        const profileData = {
          id: profileDoc.id,
          ...profileDoc.data(),
        } as PenpalProfile;
        setMyProfile(profileData);

        // 내 프로필에 대한 신청 목록 로드
        const applicationsQuery = query(
          collection(db, "penpalApplications"),
          where("penpalProfileId", "==", profileDoc.id),
          where("status", "==", "pending")
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);
        
        const applicationsList: ApplicationWithProfile[] = [];
        
        for (const appDoc of applicationsSnapshot.docs) {
          const appData = appDoc.data();
          
          // 신청자의 아이 정보 가져오기
          const childDoc = await getDoc(doc(db, "children", appData.applicantUserId));
          let applicantInfo = {};
          if (childDoc.exists()) {
            const childData = childDoc.data();
            applicantInfo = {
              applicantAge: childData.age,
              applicantLevel: childData.englishLevel,
              applicantArScore: childData.arScore,
            };
          }

          // 신청자의 일기 통계 가져오기
          const diariesQuery = query(
            collection(db, "diaries"),
            where("userId", "==", appData.applicantUserId)
          );
          const diariesSnapshot = await getDocs(diariesQuery);
          
          let totalWords = 0;
          let diaryCount = diariesSnapshot.size;
          
          diariesSnapshot.forEach((diaryDoc) => {
            const diaryData = diaryDoc.data();
            totalWords += diaryData.stats?.wordCount || 0;
          });
          
          const avgWords = diaryCount > 0 ? Math.round(totalWords / diaryCount) : 0;

          applicationsList.push({
            id: appDoc.id,
            ...appData,
            ...applicantInfo,
            applicantDiaryCount: diaryCount,
            applicantTotalWords: totalWords,
            applicantAvgWords: avgWords,
          } as ApplicationWithProfile);
        }

        setApplications(applicationsList);
      } catch (error) {
        console.error("Error loading applications:", error);
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, [user, router]);

  const handleAccept = async (application: ApplicationWithProfile) => {
    if (!user || !db || !myProfile) return;

    if (!confirm(`${application.applicantChildName}님의 펜팔 신청을 수락하시겠습니까?\n\n수락하면 펜팔이 매칭되며, 양쪽 보호자가 주소를 입력해야 합니다.`)) {
      return;
    }

    try {
      // 1. 신청 상태를 accepted로 변경
      await updateDoc(doc(db, "penpalApplications", application.id), {
        status: "accepted",
        updatedAt: new Date().toISOString(),
      });

      // 2. 양방향 매칭 생성
      const match = {
        user1Id: user.uid,
        user1ChildName: myProfile.childName,
        user1AddressSubmitted: false,
        user2Id: application.applicantUserId,
        user2ChildName: application.applicantChildName,
        user2AddressSubmitted: false,
        status: "address_pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const matchDoc = await addDoc(collection(db, "penpalMatches"), match);

      // 3. 내 프로필 상태를 matched로 변경
      await updateDoc(doc(db, "penpalProfiles", myProfile.id), {
        status: "matched",
        updatedAt: new Date().toISOString(),
      });

      // 4. 상대방 프로필도 matched로 변경 (있다면)
      const otherProfileQuery = query(
        collection(db, "penpalProfiles"),
        where("userId", "==", application.applicantUserId),
        where("status", "==", "recruiting")
      );
      const otherProfileSnapshot = await getDocs(otherProfileQuery);
      if (!otherProfileSnapshot.empty) {
        const otherProfileDoc = otherProfileSnapshot.docs[0];
        await updateDoc(doc(db, "penpalProfiles", otherProfileDoc.id), {
          status: "matched",
          updatedAt: new Date().toISOString(),
        });
      }

      alert(`✅ ${application.applicantChildName}님과 펜팔이 매칭되었습니다!\n\n이제 보호자 주소를 입력해주세요.`);
      
      // 주소 입력 페이지로 이동
      router.push(`/penpal/address/${matchDoc.id}`);
    } catch (error) {
      console.error("Error accepting application:", error);
      alert("수락 중 오류가 발생했습니다.");
    }
  };

  const handleReject = async (application: ApplicationWithProfile) => {
    if (!db) {
      alert("데이터베이스 연결 오류");
      return;
    }

    if (!confirm(`${application.applicantChildName}님의 펜팔 신청을 거절하시겠습니까?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, "penpalApplications", application.id), {
        status: "rejected",
        updatedAt: new Date().toISOString(),
      });

      setApplications(applications.filter(app => app.id !== application.id));
      alert("신청이 거절되었습니다.");
    } catch (error) {
      console.error("Error rejecting application:", error);
      alert("거절 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">신청 목록을 불러오는 중...</p>
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
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📬</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                받은 펜팔 신청
              </h1>
            </div>
            <div className="flex items-center gap-3">
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
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* 내 프로필 정보 */}
          {myProfile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-xl p-6 mb-8"
            >
              <div className="text-white">
                <h2 className="text-xl font-bold mb-2">
                  📋 내 펜팔 프로필
                </h2>
                <p className="text-white/90">
                  {myProfile.childName} • {myProfile.age}세 • {myProfile.englishLevel}
                </p>
              </div>
            </motion.div>
          )}

          {/* 신청 목록 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              📬 받은 신청 목록
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              총 {applications.length}개의 신청이 있습니다
            </p>
          </div>

          {applications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
            >
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                받은 신청이 없습니다
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                다른 친구들이 신청하면 여기에 표시됩니다.
              </p>
              <Link
                href="/penpal"
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:scale-105 transition-all"
              >
                펜팔 목록으로 →
              </Link>
            </motion.div>
          ) : (
            <div className="grid gap-6">
              {applications.map((application, index) => (
                <motion.div
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-2 border-blue-200 dark:border-blue-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="text-4xl">🧒</div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            {application.applicantChildName}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {application.applicantAge}세 • {application.applicantLevel}
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">AR 점수</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">
                              📚 {application.applicantArScore || "미입력"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">작성한 일기</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">
                              📝 {application.applicantDiaryCount || 0}개
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">총 단어 수</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">
                              ✍️ {application.applicantTotalWords?.toLocaleString() || 0}개
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">평균 단어 수</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">
                              📊 {application.applicantAvgWords || 0}개/편
                            </p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            신청일: {new Date(application.createdAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReject(application)}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
                    >
                      거절
                    </button>
                    <button
                      onClick={() => handleAccept(application)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                    >
                      ✅ 수락하기
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

