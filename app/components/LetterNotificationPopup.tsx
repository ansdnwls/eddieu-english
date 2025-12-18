"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { LetterNotification } from "@/app/types";

export default function LetterNotificationPopup() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<LetterNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!db || !user) return;

    // 실시간 알림 리스너
    const notificationsQuery = query(
      collection(db, "letterNotifications"),
      where("userId", "==", user.uid),
      where("isRead", "==", false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsList: LetterNotification[] = [];

      snapshot.forEach((doc) => {
        const data = {
          id: doc.id,
          ...doc.data(),
        } as LetterNotification;

        // "letter_sent" 및 "penpal_cancelled" 타입 표시
        if (
          (data.type === "letter_sent" || data.type === "penpal_cancelled") &&
          !dismissedIds.has(doc.id)
        ) {
          notificationsList.push(data);
        }
      });

      // 최신순 정렬
      notificationsList.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(notificationsList);
    });

    return () => unsubscribe();
  }, [user, dismissedIds]);

  const handleDismiss = async (notificationId: string) => {
    if (!db) return;

    try {
      // 알림을 읽음 처리
      await updateDoc(doc(db, "letterNotifications", notificationId), {
        isRead: true,
      });

      // 로컬에서도 제거
      setDismissedIds((prev) => new Set(prev).add(notificationId));
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );

      console.log("✅ 알림 닫기:", notificationId);
    } catch (error) {
      console.error("❌ 알림 닫기 오류:", error);
    }
  };

  const handleGoToMission = (notification: LetterNotification) => {
    // 알림을 읽음 처리
    handleDismiss(notification.id);

    // 미션 페이지로 이동
    if (notification.link) {
      router.push(notification.link);
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="flex items-start justify-center pt-20 px-4">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              className="pointer-events-auto max-w-md w-full"
            >
              {notification.type === "penpal_cancelled" ? (
                // 취소 알림 (빨간색)
                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl shadow-2xl p-6 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl flex-shrink-0">⚠️</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">
                        {notification.title}
                      </h3>
                      <p className="text-white/90 mb-4 text-lg">
                        {notification.message}
                      </p>
                      <div className="bg-white/20 rounded-lg p-4 mb-4">
                        <p className="text-white text-sm font-semibold">
                          💡 새로운 펜팔 친구를 찾아보세요!
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleGoToMission(notification)}
                          className="flex-1 px-6 py-3 bg-white text-red-600 rounded-lg font-bold hover:bg-red-50 transition-all shadow-md"
                        >
                          펜팔 관리로 가기 →
                        </button>
                        <button
                          onClick={() => handleDismiss(notification.id)}
                          className="px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all"
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // 편지 발송 알림 (파란색)
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl shadow-2xl p-6 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl flex-shrink-0">📬</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">
                        {notification.title}
                      </h3>
                      <p className="text-white/90 mb-4 text-lg">
                        {notification.message}
                      </p>
                      <div className="bg-white/20 rounded-lg p-4 mb-4">
                        <p className="text-white text-sm font-semibold mb-2">
                          📸 인증 방법:
                        </p>
                        <ol className="text-white/90 text-sm space-y-1 list-decimal list-inside">
                          <li>받은 편지를 확인하세요</li>
                          <li>편지 사진을 찍어주세요</li>
                          <li>인증하면 캐릭터 도장이 찍혀요! 🎉</li>
                        </ol>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleGoToMission(notification)}
                          className="flex-1 px-6 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-all shadow-md"
                        >
                          인증하러 가기 →
                        </button>
                        <button
                          onClick={() => handleDismiss(notification.id)}
                          className="px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all"
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

