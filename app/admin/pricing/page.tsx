"use client";

import { useEffect, useState, FormEvent } from "react";
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "../layout";
import { motion } from "framer-motion";

interface PricingPlan {
  id?: string;
  name: string;
  price: number;
  period: "영구" | "월" | "년";
  description: string;
  features: string[];
  buttonText: string;
  popular: boolean;
  color: "gray" | "blue" | "purple";
  orderId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function PricingManagementPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState<PricingPlan>({
    name: "",
    price: 0,
    period: "월",
    description: "",
    features: [""],
    buttonText: "구독하기",
    popular: false,
    color: "blue",
    orderId: "",
    isActive: true,
  });

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const firestoreDb = db as NonNullable<typeof db>;
    
    console.log("📊 Setting up real-time listener for pricing plans...");

    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(
      query(collection(firestoreDb, "pricingPlans"), orderBy("price", "asc")),
      (snapshot) => {
        const plansList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PricingPlan[];
        
        setPlans(plansList);
        setLoading(false);
        console.log("✅ Pricing plans loaded:", plansList.length);
      },
      (error) => {
        console.error("❌ Error loading pricing plans:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [db]);

  const handleAddNew = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      price: 0,
      period: "월",
      description: "",
      features: [""],
      buttonText: "구독하기",
      popular: false,
      color: "blue",
      orderId: "",
      isActive: true,
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      period: plan.period,
      description: plan.description,
      features: plan.features.length > 0 ? plan.features : [""],
      buttonText: plan.buttonText,
      popular: plan.popular,
      color: plan.color,
      orderId: plan.orderId,
      isActive: plan.isActive,
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("정말 이 요금제를 삭제하시겠습니까?")) {
      return;
    }

    if (!db) {
      alert("데이터베이스 연결 오류");
      return;
    }

    try {
      await deleteDoc(doc(db, "pricingPlans", planId));
      setSuccess("요금제가 삭제되었습니다.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting plan:", error);
      setError("삭제 중 오류가 발생했습니다.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (!db) {
      setError("데이터베이스 연결 오류");
      setSaving(false);
      return;
    }

    try {
      // 유효성 검사
      if (!formData.name.trim()) {
        throw new Error("요금제 이름을 입력해주세요.");
      }
      if (formData.price < 0) {
        throw new Error("가격은 0 이상이어야 합니다.");
      }
      if (!formData.orderId.trim()) {
        throw new Error("주문 ID를 입력해주세요.");
      }
      if (formData.features.filter(f => f.trim()).length === 0) {
        throw new Error("최소 1개 이상의 기능을 입력해주세요.");
      }

      const planData = {
        ...formData,
        features: formData.features.filter(f => f.trim()),
        updatedAt: new Date().toISOString(),
      };

      if (editingPlan?.id) {
        // 수정
        await updateDoc(doc(db, "pricingPlans", editingPlan.id), planData);
        setSuccess("요금제가 수정되었습니다.");
      } else {
        // 추가
        await addDoc(collection(db, "pricingPlans"), {
          ...planData,
          createdAt: new Date().toISOString(),
        });
        setSuccess("요금제가 추가되었습니다.");
      }

      setShowForm(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "저장 중 오류가 발생했습니다.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, ""],
    });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({
      ...formData,
      features: newFeatures,
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">요금제를 불러오는 중...</p>
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
            💰 요금제 관리
          </h1>
          <button
            onClick={handleAddNew}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all"
          >
            + 새 요금제 추가
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-100 dark:bg-green-900/30 border border-green-400 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg"
          >
            {success}
          </motion.div>
        )}

        {/* 요금제 목록 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 ${
                plan.popular
                  ? "border-blue-500 dark:border-blue-500"
                  : "border-gray-200 dark:border-gray-700"
              } ${!plan.isActive ? "opacity-50" : ""}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    {plan.name}
                  </h3>
                  {plan.popular && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                      인기
                    </span>
                  )}
                  {!plan.isActive && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full ml-2">
                      비활성
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {plan.price === 0 ? "무료" : `${plan.price.toLocaleString()}원`}
                  </div>
                  {plan.price > 0 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      /{plan.period}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {plan.description}
              </p>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  기능:
                </p>
                <ul className="space-y-1">
                  {plan.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 3 && (
                    <li className="text-xs text-gray-500 dark:text-gray-500">
                      +{plan.features.length - 3}개 더
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(plan)}
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  수정
                </button>
                <button
                  onClick={() => plan.id && handleDelete(plan.id)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <p className="text-gray-600 dark:text-gray-400">
              등록된 요금제가 없습니다. 새 요금제를 추가해주세요.
            </p>
          </div>
        )}

        {/* 요금제 추가/수정 폼 */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowForm(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                {editingPlan ? "요금제 수정" : "새 요금제 추가"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 요금제 이름 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    요금제 이름 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 베이직, 프리미엄"
                  />
                </div>

                {/* 가격 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      가격 (원) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      required
                      min="0"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      기간 *
                    </label>
                    <select
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value as "영구" | "월" | "년" })}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="영구">영구</option>
                      <option value="월">월</option>
                      <option value="년">년</option>
                    </select>
                  </div>
                </div>

                {/* 설명 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    설명 *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 개인 학습자에게 적합한 플랜"
                  />
                </div>

                {/* 주문 ID */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    주문 ID (orderId) *
                  </label>
                  <input
                    type="text"
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: plan_basic"
                  />
                </div>

                {/* 기능 목록 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    기능 목록 *
                  </label>
                  <div className="space-y-2">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="기능 설명"
                        />
                        {formData.features.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addFeature}
                      className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                    >
                      + 기능 추가
                    </button>
                  </div>
                </div>

                {/* 버튼 텍스트 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    버튼 텍스트
                  </label>
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 구독하기"
                  />
                </div>

                {/* 옵션 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.popular}
                      onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      인기 플랜으로 표시
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      활성화
                    </label>
                  </div>
                </div>

                {/* 색상 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    색상 테마
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value as "gray" | "blue" | "purple" })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="gray">회색</option>
                    <option value="blue">파란색</option>
                    <option value="purple">보라색</option>
                  </select>
                </div>

                {/* 버튼 */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-all"
                  >
                    {saving ? "저장 중..." : editingPlan ? "수정하기" : "추가하기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-all"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}

