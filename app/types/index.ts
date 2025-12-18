// API 요청/응답 타입 정의

export interface DiaryUploadRequest {
  image: File;
  age: number;
  englishLevel?: EnglishLevel;
}

export interface OCRResult {
  extractedText: string;
  confidence: number;
}

export interface CorrectionResult {
  originalText: string;
  correctedText: string;
  feedback: string;
  corrections: Correction[];
  encouragement: string;
  sentenceExpansion?: string; // 문장 확장 (한글로 대화 이어가기)
  expansionExample?: string; // 확장 예시
  cheerUp?: string; // Cheer up 메시지
  extractedWords?: ExtractedWord[];
  betterVocabulary?: BetterVocabulary[]; // 부모용: 더 나은 단어 제안
  sentenceByStence?: SentenceCorrection[]; // 문장별 교정
  alternativeExpressions?: AlternativeExpression[]; // 작문용: 같은 의미의 다양한 표현
  stats?: DiaryStats; // 통계
  createdAt?: string;
  diaryId?: string;
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
  alternatives?: string[]; // 작문용: 대체 표현들
}

export interface BetterVocabulary {
  original: string;
  better: string;
  explanation: string;
  example: string;
}

export interface SentenceCorrection {
  original: string;
  corrected: string;
  explanation: string;
  alternatives?: string[]; // 작문용: 문장 대체 표현들
}

export interface AlternativeExpression {
  original: string;
  alternatives: AlternativeDetail[];
}

export interface AlternativeDetail {
  expression: string;
  level: string; // "기본", "격식", "비격식", "문학적" 등
  explanation: string;
  example?: string; // 예문
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 영어 실력 레벨
export type EnglishLevel = "Lv.1" | "Lv.2" | "Lv.3" | "Lv.4" | "Lv.5";

export const ENGLISH_LEVELS: { value: EnglishLevel; label: string; description: string }[] = [
  {
    value: "Lv.1",
    label: "Lv.1",
    description: "영어 일기 처음 써봐요 (단어 몇 개로 쓰기 시작)"
  },
  {
    value: "Lv.2",
    label: "Lv.2",
    description: "간단한 문장으로 일기 써요 (기본 주어 동사 사용)"
  },
  {
    value: "Lv.3",
    label: "Lv.3",
    description: "여러 문장으로 감정/이유도 쓰려고 해요"
  },
  {
    value: "Lv.4",
    label: "Lv.4",
    description: "자유롭게 길게 쓰기도 해요 (자기 표현 가능)"
  },
  {
    value: "Lv.5",
    label: "Lv.5",
    description: "첨삭보단 피드백 위주로 받고 싶어요"
  }
];

// 일기/작문 데이터 구조 (Firestore 저장용)
export interface DiaryEntry {
  id: string;
  userId: string;
  originalText: string;
  correctedText: string;
  feedback: string;
  encouragement: string;
  corrections: Correction[];
  extractedWords: ExtractedWord[];
  englishLevel: EnglishLevel;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  stats?: DiaryStats;
  contentType?: "diary" | "composition"; // 일기 or 작문
  compositionType?: "letter" | "essay" | "other"; // 작문 유형 (작문일 때만)
  accountType?: "child" | "parent"; // 계정 타입 (아이/부모)
}

// 추출된 단어
export interface ExtractedWord {
  word: string;
  meaning?: string;
  level?: string;
  example?: string;
  category?: string;
}

// 일기 통계
export interface DiaryStats {
  wordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  correctionCount: number;
  uniqueWords: number;
}

// 성장 통계
export interface GrowthStats {
  totalDiaries: number;
  totalWords: number;
  averageWordCount: number;
  averageSentenceLength: number;
  improvementTrend: "up" | "down" | "stable";
  levelProgress: {
    current: EnglishLevel;
    next: EnglishLevel | null;
    progress: number; // 0-100
  };
}

// 게시판 관련 타입
export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string; // 부모 아이디 (로그인한 사용자 UID)
  parentId: string; // 부모 아이디
  authorName: string;
  authorEmail?: string;
  authorNickname?: string; // 닉네임 (응원 게시판용)
  childName: string; // 아이 이름 (데이터 식별용 + UI 표현용)
  category: PostCategory;
  views: number;
  likes: string[]; // 좋아요한 사용자 UID 배열
  comments: Comment[];
  isPinned?: boolean; // 공지사항 고정
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  diaryId?: string; // 일기 공유 게시판의 경우 연결된 일기 ID
}

