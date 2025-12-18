# 📬 펜팔 편지 인증 시스템 가이드 (옵션 2: 받는 사람 인증 방식)

## 🎯 시스템 개요

**구현 방식**: 보낸 사람이 편지를 업로드하고, **받는 사람이 받아서 인증하면 도장이 찍히는 방식**

### 핵심 플로우

```
1. 민준 → 편지 작성 & 사진 촬영 → 업로드 (발송)
2. 📬 문슈에게 알림: "민준이가 편지를 보냈어요!"
3. 문슈 → 편지 수령 → 사진 촬영 → 업로드 (인증)
4. 🎉 민준에게 알림: "문슈가 편지를 받았어요! 도장 찍혔습니다!"
5. ✅ 민준 캐릭터 도장 찍힘 (진행률 +1)
```

---

## 📁 새로 생성된 파일

### 1. API Routes

| 파일 | 설명 |
|------|------|
| `app/api/penpal/send-letter/route.ts` | 편지 발송 API (보낸 사람이 사용) |
| `app/api/penpal/receive-letter/route.ts` | 편지 수령 인증 API (받는 사람이 사용) |
| `app/api/penpal/dispute-letter/route.ts` | 편지 미도착 신고 API |
| `app/api/penpal/check-pending-letters/route.ts` | 자동 알림 시스템 (Cron Job) |

### 2. UI 컴포넌트

| 파일 | 설명 |
|------|------|
| `app/components/CharacterStampSelector.tsx` | 캐릭터 도장 선택 컴포넌트 |
| `app/penpal/mission/[matchId]/MissionContent.tsx` | 미션 페이지 메인 컴포넌트 |
| `app/admin/penpal/disputes/page.tsx` | 관리자 분쟁 처리 페이지 |

### 3. 설정 파일

| 파일 | 설명 |
|------|------|
| `vercel.json` | Vercel Cron Job 설정 (매일 자동 실행) |

---

## 🔄 편지 인증 프로세스

### Step 1: 편지 발송 (보낸 사람)

**민준이가 편지를 쓰고 사진을 찍어서 업로드**

```typescript
// POST /api/penpal/send-letter
{
  matchId: "match_abc123",
  senderId: "user_minjun",
  image: File
}
```

**결과**:
- LetterProof 생성 (status: "sent")
- 문슈에게 알림 발송
- 민준이 화면: "문슈가 받을 때까지 기다려주세요! ⏳"

---

### Step 2: 편지 수령 인증 (받는 사람)

**문슈가 편지를 받고 사진을 찍어서 인증**

```typescript
// POST /api/penpal/receive-letter
{
  proofId: "proof_xyz789",
  receiverId: "user_munshu",
  image: File
}
```

**결과**:
- LetterProof 업데이트 (status: "received")
- 미션 진행도 +1
- 민준이에게 알림: "문슈가 편지를 받았어요! 🎉"
- 민준 캐릭터 도장 찍힘 (예: 🦁)

---

## ⏰ 자동 알림 시스템

### 3일 경과: 받는 사람에게 알림

```
📬 편지 인증을 잊으셨나요?
민준이가 보낸 편지가 도착했다면 사진을 찍어서 인증해주세요! 💌
```

### 7일 경과: 관리자에게 알림

```
⚠️ 편지 인증 지연
문슈님이 민준님의 편지(Step 3)를 7일째 인증하지 않고 있습니다.
```

### 10일 경과: 자동 인증 + 패널티 경고

```
🤖 자동 인증 처리
편지를 10일 동안 인증하지 않아 자동으로 인증 처리되었습니다. 
다음에는 빨리 인증해주세요! 😢
```

**자동 인증 처리**:
- LetterProof status → "auto_verified"
- 미션 진행도 +1
- 받는 사람에게 패널티 경고 알림
- 3회 이상 자동 인증 시 관리자 개입

---

## 📮 편지 미도착 신고 시스템

### 2주(14일) 후 신고 가능

**문슈가 "편지가 안 왔어요" 신고**

```typescript
// POST /api/penpal/dispute-letter
{
  proofId: "proof_xyz789",
  receiverId: "user_munshu",
  reason: "우편함에 편지가 없어요"
}
```

**처리 프로세스**:
1. LetterProof status → "disputed"
2. 관리자에게 우선순위 높은 알림 발송
3. 민준이에게 알림: "편지가 안 도착했다고 신고되었습니다"

**관리자 처리 옵션**:
1. **신고 승인**: 편지 재발송 요청
2. **신고 거부**: 자동 인증 + 악의적 신고 경고

---

## 🎨 캐릭터 도장 시스템

