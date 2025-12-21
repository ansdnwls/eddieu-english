# Firebase 인증 도메인 설정 가이드

## 🔴 에러: `auth/unauthorized-domain`

구글 로그인 시 `Firebase: Error (auth/unauthorized-domain)` 에러가 발생하는 경우, Firebase Console에서 현재 도메인을 승인된 도메인 목록에 추가해야 합니다.

## 📋 해결 방법

### 1. Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택 (예: `mflow-englishdiary`)

### 2. Authentication 설정 열기
1. 왼쪽 메뉴에서 **Authentication** 클릭
2. 상단의 **Settings** (톱니바퀴 아이콘) 클릭
3. **승인된 도메인** (Authorized domains) 섹션으로 스크롤

### 3. 도메인 추가
**추가해야 할 도메인들:**

#### 개발 환경 (로컬)
- `localhost`
- `localhost:3000`
- `localhost:3001`
- `127.0.0.1`
- `127.0.0.1:3000`
- `127.0.0.1:3001`

#### 로컬 네트워크 (같은 네트워크의 다른 기기에서 접속)
- `192.168.55.82` (현재 IP 주소)
- `192.168.55.82:3001` (포트 포함)
- 또는 사용 중인 다른 IP 주소들

#### 프로덕션 환경 (배포 후)
- 실제 도메인 (예: `yourdomain.com`)
- 서브도메인 (예: `www.yourdomain.com`)

### 4. 도메인 추가 방법
1. **도메인 추가** 버튼 클릭
2. 도메인 입력 (예: `192.168.55.82`)
3. **추가** 버튼 클릭
4. 포트가 있는 경우 별도로 추가 (예: `192.168.55.82:3001`)

### 5. 저장 및 확인
- 도메인 추가 후 자동으로 저장됩니다
- 변경 사항이 적용되는 데 몇 초 정도 걸릴 수 있습니다
- 브라우저를 새로고침하고 다시 시도하세요

## ⚠️ 주의사항

1. **포트 번호**: 포트가 있는 URL은 별도로 추가해야 합니다
   - `localhost`와 `localhost:3001`은 다른 도메인으로 인식됩니다

2. **IP 주소 변경**: 로컬 네트워크의 IP 주소가 변경되면 다시 추가해야 합니다

3. **프로덕션**: 실제 서비스 배포 시에는 실제 도메인을 반드시 추가해야 합니다

## 🔍 현재 도메인 확인 방법

브라우저 개발자 도구 콘솔에서 다음 명령어로 확인:
```javascript
console.log(window.location.hostname);
console.log(window.location.host); // 포트 포함
```

## ✅ 확인 체크리스트

- [ ] Firebase Console에서 Authentication → Settings 접속
- [ ] 승인된 도메인 섹션 확인
- [ ] `localhost` 추가됨
- [ ] `localhost:3001` 추가됨 (또는 사용 중인 포트)
- [ ] 현재 IP 주소 추가됨 (예: `192.168.55.82`)
- [ ] 포트 포함 IP 주소 추가됨 (예: `192.168.55.82:3001`)
- [ ] 브라우저 새로고침 후 다시 시도

## 🆘 여전히 문제가 발생하는 경우

1. **브라우저 캐시 삭제**: Ctrl+Shift+Delete (또는 Cmd+Shift+Delete)
2. **시크릿 모드에서 테스트**: 캐시 문제 확인
3. **Firebase Console에서 도메인 목록 재확인**: 실제로 추가되었는지 확인
4. **개발 서버 재시작**: `npm run dev` 중지 후 다시 시작

## 📞 추가 도움

- [Firebase 공식 문서 - 승인된 도메인](https://firebase.google.com/docs/auth/web/redirect-best-practices)
- Firebase Console: https://console.firebase.google.com/





