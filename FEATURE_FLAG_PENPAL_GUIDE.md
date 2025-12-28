# Feature Flag 비활성화 구현 가이드

## ✅ 완료된 작업

### 1. Feature Flag 시스템 구축 ✅

**파일:** `lib/featureFlags.ts`

```typescript
// 펜팔 활성화 여부 확인
isPenpalEnabled() // boolean 반환

// 모든 Feature Flags 확인
getAllFeatureFlags() // { penpal: boolean }

// 에러 메시지
FEATURE_DISABLED_MESSAGES.penpal.ko // "펜팔 기능은 현재 사용할 수 없습니다."
```

**환경변수:**
```bash
NEXT_PUBLIC_PENPAL_ENABLED=false  # 펜팔 비활성화
NEXT_PUBLIC_PENPAL_ENABLED=true   # 펜팔 활성화
```

---

### 2. FE: 펜팔 네비게이션/메뉴/링크 조건부 렌더링 ✅

#### 대시보드 (`app/dashboard/page.tsx`)
- 펜팔 관리 링크: `isPenpalEnabled()` 조건부 렌더링
- 비활성화 시 "펜팔 관리" 버튼 완전히 숨김

#### 게시판 (`app/board/page.tsx`)
- 펜팔 카테고리 링크: Feature Flag 확인 후 렌더링
- 비활성화 시 게시판에서 펜팔 메뉴 숨김

#### 관리자 레이아웃 (`app/admin/layout.tsx`)
- 펜팔 관리 메뉴 3개:
  - ✉️ 펜팔 관리
  - ❌ 취소 요청 관리
  - 📮 편지 분쟁 처리
- 모두 `isPenpalEnabled()` 조건부 렌더링

---

### 3. FE: 펜팔 페이지 접근 시 비활성화 처리 ✅

#### 사용자 펜팔 라우트 (`app/penpal/layout.tsx`)
- Feature Flag 비활성화 시:
  - Alert 메시지 표시
  - 자동으로 `/dashboard`로 리다이렉트
  - 차단 메시지 화면 표시

#### 관리자 펜팔 라우트 (`app/admin/penpal/layout.tsx`)
- Feature Flag 비활성화 시:
  - 자동으로 `/admin`으로 리다이렉트
  - 차단 메시지 화면 표시

**보호되는 경로:**
```
/penpal/*             → /dashboard 리다이렉트
/admin/penpal/*       → /admin 리다이렉트
```

---

### 4. BE: 펜팔 API 엔드포인트 Feature Flag 미들웨어 ✅

**파일:** `lib/apiFeatureFlags.ts`

```typescript
// API에서 펜팔 기능 확인
const featureCheck = checkPenpalFeature();
if (!featureCheck.allowed) {
  return featureCheck.response!; // 403 Forbidden 자동 반환
}
```

**적용된 API 엔드포인트:**
1. `/api/penpal/send-letter` ✅
2. `/api/penpal/receive-letter` ✅
3. `/api/penpal/cancel-request` ✅
4. `/api/penpal/dispute-letter` ✅
5. `/api/penpal/check-pending-letters` ✅
6. `/api/penpal/reputation` (GET/POST) ✅
7. `/api/penpal/send-address-reminder` ✅

**에러 응답 형식:**
```json
{
  "success": false,
  "error": "펜팔 기능은 현재 사용할 수 없습니다.",
  "errorCode": "FEATURE_DISABLED"
}
```
**HTTP Status:** 403 Forbidden

---

## 📋 테스트 체크리스트

### FE 테스트

#### 1. 비활성화 상태 (NEXT_PUBLIC_PENPAL_ENABLED=false)
- [ ] 대시보드: 펜팔 관리 버튼이 보이지 않음
- [ ] 게시판: 펜팔 카테고리 링크가 보이지 않음
- [ ] 관리자 메뉴: 펜팔 관련 메뉴 3개가 보이지 않음
- [ ] `/penpal` 직접 접근 → Alert + 대시보드로 리다이렉트
- [ ] `/penpal/manage` 직접 접근 → 대시보드로 리다이렉트
- [ ] `/admin/penpal` 직접 접근 → 관리자 홈으로 리다이렉트

#### 2. 활성화 상태 (NEXT_PUBLIC_PENPAL_ENABLED=true)
- [ ] 대시보드: 펜팔 관리 버튼이 정상 표시
- [ ] 게시판: 펜팔 카테고리 링크가 정상 표시
- [ ] 관리자 메뉴: 펜팔 관련 메뉴 3개가 정상 표시
- [ ] 모든 펜팔 페이지 정상 접근