export type PostCategory = "diary_share" | "education_qa" | "notice_mission" | "penpal";

export interface PostCategoryInfo {
  value: PostCategory;
  label: string;
  emoji: string;
  description: string;
  writeAccess: "all" | "parent" | "admin"; // all: 모두, parent: 보호자만, admin: 관리자만
  viewAccess: "all" | "parent"; // all: 모두, parent: 보호자만
}

export const POST_CATEGORIES: PostCategoryInfo[] = [
  { 
    value: "diary_share", 
    label: "일기 공유 게시판", 
    emoji: "📝",
    description: "아이들이 쓴 일기 첨삭 결과 공유 (응원과 댓글 가능)",
    writeAccess: "all",
    viewAccess: "all"
  },
  { 
    value: "education_qa", 
    label: "교육정보/Q&A", 
    emoji: "📚",
    description: "부모들끼리 질문, 꿀팁 공유",
    writeAccess: "parent",
    viewAccess: "all"
  },
  { 
    value: "penpal", 
    label: "펜팔 모집", 
    emoji: "✉️",
    description: "영어 편지 친구 찾기 (펜팔 매칭)",
    writeAccess: "all",
    viewAccess: "all"
  },
  { 
    value: "notice_mission", 
    label: "공지 / 미션", 
    emoji: "📢",
    description: "운영팀이 이벤트, 미션 공지",
    writeAccess: "admin",
    viewAccess: "all"
  },
];

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorNickname?: string; // 닉네임 (응원 게시판용)
  childName?: string; // 아이 이름 (데이터 식별용 + UI 표현용)
  likes: string[]; // 좋아요한 사용자 UID 배열
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[]; // 대댓글 (선택적)
}

// 사용자 정보 (부모/아이 구분)
export interface UserProfile {
  userId: string;
  email: string;
  isParent: boolean; // 부모 계정 여부
  childId?: string; // 아이 계정인 경우 연결된 부모 ID
  parentId?: string; // 부모 계정인 경우
  nickname?: string; // 닉네임
  displayName: string; // 표시 이름
}

// ElevenLabs 음성 관련 타입
export type VoiceOption = 
  | "rachel_us"   // 🇺🇸 Rachel (여성, 미국) - 명확하고 친절한
  | "domi_us"     // 🇺🇸 Domi (여성, 미국) - 밝고 활기찬
  | "elli_us"     // 🇺🇸 Elli (여성, 미국) - 부드럽고 따뜻한
  | "antoni_us"   // 🇺🇸 Antoni (남성, 미국) - 깊고 따뜻한
  | "josh_us"     // 🇺🇸 Josh (남성, 미국) - 명확하고 친근한
  | "adam_us"     // 🇺🇸 Adam (남성, 미국) - 자연스럽고 편안한
  | "sam_us"      // 🇺🇸 Sam (남성, 미국) - 젊고 활기찬
  | "bella_uk"    // 🇬🇧 Bella (여성, 영국) - 우아한
  | "arnold_uk"   // 🇬🇧 Arnold (남성, 영국) - 클래식한
  | "default";    // 🎯 기본 (Rachel) - 아이 친화적

export interface VoiceRequest {
  text: string;
  voiceOption?: VoiceOption;
}

export interface VoiceResponse {
  success: boolean;
  error?: string;
  audioUrl?: string;
  mock?: boolean;
}

// 월별 성장 리포트
export interface MonthlyReport {
  userId: string;
  accountType: "child" | "parent";
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalEntries: number;
    totalWords: number;
    averageWordsPerEntry: number;
    growthPercentage: number; // 이전 달 대비 성장률
  };
  analysis: {
    lengthScore: number; // 0-100
    vocabularyScore: number; // 0-100
    grammarScore: number; // 0-100
    overallScore: number; // 0-100
  };
  insights: string; // GPT가 생성한 분석 텍스트
  recommendations: string[]; // 추천 사항 배열
  createdAt: string;
}

// 일자별 단어 통계 (그래프용)
export interface DailyWordCount {
  date: string; // YYYY-MM-DD
  wordCount: number;
  entryCount: number; // 그날 작성한 일기/작문 수
}

