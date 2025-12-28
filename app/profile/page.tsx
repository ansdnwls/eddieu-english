"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { deleteUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGuard from "@/components/AuthGuard";
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, deleteDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import EnglishLevelSelector from "@/app/components/EnglishLevelSelector";
import { EnglishLevel, ChildProfile } from "@/app/types";

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
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentAccountType, setCurrentAccountType] = useState<"child" | "parent">("child");
  const [hasParentAccount, setHasParentAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [addParent, setAddParent] = useState(false);
  const [parentName, setParentName] = useState("");
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [withdrawalDetail, setWithdrawalDetail] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [currentChildId, setCurrentChildId] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [canAddMoreChildren, setCanAddMoreChildren] = useState(false);
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
        // 구독 정보 조회
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const plan = userData.subscriptionPlan || "free";
          setSubscriptionPlan(plan);
          console.log("💎 구독 플랜:", plan);
        }

        // 모든 아이 목록 로드
        const childrenRef = collection(db, "children");
        const q = query(childrenRef, where("parentId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        const childList: ChildProfile[] = [];
        querySnapshot.forEach((doc) => {
          childList.push({
            id: doc.id.includes("_") ? doc.id.split("_")[1] : doc.id,
            ...doc.data(),
          } as ChildProfile);
        });

        setChildren(childList);
        
        // 구독 플랜에 따른 아이 추가 가능 여부
        const plan = userDoc.exists() ? (userDoc.data().subscriptionPlan || "free") : "free";
        setCanAddMoreChildren(childList.length < (plan === "premium" || plan === "family" ? 3 : 1));

        // 현재 선택된 아이 ID 가져오기
        const savedChildId = localStorage.getItem("currentChildId") || "child1";
        setCurrentChildId(savedChildId);
        
        // 아이 정보 확인 (다중 아이 지원)
        const childDocId = `${user.uid}_${savedChildId}`;
        const childRef = doc(db, "children", childDocId);
        const childSnap = await getDoc(childRef);
        
        console.log("📄 조회 중인 문서 ID:", childDocId);

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

      // 현재 선택된 아이 ID 가져오기
      const savedChildId = currentChildId || localStorage.getItem("currentChildId") || "child1";
      const childDocId = `${user.uid}_${savedChildId}`;
      
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

      // Firestore 업데이트 (다중 아이 지원)
      await updateDoc(doc(db, "children", childDocId), childData);
      
      // localStorage의 childInfo도 업데이트
      localStorage.setItem("childInfo", JSON.stringify({
        id: savedChildId,
        ...childData,
      }));

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

  // 아이 계정 삭제
  const handleDeleteChild = async () => {
    if (!user || !db || !currentChildId) {
      alert("오류가 발생했습니다.");
      return;
    }

    // 1차 확인
    const confirm1 = confirm(
      `⚠️ 정말로 "${formData.childName}" 아이의 계정을 삭제하시겠습니까?\n\n` +
      `삭제되는 데이터:\n` +
      `✓ 아이 정보\n` +
      `✓ 모든 일기 및 작문\n` +
      `✓ 펜팔 프로필\n` +
      `✓ 학습 기록\n\n` +
      `⚠️ 삭제된 데이터는 복구할 수 없습니다!`
    );

    if (!confirm1) return;

    // 2차 확인 모달 표시
    setShowDeleteConfirm(true);
  };

  // 삭제 확인 완료
  const confirmDeleteChild = async () => {
    if (deleteConfirmName !== formData.childName) {
      alert("아이 이름이 일치하지 않습니다. 삭제가 취소되었습니다.");
      setDeleteConfirmName("");
      return;
    }

    setSaving(true);
    setError("");
    setShowDeleteConfirm(false);
    setDeleteConfirmName("");

    try {
      const childDocId = `${user.uid}_${currentChildId}`;

      // 1. 아이의 모든 일기 삭제
      const diariesQuery = query(
        collection(db, "diaries"),
        where("userId", "==", user.uid),
        where("childId", "==", currentChildId)
      );
      const diariesSnapshot = await getDocs(diariesQuery);
      for (const diaryDoc of diariesSnapshot.docs) {
        await deleteDoc(doc(db, "diaries", diaryDoc.id));
      }
      console.log(`🗑️ ${diariesSnapshot.size}개의 일기 삭제 완료`);

      // 2. 펜팔 프로필 삭제
      const penpalQuery = query(
        collection(db, "penpalProfiles"),
        where("userId", "==", user.uid),
        where("childId", "==", currentChildId)
      );
      const penpalSnapshot = await getDocs(penpalQuery);
      for (const penpalDoc of penpalSnapshot.docs) {
        await deleteDoc(doc(db, "penpalProfiles", penpalDoc.id));
      }
      console.log(`🗑️ 펜팔 프로필 삭제 완료`);

      // 3. 아이 정보 삭제
      await deleteDoc(doc(db, "children", childDocId));
      console.log(`🗑️ 아이 정보 삭제 완료: ${childDocId}`);

      // 4. 부모 프로필에서 아이 제거
      const parentRef = doc(db, "parents", user.uid);
      const parentSnap = await getDoc(parentRef);
      if (parentSnap.exists()) {
        const parentData = parentSnap.data();
        const updatedChildren = (parentData.children || []).filter(
          (id: string) => id !== currentChildId
        );
        await updateDoc(parentRef, {
          children: updatedChildren,
          updatedAt: new Date().toISOString(),
        });
        console.log(`✅ 부모 프로필 업데이트 완료`);
      }

      // 5. localStorage 정리
      localStorage.removeItem("currentChildId");
      localStorage.removeItem("childInfo");

      alert(`✅ "${formData.childName}" 계정이 삭제되었습니다.`);
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 아이 계정 삭제 실패:", error);
      setError("계정 삭제 중 오류가 발생했습니다: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 부모 계정 삭제
  const handleDeleteParent = async () => {
    if (!user || !db || !hasParentAccount) {
      alert("부모 계정이 없습니다.");
      return;
    }

    const confirm1 = confirm(
      `⚠️ 정말로 부모 계정을 삭제하시겠습니까?\n\n` +
      `삭제되는 데이터:\n` +
      `✓ 부모 프로필 정보\n` +
      `✓ 부모 모드로 작성한 모든 작문\n\n` +
      `⚠️ 삭제된 데이터는 복구할 수 없습니다!\n` +
      `💡 아이 계정은 유지됩니다.`
    );

    if (!confirm1) return;

    setSaving(true);
    setError("");

    try {
      // 1. 부모 모드로 작성한 작문 삭제
      const compositionsQuery = query(
        collection(db, "diaries"),
        where("userId", "==", user.uid),
        where("accountType", "==", "parent")
      );
      const compositionsSnapshot = await getDocs(compositionsQuery);
      for (const compDoc of compositionsSnapshot.docs) {
        await deleteDoc(doc(db, "diaries", compDoc.id));
      }
      console.log(`🗑️ ${compositionsSnapshot.size}개의 부모 작문 삭제 완료`);

      // 2. 부모 프로필 삭제
      await deleteDoc(doc(db, "parents", user.uid));
      console.log(`🗑️ 부모 프로필 삭제 완료`);

      setHasParentAccount(false);
      setParentName("");
      setAddParent(false);
      alert("✅ 부모 계정이 삭제되었습니다.");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 부모 계정 삭제 실패:", error);
      setError("부모 계정 삭제 중 오류가 발생했습니다: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalReason) {
      setError("탈퇴 사유를 선택해주세요.");
      return;
    }

    // 1차 확인
    const confirm1 = confirm(
      "⚠️ 정말로 회원탈퇴를 하시겠습니까?\n\n" +
      "삭제되는 모든 데이터:\n" +
      "✓ 모든 아이 계정\n" +
      "✓ 부모 계정\n" +
      "✓ 모든 일기 및 작문\n" +
      "✓ 펜팔 프로필 및 매칭\n" +
      "✓ 학습 기록 및 통계\n" +
      "✓ 구독 정보\n\n" +
      "⚠️ 삭제된 데이터는 절대 복구할 수 없습니다!"
    );

    if (!confirm1) return;

    // 2차 확인 (최종 확인)
    const confirm2 = confirm(
      "🛑 최종 확인\n\n" +
      "정말로 탈퇴하시겠습니까?\n" +
      "이 작업은 되돌릴 수 없습니다.\n\n" +
      "확인을 누르면 즉시 회원탈퇴가 진행됩니다."
    );

    if (!confirm2) return;

    if (!user || !db) {
      setError("로그인이 필요합니다.");
      return;
    }

    setWithdrawing(true);
    setError("");
    setSuccess("");

    try {
      const firestoreDb = db as NonNullable<typeof db>;

      // 1. 탈퇴 이력 저장 (관리자 확인용)
      // 자녀 수 계산
      const childrenCountQuery = query(
        collection(firestoreDb, "children"),
        where("parentId", "==", user.uid)
      );
      const childrenCountSnapshot = await getDocs(childrenCountQuery);
      const childrenCount = childrenCountSnapshot.size;

      // 일기 수 계산
      const diariesCountQuery = query(
        collection(firestoreDb, "diaries"),
        where("userId", "==", user.uid)
      );
      const diariesCountSnapshot = await getDocs(diariesCountQuery);
      const diariesCount = diariesCountSnapshot.size;

      const withdrawalRecord = {
        userId: user.uid,
        userEmail: user.email || "",
        childName: formData.childName || "",
        reason: withdrawalReason,
        detail: withdrawalDetail || "",
        childrenCount: childrenCount,
        diariesCount: diariesCount,
        withdrawnAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(firestoreDb, "withdrawalRequests"), withdrawalRecord);
      console.log("✅ 탈퇴 기록 저장 완료 (자녀:", childrenCount, "일기:", diariesCount, ")");

      // 2. 사용자 데이터 삭제
      // children 컬렉션에서 모든 자녀 삭제 (다중 자녀 지원)
      const childrenQuery = query(
        collection(firestoreDb, "children"),
        where("parentId", "==", user.uid)
      );
      const childrenSnapshot = await getDocs(childrenQuery);
      for (const childDoc of childrenSnapshot.docs) {
        await deleteDoc(doc(firestoreDb, "children", childDoc.id));
        console.log("🗑️ 자녀 정보 삭제:", childDoc.id);
      }
      
      // parents 컬렉션에서 삭제 (있다면)
      const parentRef = doc(firestoreDb, "parents", user.uid);
      const parentSnap = await getDoc(parentRef);
      if (parentSnap.exists()) {
        await deleteDoc(parentRef);
      }

      // 사용자의 일기들 삭제
      const diariesQuery = query(
        collection(firestoreDb, "diaries"),
        where("userId", "==", user.uid)
      );
      const diariesSnapshot = await getDocs(diariesQuery);
      for (const diaryDoc of diariesSnapshot.docs) {
        await deleteDoc(doc(firestoreDb, "diaries", diaryDoc.id));
      }

      // 구독 정보 삭제 (있다면)
      const subscriptionsQuery = query(
        collection(firestoreDb, "subscriptions"),
        where("userId", "==", user.uid)
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      for (const subDoc of subscriptionsSnapshot.docs) {
        await deleteDoc(doc(firestoreDb, "subscriptions", subDoc.id));
      }

      // Firebase Auth 계정 삭제
      if (auth && user) {
        try {
          await deleteUser(user);
          console.log("✅ Firebase Auth 계정 삭제 완료");
        } catch (authError: any) {
          console.error("Firebase Auth 계정 삭제 오류:", authError);
          // Auth 계정 삭제 실패해도 Firestore 데이터는 삭제되었으므로 계속 진행
        }
      }

      setSuccess("탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.");
      
      // 2초 후 홈으로 이동
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err: any) {
      setError("탈퇴 처리 중 오류가 발생했습니다: " + err.message);
      setWithdrawing(false);
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
                프로필 관리
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {formData.childName ? `${formData.childName}의 정보를 업데이트하세요` : "아이의 정보를 업데이트하세요"}
              </p>
              {currentChildId && (
                <div className="mt-3 inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm font-semibold">
                  👶 현재 수정 중: {currentChildId === "child1" ? "첫째" : "둘째"} ({currentChildId})
                </div>
              )}
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

              {/* 아이 추가 (프리미엄 전용) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6"
              >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  👶 아이 추가
                </h3>
                {subscriptionPlan === "premium" || subscriptionPlan === "family" ? (
                  <>
                    {canAddMoreChildren ? (
                      <Link href="/add-child?mode=add">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-2xl">👶➕</span>
                          <span>아이 추가하기</span>
                        </motion.button>
                      </Link>
                    ) : (
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 text-center">
                        <p className="text-gray-600 dark:text-gray-400">
                          최대 3명의 아이까지 등록 가능합니다. (현재 {children.length}명)
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border-2 border-purple-300 dark:border-purple-700">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">🔒</span>
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">
                          프리미엄 플랜 전용 기능
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          프리미엄 플랜으로 업그레이드하시면 최대 3명의 아이를 등록하고 관리할 수 있습니다.
                        </p>
                      </div>
                    </div>
                    <Link href="/pricing">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                      >
                        프리미엄 플랜 알아보기 →
                      </motion.button>
                    </Link>
                  </div>
                )}
              </motion.div>

              {/* 부모 프로필 추가/수정 (프리미엄 전용) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6"
              >
                {subscriptionPlan === "premium" || subscriptionPlan === "family" ? (
                  <>
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
                  </>
                ) : (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border-2 border-purple-300 dark:border-purple-700">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">💎</div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-purple-800 dark:text-purple-300 mb-2">
                          부모 프로필은 프리미엄 기능이에요!
                        </h4>
                        <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
                          <strong>프리미엄 플랜</strong>에서는:
                        </p>
                        <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1 mb-4">
                          <li>✅ 부모 프로필 생성 가능</li>
                          <li>✅ 성인용 고급 영어 작문 첨삭</li>
                          <li>✅ 부모 모드 전환 기능</li>
                          <li>✅ 일기 첨삭 무제한 + TTS 무제한</li>
                        </ul>
                        <Link href="/pricing">
                          <button
                            type="button"
                            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-lg hover:scale-105 transition-all shadow-lg"
                          >
                            프리미엄 플랜 보기 →
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

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

                      {/* 부모 계정 삭제 버튼 */}
                      {hasParentAccount && (
                        <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                          <button
                            type="button"
                            onClick={handleDeleteParent}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                          >
                            <span>🗑️</span>
                            <span>부모 계정 삭제하기</span>
                          </button>
                          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
                            ⚠️ 부모 모드로 작성한 모든 작문이 삭제됩니다
                          </p>
                        </div>
                      )}
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

              <div className="space-y-3">
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

                {/* 아이 계정 삭제 버튼 */}
                <button
                  type="button"
                  onClick={handleDeleteChild}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <span>🗑️</span>
                  <span>이 아이 계정 삭제하기</span>
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  ⚠️ 이 아이의 모든 일기와 데이터가 삭제됩니다 (복구 불가)
                </p>
              </div>
            </form>

            {/* 회원탈퇴 섹션 */}
            <div className="mt-12 pt-8 border-t-2 border-red-200 dark:border-red-800">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
                <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
                  ⚠️ 회원탈퇴
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  회원탈퇴를 하시면 모든 데이터가 삭제되며 복구할 수 없습니다.
                </p>
                
                {!showWithdrawal ? (
                  <button
                    onClick={() => setShowWithdrawal(true)}
                    className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all"
                  >
                    회원탈퇴 신청하기
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        탈퇴 사유 *
                      </label>
                      <select
                        value={withdrawalReason}
                        onChange={(e) => setWithdrawalReason(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="">선택해주세요</option>
                        <option value="서비스 불만">서비스 불만</option>
                        <option value="사용 빈도 낮음">사용 빈도 낮음</option>
                        <option value="다른 서비스 이용">다른 서비스 이용</option>
                        <option value="개인정보 우려">개인정보 우려</option>
                        <option value="가격 부담">가격 부담</option>
                        <option value="기타">기타</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        상세 사유 (선택사항)
                      </label>
                      <textarea
                        value={withdrawalDetail}
                        onChange={(e) => setWithdrawalDetail(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                        placeholder="탈퇴 사유를 자세히 알려주시면 서비스 개선에 도움이 됩니다."
                      />
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handleWithdrawal}
                        disabled={!withdrawalReason || withdrawing}
                        className={`flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all ${
                          !withdrawalReason || withdrawing
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {withdrawing ? "처리 중..." : "탈퇴 신청하기"}
                      </button>
                      <button
                        onClick={() => {
                          setShowWithdrawal(false);
                          setWithdrawalReason("");
                          setWithdrawalDetail("");
                        }}
                        disabled={withdrawing}
                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-all"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 아이 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
              ⚠️ 최종 확인
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              정말로 삭제하시려면 아이 이름 <strong>"{formData.childName}"</strong>을(를) 입력해주세요:
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="아이 이름을 입력하세요"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmName("");
                }}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                취소
              </button>
              <button
                onClick={confirmDeleteChild}
                disabled={deleteConfirmName !== formData.childName}
                className={`flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-lg transition-all ${
                  deleteConfirmName === formData.childName
                    ? "hover:bg-red-600"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                삭제
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AuthGuard>
  );
}