### 10가지 캐릭터 도장

| 도장 | 이름 | 성격 |
|------|------|------|
| 🦁 | 사자 | 용감하고 씩씩한 |
| 🐰 | 토끼 | 귀엽고 상냥한 |
| 🐻 | 곰 | 든든하고 다정한 |
| 🦊 | 여우 | 영리하고 재치있는 |
| 🐼 | 판다 | 사랑스럽고 친근한 |
| 🐯 | 호랑이 | 당당하고 멋진 |
| 🐨 | 코알라 | 느긋하고 차분한 |
| 🐸 | 개구리 | 발랄하고 재밌는 |
| 🐷 | 돼지 | 복스럽고 행복한 |
| 🐥 | 병아리 | 앙증맞고 사랑스러운 |

### 도장 선택

**펜팔 프로필 등록 시 선택**

```tsx
<CharacterStampSelector
  selectedStamp={selectedStamp}
  onSelect={setSelectedStamp}
/>
```

### 도장 표시

**편지 인증 완료 시 애니메이션과 함께 표시**

```tsx
<StampDisplay stamp="🦁" size="md" />
```

---

## 🔔 알림 타입

### LetterNotification (사용자 알림)

```typescript
{
  type: "letter_sent",      // 편지 발송됨
  type: "letter_received",  // 편지 수령됨
  type: "verification_reminder", // 인증 리마인더
  type: "letter_not_arrived",    // 미도착 신고
}
```

### AdminNotification (관리자 알림)

```typescript
{
  type: "letter_dispute",      // 편지 분쟁
  type: "verification_delay",  // 인증 지연
  priority: "high" | "medium" | "low"
}
```

---

## ⚙️ Cron Job 설정

### Vercel Cron (매일 자동 실행)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/penpal/check-pending-letters",
      "schedule": "0 0 * * *"  // 매일 00:00 (UTC)
    }
  ]
}
```

### 수동 실행 (테스트용)

```bash
curl -X POST http://localhost:3000/api/penpal/check-pending-letters
```

---

## 📊 데이터 구조

### LetterProof (편지 인증 기록)

```typescript
{
  id: "proof_123",
  missionId: "match_abc",
  matchId: "match_abc",
  stepNumber: 3,
  
  // 보낸 사람
  senderId: "user_minjun",
  senderChildName: "민준",
  senderImageUrl: "https://...",
  senderUploadedAt: "2025-12-17T10:00:00Z",
  
  // 받는 사람
  receiverId: "user_munshu",
  receiverChildName: "문슈",
  receiverImageUrl: "https://...",  // 수령 후
  receiverUploadedAt: "2025-12-20T15:30:00Z",  // 수령 후
  
  // 상태
  status: "sent" | "received" | "auto_verified" | "disputed",
  
  // 자동화
  reminderSentAt: "2025-12-20T10:00:00Z",  // 3일 알림
  adminNotifiedAt: "2025-12-24T10:00:00Z", // 7일 알림
  autoVerifiedAt: "2025-12-27T10:00:00Z",  // 10일 자동인증
  
  // 분쟁
  isDisputed: false,
  disputeReason: null,
  disputedAt: null,
  
  verifiedAt: "2025-12-20T15:30:00Z",
  createdAt: "2025-12-17T10:00:00Z",
}
```

---

## 🎯 주요 UI 화면

### 1. 미션 페이지 (`/penpal/mission/[matchId]`)

#### 진행 상황

```
📬 민준 ↔️ 문슈
[████████░░] 8 / 10

💌 2개 남았어요! 조금만 더 힘내요!
```

#### 받아야 할 편지 알림

```
📬 새 편지가 도착했어요!

Step 3 - 민준님이 보낸 편지
발송일: 2025-12-17
[발송 사진]

📸 받은 편지 인증하기
```

#### 편지 보내기

```
📮 편지 보내기
이번 차례는 민준님이 편지를 보낼 차례예요!

[파일 선택]
✉️ 편지 보내기
```

#### 편지 인증 타임라인

```
📜 편지 인증 기록

🦁 Step 1 ✅ 인증완료
   민준 → 문슈
   발송: 2025-12-01 | 수령: 2025-12-04
   [발송사진] [수령사진]

🐰 Step 2 ✅ 인증완료
   문슈 → 민준
   발송: 2025-12-05 | 수령: 2025-12-08
   [발송사진] [수령사진]

⏳ Step 3 📬 도착대기
   민준 → 문슈
   발송: 2025-12-17
   [발송사진]
```

### 2. 관리자 분쟁 처리 페이지

```
📮 편지 분쟁 관리

