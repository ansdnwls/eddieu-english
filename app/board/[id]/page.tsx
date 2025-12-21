"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Post, Comment, POST_CATEGORIES } from "@/app/types";
import { addSubjectParticle } from "@/app/utils/koreanHelper";
import Link from "next/link";

export default function PostDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      if (!db || !postId) {
        setLoading(false);
        return;
      }

      try {
        const postDoc = await getDoc(doc(db, "posts", postId));
        
        if (!postDoc.exists()) {
          alert("게시글을 찾을 수 없습니다.");
          router.push("/board");
          return;
        }

        const data = postDoc.data();
        const postData: Post = {
          id: postDoc.id,
          ...data,
          comments: data.comments || [],
        } as Post;

        setPost(postData);
        setIsAuthor(user?.uid === postData.authorId);
        setIsLiked(user?.uid ? postData.likes?.includes(user.uid) : false);

        // 조회수 증가 (본인 게시글 제외)
        if (user?.uid !== postData.authorId) {
          await updateDoc(doc(db, "posts", postId), {
            views: (postData.views || 0) + 1,
          });
        }

        // 관리자가 Q&A나 광고문의 확인 시 isRead를 true로 업데이트
        if (user?.uid && (postData.category === "qna" || postData.category === "advertisement")) {
          try {
            // 관리자 확인
            const adminDoc = await getDoc(doc(db, "admins", user.uid));
            if (adminDoc.exists() && adminDoc.data().isAdmin === true && !postData.isRead) {
              await updateDoc(doc(db, "posts", postId), {
                isRead: true,
                updatedAt: new Date().toISOString(),
              });
              setPost({ ...postData, isRead: true });
              console.log("✅ 게시글 읽음 처리 완료");
            }
          } catch (error) {
            console.log("⚠️ 관리자 확인 실패:", error);
          }
        }
      } catch (error) {
        console.error("Error loading post:", error);
        alert("게시글을 불러오는 중 오류가 발생했습니다.");
        router.push("/board");
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId, user, router]);

  const handleLike = async () => {
    if (!user || !post || !db) return;

    try {
      const postRef = doc(db, "posts", postId);
      const currentLikes = post.likes || [];

      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid),
        });
        setPost({ ...post, likes: currentLikes.filter((id) => id !== user.uid) });
        setIsLiked(false);
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid),
        });
        setPost({ ...post, likes: [...currentLikes, user.uid] });
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleDelete = async () => {
    if (!post || !db || !isAuthor) return;

    if (!confirm("정말 이 게시글을 삭제하시겠습니까?")) return;

    try {
      await updateDoc(doc(db, "posts", postId), {
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      });
      alert("게시글이 삭제되었습니다.");
      router.push("/board");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("게시글 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentContent.trim() || !user || !post || !db) return;

    setSubmittingComment(true);

    try {
      // 아이 정보 가져오기
      const childDoc = await getDoc(doc(db, "children", user.uid));
      const childData = childDoc.exists() ? childDoc.data() : null;
      
      const authorName = childData
        ? childData.childName || childData.name || user.email?.split("@")[0] || "익명"
        : user.email?.split("@")[0] || "익명";

      const childName = childData
        ? childData.childName || childData.name || ""
        : "";

      const newComment: Comment = {
        id: Date.now().toString(),
        postId: postId,
        content: commentContent.trim(),
        authorId: user.uid,
        authorName,
        authorEmail: user.email || undefined,
        childName: childName, // 아이 이름 추가
        likes: [],
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "posts", postId), {
        comments: arrayUnion(newComment),
        updatedAt: new Date().toISOString(),
      });

      setPost({
        ...post,
        comments: [...(post.comments || []), newComment],
      });

      setCommentContent("");
    } catch (error) {
      console.error("Error submitting comment:", error);
      alert("댓글 작성 중 오류가 발생했습니다.");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">게시글을 불러오는 중...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
        {/* 헤더 */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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
            {isAuthor && (
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <main className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-8 space-y-6"
          >
            {/* 게시글 헤더 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                {post.isPinned && (
                  <span className="text-yellow-500">📌</span>
                )}
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded">
                  {POST_CATEGORIES.find(c => c.value === post.category)?.emoji} {POST_CATEGORIES.find(c => c.value === post.category)?.label}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-4 break-words">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <span>👤 {post.childName || post.authorNickname || post.authorName ? `${addSubjectParticle(post.childName || post.authorNickname || post.authorName)} 쓴 글` : "익명"}</span>
                <span>👁️ {post.views || 0}</span>
                <span>❤️ {post.likes?.length || 0}</span>
                <span>💬 {post.comments?.length || 0}</span>
                <span className="w-full sm:w-auto sm:ml-auto">
                  {new Date(post.createdAt).toLocaleString("ko-KR")}
                </span>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* 게시글 내용 */}
            <div className="prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                {post.content}
              </div>
            </div>

            {/* 응원 버튼 (일기 공유 게시판) */}
            {post.category === "diary_share" && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLike}
                  disabled={!user}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    isLiked
                      ? "bg-pink-500 text-white hover:bg-pink-600"
                      : "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/50"
                  } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isLiked ? "💝 응원 중" : "💝 응원하기"} ({post.likes?.length || 0}명이 응원했어요)
                </button>
              </div>
            )}

            {/* 좋아요 버튼 (다른 게시판) */}
            {post.category !== "diary_share" && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLike}
                  disabled={!user}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    isLiked
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isLiked ? "❤️ 좋아요 취소" : "🤍 좋아요"} ({post.likes?.length || 0})
                </button>
              </div>
            )}

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* 댓글 섹션 */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                {post.category === "diary_share" ? "💬 응원 댓글" : "💬 댓글"} ({post.comments?.length || 0})
              </h2>
              {post.category === "diary_share" && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  아이들에게 따뜻한 응원 댓글을 남겨주세요! 💝
                </p>
              )}

              {/* 댓글 작성 폼 */}
              {user && (
                <form onSubmit={handleSubmitComment} className="mb-6">
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder={post.category === "diary_share" ? "따뜻한 응원 댓글을 남겨주세요... 💝" : "댓글을 입력하세요..."}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-3"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !commentContent.trim()}
                    className={`px-6 py-2 rounded-lg transition-all font-semibold ${
                      post.category === "diary_share"
                        ? "bg-pink-500 hover:bg-pink-600 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    } ${
                      submittingComment || !commentContent.trim()
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {submittingComment ? "작성 중..." : post.category === "diary_share" ? "💝 응원 댓글 남기기" : "댓글 작성"}
                  </button>
                </form>
              )}

              {/* 댓글 목록 */}
              <div className="space-y-4">
                {post.comments && post.comments.length > 0 ? (
                  post.comments
                    .filter((comment) => !comment.isDeleted)
                    .map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-semibold text-gray-800 dark:text-white">
                              {comment.authorNickname || comment.childName || comment.authorName}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              {new Date(comment.createdAt).toLocaleString("ko-KR")}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    아직 댓글이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </AuthGuard>
  );
}




