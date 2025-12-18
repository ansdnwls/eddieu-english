"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import DiaryList from "./diary-list";
import { collection, query, where, getDocs } from "firebase/firestore";
import { DiaryEntry } from "@/app/types";
import AddressNotificationBanner from "@/app/components/AddressNotificationBanner";

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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [currentAccountType, setCurrentAccountType] = useState<"child" | "parent">("child");
  const [hasParentAccount, setHasParentAccount] = useState(false);

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
      if (!user) return;

      try {
        // Firestore에서 데이터 로드
        if (db) {
          const docRef = doc(db, "children", user.uid);
          const docSnap = await getDoc(docRef);

          // 부모 계정 확인
          const parentRef = doc(db, "parents", user.uid);
          const parentSnap = await getDoc(parentRef);
          const hasParent = parentSnap.exists();
          setHasParentAccount(hasParent);
          
          console.log("📊 부모 계정 확인:", {
            userId: user.uid,
            hasParent,
            parentData: parentSnap.exists() ? parentSnap.data() : null
          });
          
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

          if (docSnap.exists()) {
            setChildInfo(docSnap.data() as ChildInfo);
          } else {
            // LocalStorage에서 백업 로드
            const saved = localStorage.getItem("childInfo");
            if (saved) {
              setChildInfo(JSON.parse(saved));
            } else {
              // 관리자가 아닌 경우에만 아이 정보 입력 페이지로 이동
              if (!isAdmin) {
                router.push("/add-child");
              }
            }
          }
        } else {
          // LocalStorage에서 백업 로드
          const saved = localStorage.getItem("childInfo");
          if (saved) {
            setChildInfo(JSON.parse(saved));
          } else {
            // 관리자가 아닌 경우에만 아이 정보 입력 페이지로 이동
            if (!isAdmin) {
              router.push("/add-child");
            }
          }
        }
      } catch (error) {
        console.error("Error loading child info:", error);
        // LocalStorage에서 백업 로드
        const saved = localStorage.getItem("childInfo");
        if (saved) {
          setChildInfo(JSON.parse(saved));
        }
      } finally {
        setLoading(false);
      }
    };

    if (!checkingAdmin) {
      loadChildInfo();
    }
  }, [user, router, isAdmin, checkingAdmin]);

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
        
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <span className="text-3xl">✨</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                {currentAccountType === "child" ? "아이 영어일기 AI 첨삭" : "영어 작문 AI 첨삭"}
              </h1>
            </Link>
            <div className="flex items-center gap-3">
              {/* 계정 전환 버튼 */}
              {(() => {
                console.log("🔍 전환 버튼 렌더링:", { hasParentAccount, currentAccountType, parentInfo });
                return null;
              })()}
              {hasParentAccount && (
                <motion.button
                  type="button"
                  onClick={() => {
                    const newType = currentAccountType === "child" ? "parent" : "child";
                    console.log("🔄 계정 전환:", { from: currentAccountType, to: newType });
                    setCurrentAccountType(newType);
                    localStorage.setItem("currentAccountType", newType);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  <span className="text-lg">{currentAccountType === "child" ? "👨‍💼" : "👶"}</span>
                  <span className="text-sm">{currentAccountType === "child" ? "부모 모드 전환" : "아이 모드 전환"}</span>
                </motion.button>
              )}
              {/* 임시: 부모 계정 없어도 버튼 표시 (디버깅용) */}
              {!hasParentAccount && (
                <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-xs">
                  부모 계정 없음
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
              >
                로그아웃
              </button>
            </div>
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
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
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
                <button
                  onClick={() => router.push("/profile")}
                  className="mt-4 text-blue-500 hover:text-blue-600 text-sm font-semibold"
                >
                  ⚙️ 프로필 수정하기 →
                </button>
              </div>

              {/* 메인 기능 버튼 */}
              <Link href="/">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-6 px-8 rounded-2xl shadow-lg text-center text-xl cursor-pointer"
                >
                  📝 영어 일기 첨삭 시작하기
                </motion.div>
              </Link>

              {/* 영어작문 첨삭 버튼 */}
              <Link href="/composition">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-6 px-8 rounded-2xl shadow-lg text-center text-xl cursor-pointer mt-4"
                >
                  ✍️ 영어작문 첨삭 (편지, 에세이 등)
                </motion.div>
              </Link>

              {/* 빠른 링크 */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <Link href="/vocabulary">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg text-center cursor-pointer"
                  >
                    <div className="text-2xl mb-2">📚</div>
                    <div>단어장</div>
                  </motion.div>
                </Link>
                <Link href="/stats">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg text-center cursor-pointer"
                  >
                    <div className="text-2xl mb-2">📊</div>
                    <div>성장 통계</div>
                  </motion.div>
                </Link>
                <Link href="/penpal/manage">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg text-center cursor-pointer"
                  >
                    <div className="text-2xl mb-2">✉️</div>
                    <div>펜팔 관리</div>
                  </motion.div>
                </Link>
                <Link href="/board">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg text-center cursor-pointer"
                  >
                    <div className="text-2xl mb-2">📋</div>
                    <div>게시판</div>
                  </motion.div>
                </Link>
              </div>

              {/* 일기 목록 */}
              {user?.uid && (
                <div className="mt-8">
                  <DiaryList userId={user.uid} currentAccountType={currentAccountType} />
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
    </AuthGuard>
  );
}

