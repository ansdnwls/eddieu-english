"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import EnglishLevelSelector from "@/app/components/EnglishLevelSelector";
import { EnglishLevel } from "@/app/types";

interface ChildInfo {
  childName: string;
  parentId: string;
  age: number;
  grade: string;
  englishLevel: EnglishLevel | "";
  arScore: string;
  avatar: string;
}

interface ParentInfo {
  parentName: string;
  accountType: "parent";
}

const avatars = ["👦", "👧", "🧒", "👶", "🎭", "🦸", "🧙", "👨‍🚀"];

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentAccountType, setCurrentAccountType] = useState<"child" | "parent">("child");
  const [hasParentAccount, setHasParentAccount] = useState(false);
  const [addParent, setAddParent] = useState(false);
  const [parentName, setParentName] = useState("");
  const [formData, setFormData] = useState<ChildInfo>({
    childName: "",
    parentId: user?.uid || "",
    age: 8,
    grade: "",
    englishLevel: "",
    arScore: "",
    avatar: avatars[0],
  });

  useEffect(() => {
    const loadProfileInfo = async () => {
      if (!db || !user) {
        setLoading(false);
        return;
      }

      try {
        // 아이 정보 확인
        const childRef = doc(db, "children", user.uid);
        const childSnap = await getDoc(childRef);

        // 부모 정보 확인
        const parentRef = doc(db, "parents", user.uid);
        const parentSnap = await getDoc(parentRef);
        
        console.log("👶 Child exists:", childSnap.exists());
        console.log("👨‍💼 Parent exists:", parentSnap.exists());
        if (parentSnap.exists()) {
          console.log("👨‍💼 Parent data:", parentSnap.data());
        }
        
        setHasParentAccount(parentSnap.exists());
        
        // 부모 정보가 있으면 불러오기
        if (parentSnap.exists()) {
          const parentData = parentSnap.data();
          setParentName(parentData.parentName || "");
        }

        if (childSnap.exists()) {
          const childData = childSnap.data();
          setFormData({
            childName: childData.childName || "",
            parentId: childData.parentId || user.uid,
            age: childData.age || 8,
            grade: childData.grade || "",
            englishLevel: childData.englishLevel || "",
            arScore: childData.arScore || "",
            avatar: childData.avatar || avatars[0],
          });
          
          // 현재 표시 중인 계정 타입 (localStorage에서 가져오기)
          const savedAccountType = localStorage.getItem("currentAccountType") as "child" | "parent" | null;
          if (savedAccountType && savedAccountType === "parent" && parentSnap.exists()) {
            setCurrentAccountType("parent");
          } else {
            setCurrentAccountType("child");
          }
        } else {
          // 아이 정보가 없으면 add-child로 이동
          router.push("/add-child");
        }
      } catch (err) {
        console.error("프로필 정보 로딩 오류:", err);
        setError("프로필 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadProfileInfo();
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      if (!user || !db) {
        throw new Error("로그인이 필요합니다.");
      }

      const childData = {
        childName: formData.childName,
        parentId: user.uid,
        email: user.email || null, // 부모(로그인 계정)의 이메일 추가
        age: formData.age,
        grade: formData.grade,
        englishLevel: formData.englishLevel,
        arScore: formData.arScore,
        avatar: formData.avatar,
        updatedAt: new Date().toISOString(),
      };

      // Firestore 업데이트
      await updateDoc(doc(db, "children", user.uid), childData);

      // 부모 프로필 추가 또는 수정
      if (parentName.trim()) {
        const parentData = {
          parentName: parentName.trim(),
          email: user.email || null, // 부모 이메일 추가
          accountType: "parent",
          updatedAt: new Date().toISOString(),
          ...((!hasParentAccount) && { createdAt: new Date().toISOString() }), // 새로 추가하는 경우에만 createdAt
        };
        
        // parents 컬렉션에 저장 (추가 또는 업데이트)
        await setDoc(doc(db, "parents", user.uid), parentData, { merge: true });
        
        // LocalStorage에도 저장
        localStorage.setItem("parentInfo", JSON.stringify(parentData));
        
        if (!hasParentAccount) {
          setHasParentAccount(true);
          setSuccess("프로필과 부모 계정이 성공적으로 추가되었습니다! 🎉");
        } else {
          setSuccess("프로필이 성공적으로 업데이트되었습니다! 🎉");
        }
      } else {
        setSuccess("프로필이 성공적으로 업데이트되었습니다! 🎉");
      }
      
      // 대시보드로 이동
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: any) {
      setError("저장 중 오류가 발생했습니다: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">⏳</div>
            <p className="text-gray-600 dark:text-gray-400">프로필 로딩 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

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
              <div className="text-5xl mb-4">{formData.avatar}</div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                프로필 수정
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                아이의 정보를 업데이트하세요
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 부모 아이디 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  부모 아이디 (변경 불가)
                </label>
                <input
                  type="text"
                  value={formData.parentId || user?.uid || ""}
                  disabled
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
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
                  placeholder="아이의 이름을 입력하세요"
                />
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
                  AR 점수 (Accelerated Reader) *
                </label>
                <input
                  type="text"
                  value={formData.arScore}
                  onChange={(e) =>
                    setFormData({ ...formData, arScore: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 2.5 또는 2.0-3.0"
                />
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  💡 <strong>AR 점수란?</strong> Accelerated Reader 점수로, 아이의 영어 읽기 수준을 나타냅니다.
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  예: "2.5" (2학년 5개월 수준), "2.0-3.0" (2~3학년 수준)
                </p>
                <p className="mt-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded p-2">
                  ✨ AR 점수는 GPT 대화 프롬프트에서 아이의 영어 수준에 맞는 대화를 생성하는 데 사용됩니다.
                </p>
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

              {/* 부모 프로필 추가/수정 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6"
              >
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setAddParent(!addParent)}
                    className={`w-full px-6 py-4 rounded-xl font-semibold transition-all flex items-center justify-between ${
                      addParent
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">👨‍💼</span>
                      <span>{hasParentAccount ? "부모 프로필 수정" : "부모 프로필 추가 (1+1)"}</span>
                    </span>
                    <span className="text-2xl">{addParent ? "▼" : "▶"}</span>
                  </button>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    💡 부모님도 영어 작문 연습을 하고 싶으시다면 부모 프로필을 {hasParentAccount ? "수정" : "추가"}하세요!
                  </p>
                </div>

                {addParent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4"
                  >
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-4xl">👨‍💼</span>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                            부모 프로필
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            게시판에 표시될 이름을 입력하세요
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          부모 이름 (노출 이름) *
                        </label>
                        <input
                          type="text"
                          value={parentName}
                          onChange={(e) => setParentName(e.target.value)}
                          placeholder="예: 민준엄마, 지아아빠"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          게시판에 "OO이(가) 쓴 글" 형식으로 표시됩니다.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-100 dark:bg-green-900/30 border border-green-400 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm font-semibold"
                >
                  {success}
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
                    saving || 
                    !formData.childName || 
                    !formData.englishLevel
                  }
                  className={`flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all ${
                    saving || 
                    !formData.childName || 
                    !formData.englishLevel
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:scale-105 hover:shadow-xl"
                  }`}
                >
                  {saving ? "저장 중..." : "변경사항 저장"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}


