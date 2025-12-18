"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 사이드바 */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">
            🛡️ 관리자
          </h1>
          <nav className="space-y-2">
            <AdminNavLink href="/admin">📊 대시보드</AdminNavLink>
            <AdminNavLink href="/admin/users">👨‍👩‍👧 유저/아이 관리</AdminNavLink>
            <AdminNavLink href="/admin/content">📝 콘텐츠 검토</AdminNavLink>
            <AdminNavLink href="/admin/board">📋 게시판 관리</AdminNavLink>
            <AdminNavLink href="/admin/penpal">✉️ 펜팔 관리</AdminNavLink>
            <AdminNavLink href="/admin/penpal/cancel-requests">❌ 취소 요청 관리</AdminNavLink>
            <AdminNavLink href="/admin/penpal/disputes">📮 편지 분쟁 처리</AdminNavLink>
            <AdminNavLink href="/admin/rewards">🎁 포인트 & 리워드</AdminNavLink>
            <AdminNavLink href="/admin/pricing">💰 요금제 관리</AdminNavLink>
            <AdminNavLink href="/admin/ai">🤖 AI 피드백 모니터링</AdminNavLink>
            <AdminNavLink href="/admin/support">💌 고객 지원</AdminNavLink>
            <AdminNavLink href="/admin/settings">⚙️ 설정/도구</AdminNavLink>
            <AdminNavLink href="/admin/api-keys">🔑 API 키 설정</AdminNavLink>
          </nav>
        </div>
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <Link
            href="/"
            className="block w-full text-center py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
          >
            🏠 홈으로
          </Link>
          <Link
            href="/dashboard"
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
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}

function AdminNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
    >
      {children}
    </Link>
  );
}