[분쟁 중] Step 3
민준 → 문슈
발송일: 2025-12-17
신고일: 2025-12-31
신고 사유: 우편함에 편지가 없어요

✅ 신고 승인 (재발송 요청)
⚠️ 신고 거부 (자동 인증)
```

---

## 🚀 배포 전 체크리스트

### 1. Firebase 설정

- [ ] Firestore 인덱스 생성
  - `letterProofs`: `missionId` ↑ + `stepNumber` ↑
  - `letterProofs`: `status` ↑ + `senderUploadedAt` ↑

- [ ] Storage Rules 설정
  ```javascript
  match /penpal/letters/{matchId}/{filename} {
    allow write: if request.auth != null;
    allow read: if request.auth != null;
  }
  ```

### 2. 환경 변수

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
CRON_SECRET=your-secret-key  # Cron Job 보안
```

### 3. Vercel 배포

- [ ] `vercel.json` 파일 커밋
- [ ] Vercel Dashboard에서 Cron Jobs 활성화
- [ ] 환경 변수 설정

### 4. 테스트

- [ ] 편지 발송 → 수령 인증 플로우
- [ ] 3일/7일/10일 자동 알림 (날짜 조작 테스트)
- [ ] 편지 미도착 신고
- [ ] 관리자 분쟁 처리
- [ ] 캐릭터 도장 표시

---

## 🎓 사용자 가이드

### 펜팔 시작하기

1. **펜팔 프로필 등록**
   - `/penpal/register`
   - 캐릭터 도장 선택
   - 자기소개 작성

2. **매칭 승인 대기**
   - 관리자가 주소 확인 후 승인

3. **편지 미션 시작**
   - `/penpal/manage` - 내 펜팔 목록
   - `편지 인증하기` 버튼 클릭

### 편지 보내는 사람

1. 편지 작성 & 사진 촬영
2. 미션 페이지에서 사진 업로드
3. "편지 보내기" 버튼 클릭
4. 상대방이 받을 때까지 대기 ⏳

### 편지 받는 사람

1. 알림 확인: "새 편지가 도착했어요!"
2. 실제 편지 수령
3. 받은 편지 사진 촬영
4. "받은 편지 인증하기" 버튼 클릭
5. 사진 업로드 & 인증 완료 🎉
6. 상대방 캐릭터 도장 찍힘!

### 문제 발생 시

- **편지가 안 왔어요**: 2주 후 신고 가능
- **인증을 잊었어요**: 3일 후 알림, 10일 후 자동 인증
- **상대방이 응답 없어요**: 관리자에게 문의

---

## 📈 향후 개선 사항

### Phase 2 (선택적 구현)

1. **평판 시스템 고도화**
   - 3회 이상 자동 인증 시 매칭 제한
   - 5회 이상 신고 거부 시 경고
   - 신뢰도 점수 표시

2. **알림 채널 확장**
   - 이메일 알림
   - 카카오톡 알림톡
   - 푸시 알림 (웹/모바일)

3. **통계 대시보드**
   - 평균 인증 소요 시간
   - 자동 인증 비율
   - 분쟁 발생 비율

4. **편지 추적**
   - 우편 번호 입력
   - 배송 추적 연동 (우체국 API)

---

## 🆘 트러블슈팅

### Q1: 편지 인증이 안 돼요

**확인사항**:
1. 이미지 파일 형식 (JPEG, PNG만 지원)
2. 파일 크기 (5MB 이하)
3. 네트워크 연결 상태
4. Firebase Storage 권한

### Q2: 알림이 안 와요

**확인사항**:
1. Firestore에 `letterNotifications` 컬렉션 확인
2. 사용자 ID가 정확한지 확인
3. 알림 컴포넌트가 렌더링되는지 확인

### Q3: Cron Job이 실행 안 돼요

**확인사항**:
1. Vercel Dashboard에서 Cron Jobs 활성화 여부
2. `vercel.json` 파일 커밋 여부
3. `/api/penpal/check-pending-letters` 수동 실행 테스트
4. `CRON_SECRET` 환경 변수 설정

### Q4: 도장이 안 찍혀요

**확인사항**:
1. 펜팔 프로필에 `characterStamp` 필드 확인
2. `StampDisplay` 컴포넌트 import 확인
3. 브라우저 콘솔 오류 확인

---

## 📞 지원

문제가 지속되면:
1. GitHub Issues 등록
2. 로그 파일 첨부 (브라우저 콘솔, Vercel 로그)
3. 재현 단계 상세 작성

---

**작성일**: 2025-12-17  
**버전**: 1.0.0  
**시스템**: 편지 인증 옵션 2 (받는 사람 인증 방식)

