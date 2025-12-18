"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "../layout";
import { motion } from "framer-motion";

interface PointSettings {
  diaryWrite: number;
  diaryCorrection: number;
  vocabularyReview: number;
  dailyLogin: number;
}

interface Reward {
  id: string;
  name: string;
  requiredPoints: number;
  stock: number;
  description?: string;
}

export default function RewardsPage() {
  const [pointSettings, setPointSettings] = useState<PointSettings>({
    diaryWrite: 10,
    diaryCorrection: 5,
    vocabularyReview: 3,
    dailyLogin: 1,
  });
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        // 포인트 설정 로드
        const settingsDoc = await getDoc(doc(db, "admin_settings", "point_settings"));
        if (settingsDoc.exists()) {
          setPointSettings(settingsDoc.data() as PointSettings);
        }

        // 리워드 목록 로드
        const rewardsSnapshot = await getDocs(collection(db, "rewards"));
        const rewardsList = rewardsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Reward[];
        setRewards(rewardsList);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSavePoints = async () => {
    if (!db) return;

    setSaving(true);
    try {
      await setDoc(doc(db, "admin_settings", "point_settings"), pointSettings);
      alert("포인트 설정이 저장되었습니다!");
    } catch (error) {
      console.error("Error saving points:", error);
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
          🎁 포인트 & 리워드 관리
        </h1>

        {/* 포인트 설정 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            포인트 설정표
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                일기 작성
              </label>
              <input
                type="number"
                value={pointSettings.diaryWrite}
                onChange={(e) =>
                  setPointSettings({
                    ...pointSettings,
                    diaryWrite: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                일기 첨삭 완료
              </label>
              <input
                type="number"
                value={pointSettings.diaryCorrection}
                onChange={(e) =>
                  setPointSettings({
                    ...pointSettings,
                    diaryCorrection: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                단어장 복습
              </label>
              <input
                type="number"
                value={pointSettings.vocabularyReview}
                onChange={(e) =>
                  setPointSettings({
                    ...pointSettings,
                    vocabularyReview: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                일일 로그인
              </label>
              <input
                type="number"
                value={pointSettings.dailyLogin}
                onChange={(e) =>
                  setPointSettings({
                    ...pointSettings,
                    dailyLogin: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleSavePoints}
              disabled={saving}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                saving
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              {saving ? "저장 중..." : "💾 저장하기"}
            </button>
          </div>
        </motion.div>

        {/* 리워드 목록 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              리워드 목록
            </h2>
            <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all">
              + 리워드 추가
            </button>
          </div>
          {rewards.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              등록된 리워드가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      {reward.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      필요 포인트: {reward.requiredPoints} | 재고: {reward.stock}
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-sm">
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





