"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { AddressNotification } from "@/app/types";

export default function AddressNotificationBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AddressNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!db || !user) {
        setLoading(false);
        return;
      }

      try {
        const now = new Date().toISOString();
        
        const notificationsQuery = query(
          collection(db, "addressNotifications"),
          where("userId", "==", user.uid),
          where("isRead", "==", false)
        );

        const snapshot = await getDocs(notificationsQuery);
        const notificationsList: AddressNotification[] = [];

        // 알림 확인 및 필터링
        for (const docSnap of snapshot.docs) {
          const data = {
            id: docSnap.id,
            ...docSnap.data(),
          } as AddressNotification;

          let shouldDelete = false;

          // 1. 만료된 알림 체크
          if (data.expiresAt < now) {
            shouldDelete = true;
            console.log("🗑️ Expired notification:", docSnap.id);
          }

          // 2. 이미 주소를 제출했는지 체크
          if (!shouldDelete && data.matchId) {
            try {
              const matchDoc = await getDoc(doc(db, "penpalMatches", data.matchId));
              if (matchDoc.exists()) {
                const matchData = matchDoc.data();
                const isUser1 = matchData.user1Id === user.uid;
                const myAddressSubmitted = isUser1 
                  ? matchData.user1AddressSubmitted 
                  : matchData.user2AddressSubmitted;

                // 이미 주소를 제출했으면 알림 삭제
                if (myAddressSubmitted) {
                  shouldDelete = true;
                  console.log("✅ Address already submitted, removing notification:", docSnap.id);
                }
              }
            } catch (err) {
              console.error("⚠️ Error checking match status:", err);
            }
          }

          // 삭제할 알림은 Firestore에서 제거
          if (shouldDelete) {
            await deleteDoc(doc(db, "addressNotifications", docSnap.id));
          } else {
            notificationsList.push(data);
          }
        }

        setNotifications(notificationsList);
      } catch (error) {
        console.error("❌ Error loading notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [user]);

  const handleDismiss = async (notificationId: string) => {
    if (!db) return;

    try {
      await deleteDoc(doc(db, "addressNotifications", notificationId));
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      console.log("✅ Notification dismissed:", notificationId);
    } catch (error) {
      console.error("❌ Error dismissing notification:", error);
    }
  };

  const handleGoToAddress = (notification: AddressNotification) => {
    router.push(`/penpal/address/${notification.matchId}`);
  };

  if (loading || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 left-0 right-0 z-40 px-4">
      <div className="max-w-4xl mx-auto space-y-3">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-2xl shadow-2xl p-6 cursor-pointer"
              onClick={() => handleGoToAddress(notification)}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">📮</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">
                    주소를 입력해주세요!
                  </h3>
                  <p className="text-white/90 mb-3">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGoToAddress(notification);
                      }}
                      className="px-6 py-2 bg-white text-orange-600 rounded-lg font-bold hover:bg-orange-50 transition-all shadow-md"
                    >
                      주소 입력하러 가기 →
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notification.id);
                      }}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

