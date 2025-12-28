# Next.js 15/16 Dynamic Routes 업데이트 ✅

## 🔄 변경 사항

Next.js 15/16에서 동적 라우트의 `params`가 **Promise**로 변경되었습니다.
`React.use()`를 사용하여 unwrap해야 합니다.

---

## ✅ 수정된 파일 (5개)

### 1. `app/showtell/week/[week]/day1/page.tsx`

**변경 전:**
```typescript
import { useState, useEffect } from "react";

interface Day1PageProps {
  params: {
    week: string;
  };
}

export default function Day1Page({ params }: Day1PageProps) {
  const week = parseInt(params.week, 10);
  // ...
}
```

**변경 후:**
```typescript
import { use, useState, useEffect } from "react";

interface Day1PageProps {
  params: Promise<{
    week: string;
  }>;
}

export default function Day1Page({ params }: Day1PageProps) {
  const resolvedParams = use(params);
  const week = parseInt(resolvedParams.week, 10);
  // ...
}
```

---

### 2. `app/showtell/week/[week]/day2/page.tsx`

**변경:**
- `params` 타입: `{ week: string }` → `Promise<{ week: string }>`
- `React.use(params)` 추가
- `resolvedParams.week` 사용

---

### 3. `app/showtell/week/[week]/day3/page.tsx`

**변경:**
- `params` 타입: `{ week: string }` → `Promise<{ week: string }>`
- `React.use(params)` 추가
- `resolvedParams.week` 사용

---

### 4. `app/showtell/week/[week]/page.tsx` (Week Home)

**변경:**
- `params` 타입: `{ week: string }` → `Promise<{ week: string }>`
- `React.use(params)` 추가
- `resolvedParams.week` 사용

---

### 5. `app/showtell/portfolio/[portfolio_id]/page.tsx`

**변경 전:**
```typescript
export default function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { portfolio_id } = params;
  // ...
}
```

**변경 후:**
```typescript
export default function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const resolvedParams = use(params);
  const { portfolio_id } = resolvedParams;
  // ...
}
```

---

## 📚 핵심 변경 사항 요약

### 변경 전 (Next.js 14)
```typescript
interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const { id } = params; // 직접 접근
}
```

### 변경 후 (Next.js 15/16)
```typescript
import { use } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: PageProps) {
  const resolvedParams = use(params); // Promise unwrap
  const { id } = resolvedParams;
}
```

---

## 🔍 왜 이렇게 변경되었나?

### Next.js 15/16의 변경 이유

1. **비동기 라우팅 지원**: 동적 라우트가 비동기로 처리되어 성능 최적화
2. **타입 안정성**: Promise 타입으로 명시적으로 비동기 처리 강제
3. **일관성**: 모든 동적 데이터가 비동기로 처리되는 패턴 통일

### React.use() Hook

- React 19의 새로운 Hook
- Promise를 unwrap하여 동기적으로 사용 가능
- Suspense와 함께 작동

---

## ⚠️ 주의사항

### 1. `use()`는 컴포넌트 최상위에서 호출

```typescript
// ✅ 올바른 사용
export default function Page({ params }: PageProps) {
  const resolvedParams = use(params);
  const week = parseInt(resolvedParams.week);
  // ...
}

// ❌ 잘못된 사용 (조건문 안에서 사용)
export default function Page({ params }: PageProps) {
  if (someCondition) {
    const resolvedParams = use(params); // 에러!
  }
}
```

### 2. `searchParams`도 Promise

```typescript
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function Page({ params, searchParams }: PageProps) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
}
```

---

## ✅ 에러 해결 확인

### 에러 메시지 (변경 전)
```
Console Error

A param property was accessed directly with `params.week`. 
`params` is a Promise and must be unwrapped with `React.use()` 
before accessing its properties.
```

### 해결 (변경 후)
```typescript
// ✅ 에러 해결됨
const resolvedParams = use(params);
const week = parseInt(resolvedParams.week, 10);
```

---

## 📊 영향을 받는 페이지

| 페이지 | 동적 파라미터 | 상태 |
|--------|---------------|------|
| `app/showtell/week/[week]/day1/page.tsx` | `week` | ✅ 수정 완료 |
| `app/showtell/week/[week]/day2/page.tsx` | `week` | ✅ 수정 완료 |
| `app/showtell/week/[week]/day3/page.tsx` | `week` | ✅ 수정 완료 |
| `app/showtell/week/[week]/page.tsx` | `week` | ✅ 수정 완료 |
| `app/showtell/portfolio/[portfolio_id]/page.tsx` | `portfolio_id` | ✅ 수정 완료 |

---

## 🔗 참고 자료

- [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [React.use() Hook Documentation](https://react.dev/reference/react/use)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

---

**작성일**: 2025-12-27  
**상태**: ✅ 모든 동적 라우트 페이지 수정 완료




