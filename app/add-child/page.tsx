"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import EnglishLevelSelector from "@/app/components/EnglishLevelSelector";
import { EnglishLevel, ChildProfile } from "@/app/types";

interface ChildInfo {
  childName: string; // 아이 이름 (데이터 식별용 + UI 표현용)
  parentId: string; // 부모 아이디 (로그인한 사용자 UID)
  age: number;
  grade: string;
  englishLevel: EnglishLevel | "";
  arScore: string;
  avatar: string;
}

interface ParentInfo {
  parentName: string; // 부모 노출 이름
  accountType: "parent"; // 계정 타입
}

const avatars = ["👦", "👧", "🧒", "👶", "🎭", "🦸", "🧙", "👨‍🚀"];

export default function AddChildPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddingSecond = searchParams.get("mode") === "add"; // 두 번째 아이 추가 모드
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingChildrenCount, setExistingChildrenCount] = useState(0);
  const [error, setError] = useState("");
  const [addParent, setAddParent] = useState(false);
  const [parentName, setParentName] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  const [formData, setFormData] = useState<ChildInfo>({
    childName: "",
    parentId: user?.uid || "",
    age: 8,
    grade: "",
    englishLevel: "",
    arScore: "",
    avatar: avatars[0],
  });

  // user가 변경되면 parentId 업데이트
  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, parentId: user.uid }));
    }
  }, [user]);

  // 기존 아이 수 확인 및 구독 정보 로드
  useEffect(() => {
    const checkExistingChildren = async () => {
      if (!user || !db) {
        setCheckingExisting(false);
        return;
      }

      try {
        // 구독 정보 조회
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const plan = userData.subscriptionPlan || "free";
          setSubscriptionPlan(plan);
          console.log("💎 구독 플랜:", plan);
        }

        const childrenRef = collection(db, "children");
        const q = query(childrenRef, where("parentId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const count = querySnapshot.size;
        
        setExistingChildrenCount(count);
        console.log("👶 기존 아이 수:", count);

        // 무료/베이직 사용자는 1명만 가능
        if ((subscriptionPlan === "free" || subscriptionPlan === "basic") && count >= 1 && isAddingSecond) {
          setError("🔒 무료 및 베이직 플랜은 아이 1명만 등록 가능합니다.");
        }
        // 프리미엄 사용자는 3명까지 가능
        else if ((subscriptionPlan === "premium" || subscriptionPlan === "family") && count >= 3 && isAddingSecond) {
          setError("⚠️ 최대 3명의 아이까지 등록 가능합니다.");
        }
      } catch (err) {
        console.error("❌ 기존 아이 확인 실패:", err);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingChildren();
  }, [user, isAddingSecond, subscriptionPlan]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!user || !db) {
        throw new Error("로그인이 필요합니다.");
      }

      // 무료/베이직 사용자는 1명만 가능
      if ((subscriptionPlan === "free" || subscriptionPlan === "basic") && existingChildrenCount >= 1) {
        throw new Error("🔒 무료 및 베이직 플랜은 아이 1명만 등록 가능합니다.\n\n프리미엄 플랜으로 업그레이드하시면 최대 3명까지 등록할 수 있습니다.");
      }

      // 프리미엄 사용자는 3명까지 가능
      if ((subscriptionPlan === "premium" || subscriptionPlan === "family") && existingChildrenCount >= 3) {
        throw new Error("⚠️ 최대 3명의 아이까지 등록 가능합니다.");
      }

      // 아이 ID 결정 (child1, child2, child3)
      const childId = `child${existingChildrenCount + 1}`;
      console.log(`👶 아이 추가: ${childId} (기존 ${existingChildrenCount}명)`);

      // 아이 정보 저장
      const childData: ChildProfile = {
        id: childId,
        childName: formData.childName,
        parentId: user.uid,
        email: user.email || undefined,
        age: formData.age,
        grade: formData.grade,
        englishLevel: formData.englishLevel,
        arScore: formData.arScore,
        avatar: formData.avatar,
        accountType: "child",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // children 컬렉션에 저장 (문서 ID를 ${userId}_${childId} 형태로)
      const docId = `${user.uid}_${childId}`;
      await setDoc(doc(db, "children", docId), childData);
      console.log(`✅ 아이 정보 저장 완료: ${docId}`);

      // 부모 프로필 처리
      const parentRef = doc(db, "parents", user.uid);
      const parentSnap = await getDoc(parentRef);

      if (addParent && parentName.trim() && !parentSnap.exists()) {
        // 부모 프로필 신규 생성
        const parentData = {
          parentId: user.uid,
          parentName: parentName.trim(),
          email: user.email || undefined,
          children: [childId],
          accountType: "parent",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(parentRef, parentData);
        localStorage.setItem("parentInfo", JSON.stringify(parentData));
        console.log("✅ 부모 프로필 생성 완료");
      } else if (parentSnap.exists()) {
        // 기존 부모 프로필에 아이 추가
        const existingParentData = parentSnap.data();
        const updatedChildren = [...(existingParentData.children || []), childId];
        await setDoc(parentRef, {
          ...existingParentData,
          children: updatedChildren,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log("✅ 부모 프로필 업데이트 완료 (아이 추가)");
      }

      // LocalStorage에 현재 선택된 아이 저장
      localStorage.setItem("currentChildId", childId);
      localStorage.setItem("childInfo", JSON.stringify(childData));

      // 대시보드로 이동
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 저장 실패:", error);
      setError(error.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">{isAddingSecond ? "👶➕" : "👶"}</div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {isAddingSecond ? `${existingChildrenCount + 1}번째 아이 정보 입력` : "아이 정보 입력"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isAddingSecond
                  ? `${existingChildrenCount + 1}번째 아이의 정보를 입력해주세요 (최대 2명)`
                  : "아이의 정보를 입력해주세요"}
              </p>
              {existingChildrenCount > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      💡 현재 {existingChildrenCount}명의 아이가 등록되어 있습니다.
                      {subscriptionPlan === "free" || subscriptionPlan === "basic" 
                        ? " (무료/베이직 플랜: 최대 1명)" 
                        : " (프리미엄 플랜: 최대 3명)"}
                    </p>
                  </div>
                  
                  {/* 무료/베이직 사용자가 1명 이상 등록한 경우 */}
                  {(subscriptionPlan === "free" || subscriptionPlan === "basic") && existingChildrenCount >= 1 && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border-2 border-purple-300 dark:border-purple-700">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">💎</div>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-purple-800 dark:text-purple-300 mb-2">
                            더 많은 아이를 등록하고 싶으신가요?
                          </h4>
                          <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
                            <strong>프리미엄 플랜</strong>으로 업그레이드하시면:
                          </p>
                          <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1 mb-4">
                            <li>✅ 최대 <strong>3명</strong>의 아이 등록 가능</li>
                            <li>✅ 아이 전환 기능으로 쉽게 관리</li>
                            <li>✅ 부모 모드 전환 기능</li>
                            <li>✅ 일기 첨삭 무제한 + TTS 무제한</li>
                          </ul>
                          <button
                            type="button"
                            onClick={() => router.push("/pricing")}
                            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-lg hover:scale-105 transition-all shadow-lg"
                          >
                            프리미엄 플랜 보기 →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 프리미엄 사용자가 3명 등록한 경우 */}
                  {(subscriptionPlan === "premium" || subscriptionPlan === "family") && existingChildrenCount >= 3 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        ⚠️ 프리미엄 플랜은 최대 3명까지 등록 가능합니다.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 부모 아이디 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  부모 아이디 (자동 입력)
                </label>
                <input
                  type="text"
                  value={formData.parentId || user?.uid || ""}
                  disabled
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  placeholder="로그인한 계정의 아이디가 자동으로 입력됩니다"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  로그인한 부모 계정의 아이디입니다. 변경할 수 없습니다.
                </p>
              </div>

              {/* 아이 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  아이 이름 *
                </label>
                <input
                  type="text"
                  value={formData.childName}
                  onChange={(e) =>
                    setFormData({ ...formData, childName: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="아이의 이름을 입력하세요 (예: 민준, 지아)"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  게시판에 "OO이(가) 쓴 글" 형식으로 표시됩니다.
                </p>
              </div>

              {/* 나이와 학년 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    나이 *
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="18"
                    value={formData.age}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        age: parseInt(e.target.value) || 8,
                      })
                    }
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    학년
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) =>
                      setFormData({ ...formData, grade: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">선택 안 함</option>
                    <option value="유치원">유치원</option>
                    <option value="1학년">1학년</option>
                    <option value="2학년">2학년</option>
                    <option value="3학년">3학년</option>
                    <option value="4학년">4학년</option>
                    <option value="5학년">5학년</option>
                    <option value="6학년">6학년</option>
                    <option value="중1">중1</option>
                    <option value="중2">중2</option>
                    <option value="중3">중3</option>
                  </select>
                </div>
              </div>

              {/* 영어 실력 수준 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  영어 실력 수준 *
                </label>
                <EnglishLevelSelector
                  selectedLevel={formData.englishLevel}
                  onLevelChange={(level) =>
                    setFormData({ ...formData, englishLevel: level })
                  }
                />
              </div>

              {/* AR 점수 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AR 점수 (선택)
                </label>
                <input
                  type="text"
                  value={formData.arScore}
                  onChange={(e) =>
                    setFormData({ ...formData, arScore: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 2.5"
                />
              </div>

              {/* 아바타 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  아바타 선택
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, avatar })
                      }
                      className={`text-5xl p-4 rounded-xl border-2 transition-all ${
                        formData.avatar === avatar
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-110"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              {/* 부모 프로필 추가 옵션 (프리미엄 전용) */}
              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6 mt-6">
                {(subscriptionPlan === "premium" || subscriptionPlan === "family") ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                          👨‍💼 부모 프로필 추가 (선택사항)
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          부모도 함께 영어 작문 연습을 할 수 있어요!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAddParent(!addParent)}
                        className={`relative w-14 h-8 rounded-full transition-colors ${
                          addParent ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                            addParent ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {addParent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-700">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            부모 이름 (노출 이름) *
                          </label>
                          <input
                            type="text"
                            value={parentName}
                            onChange={(e) => setParentName(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="예: 김엄마, 박아빠"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            💡 부모 계정으로 전환하면 성인용 영어 작문 첨삭을 받을 수 있어요!
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border-2 border-purple-300 dark:border-purple-700">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">💎</div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-purple-800 dark:text-purple-300 mb-2">
                          부모도 함께 영어 작문 연습을 하고 싶으신가요?
                        </h4>
                        <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
                          <strong>프리미엄 플랜</strong>에서는:
                        </p>
                        <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1 mb-4">
                          <li>✅ 부모 계정 전환 기능</li>
                          <li>✅ 성인용 고급 영어 작문 첨삭</li>
                          <li>✅ 아이 2명 이상 관리 가능</li>
                          <li>✅ 무제한 첨삭 + TTS 무제한</li>
                        </ul>
                        <button
                          type="button"
                          onClick={() => router.push("/pricing")}
                          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-lg hover:scale-105 transition-all shadow-lg"
                        >
                          프리미엄 플랜 보기 →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={
                    loading || 
                    !formData.childName || 
                    !formData.englishLevel ||
                    (addParent && !parentName.trim())
                  }
                  className={`flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all ${
                    loading || 
                    !formData.childName || 
                    !formData.englishLevel ||
                    (addParent && !parentName.trim())
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:scale-105 hover:shadow-xl"
                  }`}
                >
                  {loading ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}

