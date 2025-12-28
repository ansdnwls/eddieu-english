"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { motion } from "framer-motion";
import Day1Write from "@/app/showtell/components/Day1Write";
import Day1Fix from "@/app/showtell/components/Day1Fix";
import { ShowTellContentPack } from "@/app/types/showtell";

interface Day1PageProps {
  params: Promise<{
    week: string;
  }>;
}

export default function Day1Page({ params }: Day1PageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const resolvedParams = use(params);
  const week = parseInt(resolvedParams.week, 10);

  const [contentPack, setContentPack] = useState<ShowTellContentPack | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [step, setStep] = useState<"write" | "fix">("write");

  // 콘텐츠 팩 로드
  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch(`/api/showtell/content?week=${week}`);
        const result = await response.json();

        if (result.success) {
          setContentPack(result.data.content_pack);
        } else {
          console.error("콘텐츠 로드 실패:", result.error);
        }
      } catch (error) {
        console.error("콘텐츠 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    if (week >= 1 && week <= 12) {
      loadContent();
    } else {
      setLoading(false);
    }
  }, [week]);

  // 제출 성공 시 교정 단계로 이동
  const handleSubmitSuccess = (id: string) => {
    setSubmissionId(id);
    setStep("fix");
  };

  // Day1 완료 시 Day2로 이동 (submissionId 전달)
  const handleDay1Complete = () => {
    if (submissionId) {
      router.push(`/showtell/week/${week}/day2?submissionId=${submissionId}`);
    } else {
      alert("제출 ID가 없습니다. 다시 시도해주세요.");
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">콘텐츠 로딩 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!contentPack || week < 1 || week > 12) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              잘못된 주차입니다
            </h2>
            <button
              onClick={() => router.push("/showtell")}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl"
            >
              ← 돌아가기
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/showtell")}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← 돌아가기
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Week {week}: {contentPack.json.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Day 1: Write + Fix
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${step === "write" ? "bg-blue-500" : "bg-gray-300"}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">작성</span>
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={`w-3 h-3 rounded-full ${step === "fix" ? "bg-green-500" : "bg-gray-300"}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">교정</span>
            </div>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="py-8">
          {step === "write" ? (
            <Day1Write
              week={week}
              childId={user?.uid || ""}
              contentPack={contentPack}
              onSubmitSuccess={handleSubmitSuccess}
            />
          ) : submissionId ? (
            <Day1Fix
              submissionId={submissionId}
              onComplete={handleDay1Complete}
            />
          ) : (
            <div className="text-center text-red-600">
              제출 ID가 없습니다. 다시 시도해주세요.
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