### BE 테스트

#### 1. 비활성화 상태 (NEXT_PUBLIC_PENPAL_ENABLED=false)
```bash
# 모든 펜팔 API 호출 시 403 에러 반환
curl -X POST http://localhost:3002/api/penpal/send-letter
# → {"success":false,"error":"펜팔 기능은 현재 사용할 수 없습니다.","errorCode":"FEATURE_DISABLED"}
```

- [ ] `/api/penpal/send-letter` → 403
- [ ] `/api/penpal/receive-letter` → 403
- [ ] `/api/penpal/cancel-request` → 403
- [ ] `/api/penpal/dispute-letter` → 403
- [ ] `/api/penpal/reputation` → 403

#### 2. 활성화 상태 (NEXT_PUBLIC_PENPAL_ENABLED=true)
- [ ] 모든 펜팔 API가 정상 동작

---

## 🚀 배포 가이드

### 환경변수 설정

#### 개발 환경
`.env.local` 파일:
```bash
NEXT_PUBLIC_PENPAL_ENABLED=false
```

#### 프로덕션 환경 (Vercel)
Vercel Dashboard → Settings → Environment Variables:
```
Variable: NEXT_PUBLIC_PENPAL_ENABLED
Value: false
Environment: Production
```

---

## 🔄 향후 재활성화 방법

1. **환경변수 변경**
   ```bash
   NEXT_PUBLIC_PENPAL_ENABLED=true
   ```

2. **재배포** (Vercel 자동 배포 또는 수동 배포)

3. **확인**
   - 대시보드에서 펜팔 관리 버튼 표시
   - 게시판에서 펜팔 메뉴 표시
   - 펜팔 페이지 접근 가능
   - API 정상 동작

---

## 📊 데이터 보존 확인

### ✅ 보존되는 데이터
- `penpalMatches` 컬렉션 (매칭 기록)
- `letterMissions` 컬렉션 (미션 기록)
- `letterProofs` 컬렉션 (편지 인증)
- `penpalApplications` 컬렉션 (신청 기록)
- `userPenpalReputations` 컬렉션 (신뢰도)
- `penpalCancelRequests` 컬렉션 (취소 요청)
- `letterNotifications` 컬렉션 (알림)

### ❌ 삭제되지 않는 것
- 모든 펜팔 관련 Firestore 데이터
- Firebase Storage의 편지 이미지
- 사용자 프로필의 펜팔 관련 필드

---

## 🛠️ 코드 변경 사항 요약

### 새로 생성된 파일
1. `lib/featureFlags.ts` - Feature Flag 시스템
2. `lib/apiFeatureFlags.ts` - API 미들웨어
3. `app/penpal/layout.tsx` - 사용자 펜팔 라우트 보호
4. `app/admin/penpal/layout.tsx` - 관리자 펜팔 라우트 보호

### 수정된 파일
1. `app/dashboard/page.tsx` - 펜팔 관리 링크 조건부 렌더링
2. `app/board/page.tsx` - 펜팔 카테고리 조건부 렌더링
3. `app/admin/layout.tsx` - 관리자 펜팔 메뉴 조건부 렌더링
4. `app/api/penpal/**/route.ts` (7개) - Feature Flag 미들웨어 추가

---

## 📞 문제 발생 시

### 펜팔 기능이 보이지 않는데 활성화하고 싶다면:
1. 환경변수 확인: `NEXT_PUBLIC_PENPAL_ENABLED=true`
2. 서버 재시작 (개발 환경)
3. 브라우저 캐시 클리어

### 펜팔 기능이 보이는데 숨기고 싶다면:
1. 환경변수 확인: `NEXT_PUBLIC_PENPAL_ENABLED=false`
2. 서버 재시작 (개발 환경)
3. Vercel 재배포 (프로덕션)

---

## 🎯 달성한 요구사항

✅ **FE: 펜팔 메뉴/버튼/리스트/모집글/신청/주소동의 화면 전부 숨김**
- 조건부 렌더링으로 완전히 숨김
- Layout으로 라우트 전체 보호

✅ **BE: 펜팔 관련 엔드포인트는 flag OFF면 403(FeatureDisabled) 반환**
- 모든 API에 미들웨어 적용
- 403 상태 코드 + 명확한 에러 메시지

✅ **기존 펜팔 DB 데이터는 삭제/마이그레이션 금지**
- 데이터 보존 확인 완료
- 읽기 전용 상태로 보관

---

**작성일:** 2025-12-27
**작성자:** Cursor AI Assistant




