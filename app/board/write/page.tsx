"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PostCategory, POST_CATEGORIES } from "@/app/types";
import Link from "next/link";

export default function WritePostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("diary_share");
  const [childName, setChildName] = useState(""); // 아이 이름
  const [savedChildName, setSavedChildName] = useState(""); // 저장된 아이 이름
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isParent, setIsParent] = useState(false);

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam && POST_CATEGORIES.find(c => c.value === categoryParam)) {
      setCategory(categoryParam as PostCategory);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user || !db) return;

      try {
        // 관리자 확인
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (adminDoc.exists() && adminDoc.data().isAdmin === true) {
          setIsAdmin(true);
        }

        // 부모 계정 확인 및 저장된 아이 이름 가져오기
        const childDoc = await getDoc(doc(db, "children", user.uid));
        if (childDoc.exists()) {
          setIsParent(true);
          const childData = childDoc.data();
          const name = childData.childName || childData.name || "";
          setSavedChildName(name);
          setChildName(name); // 기본값으로 설정
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    checkUserRole();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }

    if (!childName.trim()) {
      setError("아이 이름을 입력해주세요.");
      return;
    }

    if (!user || !db) {
      setError("로그인이 필요합니다.");
      return;
    }

    // 카테고리별 권한 체크
    const categoryInfo = POST_CATEGORIES.find(c => c.value === category);
    if (categoryInfo) {
      if (categoryInfo.writeAccess === "admin" && !isAdmin) {
        setError("관리자만 이 게시판에 글을 쓸 수 있습니다.");
        return;
      }
      if (categoryInfo.writeAccess === "parent" && !isParent) {
        setError("보호자만 이 게시판에 글을 쓸 수 있습니다.");
        return;
      }
    }

    setLoading(true);

    try {
      // 사용자 정보 가져오기
      const childDoc = await getDoc(doc(db, "children", user.uid));
      const authorName = childDoc.exists() 
        ? childDoc.data().childName || childDoc.data().name || user.email?.split("@")[0] || "익명"
        : user.email?.split("@")[0] || "익명";

      // 게시글 저장
      const postData: any = {
        title: title.trim(),
        content: content.trim(),
        authorId: user.uid, // 부모 아이디
        parentId: user.uid, // 부모 아이디
        authorName,
        authorEmail: user.email,
        childName: childName.trim(), // 아이 이름 (데이터 식별용 + UI 표현용)
        category,
        views: 0,
        likes: [],
        comments: [],
        isPinned: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 닉네임은 사용하지 않음 (아이 이름 사용)

      await addDoc(collection(db, "posts"), postData);

      // 게시판 목록으로 이동
      router.push("/board");
    } catch (error: any) {
      console.error("Error creating post:", error);
      setError("게시글 작성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✏️</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                게시글 작성
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 카테고리 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  카테고리
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {POST_CATEGORIES.map((cat) => {
                    // 권한 체크
                    let canWrite = false;
                    if (cat.writeAccess === "all") canWrite = true;
                    if (cat.writeAccess === "parent" && isParent) canWrite = true;
                    if (cat.writeAccess === "admin" && isAdmin) canWrite = true;

                    if (!canWrite) return null;

                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                          category === cat.value
                            ? "bg-blue-500 text-white shadow-lg"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                        title={cat.description}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    );
                  })}
                </div>
                {POST_CATEGORIES.find(c => c.value === category) && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {POST_CATEGORIES.find(c => c.value === category)?.description}
                  </p>
                )}
              </div>

              {/* 아이 이름 입력 */}
              <div>
                <label
                  htmlFor="childName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  아이 이름 *
                </label>
                {savedChildName ? (
                  <div className="space-y-2">
                    <select
                      id="childName"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={savedChildName}>{savedChildName}</option>
                      <option value="">직접 입력</option>
                    </select>
                    {childName === "" && (
                      <input
                        type="text"
                        value={childName}
                        onChange={(e) => setChildName(e.target.value)}
                        placeholder="아이 이름을 입력하세요"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    )}
                  </div>
                ) : (
                  <input
                    id="childName"
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="아이 이름을 입력하세요 (예: 민준, 지아)"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {childName ? `게시판에 "${childName}이(가) 쓴 글" 형식으로 표시됩니다.` : "게시판에 표시될 아이 이름을 입력하세요."}
                </p>
              </div>


              {/* 제목 */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  제목
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={100}
                />
              </div>

              {/* 내용 */}
              <div>
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  내용
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="내용을 입력하세요"
                  rows={15}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* 에러 메시지 */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/board")}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg transition-all font-semibold ${
                    loading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:scale-105 hover:shadow-xl"
                  }`}
                >
                  {loading ? "작성 중..." : "작성하기"}
                </button>
              </div>
            </form>
          </motion.div>
        </main>
      </div>
    </AuthGuard>
  );
}




