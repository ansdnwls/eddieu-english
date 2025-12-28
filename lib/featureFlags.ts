/**
 * Feature Flags Configuration
 * 
 * 기능 활성화/비활성화를 중앙에서 관리하는 시스템
 * 환경변수 기반으로 동작하며, 런타임에 기능을 켜고 끌 수 있습니다.
 */

// ====================================
// Feature Flag Types
// ====================================

export interface FeatureFlags {
  penpal: boolean;
  // 향후 추가될 기능들
  // showAndTell: boolean;
  // writingLadder: boolean;
  // videoCoaching: boolean;
}

// ====================================
// Feature Flag Getters
// ====================================

/**
 * 펜팔 기능 활성화 여부
 * 
 * @returns {boolean} 펜팔 기능이 활성화되어 있으면 true
 */
export function isPenpalEnabled(): boolean {
  // 환경변수에서 읽기 (기본값: false)
  const envValue = process.env.NEXT_PUBLIC_PENPAL_ENABLED;
  
  // 명시적으로 "true"인 경우만 활성화
  return envValue === "true";
}

/**
 * 모든 Feature Flags 반환
 * 
 * @returns {FeatureFlags} 모든 기능 플래그 객체
 */
export function getAllFeatureFlags(): FeatureFlags {
  return {
    penpal: isPenpalEnabled(),
  };
}

// ====================================
// Feature Flag Error Messages
// ====================================

/**
 * Feature Flag 비활성화 에러 메시지
 */
export const FEATURE_DISABLED_MESSAGES = {
  penpal: {
    ko: "펜팔 기능은 현재 사용할 수 없습니다.",
    en: "Penpal feature is currently unavailable.",
  },
} as const;

/**
 * Feature Flag 비활성화 에러 생성
 * 
 * @param featureName - 기능 이름
 * @returns {Error} 에러 객체
 */
export function createFeatureDisabledError(
  featureName: keyof typeof FEATURE_DISABLED_MESSAGES
): Error {
  const error = new Error(FEATURE_DISABLED_MESSAGES[featureName].ko);
  error.name = "FeatureDisabledError";
  return error;
}

// ====================================
// Client-side Helpers
// ====================================

/**
 * 클라이언트에서 Feature Flag 확인 + 리다이렉트
 * 
 * @example
 * ```tsx
 * useEffect(() => {
 *   checkFeatureOrRedirect("penpal", "/dashboard");
 * }, []);
 * ```
 */
export function checkFeatureOrRedirect(
  feature: keyof FeatureFlags,
  redirectTo: string = "/"
): void {
  if (typeof window === "undefined") return;

  const flags = getAllFeatureFlags();
  
  if (!flags[feature]) {
    console.warn(`⚠️ Feature "${feature}" is disabled. Redirecting...`);
    window.location.href = redirectTo;
  }
}

// ====================================
// Logging Helper
// ====================================

/**
 * Feature Flags 상태 로깅 (개발 환경 전용)
 */
export function logFeatureFlags(): void {
  if (process.env.NODE_ENV !== "production") {
    const flags = getAllFeatureFlags();
    console.log("🚩 Feature Flags Status:");
    console.table(flags);
  }
}





