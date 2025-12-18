"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, addDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminLayout from "../layout";
import { motion } from "framer-motion";
import { Post, PostCategory, POST_CATEGORIES } from "@/app/types";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function BoardManagementPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostCategory | "all">("all");
  const [addingNotice, setAddingNotice] = useState(false);

  useEffect(() => {
    const loadPosts = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      try {
        // 인덱스 없이 작동하도록 쿼리 단순화
        const q = query(collection(db, "posts"));
        
        const snapshot = await getDocs(q);
        const postList: Post[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          postList.push({
            id: doc.id,
            ...data,
            comments: data.comments || [],
          } as Post);
        });

        // 클라이언트 사이드에서 정렬 (고정 게시글 우선, 그 다음 날짜순)
        postList.sort((a, b) => {
          // 고정 게시글 우선
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          // 날짜순 정렬 (최신순)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // 카테고리 필터링
        if (filter !== "all") {
          const filtered = postList.filter((post) => post.category === filter);
          setPosts(filtered);
        } else {
          setPosts(postList);
        }
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [filter]);

  const handlePinPost = async (postId: string, currentPinStatus: boolean) => {
    if (!db) return;

    try {
      await updateDoc(doc(db, "posts", postId), {
        isPinned: !currentPinStatus,
        updatedAt: new Date().toISOString(),
      });
      
      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, isPinned: !currentPinStatus } : post
        )
      );
      alert(currentPinStatus ? "고정이 해제되었습니다." : "게시글이 고정되었습니다.");
    } catch (error) {
      console.error("Error pinning post:", error);
      alert("오류가 발생했습니다.");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("정말 이 게시글을 삭제하시겠습니까?")) return;
    if (!db) return;

    try {
      await updateDoc(doc(db, "posts", postId), {
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      });
      
      setPosts(posts.filter((post) => post.id !== postId));
      alert("게시글이 삭제되었습니다.");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("오류가 발생했습니다.");
    }
  };

  const handleAddWordCountingNotice = async () => {
    if (!db || !user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!confirm("단어 카운팅 방법 안내 공지사항을 추가하시겠습니까?")) return;

    setAddingNotice(true);

    try {
      // 기존에 같은 제목의 공지사항이 있는지 확인
      const postsRef = collection(db, "posts");
      const q = query(
        postsRef,
        where("category", "==", "notice_mission"),
        where("title", "==", "📊 단어 카운팅 방법 안내")
      );

      const existingPosts = await getDocs(q);
      if (!existingPosts.empty) {
        alert("이미 같은 제목의 공지사항이 존재합니다.");
        setAddingNotice(false);
        return;
      }

      const noticeContent = `# 📊 단어 카운팅 방법 안내

안녕하세요! 영어 일기/작문의 단어 수가 어떻게 계산되는지 안내드립니다.

## 🔢 단어 수 계산 방법

우리 시스템은 **정확한 단어 수**를 계산하기 위해 다음과 같은 방법을 사용합니다:

### ✅ 계산 방식

1. **구두점 제거**: 문장 부호(.,!?;:()[]{}'")를 제거합니다
2. **공백으로 분리**: 공백, 탭, 줄바꿈으로 단어를 구분합니다
3. **빈 문자열 제거**: 빈 문자열은 카운트에서 제외합니다

### 📝 예시

\`\`\`
"I went to the zoo!" 
→ ["I", "went", "to", "the", "zoo"] 
→ 5개 단어 ✅

"Hello, world!" 
→ ["Hello", "world"] 
→ 2개 단어 ✅

"I'm happy!" 
→ ["I", "m", "happy"] 
→ 3개 단어 ✅
\`\`\`

## 💡 주의사항

- **구두점이 붙은 단어**: 구두점은 제거되어 별도로 카운트되지 않습니다
- **연속된 공백**: 여러 공백은 하나로 처리됩니다
- **줄바꿈**: 줄바꿈도 공백으로 처리되어 단어를 구분합니다

## 📈 통계에 반영되는 항목

- **총 단어 수**: 일기/작문 전체의 단어 개수
- **문장 수**: 마침표(.), 느낌표(!), 물음표(?)로 구분된 문장 개수
- **평균 문장 길이**: 총 단어 수 ÷ 문장 수
- **고유 단어 수**: 중복을 제외한 서로 다른 단어의 개수

## 🎯 왜 정확한 카운팅이 중요한가요?

정확한 단어 수는 다음과 같은 곳에서 사용됩니다:

1. **성장 통계**: 일자별 단어 사용량 그래프
2. **월별 리포트**: GPT가 분석하는 성장 지표
3. **학습 진도**: 아이의 영어 실력 향상 추적

## ❓ 궁금한 점이 있으신가요?

문의사항이 있으시면 언제든지 연락주세요!

---

*이 공지사항은 시스템 업데이트로 인해 추가되었습니다.*`;

      const postData = {
        title: "📊 단어 카운팅 방법 안내",
        content: noticeContent,
        authorId: user.uid,
        parentId: user.uid,
        authorName: "운영팀",
        authorEmail: user.email || "admin@example.com",
        childName: "운영팀",
        category: "notice_mission" as PostCategory,
        views: 0,
        likes: [],
        comments: [],
        isPinned: true,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "posts"), postData);
      alert("✅ 단어 카운팅 안내 공지사항이 성공적으로 추가되었습니다!");
      
      // 목록 새로고침
      const loadPosts = async () => {
        if (!db) return;
        const q = query(collection(db, "posts"));
        const snapshot = await getDocs(q);
        const postList: Post[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          postList.push({
            id: doc.id,
            ...data,
            comments: data.comments || [],
          } as Post);
        });

        postList.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        if (filter !== "all") {
          const filtered = postList.filter((post) => post.category === filter);
          setPosts(filtered);
        } else {
          setPosts(postList);
        }
      };

      await loadPosts();
    } catch (error) {
      console.error("Error adding notice:", error);
      alert("공지사항 추가 중 오류가 발생했습니다.");
    } finally {
      setAddingNotice(false);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            📋 게시판 관리
          </h1>
          <Link href="/admin/board/write">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              ✏️ 게시글 작성
            </motion.button>
          </Link>
        </div>

        {/* 필터 */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            전체
          </button>
          {POST_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value as PostCategory)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                filter === cat.value
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* 게시글 목록 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    작성자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    조회수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    작성일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {posts
                  .filter((post) => !post.isDeleted)
                  .map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {post.isPinned && <span className="text-yellow-500">📌</span>}
                          <Link
                            href={`/board/${post.id}`}
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {post.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {post.authorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs">
                          {POST_CATEGORIES.find(c => c.value === post.category)?.emoji} {POST_CATEGORIES.find(c => c.value === post.category)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {post.views || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePinPost(post.id, post.isPinned || false)}
                            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300"
                          >
                            {post.isPinned ? "📌 해제" : "📌 고정"}
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {posts.filter((post) => !post.isDeleted).length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              게시글이 없습니다.
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}



