import { NextRequest, NextResponse } from "next/server";
import { logVoiceApiCall } from "@/app/utils/apiLogger";

// Buffer 사용을 위해 Node.js 런타임 지정
export const runtime = "nodejs";

// API 키 가져오기 (환경 변수에서만 가져오기 - 서버 사이드)
function getAPIKeys() {
  const elevenlabsKey = process.env.ELEVENLABS_API_KEY || "";
  
  if (!elevenlabsKey) {
    console.warn("⚠️ ELEVENLABS_API_KEY 환경 변수가 설정되지 않았습니다.");
  }
  
  return {
    elevenlabs: elevenlabsKey,
  };
}

// ElevenLabs 음성 ID 매핑 (차별화된 원어민 발음)
const VOICE_OPTIONS = {
  // 미국 영어 (여성)
  "rachel_us": "21m00Tcm4TlvDq8ikWAM", // Rachel - 명확하고 친절한 여성 목소리
  "domi_us": "AZnzlk1XvdvUeBnXmlld",   // Domi - 밝고 활기찬 여성 목소리
  "elli_us": "MF3mGyEYCl7XYWbV9V6O",   // Elli - 부드럽고 따뜻한 여성 목소리
  
  // 미국 영어 (남성)
  "antoni_us": "ErXwobaYiN019PkySvjV", // Antoni - 깊고 따뜻한 남성 목소리
  "josh_us": "TxGEqnHWrfWFTfGW9XjX",   // Josh - 명확하고 친근한 남성 목소리
  "adam_us": "pNInz6obpgDQGcFmaJgB",   // Adam - 자연스럽고 편안한 남성 목소리
  "sam_us": "yoZ06aMxZJJ28mfd3POQ",     // Sam - 젊고 활기찬 남성 목소리
  
  // 영국 영어
  "bella_uk": "EXAVITQu4vr4xnSDxMaL",   // Bella - 우아한 영국 여성 목소리
  "arnold_uk": "VR6AewLTigWG4xSOukaG",  // Arnold - 클래식한 영국 남성 목소리
  
  // 기본값 (아이 친화적)
  "default": "21m00Tcm4Tcm4TlvDq8ikWAM", // Rachel (기본)
} as const;

export type VoiceOption = keyof typeof VOICE_OPTIONS;

