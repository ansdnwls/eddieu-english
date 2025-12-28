"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "../layout";
import { motion, AnimatePresence } from "framer-motion";
import { PromotionCode } from "@/app/types";

export default function PromotionsPage() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<PromotionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionCode | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "percentage" as "percentage" | "fixed" | "period",
    discountValue: 0,
    maxUsage: 0,
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    applicablePlans: [] as string[],
    description: "",
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, "promotions"));
      const promoList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PromotionCode[];
      
      setPromotions(promoList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error("❌ 프로모션 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    try {
      const promoData = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        type: formData.type,
        discountValue: formData.discountValue,
        maxUsage: formData.maxUsage,
        currentUsage: editingPromotion?.currentUsage || 0,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
        applicablePlans: formData.applicablePlans,
        isActive: true,
        createdBy: user.uid,
        description: formData.description,
        updatedAt: new Date().toISOString(),
      };

      if (editingPromotion) {
        await updateDoc(doc(db, "promotions", editingPromotion.id), promoData);
        alert("✅ 프로모션이 수정되었습니다.");
      } else {
        await addDoc(collection(db, "promotions"), {
          ...promoData,
          createdAt: new Date().toISOString(),
        });
        alert("✅ 프로모션이 생성되었습니다.");
      }

      setShowModal(false);
      resetForm();
      loadPromotions();
    } catch (error) {
      console.error("❌ 프로모션 저장 실패:", error);
      alert("프로모션 저장 중 오류가 발생했습니다.");
    }
  };

  const handleEdit = (promotion: PromotionCode) => {
    setEditingPromotion(promotion);
    setFormData({
      code: promotion.code,
      name: promotion.name,
      type: promotion.type,
      discountValue: promotion.discountValue,
      maxUsage: promotion.maxUsage,
      validFrom: promotion.validFrom.split("T")[0],
      validUntil: promotion.validUntil.split("T")[0],
      applicablePlans: promotion.applicablePlans,
      description: promotion.description || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 프로모션을 삭제하시겠습니까?")) return;
    if (!db) return;

    try {
      await deleteDoc(doc(db, "promotions", id));
      alert("✅ 프로모션이 삭제되었습니다.");
      loadPromotions();
    } catch (error) {
      console.error("❌ 프로모션 삭제 실패:", error);
      alert("프로모션 삭제 중 오류가 발생했습니다.");
    }
  };

  const toggleActive = async (promotion: PromotionCode) => {
    if (!db) return;

    try {
      await updateDoc(doc(db, "promotions", promotion.id), {
        isActive: !promotion.isActive,
        updatedAt: new Date().toISOString(),
      });
      loadPromotions();
    } catch (error) {
      console.error("❌ 상태 변경 실패:", error);
    }
  };

  const resetForm = () => {
    setEditingPromotion(null);
    setFormData({
      code: "",
      name: "",
      type: "percentage",
      discountValue: 0,
      maxUsage: 0,
      validFrom: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      applicablePlans: [],
      description: "",
    });
  };

  const getDiscountText = (promo: PromotionCode) => {
    if (promo.type === "percentage") return `${promo.discountValue}% 할인`;
    if (promo.type === "fixed") return `${promo.discountValue.toLocaleString()}원 할인`;
    return `${promo.discountValue}일 무료 연장`;
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            🎁 프로모션 관리
          </h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:scale-105 transition-all shadow-lg"
          >
            ➕ 프로모션 추가
          </button>
        </div>

        {/* 프로모션 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map((promo) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 ${
                promo.isActive
                  ? "border-green-300 dark:border-green-700"
                  : "border-gray-300 dark:border-gray-700 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎫</span>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                      {promo.code}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {promo.name}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(promo)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    promo.isActive
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {promo.isActive ? "활성" : "비활성"}
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg p-3">
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300 text-center">
                    {getDiscountText(promo)}
                  </p>
                </div>

                {promo.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {promo.description}
                  </p>
                )}

                <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                  <p>📅 {new Date(promo.validFrom).toLocaleDateString()} ~ {new Date(promo.validUntil).toLocaleDateString()}</p>
                  <p>
                    📊 사용: {promo.currentUsage} / {promo.maxUsage === 0 ? "무제한" : promo.maxUsage}
                  </p>
                  {promo.applicablePlans.length > 0 && (
                    <p>🎯 적용 플랜: {promo.applicablePlans.join(", ")}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(promo)}
                  className="flex-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all text-sm font-semibold"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
                  className="flex-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all text-sm font-semibold"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          ))}

          {promotions.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🎁</div>
              <p className="text-gray-600 dark:text-gray-400">
                등록된 프로모션이 없습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 프로모션 추가/수정 모달 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl my-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                {editingPromotion ? "프로모션 수정" : "프로모션 추가"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      프로모션 코드 *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                      placeholder="WELCOME2024"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      프로모션 이름 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="신규 가입 환영 이벤트"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      할인 유형 *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as "percentage" | "fixed" | "period" })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="percentage">퍼센트 할인 (%)</option>
                      <option value="fixed">고정 금액 할인 (원)</option>
                      <option value="period">기간 연장 (일)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      할인값 *
                    </label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })}
                      required
                      min="0"
                      placeholder={formData.type === "percentage" ? "10" : formData.type === "fixed" ? "5000" : "7"}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    최대 사용 횟수 (0 = 무제한)
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsage}
                    onChange={(e) => setFormData({ ...formData, maxUsage: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      시작일 *
                    </label>
                    <input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      종료일 *
                    </label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="프로모션에 대한 설명을 입력하세요"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:scale-105 transition-all shadow-lg"
                  >
                    {editingPromotion ? "수정하기" : "추가하기"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}






