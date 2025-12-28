"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import DiaryList from "./diary-list";
import { collection, query, where, getDocs } from "firebase/firestore";
import { DiaryEntry, ChildProfile } from "@/app/types";
import AddressNotificationBanner from "@/app/components/AddressNotificationBanner";
import ChildSwitcher from "@/app/components/ChildSwitcher";
import { isPenpalEnabled } from "@/lib/featureFlags";

interface AdminMessage {
  id: string;
  title: string;
  content: string;
  createdAt: any;
  isRead: boolean;
}

interface ChildInfo {
  childName: string; // 아이 이름
  parentId: string; // 부모 아이디
  age: number;
  grade: string;
  englishLevel: string;
  arScore: string;
  avatar: string;
  name?: string; // 하위 호환성을 위한 필드 (기존 데이터)
}

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [childInfo, setChildInfo] = useState<ChildInfo | null>(null);
  const [parentInfo, setParentInfo] = useState<{ parentName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [badgeCount, setBadgeCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string }>>([]);
  const [currentAccountType, setCurrentAccountType] = useState<"child" | "parent">("child");
  const [hasParentAccount, setHasParentAccount] = useState(false);
  const [currentChildId, setCurrentChildId] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [canAddMoreChildren, setCanAddMoreChildren] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  const [usedDiaryCount, setUsedDiaryCount] = useState<number>(0);
  const [maxDiaryCount, setMaxDiaryCount] = useState<number>(5);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<AdminMessage | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !db) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (adminDoc.exists() && adminDoc.data().isAdmin === true) {
          setIsAdmin(true);
          // 관리자인 경우 관리자 페이지로 자동 리디렉션
          router.push("/admin");
        }
      } catch (error) {
        console.error("Error checking admin:", error);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, router]);

  useEffect(() => {
    const loadChildInfo = async () => {
      if (!user || !db) {
        setLoading(false);
        return;
      }

      try {
        console.log("👶 아이 정보 로딩 시작...");

        // 부모 계정 확인
        const parentRef = doc(db, "parents", user.uid);
        const parentSnap = await getDoc(parentRef);
        const hasParent = parentSnap.exists();
        setHasParentAccount(hasParent);
        
        if (parentSnap.exists()) {
          const parentData = parentSnap.data();
          setParentInfo({
            parentName: parentData.parentName || "부모"
          });
        }

        // 현재 계정 타입 불러오기
        const savedAccountType = localStorage.getItem("currentAccountType") as "child" | "parent" | null;
        if (savedAccountType && savedAccountType === "parent" && parentSnap.exists()) {
          setCurrentAccountType("parent");
        } else {
          setCurrentAccountType("child");
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

        console.log("✅ 아이 목록 로딩 완료:", childList);
        setChildren(childList);
        
        // 구독 플랜에 따른 아이 추가 가능 여부 (나중에 subscriptionPlan과 함께 확인)
        // 무료/베이직: 1명만, 프리미엄: 3명까지
        setCanAddMoreChildren(childList.length < 3);

        // 현재 선택된 아이 ID 불러오기
        let selectedChildId = localStorage.getItem("currentChildId");
        
        // 아이가 없으면 등록 페이지로
        if (childList.length === 0) {
          if (!isAdmin) {
            router.push("/add-child");
          }
          return;
        }

        // 선택된 아이가 없거나 유효하지 않으면 첫 번째 아이 선택
        if (!selectedChildId || !childList.find(c => c.id === selectedChildId)) {
          selectedChildId = childList[0].id;
          localStorage.setItem("currentChildId", selectedChildId);
        }

        setCurrentChildId(selectedChildId);

        // 현재 선택된 아이 정보 로드
        const currentChild = childList.find(c => c.id === selectedChildId);
        if (currentChild) {
          setChildInfo({
            childName: currentChild.childName,
            parentId: currentChild.parentId,
            age: currentChild.age,
            grade: currentChild.grade,
            englishLevel: currentChild.englishLevel,
            arScore: currentChild.arScore,
            avatar: currentChild.avatar,
          });
          localStorage.setItem("childInfo", JSON.stringify(currentChild));
        }
      } catch (error) {
        console.error("❌ Error loading child info:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!checkingAdmin) {
      loadChildInfo();
    }
  }, [user, router, isAdmin, checkingAdmin]);

  // 구독 정보 로드
  useEffect(() => {
    const loadSubscriptionInfo = async () => {
      if (!user || !db) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const plan = userData.subscriptionPlan || "free";
          setSubscriptionPlan(plan);
          
          // 플랜별 최대 첨삭 횟수 설정
          if (plan === "free") {
            setMaxDiaryCount(5);
          } else if (plan === "basic") {
            setMaxDiaryCount(30);
          } else if (plan === "premium" || plan === "family") {
            setMaxDiaryCount(999); // 무제한 (표시용 큰 숫자)
          }
        }

        // 이번 달 사용 횟수 조회
        if (currentChildId) {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          const diariesRef = collection(db, "diaries");
          const q = query(
            diariesRef,
            where("userId", "==", user.uid),
            where("childId", "==", currentChildId)
          );
          const snapshot = await getDocs(q);
          
          // 이번 달 일기만 카운트
          const thisMonthCount = snapshot.docs.filter(doc => {
            const createdAt = new Date(doc.data().createdAt);
            return createdAt >= startOfMonth;
          }).length;
          
          setUsedDiaryCount(thisMonthCount);
        }
      } catch (error) {
        console.error("❌ 구독 정보 로드 실패:", error);
      }
    };

    loadSubscriptionInfo();
  }, [user, currentChildId]);

  // 관리자 메시지 로드 (로그인 시 팝업)
  useEffect(() => {
    const loadAdminMessages = async () => {
      if (!user || !db) return;

      try {
        const messagesRef = collection(db, "messages");
        const q = query(
          messagesRef,
          where("userId", "==", user.uid),
          where("isRead", "==", false)
        );
        const snapshot = await getDocs(q);
        
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          content: doc.data().content,
          createdAt: doc.data().createdAt,
          isRead: doc.data().isRead,
        })) as AdminMessage[];

        setAdminMessages(messages);
        
        // 읽지 않은 메시지가 있으면 첫 번째 메시지를 팝업으로 표시
        if (messages.length > 0) {
          setCurrentMessage(messages[0]);
          setShowMessagePopup(true);
        }
      } catch (error) {
        console.error("❌ 메시지 로드 실패:", error);
      }
    };

    loadAdminMessages();
  }, [user]);

  // 메시지 읽음 처리
  const markMessageAsRead = async (messageId: string) => {
    if (!db) return;
    
    try {
      const messageRef = doc(db, "messages", messageId);
      await updateDoc(messageRef, {
        isRead: true,
      });
      
      // 다음 메시지 표시
      const remainingMessages = adminMessages.filter(m => m.id !== messageId);
      setAdminMessages(remainingMessages);
      
      if (remainingMessages.length > 0) {
        setCurrentMessage(remainingMessages[0]);
      } else {
        setShowMessagePopup(false);
        setCurrentMessage(null);
      }
    } catch (error) {
      console.error("❌ 메시지 읽음 처리 실패:", error);
    }
  };


  // 배지 개수 및 알림 로드
  useEffect(() => {
    const loadBadgesAndNotifications = async () => {
      if (!user || !db) return;

      try {
        // 배지 개수 가져오기
        const badgesRef = collection(db, `users/${user.uid}/badges`);
        const badgesSnapshot = await getDocs(badgesRef);
        setBadgeCount(badgesSnapshot.size);

        // 알림 가져오기 (읽지 않은 알림만)
        const notificationsRef = collection(db, `users/${user.uid}/notifications`);
        const notificationsQuery = query(notificationsRef, where("read", "==", false));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        
        const notificationsList: any[] = [];
        notificationsSnapshot.forEach((doc) => {
          notificationsList.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        
        setNotifications(notificationsList);
      } catch (error) {
        console.error("Error loading badges and notifications:", error);
      }
    };

    if (user && db) {
      loadBadgesAndNotifications();
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };


  if (loading || checkingAdmin) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 주소 입력 알림 배너 */}
        <AddressNotificationBanner />
        
        {/* 헤더 - 메인과 동일한 메뉴바 */}
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between h-16"
            >
              {/* 로고 */}
              <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                  <Image 
                    src="/icon-192x192.png?v=2" 
                    alt="EddieU AI 로고" 
                    width={40} 
                    height={40}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    EddieU AI
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                    영어일기·작문·스피킹 올인원
                  </p>
                </div>
              </Link>

              {/* 네비게이션 */}
              <nav className="flex items-center gap-2 sm:gap-4">
                <Link
                  href="/courses"
                  className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  📚 코스
                </Link>
                <Link
                  href="/dashboard"
                  className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  ✍️ 영어일기
                </Link>
                <Link
                  href="/pricing"
                  className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  요금제
                </Link>
                <Link
                  href="/board"
                  className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  게시판
                </Link>
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* 현재 요금제 표시 버튼 */}
                  <Link href="/pricing">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all text-sm ${
                        subscriptionPlan === "free"
                          ? "bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                          : subscriptionPlan === "basic"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      }`}
                    >
                      <span className="text-base sm:text-lg">
                        {subscriptionPlan === "free" ? "🆓" : subscriptionPlan === "basic" ? "💙" : "💎"}
                      </span>
                      <span className="hidden sm:inline">
                        {subscriptionPlan === "free" 
                          ? "무료" 
                          : subscriptionPlan === "basic"
                          ? "베이직"
                          : "프리미엄"
                        }
                      </span>
                    </motion.button>
                  </Link>
                  {/* 아이 전환 버튼 (프리미엄만, 2명 이상일 때만) */}
                  {currentAccountType === "child" && children.length > 1 && (subscriptionPlan === "premium" || subscriptionPlan === "family") && (
                    <ChildSwitcher
                      currentChildId={currentChildId}
                      onChildChange={(childId) => {
                        console.log("🔄 아이 전환:", childId);
                        setCurrentChildId(childId);
                        localStorage.setItem("currentChildId", childId);
                        
                        // 선택된 아이 정보 업데이트
                        const selectedChild = children.find(c => c.id === childId);
                        if (selectedChild) {
                          setChildInfo({
                            childName: selectedChild.childName,
                            parentId: selectedChild.parentId,
                            age: selectedChild.age,
                            grade: selectedChild.grade,
                            englishLevel: selectedChild.englishLevel,
                            arScore: selectedChild.arScore,
                            avatar: selectedChild.avatar,
                          });
                          localStorage.setItem("childInfo", JSON.stringify(selectedChild));
                          // 페이지 새로고침하여 일기 목록 갱신
                          window.location.reload();
                        }
                      }}
                    />
                  )}

                  <button
                    onClick={handleSignOut}
                    className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </nav>
            </motion.div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          {childInfo ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* 현재 모드 표시 */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-4 py-2 text-center relative z-0">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {currentAccountType === "child" ? "👶 아이 모드입니다." : "👨‍💼 부모 모드입니다."}
                </span>
              </div>
              {/* 알림 표시 */}
              {notifications.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-xl shadow-lg p-6 border-2 border-yellow-300 dark:border-yellow-700"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-4xl">🎉</div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                            {notification.title}
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* 환영 메시지 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center relative">
                <div className="text-6xl mb-4">{currentAccountType === "child" ? childInfo.avatar : "👨‍💼"}</div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 flex items-center justify-center gap-3">
                  안녕하세요, {currentAccountType === "child" ? (childInfo.childName || childInfo.name) : (parentInfo?.parentName || "부모")}님! 👋
                  {badgeCount > 0 && currentAccountType === "child" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, 360] }}
                      transition={{ duration: 0.6 }}
                      className="relative"
                    >
                      <div className="text-5xl">⭐</div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                        {badgeCount >= 10 ? "10" : badgeCount}
                      </div>
                    </motion.div>
                  )}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentAccountType === "child" 
                    ? (badgeCount > 0 
                        ? `오늘의 일기 배지 ${badgeCount}개를 보유하고 있어요!` 
                        : "영어 일기를 첨삭받아보세요!")
                    : "영어 작문을 첨삭받아보세요!"
                  }
                </p>
                {badgeCount > 0 && currentAccountType === "child" && (
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {badgeCount < 10 
                      ? `${10 - badgeCount}개 더 모으면 숫자 10 별로 업그레이드돼요!` 
                      : "🎊 축하합니다! 숫자 10 별을 달성했어요!"}
                  </div>
                )}
              </div>

              {/* 아이 정보 카드 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                  아이 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">나이</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-white">
                      {childInfo.age}세
                    </p>
                  </div>
                  {childInfo.grade && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">학년</p>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">
                        {childInfo.grade}
                      </p>
                    </div>
                  )}
                  {childInfo.englishLevel && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        영어 실력
                      </p>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">
                        {childInfo.englishLevel}
                      </p>
                    </div>
                  )}
                  {childInfo.arScore && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        AR 점수
                      </p>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">
                        {childInfo.arScore}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => router.push("/profile")}
                    className="text-blue-500 hover:text-blue-600 text-sm font-semibold"
                  >
                    ⚙️ 프로필 수정하기 →
                  </button>
                  {/* 부모 모드 전환 버튼 (프리미엄만) */}
                  {hasParentAccount && (subscriptionPlan === "premium" || subscriptionPlan === "family") && (
                    <button
                      onClick={() => {
                        const newType = currentAccountType === "child" ? "parent" : "child";
                        console.log("🔄 계정 전환:", { from: currentAccountType, to: newType });
                        setCurrentAccountType(newType);
                        localStorage.setItem("currentAccountType", newType);
                      }}
                      className="text-blue-500 hover:text-blue-600 text-sm font-semibold"
                    >
                      {currentAccountType === "child" ? "👨‍💼 부모모드" : "👶 아이모드"}
                    </button>
                  )}
                  {/* 무료/베이직 사용자가 부모 모드 전환하려고 할 때 */}
                  {hasParentAccount && (subscriptionPlan === "free" || subscriptionPlan === "basic") && (
                    <button
                      onClick={() => {
                        if (confirm("🔒 부모 모드 전환은 프리미엄 플랜에서만 이용 가능합니다.\n\n프리미엄 플랜에서는 부모 계정과 아이 계정을 자유롭게 전환할 수 있습니다.\n\n요금제 페이지로 이동하시겠습니까?")) {
                          router.push("/pricing");
                        }
                      }}
                      className="text-gray-400 hover:text-gray-500 text-sm font-semibold"
                    >
                      🔒 부모모드
                    </button>
                  )}
                </div>
              </div>

              {/* 일기 목록 */}
              {user?.uid && (
                <div className="mt-8">
                  <DiaryList 
                    userId={user.uid} 
                    currentAccountType={currentAccountType}
                    currentChildId={currentChildId}
                  />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              {isAdmin ? (
                <>
                  <div className="text-6xl mb-4">🛡️</div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    관리자 계정입니다
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    관리자 페이지에서 시스템을 관리할 수 있습니다.
                  </p>
                  <Link
                    href="/admin"
                    className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:scale-105 transition-all"
                  >
                    관리자 페이지로 이동 →
                  </Link>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">👶</div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    아이 정보를 먼저 입력해주세요
                  </h2>
                  <button
                    onClick={() => router.push("/add-child")}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:scale-105 transition-all"
                  >
                    아이 정보 입력하기
                  </button>
                </>
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* 관리자 메시지 팝업 */}
      <AnimatePresence>
        {showMessagePopup && currentMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => currentMessage && markMessageAsRead(currentMessage.id)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">📩</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {currentMessage.title}
                </h2>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {currentMessage.content}
                </p>
              </div>

              {adminMessages.length > 1 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
                  💡 읽지 않은 메시지 {adminMessages.length}개
                </p>
              )}

              <button
                onClick={() => markMessageAsRead(currentMessage.id)}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:scale-105 transition-all shadow-lg"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthGuard>
  );
}

