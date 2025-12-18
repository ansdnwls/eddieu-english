"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "../layout";
import { motion } from "framer-motion";

export default function APIKeysPage() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState({
    openai: "",
    googleVision: "",
    tts: "",
    elevenlabs: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    const loadAPIKeys = async () => {
      if (!db || !user) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "admin_settings", "api_keys");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setApiKeys({
            openai: data.openai || "",
            googleVision: data.googleVision || "",
            tts: data.tts || "",
            elevenlabs: data.elevenlabs || "",
          });
        }
      } catch (error) {
        console.error("Error loading API keys:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAPIKeys();
  }, [user]);

  const handleTest = async () => {
    setTesting(true);
    setTestResults(null);
    setMessage(null);

    try {
      const response = await fetch("/api/test-api-keys");
      const data = await response.json();

      if (data.success) {
        setTestResults(data.results);
        const allTested = Object.values(data.results).every((r: any) => !r.configured || r.tested);
        const hasErrors = Object.values(data.results).some((r: any) => r.error);
        
        if (hasErrors) {
          setMessage({ type: "error", text: "일부 API 키 테스트에 실패했습니다. 결과를 확인해주세요." });
        } else if (allTested) {
          setMessage({ type: "success", text: "모든 API 키가 정상적으로 연결되었습니다!" });
        } else {
          setMessage({ type: "success", text: "API 키 테스트가 완료되었습니다." });
        }
      } else {
        setMessage({ type: "error", text: data.error || "테스트 중 오류가 발생했습니다." });
      }
    } catch (error) {
      console.error("API 키 테스트 오류:", error);
      setMessage({ type: "error", text: "테스트 중 오류가 발생했습니다." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!db || !user) return;

    setSaving(true);
    setMessage(null);

    try {
      await setDoc(
        doc(db, "admin_settings", "api_keys"),
        {
          ...apiKeys,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
        { merge: true }
      );

      setMessage({ 
        type: "success", 
        text: "✅ API 키가 저장되었습니다! 이제 바로 사용할 수 있습니다." 
      });
      
      // 저장 후 자동으로 테스트 실행 (선택적)
      // handleTest();
    } catch (error) {
      console.error("Error saving API keys:", error);
      setMessage({ type: "error", text: "저장 중 오류가 발생했습니다." });
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
      <div className="max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          🔑 API 키 설정
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6"
        >
          {/* OpenAI API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKeys.openai}
              onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
              placeholder="sk-..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              GPT 첨삭 기능에 사용됩니다.
            </p>
          </div>

          {/* Google Vision API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Google Vision API Key
            </label>
            <input
              type="password"
              value={apiKeys.googleVision}
              onChange={(e) => setApiKeys({ ...apiKeys, googleVision: e.target.value })}
              placeholder="AIza..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              OCR (이미지 텍스트 인식)에 사용됩니다.
            </p>
          </div>

          {/* ElevenLabs API Key */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              🎤 ElevenLabs API Key (원어민 발음) <span className="text-purple-600 dark:text-purple-400 font-bold">NEW!</span>
            </label>
            <input
              type="password"
              value={apiKeys.elevenlabs}
              onChange={(e) => setApiKeys({ ...apiKeys, elevenlabs: e.target.value })}
              placeholder="ElevenLabs API 키를 입력하세요"
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ✨ <strong>고품질 원어민 발음</strong> 제공에 사용됩니다. 10가지 다양한 음성 옵션을 제공합니다!
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                🔗 <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold">ElevenLabs</a>에서 무료로 API 키를 발급받으세요. (무료 플랜: 월 10,000자)
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                💡 API 키를 입력하고 저장하면 바로 사용할 수 있습니다!
              </p>
            </div>
          </div>

          {/* TTS API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              TTS API Key (선택, 레거시)
            </label>
            <input
              type="password"
              value={apiKeys.tts}
              onChange={(e) => setApiKeys({ ...apiKeys, tts: e.target.value })}
              placeholder="TTS 서비스 API 키"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              음성 재생 기능에 사용됩니다. (선택사항, ElevenLabs 권장)
            </p>
          </div>

          {/* 메시지 */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 테스트 결과 */}
          {testResults && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                🔍 API 키 연결 테스트 결과
              </h3>
              {Object.entries(testResults).map(([key, result]: [string, any]) => (
                <div
                  key={key}
                  className={`p-4 rounded-lg border ${
                    result.configured && result.tested && !result.error
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : result.error
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {key === "openai" && "🤖 OpenAI"}
                      {key === "googleVision" && "👁️ Google Vision"}
                      {key === "elevenlabs" && "🎤 ElevenLabs"}
                      {key === "tts" && "🔊 TTS (레거시)"}
                    </span>
                    <span
                      className={`px-3 py-1 rounded text-sm ${
                        result.configured && result.tested && !result.error
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : result.configured && result.error
                          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {result.configured
                        ? result.tested && !result.error
                          ? "✅ 연결됨"
                          : "❌ 오류"
                        : "⚪ 미설정"}
                    </span>
                  </div>
                  {result.error && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      오류: {result.error}
                    </p>
                  )}
                  {result.configured && result.tested && !result.error && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      API 키가 정상적으로 연결되었습니다!
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 버튼 그룹 */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                saving
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              {saving ? "저장 중..." : "💾 저장하기"}
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                testing
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              {testing ? "테스트 중..." : "🔍 연결 테스트"}
            </button>
          </div>

          {/* 보안 안내 */}
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
              ⚠️ <strong>보안 안내:</strong> API 키는 안전하게 저장되며, 관리자만 접근할 수 있습니다.
              API 키를 공유하거나 노출하지 마세요.
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              💡 <strong>참고:</strong> API 키를 입력하고 저장하면 바로 사용됩니다. 
              Firestore에 저장된 API 키가 우선적으로 사용되며, 없을 경우 환경 변수(.env.local)를 사용합니다.
            </p>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}




