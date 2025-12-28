# 🚩 Feature Flag: 펜팔 비활성화 - 빠른 테스트 가이드

## 📝 요약

펜팔 기능을 **삭제하지 않고** Feature Flag로 **완전히 비활성화**했습니다.
환경변수 하나로 언제든지 켜고 끌 수 있습니다.

---

## ⚡ 5분 테스트

### 1️⃣ 환경변수 설정 (비활성화)

프로젝트 루트에 `.env.local` 파일 생성/수정:

```bash
# 펜팔 비활성화
NEXT_PUBLIC_PENPAL_ENABLED=false

# Firebase 설정 (기존 유지)
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
# ... 나머지 설정
```

### 2️⃣ 개발 서버 재시작

```bash
# 기존 서버 중지 (Ctrl+C)
npm run dev
```

### 3️⃣ 확인 사항

#### ✅ 대시보드 (`http://localhost:3002/dashboard`)
- **펜팔 관리 버튼이 사라짐** ← 빠른 링크 섹션에서 확인

#### ✅ 게시판 (`http://localhost:3002/board`)
- **펜팔 카테고리가 사라짐** ← 카테고리 필터에서 확인

#### ✅ 관리자 메뉴 (`http://localhost:3002/admin`)
- **펜팔 관련 메뉴 3개가 사라짐** ← 사이드바에서 확인
  - ✉️ 펜팔 관리
  - ❌ 취소 요청 관리
  - 📮 편지 분쟁 처리

#### ✅ 직접 접근 차단
브라우저 주소창에 직접 입력:
```
http://localhost:3002/penpal
→ Alert 표시 + /dashboard로 리다이렉트 ✅

http://localhost:3002/penpal/manage
→ /dashboard로 리다이렉트 ✅

http://localhost:3002/admin/penpal
→ /admin으로 리다이렉트 ✅
```

#### ✅ API 차단 (선택사항 - 개발자 도구)
F12 → Console에서 테스트:
```javascript
fetch('/api/penpal/send-letter', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
// → {success: false, error: "펜팔 기능은 현재 사용할 수 없습니다.", errorCode: "FEATURE_DISABLED"}
```

---

## 🔄 재활성화 테스트

### 1️⃣ 환경변수 변경

`.env.local`:
```bash
# 펜팔 활성화
NEXT_PUBLIC_PENPAL_ENABLED=true
```

### 2️⃣ 서버 재시작

```bash
# Ctrl+C 후
npm run dev
```

### 3️⃣ 확인

- ✅ 대시보드: 펜팔 관리 버튼 **다시 표시**
- ✅ 게시판: 펜팔 카테고리 **다시 표시**
- ✅ 관리자 메뉴: 펜팔 메뉴 3개 **다시 표시**
- ✅ 펜팔 페이지 **정상 접근**

---

## 🎯 체크리스트 (1분)

### Feature Flag OFF (비활성화)
- [ ] 대시보드: 펜팔 관리 버튼 없음
- [ ] 게시판: 펜팔 카테고리 없음
- [ ] 관리자: 펜팔 메뉴 3개 없음
- [ ] `/penpal` 접근 → 리다이렉트
- [ ] API 호출 → 403 에러

### Feature Flag ON (활성화)
- [ ] 대시보드: 펜팔 관리 버튼 있음
- [ ] 게시판: 펜팔 카테고리 있음
- [ ] 관리자: 펜팔 메뉴 3개 있음
- [ ] `/penpal` 접근 가능
- [ ] API 정상 동작

---

## 📊 데이터 보존 확인

### ✅ 보존됨 (삭제되지 않음)
- Firestore 컬렉션:
  - `penpalMatches`
  - `letterMissions`
  - `letterProofs`
  - `penpalApplications`
  - `userPenpalReputations`
  - 기타 펜팔 관련 모든 데이터
- Firebase Storage: 편지 이미지
- 코드: 펜팔 관련 모든 파일/컴포넌트

### ⚠️ 주의사항
- Feature Flag OFF 상태에서는 **읽기만 가능** (쓰기 차단)
- 데이터는 **절대 삭제되지 않음**
- 재활성화 시 **즉시 사용 가능**

---

## 🚀 프로덕션 배포 (Vercel)

### 1. Vercel Dashboard 접속
```
Project Settings → Environment Variables
```

### 2. 환경변수 추가
```
Name: NEXT_PUBLIC_PENPAL_ENABLED
Value: false
Environment: Production, Preview, Development (모두 선택)
```

### 3. 재배포
```bash
git commit -am "feat: Add penpal feature flag"
git push
```
또는 Vercel Dashboard에서 "Redeploy"

---

## 🔍 문제 해결

### 펜팔이 여전히 보인다면?
1. ✅ `.env.local` 확인: `NEXT_PUBLIC_PENPAL_ENABLED=false`
2. ✅ 서버 재시작: `npm run dev`
3. ✅ 브라우저 캐시 클리어: Hard Reload (Ctrl+Shift+R)

### 펜팔을 다시 켜고 싶다면?
1. `.env.local`: `NEXT_PUBLIC_PENPAL_ENABLED=true`
2. 서버 재시작
3. 페이지 새로고침

---

## 📞 지원

- 상세 가이드: `FEATURE_FLAG_PENPAL_GUIDE.md`
- 구현 파일:
  - Feature Flag: `lib/featureFlags.ts`
  - API 미들웨어: `lib/apiFeatureFlags.ts`
  - 레이아웃 보호: `app/penpal/layout.tsx`, `app/admin/penpal/layout.tsx`

---

**테스트 완료 시간:** 약 5분  
**재활성화 시간:** 약 1분 (환경변수 변경 + 재시작)





