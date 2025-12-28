import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import crypto from "crypto";

/**
 * TTS 캐시 인터페이스
 */
interface TTSCache {
  cache_key: string; // PK (hash(text+voice+speed))
  text: string;
  voice_id: string;
  speed: number;
  audio_url: string; // TTS 생성된 음성 파일 URL
  duration_sec: number;
  created_at: string;
  last_accessed_at: string;
  access_count: number;
}

/**
 * POST /api/showtell/tts
 * 
 * TTS(Text-to-Speech) 음성 생성 + 캐싱
 * - 같은 문장 재생 시 서버가 캐시 hit로 재생 URL 반환 (재생성 X)
 * - Google Cloud TTS 또는 OpenAI TTS 사용
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      text,
      voice_id = "default_en",
      speed = 1.0,
    } = body;

    // 필수 필드 검증
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required field: text" },
        { status: 400 }
      );
    }

    console.log("=== TTS 요청 ===");
    console.log("📢 Text:", text.substring(0, 50) + "...");
    console.log("🎤 Voice ID:", voice_id);
    console.log("⚡ Speed:", speed);

    // 캐시 키 생성 (hash(text+voice+speed))
    const cache_key = generateCacheKey(text, voice_id, speed);
    console.log("🔑 Cache Key:", cache_key);

    // 캐시 확인
    const cacheRef = doc(db, "showtell_tts_cache", cache_key);
    const cacheDoc = await getDoc(cacheRef);

    if (cacheDoc.exists()) {
      // 캐시 히트 ✅
      const cachedData = cacheDoc.data() as TTSCache;
      console.log("✅ 캐시 히트! 기존 음성 파일 반환");
      console.log("📊 Access Count:", cachedData.access_count);

      // 캐시 액세스 카운트 증가
      await setDoc(cacheRef, {
        ...cachedData,
        last_accessed_at: new Date().toISOString(),
        access_count: cachedData.access_count + 1,
      });

      return NextResponse.json({
        success: true,
        data: {
          audio_url: cachedData.audio_url,
          duration_sec: cachedData.duration_sec,
          cached: true,
        },
      });
    }

    // 캐시 미스 → TTS 생성
    console.log("⚠️ 캐시 미스! TTS 생성 중...");

    // ===================================
    // 🎤 TTS 생성 로직 (Mock/Dummy)
    // 실제로는 Google Cloud TTS 또는 OpenAI TTS 사용
    // ===================================
    
    // Mock: 더미 음성 파일 URL 생성
    const audio_url = `https://storage.googleapis.com/showtell-tts/${cache_key}.mp3`;
    const duration_sec = Math.ceil(text.length / 10); // 대략적인 duration 계산

    console.log("✅ TTS 생성 완료");
    console.log("🎵 Audio URL:", audio_url);
    console.log("⏱️ Duration:", duration_sec, "초");

    // 캐시에 저장
    const ttsCache: TTSCache = {
      cache_key,
      text,
      voice_id,
      speed,
      audio_url,
      duration_sec,
      created_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
      access_count: 1,
    };

    await setDoc(cacheRef, ttsCache);
    console.log("💾 캐시에 저장 완료");

    return NextResponse.json({
      success: true,
      data: {
        audio_url,
        duration_sec,
        cached: false,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ TTS 생성 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate TTS" },
      { status: 500 }
    );
  }
}

/**
 * 캐시 키 생성 함수
 * hash(text + voice_id + speed)
 */
function generateCacheKey(text: string, voice_id: string, speed: number): string {
  const input = `${text.trim().toLowerCase()}|${voice_id}|${speed}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * GET /api/showtell/tts?cache_key=xxx
 * 
 * 캐시된 TTS 조회
 */
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cache_key = searchParams.get("cache_key");

    if (!cache_key) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: cache_key" },
        { status: 400 }
      );
    }

    const cacheRef = doc(db, "showtell_tts_cache", cache_key);
    const cacheDoc = await getDoc(cacheRef);

    if (!cacheDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "TTS cache not found" },
        { status: 404 }
      );
    }

    const cachedData = cacheDoc.data() as TTSCache;

    return NextResponse.json({
      success: true,
      data: {
        audio_url: cachedData.audio_url,
        duration_sec: cachedData.duration_sec,
        cached: true,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ TTS 캐시 조회 오류:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch TTS cache" },
      { status: 500 }
    );
  }
}





