# 🔒 Firebase Storage Rules 설정 가이드

## 문제
```
Firebase Storage: An unknown error occurred, please check the error payload for server response. (storage/unknown)
```

이 오류는 Firebase Storage Rules가 설정되지 않아서 발생합니다.

---

## ✅ 해결 방법

### 1️⃣ Firebase Console 접속

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택: `mflow-englishdiary`
3. 왼쪽 메뉴에서 **Storage** 클릭
4. 상단 탭에서 **Rules** 클릭

---

### 2️⃣ Storage Rules 설정

아래 Rules를 복사해서 붙여넣고 **게시** 버튼을 클릭하세요:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // 펜팔 편지 사진 (인증된 사용자만)
    match /penpal/letters/{matchId}/{filename} {
      // 읽기: 인증된 사용자만
      allow read: if request.auth != null;
      
      // 쓰기: 인증된 사용자만 (5MB 이하)
      allow write: if request.auth != null 
                   && request.resource.size < 5 * 1024 * 1024  // 5MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // 일기 이미지 (기존)
    match /diaries/{userId}/{filename} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 10 * 1024 * 1024  // 10MB
                   && request.resource.contentType.matches('image/.*');
    }
    
    // 기타 모든 파일 (기본적으로 인증된 사용자만)
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.resource.size < 10 * 1024 * 1024;  // 10MB
    }
  }
}
```

---

## 📋 Rules 설명

### 펜팔 편지 경로
```
/penpal/letters/{matchId}/{filename}
```

**예시**:
```
/penpal/letters/match_abc123/step1_sent_1703012345678.jpg
/penpal/letters/match_abc123/step1_received_1703023456789.jpg
```

### 보안 규칙

| 작업 | 조건 |
|------|------|
| **읽기** | 인증된 사용자 |
| **쓰기** | 인증된 사용자 + 5MB 이하 + 이미지 파일 |

---

## 🔐 보안 강화 (선택사항)

더 강력한 보안이 필요하면 아래 Rules를 사용하세요:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper function: Firestore에서 매칭 정보 확인
    function isMatchParticipant(matchId) {
      let matchData = firestore.get(/databases/(default)/documents/penpalMatches/$(matchId)).data;
      return request.auth.uid == matchData.user1Id 
          || request.auth.uid == matchData.user2Id;
    }
    
    // 펜팔 편지 사진 (매칭 참여자만)
    match /penpal/letters/{matchId}/{filename} {
      // 읽기: 해당 매칭의 참여자만
      allow read: if request.auth != null 
                  && isMatchParticipant(matchId);
      
      // 쓰기: 해당 매칭의 참여자만 (5MB 이하)
      allow write: if request.auth != null 
                   && isMatchParticipant(matchId)
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    
    // 일기 이미지 (본인만)
    match /diaries/{userId}/{filename} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    
    // 기타 파일 접근 차단
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**장점**:
- ✅ 매칭 참여자만 해당 편지 사진에 접근 가능
- ✅ 다른 사용자의 편지 사진 보호
- ✅ Firestore와 연동하여 권한 확인

**단점**:
- ⚠️ Firestore 읽기 횟수 증가 (비용 증가 가능)
- ⚠️ 약간의 성능 저하

---

## 🧪 테스트 방법

### 1. Storage Rules 설정 후

1. 페이지 새로고침
2. 편지 발송 시도
3. 콘솔에서 오류 확인

### 2. 성공 메시지 확인

```
📮 편지 발송 API 시작
📸 이미지 업로드 중...
✅ 이미지 업로드 완료: https://firebasestorage.googleapis.com/...
✅ LetterProof 생성 완료: proof_xyz123
✅ 수신자 알림 발송 완료
```

### 3. Firebase Console에서 확인

1. Storage → Files
2. `penpal/letters/` 폴더 확인
3. 업로드된 이미지 확인

---

## ❌ 일반적인 오류

### Error: `storage/unauthorized`
**원인**: Storage Rules가 너무 제한적
**해결**: Rules에서 `allow read, write: if request.auth != null;` 확인

### Error: `storage/quota-exceeded`
**원인**: Storage 용량 초과
**해결**: Firebase Console → Storage → Usage 확인

### Error: `storage/canceled`
**원인**: 업로드 중단 또는 네트워크 오류
**해결**: 네트워크 확인 후 재시도

### Error: `storage/unknown`
**원인**: Rules 설정 안 됨 또는 잘못된 초기화
**해결**: 
1. Rules 설정 확인
2. Firebase App 초기화 확인 (`firebaseApp` import)

---

## 📊 Storage 사용량 모니터링

### Firebase Console
1. Storage → Usage
2. 현재 사용량 확인
3. 무료 플랜: 1GB/월

### 사용량 최적화
1. 이미지 압축 (클라이언트 사이드)
2. 오래된 이미지 자동 삭제 (Cloud Functions)
3. 썸네일 생성 후 원본 삭제

---

## 🔄 Rules 버전 관리

### Rules 백업
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 초기화
firebase init

# Rules 다운로드
firebase deploy --only storage
```

### Rules 히스토리
Firebase Console → Storage → Rules → 버전 기록

---

## ✅ 최종 체크리스트

- [ ] Firebase Console → Storage → Rules 접속
- [ ] 위의 Rules 복사 & 붙여넣기
- [ ] **게시** 버튼 클릭
- [ ] 페이지 새로고침
- [ ] 편지 발송 테스트
- [ ] Storage에 이미지 업로드 확인

---

**작성일**: 2025-12-17  
**프로젝트**: 영어 일기 AI 첨삭 - 펜팔 시스템

