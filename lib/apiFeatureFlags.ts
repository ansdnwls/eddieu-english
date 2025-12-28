/**
 * API Feature Flag Middleware
 * 
 * API 엔드포인트에서 Feature Flag를 확인하는 미들웨어 헬퍼
 */

import { NextResponse } from "next/server";
import { isPenpalEnabled, FEATURE_DISABLED_MESSAGES } from "@/lib/featureFlags";

/**
 * Feature Flag 확인 응답 타입
 */
interface FeatureCheckResult {
  allowed: boolean;
  response?: NextResponse;
}

/**
 * 펜팔 기능 활성화 여부 확인
 * 
 * 비활성화된 경우 403 에러 응답 반환
 * 
 * @returns {FeatureCheckResult} 확인 결과 및 에러 응답
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const featureCheck = checkPenpalFeature();
 *   if (!featureCheck.allowed) {
 *     return featureCheck.response!;
 *   }
 *   
 *   // 펜팔 로직 계속 실행...
 * }
 * ```
 */
export function checkPenpalFeature(): FeatureCheckResult {
  if (!isPenpalEnabled()) {
    console.warn("⚠️ API Call blocked: Penpal feature is disabled");
    
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: FEATURE_DISABLED_MESSAGES.penpal.ko,
          errorCode: "FEATURE_DISABLED",
        },
        { status: 403 } // 403 Forbidden
      ),
    };
  }

  return {
    allowed: true,
  };
}

/**
 * 여러 Feature Flag를 한번에 확인
 * 
 * @param features - 확인할 기능 배열
 * @returns {FeatureCheckResult} 확인 결과
 * 
 * @example
 * ```typescript
 * const check = checkFeatures(["penpal", "videoCoaching"]);
 * if (!check.allowed) return check.response!;
 * ```
 */
export function checkFeatures(
  features: Array<"penpal">
): FeatureCheckResult {
  for (const feature of features) {
    if (feature === "penpal" && !isPenpalEnabled()) {
      return checkPenpalFeature();
    }
  }

  return {
    allowed: true,
  };
}




