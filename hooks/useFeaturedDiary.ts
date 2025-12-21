import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc } from "firebase/firestore";

export interface FeaturedUser {
  childName: string;
  diaryId: string;
  featuredAt: string;
}

interface UseFeaturedDiaryReturn {
  featuredUser: FeaturedUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * 오늘의 일기 배지 수상자를 실시간으로 구독하는 훅
 * Firebase 초기화가 안 된 경우도 안전하게 처리
 */
export function useFeaturedDiary(): UseFeaturedDiaryReturn {
  const [featuredUser, setFeaturedUser] = useState<FeaturedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Firebase 초기화 확인
    if (!db) {
      setLoading(false);
      setError("Firebase가 초기화되지 않았습니다.");
      return;
    }

    const firestoreDb = db as NonNullable<typeof db>;

    // 실시간 리스너 설정
    const q = query(
      collection(firestoreDb, "diaries"),
      orderBy("featuredAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          setLoading(false);
          setError(null);

          if (!snapshot.empty) {
            const diaryDoc = snapshot.docs[0];
            const diaryData = diaryDoc.data();

            if (diaryData.featured && diaryData.featuredAt) {
              // featuredAt 타입 안전하게 처리 (string 또는 Firestore Timestamp)
              const featuredAtValue = diaryData.featuredAt;
              const featuredDate =
                typeof featuredAtValue === "string"
                  ? new Date(featuredAtValue)
                  : featuredAtValue?.toDate?.() ?? null;
              
              if (!featuredDate) {
                setFeaturedUser(null);
                return;
              }
              
              // 오늘 날짜 확인 (KST 기준)
              // 타임존 문제 방지: KST(Asia/Seoul) 기준으로 날짜 문자열 비교
              // toLocaleDateString("en-CA")는 YYYY-MM-DD 형식 반환
              const dateKey = (d: Date): string => 
                d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
              
              const isToday = dateKey(featuredDate) === dateKey(new Date());

              if (isToday) {
                // 해당 사용자의 아이 이름 가져오기
                const childRef = doc(firestoreDb, "children", diaryData.userId);
                const childSnap = await getDoc(childRef);
                let childName = "어린이";
                
                if (childSnap.exists()) {
                  const childData = childSnap.data();
                  childName = childData.childName || childData.name || "어린이";
                }

                // featuredAt을 ISO string으로 변환 (타입 안전)
                const featuredAtString =
                  typeof featuredAtValue === "string"
                    ? featuredAtValue
                    : featuredDate.toISOString();
                
                setFeaturedUser({
                  childName: childName,
                  diaryId: diaryDoc.id,
                  featuredAt: featuredAtString,
                });
              } else {
                // 오늘이 아니면 표시하지 않음
                setFeaturedUser(null);
              }
            } else {
              // featured가 false이거나 featuredAt이 없으면 표시하지 않음
              setFeaturedUser(null);
            }
          } else {
            // 일기가 없으면 표시하지 않음
            setFeaturedUser(null);
          }
        } catch (err) {
          const error = err as Error;
          console.error("❌ Error loading featured diary:", error);
          setError(error.message || "오늘의 일기 배지를 불러오는데 실패했습니다.");
          setFeaturedUser(null);
        }
      },
      (snapshotError) => {
        console.error("❌ Error in featured diary snapshot:", snapshotError);
        setError(snapshotError.message || "실시간 업데이트 중 오류가 발생했습니다.");
        setFeaturedUser(null);
        setLoading(false);
      }
    );

    // cleanup: 구독 해제
    return () => {
      unsubscribe();
    };
  }, []);

  return { featuredUser, loading, error };
}

