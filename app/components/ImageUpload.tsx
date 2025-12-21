"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void;
  selectedImage: File | null;
}

export default function ImageUpload({ onImageSelect, selectedImage }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rotateImage = async (file: File, degrees: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // 회전 각도에 따라 캔버스 크기 조정
        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        canvas.toBlob((blob) => {
          if (blob) {
            const rotatedFile = new File([blob], file.name, { type: file.type });
            resolve(rotatedFile);
          } else {
            reject(new Error("Failed to create blob"));
          }
        }, file.type);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleRotate = async () => {
    if (!selectedImage) return;

    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);

    try {
      const rotatedFile = await rotateImage(selectedImage, 90);
      onImageSelect(rotatedFile);
      
      // 미리보기 업데이트
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(rotatedFile);
    } catch (error) {
      console.error("이미지 회전 오류:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onImageSelect(file);
      setRotation(0); // 새 이미지 선택 시 회전 초기화
      
      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onImageSelect(file);
      setRotation(0); // 새 이미지 선택 시 회전 초기화
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative border-4 border-dashed border-blue-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-700"
      >
        {preview ? (
          <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
              style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.3s ease" }}
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRotate();
                }}
                className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-600 transition-all shadow-lg"
                title="90도 회전"
              >
                🔄
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreview(null);
                  setRotation(0);
                  onImageSelect(null);
                }}
                className="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                title="삭제"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl">📷</div>
            <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              영어 일기 사진을 업로드하세요
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              클릭하거나 드래그 앤 드롭으로 업로드
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </motion.div>
  );
}

