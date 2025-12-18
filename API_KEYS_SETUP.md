# API 키 설정 가이드

## 현재 상태

API 키는 두 가지 방법으로 관리할 수 있습니다:

1. **Firestore에 저장** (관리자 페이지에서 입력)
   - 위치: `/admin/api-keys`
   - 저장 위치: Firestore `admin_settings/api_keys` 문서
   - 현재는 저장만 되고, 실제 API 호출에는 사용되지 않음

2. **환경 변수에 저장** (서버 사이드에서 사용)
   - `.env.local` 파일에 저장
   - 실제 API 호출 시 우선 사용됨

## 설정 방법

### 방법 1: 환경 변수 사용 (권장)

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
GOOGLE_VISION_API_KEY=AIza-your-google-vision-api-key-here
TTS_API_KEY=your-tts-api-key-here
```

### 방법 2: Firestore에서 가져오기

Firestore에서 API 키를 가져오려면 Firebase Admin SDK가 필요합니다:

1. Firebase Admin SDK 설치:
```bash
npm install firebase-admin
```

2. 서비스 계정 키 다운로드:
   - Firebase Console → 프로젝트 설정 → 서비스 계정
   - "새 비공개 키 생성" 클릭
   - JSON 파일 다운로드

3. `.env.local`에 추가:
```env
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account-key.json
```

4. `app/api/correct-diary/route.ts` 수정:
   - Firebase Admin SDK를 사용하여 Firestore에서 API 키 가져오기

## API 키 테스트

관리자 페이지(`/admin/api-keys`)에서 "🔍 연결 테스트" 버튼을 클릭하면:
- OpenAI API 키 유효성 확인
- Google Vision API 키 유효성 확인
- 각 API의 연결 상태 표시

## 현재 제한사항

- 서버 사이드 API Route에서는 클라이언트 Firestore SDK를 직접 사용할 수 없음
- 환경 변수를 사용하거나 Firebase Admin SDK가 필요함
- 현재는 환경 변수를 우선 사용하도록 설정됨

## 향후 개선 사항

1. Firebase Admin SDK 통합
2. Firestore에서 API 키 자동 로드
3. API 키 암호화 저장
4. API 사용량 모니터링



