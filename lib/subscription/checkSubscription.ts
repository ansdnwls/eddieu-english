import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface SubscriptionStatus {
  isActive: boolean;
  planId: string | null;
  planName: string | null;
}

/**
 * 사용자의 구독 상태 확인
 * @param userId 사용자 UID
 * @returns 구독 상태 정보
 */
export async function checkUserSubscription(userId: string): Promise<SubscriptionStatus> {
  if (!db || !userId) {
    return { isActive: false, planId: null, planName: null };
  }

  try {
    // 1. users 컬렉션에서 구독 정보 확인
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.subscriptionStatus === "active" && userData.subscriptionPlan) {
        return {
          isActive: true,
          planId: userData.subscriptionPlan,
          planName: userData.subscriptionPlanName || userData.subscriptionPlan,
        };
      }
    }

    // 2. subscriptions 컬렉션에서 확인
    const subscriptionsQuery = query(
      collection(db, "subscriptions"),
      where("userId", "==", userId)
    );
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    
    for (const subDoc of subscriptionsSnapshot.docs) {
      const subData = subDoc.data();
      if (subData.status === "active") {
        // 구독 만료일 확인
        if (subData.endDate) {
          const endDate = new Date(subData.endDate);
          if (endDate < new Date()) {
            continue; // 만료된 구독
          }
        }
        
        return {
          isActive: true,
          planId: subData.planId,
          planName: subData.planName,
        };
      }
    }

    return { isActive: false, planId: null, planName: null };
  } catch (error) {
    console.error("❌ 구독 상태 확인 오류:", error);
    return { isActive: false, planId: null, planName: null };
  }
}

/**
 * 서버 사이드에서 구독 상태 확인 (API 라우트용)
 */
export async function checkUserSubscriptionServer(userId: string): Promise<SubscriptionStatus> {
  return checkUserSubscription(userId);
}



