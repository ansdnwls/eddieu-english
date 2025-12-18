"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";

export default function PenpalRulesPage() {
  const router = useRouter();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                영어 펜팔 이용 규칙
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                ← 뒤로
              </button>
              <Link
                href="/penpal"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all font-semibold"
              >
                펜팔 찾기
              </Link>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 인트로 */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">✉️</div>
              <h2 className="text-3xl font-bold mb-3">
                영어 펜팔로 진짜 친구를 만나요!
              </h2>
              <p className="text-blue-100 text-lg">
                10통의 편지로 서로의 마음을 이해하는 특별한 친구가 되어보세요
              </p>
            </div>

            {/* 핵심 원칙 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">🎯</span>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  핵심 원칙
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <span className="text-2xl">🔒</span>
                    <span>개인정보 보호 (10회 인증 전까지)</span>
                  </h4>
                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400 font-bold mt-1">•</span>
                      <span>연락처(전화번호, 카카오톡 등) 공유 <strong className="text-red-600 dark:text-red-400">절대 금지</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400 font-bold mt-1">•</span>
                      <span>SNS 계정 공유 <strong className="text-red-600 dark:text-red-400">절대 금지</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400 font-bold mt-1">•</span>
                      <span>편지를 통해서만 소통하며, 서로를 알아가는 시간을 가져요</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <span className="text-2xl">💌</span>
                    <span>10통의 편지 = 진짜 친구</span>
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    10번의 편지 교환을 통해 서로의 마음을 충분히 이해하게 됩니다. 
                    전문가들은 <strong>10회의 의미 있는 대화</strong>가 진정한 우정을 형성하는 
                    최소한의 기준이라고 말합니다. 천천히, 진심을 담아 편지를 주고받으며 
                    특별한 친구를 만들어보세요! 🌟
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 펜팔 진행 과정 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">📬</span>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  펜팔 진행 과정
                </h3>
              </div>

              <div className="space-y-6">
                {/* Step 1-10 */}
                <div className="relative pl-8 border-l-4 border-blue-500">
                  <div className="absolute -left-3 top-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    1
                  </div>
                  <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                    1~10회: 편지로 친해지기 💌
                  </h4>
                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span>✉️</span>
                      <span>영어로 편지를 주고받으며 서로를 알아가요</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>📸</span>
                      <span>받은 편지를 사진으로 찍어 인증해요</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>🔒</span>
                      <span><strong className="text-red-600 dark:text-red-400">이 기간에는 연락처/SNS 공유 금지!</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>💡</span>
                      <span>편지를 통해서만 대화하며 진정한 우정을 쌓아가요</span>
                    </li>
                  </ul>
                </div>

                {/* Step 완료 */}
                <div className="relative pl-8 border-l-4 border-green-500">
                  <div className="absolute -left-3 top-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    ✓
                  </div>
                  <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                    10회 완료: 진짜 친구가 되었어요! 🎉
                  </h4>
                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span>🎊</span>
                      <span>축하합니다! 10통의 편지로 서로를 이해하는 친구가 되었어요</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>📱</span>
                      <span><strong className="text-green-600 dark:text-green-400">양쪽 모두 동의하면</strong> 관리자가 연락처를 공유해드려요</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>⏹️</span>
                      <span>펜팔이 자동으로 종료되지만, 연장 버튼으로 계속 이어갈 수 있어요</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>🆕</span>
                      <span>종료 후에는 새로운 펜팔 친구를 찾을 수도 있어요</span>
                    </li>
                  </ul>
                </div>

                {/* Optional 연장 */}
                <div className="relative pl-8 border-l-4 border-purple-500">
                  <div className="absolute -left-3 top-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    +
                  </div>
                  <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                    선택: 펜팔 연장하기 (무제한) 💜
                  </h4>
                  <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span>🔄</span>
                      <span>더 많은 편지를 주고받고 싶다면 <strong>연장 버튼</strong>을 눌러요</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>🌈</span>
                      <span>시스템과 관계없이 개별적으로 계속 펜팔을 이어갈 수 있어요</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>✨</span>
                      <span>물론 종료하고 새로운 펜팔 친구를 찾아도 괜찮아요!</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* 왜 이런 규칙이 필요할까요? */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl shadow-xl p-8 border-2 border-purple-200 dark:border-purple-800"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">🤔</span>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  왜 이런 규칙이 필요할까요?
                </h3>
              </div>

              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <h4 className="font-bold mb-1">안전한 만남</h4>
                    <p>처음 만난 친구와는 천천히 알아가는 것이 중요해요. 10통의 편지면 충분히 서로를 이해할 수 있답니다.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">💭</span>
                  <div>
                    <h4 className="font-bold mb-1">깊이 있는 대화</h4>
                    <p>편지는 SNS 메시지보다 더 깊은 생각과 감정을 담을 수 있어요. 천천히 쓰고, 천천히 읽으면서 진심을 나눠요.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎓</span>
                  <div>
                    <h4 className="font-bold mb-1">영어 실력 향상</h4>
                    <p>10통의 영어 편지를 주고받으면 자연스럽게 영어 실력이 늘어나요. 무리하지 않고 꾸준히!</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">🤝</span>
                  <div>
                    <h4 className="font-bold mb-1">진정한 우정</h4>
                    <p>빠르게 연락처를 교환하는 것보다, 편지로 마음을 나누면 더 오래가는 우정이 만들어져요.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 주의사항 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-xl p-8 border-2 border-red-300 dark:border-red-700"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">⚠️</span>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  꼭 지켜주세요!
                </h3>
              </div>

              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 font-bold text-xl mt-1">❌</span>
                  <span><strong>10회 인증 전</strong> 연락처/SNS 공유는 규칙 위반이며, 펜팔이 취소될 수 있어요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 font-bold text-xl mt-1">❌</span>
                  <span>편지에 부적절한 내용을 적거나 상대방에게 불쾌감을 주는 행동은 금지예요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 font-bold text-xl mt-1">❌</span>
                  <span>답장이 너무 늦어지면 상대방이 기다리게 돼요. 일주일 내에는 답장해주세요</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold text-xl mt-1">✅</span>
                  <span>규칙을 잘 지켜야 신뢰도 점수가 올라가고, 좋은 펜팔 친구를 만날 수 있어요</span>
                </li>
              </ul>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                href="/penpal"
                className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-xl transition-all font-bold text-center text-lg"
              >
                ✉️ 펜팔 친구 찾으러 가기
              </Link>
              <Link
                href="/penpal/inbox"
                className="flex-1 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-xl transition-all font-bold text-center text-lg"
              >
                📬 내 펜팔함 확인하기
              </Link>
            </motion.div>

            {/* 푸터 메시지 */}
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              <p className="text-lg mb-2">💌 영어 펜팔로 세계 곳곳의 친구를 만나보세요!</p>
              <p className="text-sm">규칙을 지키며 즐거운 펜팔 생활을 즐겨요 🌟</p>
            </div>
          </motion.div>
        </main>
      </div>
    </AuthGuard>
  );
}

