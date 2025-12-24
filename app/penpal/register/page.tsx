"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { collection, addDoc, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import CharacterStampSelector from "@/app/components/CharacterStampSelector";
import { CharacterStamp } from "@/app/types";

export default function PenpalRegisterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [childInfo, setChildInfo] = useState<any>(null);
  const [introduction, setIntroduction] = useState("");
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<CharacterStamp | null>(null);

  useEffect(() => {
    const loadChildInfo = async () => {
      if (!user || !db) return;

      try {
        // localStorage에서 현재 선택된 아이 정보 로드
        const savedChildInfo = localStorage.getItem("childInfo");
        if (savedChildInfo) {
          const parsedInfo = JSON.parse(savedChildInfo);
          setChildInfo(parsedInfo);
        } else {
          // localStorage에 없으면 Firestore에서 로드
          const childDoc = await getDoc(doc(db, "children", user.uid));
          if (childDoc.exists()) {
            setChildInfo(childDoc.data());
          }
        }

        // 기존 펜팔 프로필이 있는지 확인 (recruiting만 체크)
        const q = query(
          collection(db, "penpalProfiles"),
          where("userId", "==", user.uid),
          where("status", "==", "recruiting")
        );
        const snapshot = await getDocs(q);
        
        // recruiting 상태이면서 실제로 매칭이 없는 경우만 "이미 모집 중"으로 간주
        if (!snapshot.empty) {
          // 진행 중인 매칭이 있는지 확인
          const matchesQuery = query(
            collection(db, "penpalMatches"),
            where("userId", "array-contains", user.uid)
          );
          
          // 더 정확한 매칭 확인
          const userMatchesQuery1 = query(
            collection(db, "penpalMatches"),
            where("user1Id", "==", user.uid)
          );
          const userMatchesQuery2 = query(
            collection(db, "penpalMatches"),
            where("user2Id", "==", user.uid)
          );
          
          const [matches1, matches2] = await Promise.all([
            getDocs(userMatchesQuery1),
            getDocs(userMatchesQuery2)
          ]);
          
          // cancelled가 아닌 매칭이 있으면 이미 모집 중
          const activeMatches = [...matches1.docs, ...matches2.docs].filter(
            doc => doc.data().status !== "cancelled"
          );
          
          setHasExistingProfile(activeMatches.length > 0);
        } else {
          setHasExistingProfile(false);
        }
      } catch (err) {
        console.error("Error loading child info:", err);
      }
    };

    loadChildInfo();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!introduction.trim()) {
      setError("하고 싶은 말을 입력해주세요.");
      return;
    }

    if (!selectedStamp) {
      setError("캐릭터 도장을 선택해주세요.");
      return;
    }

    if (!user || !db || !childInfo) {
      setError("로그인이 필요합니다.");
      return;
    }

    if (hasExistingProfile) {
      setError("이미 펜팔 모집 중입니다. 기존 모집을 완료한 후 새로 등록해주세요.");
      return;
    }

    setLoading(true);

    try {
      // 현재 선택된 아이 ID 가져오기
      const currentChildId = localStorage.getItem("currentChildId") || "child1";

      const penpalProfile = {
        userId: user.uid,
        childId: currentChildId, // 아이 ID 추가
        childName: childInfo.childName || "익명",
        age: childInfo.age || 0,
        arScore: childInfo.arScore || "미입력",
        englishLevel: childInfo.englishLevel || "Lv.1",
        introduction: introduction.trim(),
        characterStamp: selectedStamp,
        status: "recruiting",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "penpalProfiles"), penpalProfile);
      console.log("✅ 펜팔 프로필 등록 완료 (childId:", currentChildId, ")");

      alert("✅ 펜팔 모집이 등록되었습니다!");
      router.push("/board?category=penpal");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ Error registering penpal:", error);
      setError("등록 중 오류가 발생했습니다: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✉️</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                펜팔 등록하기
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
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
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✉️</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                영어 펜팔 친구 모집하기
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                매주 영어 편지를 주고받을 친구를 찾아보세요!
              </p>
            </div>

            {hasExistingProfile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg mb-6"
              >
                ⚠️ 이미 펜팔 모집 중입니다. 기존 모집을 완료한 후 새로 등록해주세요.
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 내 정보 표시 */}
              {childInfo && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-700">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                    📋 내 프로필 정보
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">닉네임:</span>
                      <span className="ml-2 font-semibold text-gray-800 dark:text-white">
                        {childInfo.childName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">나이:</span>
                      <span className="ml-2 font-semibold text-gray-800 dark:text-white">
                        {childInfo.age}세
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">영어 레벨:</span>
                      <span className="ml-2 font-semibold text-gray-800 dark:text-white">
                        {childInfo.englishLevel}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">AR 점수:</span>
                      <span className="ml-2 font-semibold text-gray-800 dark:text-white">
                        {childInfo.arScore || "미입력"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    💡 프로필 정보는 펜팔 친구를 찾는 데 사용됩니다. 정보 수정은 프로필 페이지에서 가능합니다.
                  </p>
                </div>
              )}

              {/* 캐릭터 도장 선택 */}
              <CharacterStampSelector
                selectedStamp={selectedStamp}
                onSelect={setSelectedStamp}
              />

              {/* 하고 싶은 말 */}
              <div>
                <label
                  htmlFor="introduction"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  하고 싶은 말 *
                </label>
                <textarea
                  id="introduction"
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                  placeholder="예: 나랑 매주 영어편지 주고받을 친구 구해요! 저는 동물을 좋아하고 그림 그리는 것을 좋아해요. 같이 재미있는 이야기 나눠요!"
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                  maxLength={500}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {introduction.length}/500자 | 펜팔 친구에게 자신을 소개하고 어떤 이야기를 나누고 싶은지 적어주세요.
                </p>
              </div>

              {/* 안내 사항 */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">
                  📌 펜팔 매칭 안내
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold">1.</span>
                    <span>다른 친구가 신청하면 알림을 받게 됩니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold">2.</span>
                    <span>신청을 수락하면 펜팔이 매칭됩니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold">3.</span>
                    <span>매칭 후 보호자 정보를 입력하면 관리자가 검토합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold">4.</span>
                    <span>관리자 승인 후 상대방 주소를 받아 편지를 보낼 수 있습니다.</span>
                  </li>
                </ul>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/board?category=penpal")}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading || !introduction.trim() || hasExistingProfile}
                  className={`flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg transition-all font-semibold ${
                    loading || !introduction.trim() || hasExistingProfile
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:scale-105 hover:shadow-xl"
                  }`}
                >
                  {loading ? "등록 중..." : "펜팔 등록하기"}
                </button>
              </div>
            </form>
          </motion.div>
        </main>
      </div>
    </AuthGuard>
  );
}


