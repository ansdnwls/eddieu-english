"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ImageUpload from "@/app/components/ImageUpload";

interface Day1WriteProps {
  week: number;
  childId: string;
  contentPack: {
    json: {
      day1: {
        write: {
          prompt: string;
          guide_questions: string[];
          min_words: number;
          max_words: number;
        };
      };
    };
  };
  onSubmitSuccess: (submissionId: string) => void;
}

export default function Day1Write({ week, childId, contentPack, onSubmitSuccess }: Day1WriteProps) {
  const [inputMethod, setInputMethod] = useState<"typing" | "ocr">("typing");
  const [text, setText] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState<string>("");
  const [isOCRing, setIsOCRing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { prompt, guide_questions, min_words, max_words } = contentPack.json.day1.write;

  // 단어 수 계산
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const isWordCountValid = wordCount >= min_words && wordCount <= max_words;

  // OCR 처리
  const handleOCR = async () => {
    if (!selectedImage) return;

    setIsOCRing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch("/api/ocr-diary", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.extractedText) {
        setOcrText(result.extractedText);
        setText(result.extractedText);
        console.log("✅ OCR 완료");
      } else {
        throw new Error(result.error || "OCR failed");
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ OCR 오류:", error);
      setError("이미지에서 텍스트를 추출할 수 없습니다. 다시 시도해주세요.");
    } finally {
      setIsOCRing(false);
    }
  };

  // 제출 처리
  const handleSubmit = async () => {
    if (!isWordCountValid) {
      setError(`${min_words}~${max_words} 단어를 작성해주세요. (현재: ${wordCount}개)`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submission 생성
      const response = await fetch("/api/showtell/submissions/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: childId,
          week,
          input_method: inputMethod,
          raw_text: text,
          ocr_text: inputMethod === "ocr" ? ocrText : null,
          image_url: null, // TODO: Firebase Storage 업로드
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("✅ 제출 완료:", result.data.submission_id);
        onSubmitSuccess(result.data.submission_id);
      } else {
        throw new Error(result.error || "Submission failed");
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ 제출 오류:", error);
      setError("제출 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 프롬프트 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl p-6 shadow-lg"
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          📝 {prompt}
        </h2>
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
            다음 질문들을 참고해서 작성해보세요:
          </p>
          {guide_questions.map((question, index) => (
            <p key={index} className="text-sm text-gray-700 dark:text-gray-300">
              • {question}
            </p>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full">
            {min_words}~{max_words} 단어
          </span>
          <span className={`font-semibold ${isWordCountValid ? "text-green-600" : "text-orange-600"}`}>
            현재: {wordCount}개 {isWordCountValid ? "✅" : "⚠️"}
          </span>
        </div>
      </motion.div>

      {/* 입력 방식 선택 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4"
      >
        <button
          onClick={() => setInputMethod("typing")}
          className={`flex-1 py-4 rounded-xl font-bold transition-all ${
            inputMethod === "typing"
              ? "bg-blue-500 text-white shadow-lg scale-105"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300"
          }`}
        >
          ⌨️ 타이핑하기
        </button>
        <button
          onClick={() => setInputMethod("ocr")}
          className={`flex-1 py-4 rounded-xl font-bold transition-all ${
            inputMethod === "ocr"
              ? "bg-purple-500 text-white shadow-lg scale-105"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300"
          }`}
        >
          📷 사진 업로드 (OCR)
        </button>
      </motion.div>

      {/* 입력 영역 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {inputMethod === "typing" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="여기에 영어로 작성하세요..."
            className="w-full h-64 p-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        ) : (
          <div className="space-y-4">
            <ImageUpload
              onImageSelect={setSelectedImage}
              selectedImage={selectedImage}
            />
            {selectedImage && !text && (
              <button
                onClick={handleOCR}
                disabled={isOCRing}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
              >
                {isOCRing ? "📷 이미지 분석 중..." : "📷 텍스트 추출하기"}
              </button>
            )}
            {text && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  추출된 텍스트 (수정 가능):
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full h-64 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* 에러 메시지 */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-100 dark:bg-red-900/30 border-2 border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl"
        >
          {error}
        </motion.div>
      )}

      {/* 제출 버튼 */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={handleSubmit}
        disabled={!text || isSubmitting || !isWordCountValid}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-5 rounded-xl shadow-lg transition-all text-lg disabled:cursor-not-allowed"
      >
        {isSubmitting ? "제출 중..." : "✅ 제출하고 교정받기"}
      </motion.button>
    </div>
  );
}





