"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isPenpalEnabled, FEATURE_DISABLED_MESSAGES } from "@/lib/featureFlags";

/**
 * 펜팔 라우트 전체를 보호하는 레이아웃
 * 
 * Feature Flag가 비활성화된 경우 대시보드로 리다이렉트
 */
export default function PenpalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Feature Flag 확인
    if (!isPenpalEnabled()) {
      console.warn("⚠️ Penpal feature is disabled. Redirecting to dashboard...");
      
      // 사용자에게 알림 (선택사항)
      if (typeof window !== "undefined") {
        alert(FEATURE_DISABLED_MESSAGES.penpal.ko);
      }
      
      // 대시보드로 리다이렉트
      router.replace("/dashboard");
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
            대시보드로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  // Feature Flag가 활성화된 경우에만 자식 렌더링
  return <>{children}</>;
}





