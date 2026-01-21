# Render 데이터베이스 설정 가이드

## 🔴 문제점

Render 무료 플랜에서는 **파일 시스템이 임시(ephemeral)**입니다. 이는:

- 서버가 재시작되거나 sleep 상태에서 깨어날 때 모든 파일이 사라집니다
- `accounts.json`과 `data/` 폴더의 파일들이 영구적으로 저장되지 않습니다
- 각 기기에서 로그인해도 데이터가 사라지는 이유입니다

**GitHub는 코드 저장소일 뿐이며, 데이터 저장과는 무관합니다.**

## ✅ 해결 방법: PostgreSQL 데이터베이스 사용

Render는 **무료로 PostgreSQL 데이터베이스를 제공**합니다. 이를 사용하면 데이터가 영구적으로 저장됩니다.

---

## 📋 단계별 설정 가이드

### 1단계: Render에서 PostgreSQL 데이터베이스 생성

1. **Render 대시보드 접속**
   - https://dashboard.render.com 접속

2. **새 데이터베이스 생성**
   - "New +" 클릭
   - "PostgreSQL" 선택

3. **데이터베이스 설정**
   - **Name**: `timetable-db` (원하는 이름)
   - **Database**: `timetable` (자동 생성됨)
   - **User**: 자동 생성됨
   - **Region**: 기존 웹 서비스와 동일한 지역 선택
   - **Plan**: **Free** 선택

4. **생성 완료**
   - "Create Database" 클릭
   - 데이터베이스가 생성되면 **내부 데이터베이스 URL**과 **외부 데이터베이스 URL**이 제공됩니다
   - **중요**: 웹 서비스에서 사용할 것이므로 **내부 데이터베이스 URL**을 복사하세요

---

### 2단계: 환경 변수 설정

1. **웹 서비스 설정 페이지로 이동**
   - Render 대시보드에서 기존 웹 서비스 클릭
   - "Environment" 탭 클릭

2. **데이터베이스 URL 추가**
   - "Add Environment Variable" 클릭
   - **Key**: `DATABASE_URL`
   - **Value**: 1단계에서 복사한 **내부 데이터베이스 URL** 붙여넣기
     - 형식: `postgresql://user:password@host:port/database`
   - "Save Changes" 클릭

3. **서비스 재배포**
   - 환경 변수 저장 후 자동으로 재배포됩니다
   - 또는 "Manual Deploy" → "Deploy latest commit" 클릭

---

### 3단계: 서버 코드 업데이트

서버가 PostgreSQL을 사용하도록 변경되었습니다. 다음 파일이 필요합니다:

- `package.json` - pg 라이브러리 추가됨
- `server-db.js` - PostgreSQL을 사용하는 새 서버 파일 (또는 `server.js` 업데이트)

---

### 4단계: 배포 및 테스트

1. **코드 푸시**
   ```bash
   git add .
   git commit -m "Add PostgreSQL database support"
   git push
   ```

2. **자동 재배포 확인**
   - Render 대시보드에서 배포 상태 확인
   - "Logs" 탭에서 오류 확인

3. **테스트**
   - 웹 서비스 URL로 접속
   - 계정 생성 테스트
   - 다른 기기에서 로그인 테스트
   - 데이터가 유지되는지 확인

---

## 🔍 문제 해결

### 데이터베이스 연결 오류
- `DATABASE_URL` 환경 변수가 올바르게 설정되었는지 확인
- 내부 URL을 사용했는지 확인 (외부 URL은 다른 곳에서 사용)

### 테이블 생성 오류
- 로그에서 오류 메시지 확인
- 데이터베이스 권한 확인

### 여전히 데이터가 사라지는 경우
- 서버 로그에서 데이터베이스 연결 상태 확인
- 환경 변수가 제대로 전달되었는지 확인

---

## 💡 추가 정보

### PostgreSQL 대신 다른 옵션들:

1. **메모리 기반 저장소** (비추천)
   - 서버 재시작 시 데이터 손실

2. **외부 데이터베이스 서비스**
   - Supabase (무료 PostgreSQL)
   - PlanetScale (무료 MySQL)
   - MongoDB Atlas (무료 MongoDB)

3. **파일 기반 저장소**
   - Render의 디스크는 임시이므로 사용 불가
   - 다른 호스팅 플랫폼 필요 (VPS 등)

---

## ✅ 권장 사항

**PostgreSQL을 사용하는 것이 가장 좋은 해결책입니다:**
- ✅ Render에서 무료로 제공
- ✅ 데이터 영구 저장
- ✅ 확장 가능
- ✅ 안정적
