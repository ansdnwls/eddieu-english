"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PenpalMatch } from "@/app/types";
import Link from "next/link";

export default function AddressInputPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<PenpalMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [partnerName, setPartnerName] = useState("");

  const [formData, setFormData] = useState({
    parentName: "",
    address: "",
    postalCode: "",
    email: "",
    phone: "",
    consentToShare: false,
  });

  useEffect(() => {
    const loadMatch = async () => {
      if (!db || !matchId || !user) {
        setLoading(false);
        return;
      }

      try {
        const matchDoc = await getDoc(doc(db, "penpalMatches", matchId));
        if (!matchDoc.exists()) {
          alert("매칭 정보를 찾을 수 없습니다.");
          router.push("/penpal");
          return;
        }

        const matchData = {
          id: matchDoc.id,
          ...matchDoc.data(),
        } as PenpalMatch;

        // 내가 이 매칭에 포함되어 있는지 확인
        if (matchData.user1Id !== user.uid && matchData.user2Id !== user.uid) {
          alert("권한이 없습니다.");
          router.push("/penpal");
          return;
        }

        setMatch(matchData);

        // 상대방 이름 설정
        const partner = matchData.user1Id === user.uid 
          ? matchData.user2ChildName 
          : matchData.user1ChildName;
        setPartnerName(partner);

        // 이미 주소를 제출했는지 확인
        const alreadySubmitted = matchData.user1Id === user.uid 
          ? matchData.user1AddressSubmitted 
          : matchData.user2AddressSubmitted;
        setHasSubmitted(alreadySubmitted);

        // 기존 주소 정보 로드 (있다면)
        if (alreadySubmitted) {
          const addressQuery = query(
            collection(db, "parentAddresses"),
            where("userId", "==", user.uid),
            where("matchId", "==", matchId)
          );
          const addressSnapshot = await getDocs(addressQuery);
          if (!addressSnapshot.empty) {
            const addressData = addressSnapshot.docs[0].data();
            setFormData({
              parentName: addressData.parentName || "",
              address: addressData.address || "",
              postalCode: addressData.postalCode || "",
              email: addressData.email || "",
              phone: addressData.phone || "",
              consentToShare: addressData.consentToShare || false,
            });
          }
        }
      } catch (error) {
        console.error("Error loading match:", error);
        alert("매칭 정보를 불러오는 중 오류가 발생했습니다.");
        router.push("/penpal");
      } finally {
        setLoading(false);
      }
    };

    loadMatch();
  }, [matchId, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.consentToShare) {
      alert("주소 공유 동의가 필요합니다.");
      return;
    }

    if (!user || !db || !match) {
      alert("로그인이 필요합니다.");
      return;
    }

    setSubmitting(true);

    try {
      const addressData = {
        userId: user.uid,
        matchId: matchId,
        parentName: formData.parentName.trim(),
        address: formData.address.trim(),
        postalCode: formData.postalCode.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        consentToShare: formData.consentToShare,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "parentAddresses"), addressData);

      // 매칭 정보 업데이트
      const updateData = match.user1Id === user.uid
        ? { user1AddressSubmitted: true }
        : { user2AddressSubmitted: true };

      await updateDoc(doc(db, "penpalMatches", matchId), {
        ...updateData,
        updatedAt: new Date().toISOString(),
      });

      // 양쪽 모두 주소를 제출했는지 확인
      const bothSubmitted = match.user1Id === user.uid
        ? match.user2AddressSubmitted
        : match.user1AddressSubmitted;

      if (bothSubmitted) {
        // 양쪽 모두 제출 완료 -> 관리자 검토 상태로 변경
        await updateDoc(doc(db, "penpalMatches", matchId), {
          status: "admin_review",
          updatedAt: new Date().toISOString(),
        });

        alert("✅ 주소가 제출되었습니다!\n\n양쪽 보호자 모두 주소를 입력했습니다.\n관리자 승인 후 주소를 받을 수 있습니다.");
      } else {
        alert("✅ 주소가 제출되었습니다!\n\n상대방 보호자의 주소 입력을 기다리고 있습니다.");
      }

      router.push("/penpal");
    } catch (error) {
      console.error("Error submitting address:", error);
      alert("주소 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!match) {
    return null;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📮</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                보호자 주소 입력
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
                href="/"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                🏠 홈
              </Link>
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            {/* 매칭 정보 */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                펜팔 매칭 완료!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {partnerName}님과 펜팔이 되었습니다
              </p>
            </div>

            {hasSubmitted ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-green-100 dark:bg-green-900/30 border border-green-400 text-green-700 dark:text-green-300 px-6 py-4 rounded-xl text-center mb-6"
              >
                <p className="font-semibold mb-2">✅ 주소가 이미 제출되었습니다</p>
                <p className="text-sm">
                  {match.user1AddressSubmitted && match.user2AddressSubmitted
                    ? "양쪽 모두 주소를 제출했습니다. 관리자 승인을 기다려주세요."
                    : "상대방 보호자의 주소 입력을 기다리고 있습니다."}
                </p>
              </motion.div>
            ) : (
              <>
                {/* 안내 사항 */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 mb-6 border-2 border-yellow-300 dark:border-yellow-700">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">
                    ⚠️ 중요 안내사항
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 font-bold">•</span>
                      <span>입력하신 주소는 <strong>암호화되어 안전하게 보관</strong>됩니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 font-bold">•</span>
                      <span>양쪽 보호자 모두 주소를 입력해야 합니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 font-bold">•</span>
                      <span><strong>관리자 승인 후</strong> 상대방 주소를 받을 수 있습니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 font-bold">•</span>
                      <span>펜팔 종료 후 주소 정보는 <strong>자동으로 삭제</strong>됩니다.</span>
                    </li>
                  </ul>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 보호자 이름 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      보호자 이름 *
                    </label>
                    <input
                      type="text"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="예: 홍길동"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* 우편번호 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      우편번호 *
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="예: 12345"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      maxLength={5}
                    />
                  </div>

                  {/* 주소 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      도로명 주소 *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="예: 서울특별시 강남구 테헤란로 123"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* 이메일 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      연락 가능한 이메일 *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="example@email.com"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* 전화번호 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      연락처 (선택)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="010-1234-5678"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* 동의 체크박스 */}
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="consent"
                        checked={formData.consentToShare}
                        onChange={(e) => setFormData({ ...formData, consentToShare: e.target.checked })}
                        className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        required
                      />
                      <label htmlFor="consent" className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          [필수] 개인정보 수집 및 제3자 제공 동의
                        </span>
                        <p className="mt-2 text-xs leading-relaxed">
                          • 수집 항목: 보호자 이름, 주소, 우편번호, 이메일, 연락처<br />
                          • 수집 목적: 펜팔 우편물 발송<br />
                          • 제공 대상: 펜팔 상대방 보호자 (관리자 승인 후)<br />
                          • 보유 기간: 펜팔 종료 후 30일<br />
                          • 귀하는 동의를 거부할 권리가 있으나, 거부 시 펜팔 서비스 이용이 제한됩니다.
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/penpal")}
                      className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
                    >
                      나중에 입력
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !formData.consentToShare}
                      className={`flex-1 px-6 py-3 rounded-lg shadow-lg transition-all font-semibold ${
                        submitting || !formData.consentToShare
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-105 hover:shadow-xl"
                      }`}
                    >
                      {submitting ? "제출 중..." : "📮 주소 제출하기"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </main>
      </div>
    </AuthGuard>
  );
}