// ElevenLabs API로 음성 생성
async function generateVoiceWithElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string,
  speed: number = 0.85 // 기본값 0.85 (어린이용 느린 속도)
): Promise<Buffer> {
  if (!apiKey) {
    throw new Error("ElevenLabs API 키가 설정되지 않았습니다.");
  }

  try {
    console.log("🎤 ElevenLabs API 호출 시작...");
    console.log("텍스트:", text.substring(0, 50) + "...");
    console.log("음성 ID:", voiceId);
    console.log("⚡ 속도:", speed);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_turbo_v2_5", // 최신 모델 (무료 티어 지원)
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: speed, // 속도 설정 (0.25 ~ 4.0)
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `ElevenLabs API 오류: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log("✅ ElevenLabs API 호출 성공");
    return Buffer.from(audioBuffer);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ ElevenLabs API 오류:", err);
    throw new Error(`음성 생성 실패: ${err.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceOption = "default", userId, speed = 0.85 } = body; // speed 파라미터 추가 (기본값 0.85 = 느리게)
    
    // userId가 optional이므로 안전하게 처리
    const safeUserId = userId ?? "anonymous";

    // 입력 검증
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "텍스트가 필요합니다." },
        { status: 400 }
      );
    }

    // 텍스트 길이 제한 (ElevenLabs 제한: 약 5000자)
    if (text.length > 5000) {
      return NextResponse.json(
        { success: false, error: "텍스트가 너무 깁니다. (최대 5000자)" },
        { status: 400 }
      );
    }

    // speed 검증 (0.25 ~ 4.0)
    const validSpeed = Math.max(0.25, Math.min(4.0, speed));

    // 음성 ID 가져오기
    const voiceId = VOICE_OPTIONS[voiceOption as VoiceOption] || VOICE_OPTIONS.default;
    
    // API 키 가져오기
    const apiKeys = getAPIKeys();

    if (!apiKeys.elevenlabs) {
      console.warn("⚠️ ElevenLabs API 키 없음 - Mock 응답 반환");
      return NextResponse.json(
        {
          success: false,
          error: "ElevenLabs API 키가 설정되지 않았습니다. 관리자 페이지에서 설정해주세요.",
          mock: true,
        },
        { status: 400 }
      );
    }

    // 음성 생성
    try {
      const audioBuffer = await generateVoiceWithElevenLabs(
        text,
        voiceId,
        apiKeys.elevenlabs,
        validSpeed // speed 전달
      );

      // API 호출 로그 저장 (비동기, 실패해도 API 응답에는 영향 없음)
      logVoiceApiCall(safeUserId, "success").catch((logError) => {
        console.warn("⚠️ 로그 저장 실패 (무시됨):", logError);
      });

      // MP3 파일로 반환
      return new NextResponse(new Uint8Array(audioBuffer), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename="voice-${Date.now()}.mp3"`,
        },
      });
    } catch (voiceError: unknown) {
      const err = voiceError as Error;
      console.error("❌ 음성 생성 API 오류:", err);
      
      // API 호출 실패 로그 저장 (비동기, 실패해도 API 응답에는 영향 없음)
      logVoiceApiCall(safeUserId, "error", err.message).catch((logError) => {
        console.warn("⚠️ 로그 저장 실패 (무시됨):", logError);
      });
      
      // 사용자에게는 안전한 메시지만 노출 (내부 에러 메시지 숨김)
      return NextResponse.json(
        {
          success: false,
          error: "음성 생성 중 오류가 발생했습니다.",
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 음성 생성 API 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "음성 생성 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

// 사용 가능한 음성 목록 조회
export async function GET(request: NextRequest) {
  try {
    const apiKeys = getAPIKeys();

    if (!apiKeys.elevenlabs) {
      return NextResponse.json({
        success: false,
        error: "ElevenLabs API 키가 설정되지 않았습니다.",
        voices: Object.keys(VOICE_OPTIONS).map((key) => ({
          id: key,
          name: getVoiceDisplayName(key as VoiceOption),
          voiceId: VOICE_OPTIONS[key as VoiceOption],
        })),
      });
    }

    // ElevenLabs API에서 실제 음성 목록 가져오기
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": apiKeys.elevenlabs,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          voices: data.voices || [],
          defaultVoices: Object.keys(VOICE_OPTIONS).map((key) => ({
            id: key,
            name: getVoiceDisplayName(key as VoiceOption),
            voiceId: VOICE_OPTIONS[key as VoiceOption],
          })),
        });
      }
    } catch (error) {
      console.error("ElevenLabs 음성 목록 조회 실패:", error);
    }

    // 기본 음성 목록 반환
    return NextResponse.json({
      success: true,
      voices: Object.keys(VOICE_OPTIONS).map((key) => ({
        id: key,
        name: getVoiceDisplayName(key as VoiceOption),
        voiceId: VOICE_OPTIONS[key as VoiceOption],
      })),
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("❌ 음성 목록 조회 오류:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "음성 목록 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

// 음성 표시 이름 매핑
function getVoiceDisplayName(voiceOption: VoiceOption): string {
  const names: Record<VoiceOption, string> = {
    rachel_us: "🇺🇸 Rachel (여성, 미국) - 명확하고 친절한",
    domi_us: "🇺🇸 Domi (여성, 미국) - 밝고 활기찬",
    elli_us: "🇺🇸 Elli (여성, 미국) - 부드럽고 따뜻한",
    antoni_us: "🇺🇸 Antoni (남성, 미국) - 깊고 따뜻한",
    josh_us: "🇺🇸 Josh (남성, 미국) - 명확하고 친근한",
    adam_us: "🇺🇸 Adam (남성, 미국) - 자연스럽고 편안한",
    sam_us: "🇺🇸 Sam (남성, 미국) - 젊고 활기찬",
    bella_uk: "🇬🇧 Bella (여성, 영국) - 우아한",
    arnold_uk: "🇬🇧 Arnold (남성, 영국) - 클래식한",
    default: "🎯 기본 (Rachel) - 아이 친화적",
  };
  return names[voiceOption] || voiceOption;
}


