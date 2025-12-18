"use client";

import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import MissionContent from "./MissionContent";
import Link from "next/link";

export default function LetterMissionPage() {
  const params = useParams();
  const matchId = params.matchId as string;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📬</span>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                  편지 인증 미션
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/penpal/rules"
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all font-semibold"
                >
                  📖 규칙
                </Link>
                <Link
                  href="/penpal/manage"
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  ← 돌아가기
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <MissionContent matchId={matchId} />
      </div>
    </AuthGuard>
  );
}
