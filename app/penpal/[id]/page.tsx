"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { doc, getDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PenpalProfile } from "@/app/types";
import Link from "next/link";

export default function PenpalDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;

  const [profile, setProfile] = useState<PenpalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [myChildInfo, setMyChildInfo] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!db || !profileId || !user) {
        setLoading(false);
        return;
      }

      try {
        // 펜팔 프로필 로드
        const profileDoc = await getDoc(doc(db, "penpalProfiles", profileId));
        if (!profileDoc.exists()) {
          alert("펜팔 프로필을 찾을 수 없습니다.");
          router.push("/penpal");
          return;
        }

        const profileData = {
          id: profileDoc.id,
          ...profileDoc.data(),
        } as PenpalProfile;

        setProfile(profileData);

        // 내 아이 정보 로드
        const childDoc = await getDoc(doc(db, "children", user.uid));
        if (childDoc.exists()) {
          setMyChildInfo(childDoc.data());
        }

        // 이미 신청했는지 확인
        const applicationsQuery = query(
          collection(db, "penpalApplications"),
          where("penpalProfileId", "==", profileId),
          where("applicantUserId", "==", user.uid)
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);
        setHasApplied(!applicationsSnapshot.empty);
      } catch (error) {
        console.error("Error loading profile:", error);
        alert("프로필을 불러오는 중 오류가 발생했습니다.");
        router.push("/penpal");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [profileId, user, router]);

  const handleApply = async () => {
    if (!user || !db || !profile || !myChildInfo) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (hasApplied) {
      alert("이미 신청한 펜팔입니다.");
      return;
    }

    if (!confirm(`${profile.childName}님에게 펜팔 신청을 하시겠습니까?`)) {
      return;
    }

    setApplying(true);

    try {
      const application = {
        penpalProfileId: profileId,
        applicantUserId: user.uid,
        applicantChildName: myChildInfo.childName || "익명",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "penpalApplications"), application);

      alert("✅ 펜팔 신청이 완료되었습니다!\n\n상대방이 수락하면 매칭됩니다.");
      setHasApplied(true);
    } catch (error) {
      console.error("Error applying:", error);
      alert("신청 중 오류가 발생했습니다.");
    } finally {
      setApplying(false);
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

  if (!profile) {
    return null;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✉️</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                펜팔 프로필
              </h1>
            </div>
            <div className="flex items-center gap-2">
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
        <main className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            {/* 프로필 헤더 */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🧒</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {profile.childName}
              </h2>
              <div className="flex items-center justify-center gap-4 text-gray-600 dark:text-gray-400">
                <span>📅 {profile.age}세</span>
                <span>•</span>
                <span>📚 {profile.englishLevel}</span>
                <span>•</span>
                <span>📖 AR {profile.arScore}</span>
              </div>
            </div>

            {/* 자기소개 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6 border-2 border-blue-200 dark:border-blue-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">
                🗒 하고 싶은 말
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {profile.introduction}
              </p>
            </div>

            {/* 등록 정보 */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                📅 등록일: {new Date(profile.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ✨ 상태: <span className="font-semibold text-green-600 dark:text-green-400">모집 중</span>
              </p>
            </div>

            {/* 펜팔 안내 */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 mb-6 border-2 border-purple-200 dark:border-purple-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">
                📌 펜팔 매칭 절차
              </h3>
              <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-500">1.</span>
                  <span>"신청하기" 버튼을 클릭하면 상대방에게 알림이 갑니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-500">2.</span>
                  <span>상대방이 수락하면 펜팔이 매칭됩니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-500">3.</span>
                  <span>양쪽 보호자가 주소를 입력하면 관리자가 검토합니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-500">4.</span>
                  <span>관리자 승인 후 주소를 받아 편지를 보낼 수 있습니다.</span>
                </li>
              </ol>
            </div>

            {/* 신청 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/penpal")}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
              >
                목록으로
              </button>
              <button
                onClick={handleApply}
                disabled={applying || hasApplied}
                className={`flex-1 px-6 py-3 rounded-lg shadow-lg transition-all font-semibold ${
                  hasApplied
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : applying
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-105 hover:shadow-xl"
                }`}
              >
                {hasApplied
                  ? "✅ 신청 완료"
                  : applying
                  ? "신청 중..."
                  : "📩 펜팔 신청하기"}
              </button>
            </div>

            {hasApplied && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-green-100 dark:bg-green-900/30 border border-green-400 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm text-center"
              >
                ✅ 펜팔 신청이 완료되었습니다. 상대방의 수락을 기다려주세요!
              </motion.div>
            )}
          </motion.div>
        </main>
      </div>
    </AuthGuard>
  );
}


