"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "../layout";
import { motion } from "framer-motion";

interface FeatureToggle {
  vocabularyQuiz: boolean;
  community: boolean;
  points: boolean;
  rewards: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<FeatureToggle>({
    vocabularyQuiz: true,
    community: false,
    points: true,
    rewards: true,
  });
  const [copied, setCopied] = useState(false);

  const handleToggle = (feature: keyof FeatureToggle) => {
    setFeatures({
      ...features,
      [feature]: !features[feature],
    });
  };

  const handleExportData = () => {
    // 데이터 내보내기 로직 (추후 구현)
    alert("데이터 내보내기 기능은 추후 구현 예정입니다.");
  };

  const handleCopyUID = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          ⚙️ 설정/테스트 도구
        </h1>

        {/* 내 UID 확인 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            🔑 내 사용자 UID 확인
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                현재 로그인한 사용자 UID:
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                  {user?.uid || "UID를 불러올 수 없습니다"}
                </code>
                <button
                  onClick={handleCopyUID}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {copied ? "✓ 복사됨" : "📋 복사"}
                </button>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>💡 관리자 계정 생성 방법:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>위 UID를 복사하세요</li>
                  <li>터미널에서 다음 명령어 실행:</li>
                  <li className="ml-4">
                    <code className="bg-yellow-100 dark:bg-yellow-900/40 px-2 py-1 rounded">
                      npx tsx scripts/create-admin.ts {user?.uid || "YOUR_UID"}
                    </code>
                  </li>
                  <li>또는 Firebase Console에서 직접 설정 (자세한 방법은 ADMIN_SETUP.md 참고)</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 기능 ON/OFF */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            기능 ON/OFF 스위치
          </h2>
          <div className="space-y-4">
            {Object.entries(features).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {key === "vocabularyQuiz" && "단어 퀴즈"}
                    {key === "community" && "커뮤니티"}
                    {key === "points" && "포인트 시스템"}
                    {key === "rewards" && "리워드 시스템"}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {key === "vocabularyQuiz" && "단어장에서 퀴즈 기능 활성화"}
                    {key === "community" && "일기 공유 커뮤니티 기능"}
                    {key === "points" && "포인트 적립 및 사용"}
                    {key === "rewards" && "리워드 교환 시스템"}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(key as keyof FeatureToggle)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    value ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      value ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 백업/내보내기 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            백업/내보내기
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-left"
            >
              📥 전체 유저 데이터 내보내기 (CSV)
            </button>
            <button
              onClick={handleExportData}
              className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all text-left"
            >
              📥 일기 데이터 내보내기 (JSON)
            </button>
            <button
              onClick={handleExportData}
              className="w-full px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all text-left"
            >
              📥 통계 데이터 내보내기 (Excel)
            </button>
          </div>
        </motion.div>

        {/* 테스트 도구 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            테스트 도구
          </h2>
          <div className="space-y-3">
            <button className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all text-left">
              🔄 테스트 사용자로 전환
            </button>
            <button className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all text-left">
              🧹 테스트 데이터 초기화
            </button>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}





