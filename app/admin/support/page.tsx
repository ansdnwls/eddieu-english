"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "../layout";
import { motion } from "framer-motion";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function SupportPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        // FAQ 로드
        const faqsSnapshot = await getDocs(collection(db, "faqs"));
        const faqsList = faqsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FAQ[];
        setFaqs(faqsList);

        // 공지사항 로드
        const announcementDoc = await getDoc(doc(db, "admin_settings", "announcement"));
        if (announcementDoc.exists()) {
          setAnnouncement(announcementDoc.data().text || "");
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSaveAnnouncement = async () => {
    if (!db) return;

    setSaving(true);
    try {
      await setDoc(
        doc(db, "admin_settings", "announcement"),
        {
          text: announcement,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      alert("공지사항이 저장되었습니다!");
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          💌 고객 지원 / 사용자 피드백
        </h1>

        {/* 공지사항 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            공지사항 등록
          </h2>
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="공지사항을 입력하세요..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
          <button
            onClick={handleSaveAnnouncement}
            disabled={saving}
            className={`mt-4 px-6 py-2 rounded-lg font-semibold transition-all ${
              saving
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {saving ? "저장 중..." : "💾 저장하기"}
          </button>
        </motion.div>

        {/* FAQ 관리 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              FAQ 관리
            </h2>
            <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all">
              + FAQ 추가
            </button>
          </div>
          {faqs.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              등록된 FAQ가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Q: {faq.question}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    A: {faq.answer}
                  </div>
                  <button className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    수정
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}