// 펜팔 프로필
export interface PenpalProfile {
  id: string;
  userId: string;
  childName: string; // 닉네임 (아이 이름)
  age: number;
  arScore: string;
  englishLevel: string;
  introduction: string; // 하고 싶은 말
  characterStamp: CharacterStamp; // 캐릭터 도장
  status: "recruiting" | "matched" | "completed"; // 모집중, 매칭됨, 완료
  createdAt: string;
  updatedAt: string;
}

// 펜팔 매칭 신청
export interface PenpalApplication {
  id: string;
  penpalProfileId: string; // 지원하는 펜팔 프로필 ID
  applicantUserId: string; // 신청자 UID
  applicantChildName: string;
  status: "pending" | "accepted" | "rejected"; // 대기중, 수락됨, 거절됨
  createdAt: string;
  updatedAt: string;
}

// 펜팔 매칭 (양방향 확인 완료)
export interface PenpalMatch {
  id: string;
  user1Id: string;
  user1ChildName: string;
  user1AddressSubmitted: boolean;
  user2Id: string;
  user2ChildName: string;
  user2AddressSubmitted: boolean;
  status: "address_pending" | "admin_review" | "approved" | "active" | "completed" | "cancelled";
  // address_pending: 주소 입력 대기중
  // admin_review: 관리자 검토중
  // approved: 관리자 승인됨 (주소 공유 가능)
  // active: 활발히 진행중
  // completed: 완료됨
  // cancelled: 취소됨
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancelledBy?: string; // 취소 요청한 사용자 ID
  cancelReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

// 보호자 주소 정보 (암호화 저장 권장)
export interface ParentAddress {
  id: string;
  userId: string;
  matchId: string; // 어느 매칭에 대한 주소인지
  parentName: string;
  address: string; // 도로명 주소
  postalCode: string; // 우편번호
  email: string; // 연락 가능한 이메일
  consentToShare: boolean; // 주소 공유 동의 여부
  createdAt: string;
  updatedAt: string;
}

// 편지 미션 (매칭당 1개)
export interface LetterMission {
  id: string; // matchId와 동일
  matchId: string;
  user1Id: string; // 펜팔 프로필 등록자 (먼저 보내는 사람)
  user1ChildName: string;
  user2Id: string; // 신청자
  user2ChildName: string;
  totalSteps: number; // 20 (총 10번 주고받기)
  currentStep: number; // 0-20
  completedSteps: boolean[]; // [false, false, ..., false] 20개
  isCompleted: boolean;
  rewardClaimed: boolean; // 포인트 수령 여부
  extended: boolean; // 연장 여부
  user1ContactConsent: boolean; // user1 연락처 공유 동의
  user2ContactConsent: boolean; // user2 연락처 공유 동의
  contactsShared: boolean; // 관리자가 연락처 공유 처리 완료
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  extendedAt?: string;
}

// 편지 인증 사진 (옵션 2: 받는 사람이 인증)
export interface LetterProof {
  id: string;
  missionId: string; // LetterMission ID
  matchId: string;
  stepNumber: number; // 1-20
  senderId: string; // 편지를 보낸 사람 UID
  senderChildName: string;
  senderImageUrl: string; // 보낸 사람이 업로드한 발송 사진
  senderUploadedAt: string; // 발송 업로드 시간
  receiverId: string; // 편지를 받은 사람 UID
  receiverChildName: string;
  receiverImageUrl?: string; // 받은 사람이 업로드한 수령 사진 (인증 시)
  receiverUploadedAt?: string; // 수령 인증 시간
  status: "sent" | "received" | "auto_verified" | "disputed"; // 발송됨, 수령됨, 자동인증, 분쟁
  autoVerifiedAt?: string; // 10일 후 자동 인증 시간
  isDisputed: boolean; // 분쟁 여부 (편지 안 옴 신고)
  disputeReason?: string; // 분쟁 사유
  disputedAt?: string; // 분쟁 신고 시간
  reminderSentAt?: string; // 3일 알림 발송 시간
  adminNotifiedAt?: string; // 7일 관리자 알림 시간
  verifiedAt?: string; // 최종 인증 완료 시간
  createdAt: string;
}

// 사용자 포인트 (추후 구현)
export interface UserPoints {
  userId: string;
  totalPoints: number;
  earnedPoints: number; // 총 획득 포인트
  spentPoints: number; // 총 사용 포인트
  history: PointHistory[];
  updatedAt: string;
}

export interface PointHistory {
  id: string;
  type: "earn" | "spend";
  amount: number;
  reason: string; // "펜팔 미션 완료", "출석 보상" 등
  relatedId?: string; // missionId, diaryId 등
  createdAt: string;
}

// 펜팔 주소 입력 알림
export interface AddressNotification {
  id: string;
  userId: string;
  matchId: string;
  partnerName: string; // 상대방 아이 이름
  message: string;
  type: "address_reminder"; // 알림 타입
  isRead: boolean;
  createdAt: string;
  expiresAt: string; // 24시간 후 자동 삭제
}

// 편지 인증 알림
export interface LetterNotification {
  id: string;
  userId: string; // 알림 받을 사용자
  matchId: string;
  proofId?: string; // LetterProof ID (선택적 - 취소 알림에는 없음)
  type: "letter_sent" | "letter_received" | "verification_reminder" | "letter_not_arrived" | "penpal_cancelled"; // 알림 타입
  title: string;
  message: string;
  link?: string; // 이동할 페이지 링크
  isRead: boolean;
  createdAt: string;
  expiresAt?: string; // 자동 삭제 시간 (선택적)
}

// 관리자 알림
export interface AdminNotification {
  id: string;
  type: "letter_dispute" | "verification_delay" | "user_report"; // 알림 타입
  matchId?: string;
  proofId?: string;
  userId?: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high"; // 우선순위
  status: "pending" | "in_progress" | "resolved"; // 처리 상태
  link?: string; // 관리자 페이지 링크
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string; // 처리한 관리자 UID
}

// 캐릭터 도장 타입
export type CharacterStamp = "🦁" | "🐰" | "🐻" | "🦊" | "🐼" | "🐯" | "🐨" | "🐸" | "🐷" | "🐥";

export interface CharacterStampInfo {
  emoji: CharacterStamp;
  name: string;
  description: string;
}

// 펜팔 취소 요청
export interface PenpalCancelRequest {
  id: string;
  matchId: string;
  requesterId: string; // 취소 요청자 UID
  requesterChildName: string;
  partnerId: string; // 상대방 UID
  partnerChildName: string;
  reason: string; // 취소 사유
  status: "pending" | "approved" | "rejected"; // 대기, 승인, 거절
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  processedBy?: string; // 관리자 UID
}

// 사용자 펜팔 신뢰도 점수
export interface UserPenpalReputation {
  userId: string;
  totalMatches: number; // 총 매칭 수
  completedMatches: number; // 완료한 매칭 수
  cancelledByUser: number; // 본인이 취소한 수
  cancelledByPartner: number; // 상대방이 취소한 수
  reputationScore: number; // 신뢰도 점수 (0-100)
  penalties: PenaltyRecord[]; // 패널티 기록
  lastUpdated: string;
}

// 패널티 기록
export interface PenaltyRecord {
  id: string;
  type: "cancel_request" | "late_response" | "no_address"; // 패널티 종류
  severity: "low" | "medium" | "high"; // 심각도
  points: number; // 감점
  reason: string;
  createdAt: string;
  matchId?: string;
}

// 토스페이먼츠 결제 관련 타입
export interface PaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerEmail: string;
  successUrl: string;
  failUrl: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentKey?: string;
  orderId?: string;
  amount?: number;
  error?: string;
}

export interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface PaymentInfo {
  paymentKey: string;
  orderId: string;
  orderName: string;
  method: string;
  totalAmount: number;
  status: "READY" | "IN_PROGRESS" | "WAITING_FOR_DEPOSIT" | "DONE" | "CANCELED" | "PARTIAL_CANCELED" | "ABORTED" | "EXPIRED";
  requestedAt: string;
  approvedAt?: string;
  canceledAt?: string;
  failReason?: string;
}

// 구독 결제 관련 타입
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: "monthly" | "yearly";
  features: string[];
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  billingKey: string; // 토스페이먼츠 빌링키
  status: "active" | "canceled" | "expired" | "pending";
  startDate: string;
  nextBillingDate: string;
  endDate?: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingKeyRequest {
  customerKey: string;
  authKey: string; // 첫 결제 시 받은 authKey
}

export interface BillingKeyResponse {
  success: boolean;
  billingKey?: string;
  customerKey?: string;
  error?: string;
}

export interface RecurringPaymentRequest {
  billingKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
}

export interface RecurringPaymentResponse {
  success: boolean;
  paymentKey?: string;
  orderId?: string;
  amount?: number;
  status?: string;
  error?: string;
}

