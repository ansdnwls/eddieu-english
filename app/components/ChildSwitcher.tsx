"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChildProfile } from "@/app/types";

interface ChildSwitcherProps {
  currentChildId: string | null;
  onChildChange: (childId: string) => void;
}

export default function ChildSwitcher({ currentChildId, onChildChange }: ChildSwitcherProps) {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadChildren = async () => {
      if (!user || !db) {
        setLoading(false);
        return;
      }

      try {
        console.log("👶 아이 목록 로딩 시작...");
        
        // children 컬렉션에서 부모 UID로 필터링
        const childrenRef = collection(db, "children");
        const q = query(childrenRef, where("parentId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        const childList: ChildProfile[] = [];
        querySnapshot.forEach((doc) => {
          childList.push({
            id: doc.id,
            ...doc.data(),
          } as ChildProfile);
        });
        
        console.log("✅ 아이 목록 로딩 완료:", childList);
        setChildren(childList);
      } catch (error) {
        console.error("❌ 아이 목록 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, [user]);

  const currentChild = children.find((c) => c.id === currentChildId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">로딩 중...</span>
      </div>
    );
  }

  // 아이가 1명 이하면 표시하지 않음
  if (children.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      {/* 현재 선택된 아이 버튼 */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
      >
        <span className="text-xl">{currentChild?.avatar || "👶"}</span>
        <div className="flex flex-col items-start">
          <span className="text-xs opacity-80">현재 아이</span>
          <span className="text-sm">{currentChild?.childName || "선택"}</span>
        </div>
        <span className={`ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
      </motion.button>

      {/* 아이 선택 드롭다운 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 배경 클릭 시 닫기 */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            ></div>

            {/* 드롭다운 메뉴 */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 min-w-[200px]"
            >
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    onChildChange(child.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    child.id === currentChildId
                      ? "bg-blue-50 dark:bg-blue-900/30"
                      : ""
                  }`}
                >
                  <span className="text-2xl">{child.avatar}</span>
                  <div className="flex flex-col items-start">
                    <span className={`text-sm font-semibold ${
                      child.id === currentChildId
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-900 dark:text-white"
                    }`}>
                      {child.childName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {child.age}살 · {child.englishLevel}
                    </span>
                  </div>
                  {child.id === currentChildId && (
                    <span className="ml-auto text-blue-500">✓</span>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

