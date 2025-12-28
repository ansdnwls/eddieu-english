"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { isPenpalEnabled } from "@/lib/featureFlags";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user || !db) {
        setChecking(false);
        return;
      }

      try {
        // Firestore에서 관리자 정보 확인
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (adminDoc.exists() && adminDoc.data().isAdmin === true) {
          setIsAdmin(true);
        } else {
          // 일반 사용자는 관리자 페이지 접근 불가
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error checking admin:", error);
        router.push("/dashboard");
      } finally {
        setChecking(false);
      }
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, router]);

  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">관리자 권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // 리디렉션 중
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      {/* 헤더 (모든 화면 크기에서 표시) */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-50 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          🛡️ 관리자
        </h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          aria-label="메뉴 열기"
        >
          <svg
            className="w-6 h-6 text-gray-800 dark:text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {mobileMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* 슬라이드 메뉴 (필요할 때만 열림) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto"
            >
              <div className="p-6 pt-20">
                <nav className="space-y-2">
                  <AdminNavLink href="/admin" onClick={() => setMobileMenuOpen(false)}>📊 대시보드</AdminNavLink>
                  <AdminNavLink href="/admin/users" onClick={() => setMobileMenuOpen(false)}>👨‍👩‍👧 유저/아이 관리</AdminNavLink>
                  <AdminNavLink href="/admin/withdrawal" onClick={() => setMobileMenuOpen(false)}>💔 탈퇴 관리</AdminNavLink>
                  <AdminNavLink href="/admin/content" onClick={() => setMobileMenuOpen(false)}>📝 콘텐츠 검토</AdminNavLink>
                  <AdminNavLink href="/admin/board" onClick={() => setMobileMenuOpen(false)}>📋 게시판 관리</AdminNavLink>
                  {/* 펜팔 관련 메뉴 - Feature Flag로 제어 */}
                  {isPenpalEnabled() && (
                    <>
                      <AdminNavLink href="/admin/penpal" onClick={() => setMobileMenuOpen(false)}>✉️ 펜팔 관리</AdminNavLink>
                      <AdminNavLink href="/admin/penpal/cancel-requests" onClick={() => setMobileMenuOpen(false)}>❌ 취소 요청 관리</AdminNavLink>
                      <AdminNavLink href="/admin/penpal/disputes" onClick={() => setMobileMenuOpen(false)}>📮 편지 분쟁 처리</AdminNavLink>
                    </>
                  )}
                  <AdminNavLink href="/admin/rewards" onClick={() => setMobileMenuOpen(false)}>🎁 포인트 & 리워드</AdminNavLink>
                  <AdminNavLink href="/admin/ai" onClick={() => setMobileMenuOpen(false)}>🤖 AI 피드백 모니터링</AdminNavLink>
                  <AdminNavLink href="/admin/pricing" onClick={() => setMobileMenuOpen(false)}>💰 요금제 관리</AdminNavLink>
                  <AdminNavLink href="/admin/promotions" onClick={() => setMobileMenuOpen(false)}>🎫 프로모션 관리</AdminNavLink>
                  <AdminNavLink href="/admin/support" onClick={() => setMobileMenuOpen(false)}>💌 고객 지원</AdminNavLink>
                  <AdminNavLink href="/admin/settings" onClick={() => setMobileMenuOpen(false)}>⚙️ 설정/도구</AdminNavLink>
                  <AdminNavLink href="/admin/api-keys" onClick={() => setMobileMenuOpen(false)}>🔑 API 키 설정</AdminNavLink>
                </nav>
                <div className="mt-8 space-y-2">
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                  >
                    🏠 홈으로
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                  >
                    ← 대시보드로
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                  >
                    🚪 로그아웃
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 메인 콘텐츠 */}
      <main className="pt-16 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function AdminNavLink({ 
  href, 
  children, 
  onClick 
}: { 
  href: string; 
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
    >
      {children}
    </Link>
  );
}




