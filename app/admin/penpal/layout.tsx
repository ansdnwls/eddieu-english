"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isPenpalEnabled, FEATURE_DISABLED_MESSAGES } from "@/lib/featureFlags";

/**
 * 관리자 펜팔 라우트를 보호하는 레이아웃
 * 
 * Feature Flag가 비활성화된 경우 관리자 대시보드로 리다이렉트
 */
export default function AdminPenpalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Feature Flag 확인
    if (!isPenpalEnabled()) {
      console.warn("⚠️ Penpal feature is disabled. Redirecting to admin dashboard...");
      
      // 관리자 대시보드로 리다이렉트
      router.replace("/admin");
    }
  }, [router]);

  // Feature Flag가 비활성화된 경우 렌더링하지 않음
  if (!isPenpalEnabled()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            {FEATURE_DISABLED_MESSAGES.penpal.ko}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            관리자 대시보드로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  // Feature Flag가 활성화된 경우에만 자식 렌더링
  return <>{children}</>;
}





