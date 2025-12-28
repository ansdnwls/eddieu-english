"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, orderBy, where, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post, PostCategory, POST_CATEGORIES } from "@/app/types";
import { addSubjectParticle } from "@/app/utils/koreanHelper";
import Link from "next/link";
import { isPenpalEnabled } from "@/lib/featureFlags";

function BoardPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isParent, setIsParent] = useState(false);

  // URL 파라미터에서 카테고리 읽기
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      const validCategory = POST_CATEGORIES.find(c => c.value === categoryParam);
      if (validCategory) {
        setSelectedCategory(categoryParam as PostCategory);
      }
    }
  }, [searchParams]);

  // 사용자 권한 확인
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user || !db) return;

      try {
        // 관리자 확인
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (adminDoc.exists() && adminDoc.data().isAdmin === true) {
          setIsAdmin(true);
        }

        // 부모 계정 확인 (children 컬렉션에 해당 UID가 있으면 부모 계정)
        const childDoc = await getDoc(doc(db, "children", user.uid));
        if (childDoc.exists()) {
          setIsParent(true);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    checkUserRole();
  }, [user]);

  useEffect(() => {
    const loadPosts = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        // 모든 게시글 가져오기 (공지글도 포함)
        const q = query(
          collection(db, "posts"),
          limit(100)
        );

        const snapshot = await getDocs(q);
        const postList: Post[] = [];
        
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          // 삭제되지 않은 게시글만 추가
          if (!data.isDeleted) {
            const post: Post = {
              id: docSnapshot.id,
              title: data.title || "",
              content: data.content || "",
              authorId: data.authorId || "",
              parentId: data.parentId || "",
              authorName: data.authorName || "",
              childName: data.childName || "",
              category: data.category || "diary_share",
              views: data.views || 0,
              likes: data.likes || [],
              comments: data.comments || [],
              isPinned: data.isPinned === true,
              isPinnedAll: data.isPinnedAll === true, // 명시적으로 boolean 변환
              isDeleted: data.isDeleted === true,
              isRead: data.isRead === true, // 관리자 확인 여부
              isPrivate: data.isPrivate === true, // 비밀글 여부
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
              authorEmail: data.authorEmail,
              authorNickname: data.authorNickname,
              diaryId: data.diaryId,
            };
            postList.push(post);
          }
        });

        // 클라이언트 사이드에서 카테고리 필터링
        let filteredPosts = postList;
        
        if (selectedCategory !== "all") {
          // 선택한 카테고리의 모든 게시글 + 모든 게시판에 고정된 게시글 표시
          filteredPosts = postList.filter(post => {
            // 1. 선택한 카테고리의 게시글은 항상 표시
            if (post.category === selectedCategory) return true;
            
            // 2. isPinnedAll이 true인 게시글은 모든 카테고리에서 표시
            // notice_mission 카테고리를 선택한 경우는 제외
            if (post.isPinnedAll === true && selectedCategory !== "notice_mission") {
              return true;
            }
            
            return false;
          });
        } else {
          // "전체"를 선택한 경우: 공지/미션 제외한 모든 카테고리 표시
          filteredPosts = postList.filter(post => 
            post.category !== "notice_mission"
          );
        }
        
        // 디버깅: isPinnedAll 게시글 확인
        const allPinnedAllPosts = postList.filter(post => post.isPinnedAll === true);
        console.log("📊 필터링 결과:", {
          selectedCategory,
          totalPosts: postList.length,
          allPinnedAllPosts: allPinnedAllPosts.map(p => ({
            title: p.title,
            category: p.category,
            isPinnedAll: p.isPinnedAll
          })),
          filteredPosts: filteredPosts.length,
          filteredPinnedAllPosts: filteredPosts.filter(post => post.isPinnedAll === true).map(p => p.title)
        });

        // 클라이언트 사이드에서 정렬 (고정 게시글 우선, 그 다음 날짜순)
        filteredPosts.sort((a, b) => {
          // 1. 모든 게시판에 고정된 게시글을 최우선으로 배치
          if (a.isPinnedAll && !b.isPinnedAll) return -1;
          if (!a.isPinnedAll && b.isPinnedAll) return 1;
          
          // 2. 일반 고정 게시글을 다음으로 배치
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          // 3. 둘 다 고정이거나 둘 다 고정이 아닌 경우, 날짜순 정렬 (최신순)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // 검색어 필터링
        if (searchTerm) {
          filteredPosts = filteredPosts.filter(
            (post) =>
              post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              post.content.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setPosts(filteredPosts);
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [selectedCategory, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📋</span>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                게시판
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => router.back()}
                className="hidden sm:flex px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                ← 뒤로
              </button>
              <Link
                href="/"
                className="px-3 sm:px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all text-sm sm:text-base"
              >
                🏠 홈
              </Link>
              {user && (
                <Link
                  href={`/board/write${selectedCategory !== "all" ? `?category=${selectedCategory}` : ""}`}
                  className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all text-sm sm:text-base"
                >
                  ✏️ 글쓰기
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* 카테고리 필터 */}
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedCategory === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                전체
              </button>
              {POST_CATEGORIES.map((cat) => {
                // 공지/미션 카테고리는 사용자 게시판에서 숨김 (공지글은 자동으로 상단에 고정)
                if (cat.value === "notice_mission") return null;

                // 펜팔은 Feature Flag 확인 후 별도 페이지로 이동 (비활성화 시 숨김)
                if (cat.value === "penpal") {
                  if (!isPenpalEnabled()) return null;
                  
                  return (
                    <Link
                      key={cat.value}
                      href="/penpal"
                      className="px-4 py-2 rounded-lg font-semibold transition-all bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-purple-300 dark:border-purple-600"
                      title={cat.description}
                    >
                      {cat.emoji} {cat.label}
                    </Link>
                  );
                }

                // 접근 권한 체크
                const canView = cat.viewAccess === "all" || (cat.viewAccess === "parent" && isParent);
                if (!canView) return null;

                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      selectedCategory === cat.value
                        ? "bg-blue-500 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    title={cat.description}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 검색 */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="제목 또는 내용으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 게시글 목록 */}
          {posts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
            >
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                게시글이 없습니다
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {user ? "첫 번째 게시글을 작성해보세요!" : "로그인하고 첫 번째 게시글을 작성해보세요!"}
              </p>
              {user && (
                <Link
                  href="/board/write"
                  className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:scale-105 transition-all"
                >
                  글쓰기 →
                </Link>
              )}
            </motion.div>
          ) : (
            <div className="space-y-4">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/board/${post.id}`}>
                    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-600 ${
                      post.isPinnedAll ? "border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20" : 
                      post.isPinned ? "border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20" : ""
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {post.isPinnedAll && (
                              <span className="text-purple-500" title="모든 게시판에 고정">🌟</span>
                            )}
                            {post.isPinned && !post.isPinnedAll && (
                              <span className="text-yellow-500" title="현재 게시판에 고정">📌</span>
                            )}
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                              {POST_CATEGORIES.find(c => c.value === post.category)?.emoji} {POST_CATEGORIES.find(c => c.value === post.category)?.label}
                            </span>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                              {post.title}
                            </h3>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                            {post.content}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>👤 {post.childName || post.authorName ? `${addSubjectParticle(post.childName || post.authorName)} 쓴 글` : "익명"}</span>
                        <span>👁️ {post.views || 0}</span>
                        {post.category === "diary_share" ? (
                          <>
                            <span>💝 {post.likes?.length || 0}명 응원</span>
                            <span>💬 {post.comments?.length || 0}개 댓글</span>
                          </>
                        ) : (
                          <>
                            <span>❤️ {post.likes?.length || 0}</span>
                            <span>💬 {post.comments?.length || 0}</span>
                          </>
                        )}
                        <span className="ml-auto">
                          {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    }>
      <BoardPageContent />
    </Suspense>
  );
}



