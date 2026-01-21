# 배포 가이드 (Deployment Guide)

이 시간표 관리 시스템을 실제 서버에 배포하는 방법을 안내합니다.

## 🚀 배포 옵션

### 1. Render (권장 - 무료 플랜 제공)

Render는 Node.js 앱을 쉽게 배포할 수 있는 플랫폼입니다. **무료 플랜을 제공**하며 Railway의 제한사항 없이 웹 서비스를 배포할 수 있습니다.

#### 배포 단계:

1. **Render 계정 생성**
   - https://render.com 접속
   - "Get Started for Free" 클릭
   - GitHub 계정으로 로그인

2. **새 Web Service 생성**
   - 대시보드에서 "New +" 클릭
   - "Web Service" 선택
   - GitHub 저장소 연결 (또는 "Connect account"로 연결)
   - 저장소 선택 후 "Connect"

3. **서비스 설정**
   - **Name**: 원하는 서비스 이름 (예: `timetable-app`)
   - **Region**: 가장 가까운 지역 선택 (예: Singapore)
   - **Branch**: `main` (또는 기본 브랜치)
   - **Root Directory**: (비워두기)
   - **Runtime**: `Node`
   - **Build Command**: (비워두기 - Render가 자동 감지)
   - **Start Command**: `node server.js`
   - **Instance Type**: **Free** 선택

4. **환경 변수 설정** (선택사항)
   - Environment Variables 섹션에서:
     - `NODE_ENV`: `production` (선택사항)
     - `PORT`는 Render가 자동 설정

5. **배포 시작**
   - "Create Web Service" 클릭
   - 자동으로 빌드 및 배포 시작 (약 2-3분 소요)

6. **도메인 확인**
   - 배포 완료 후 상단에 표시되는 URL 확인
   - 형식: `서비스명.onrender.com`
   - HTTPS 자동 적용

#### 장점:
- ✅ **무료 플랜 제공** (웹 서비스 배포 가능)
- ✅ 자동 배포 (Git push 시 자동)
- ✅ 자동 HTTPS
- ✅ 쉬운 설정
- ✅ 상세한 로그 제공

#### 주의사항:
- 무료 플랜은 15분간 요청이 없으면 서비스가 sleep 상태가 됩니다
- 첫 요청 시 깨어나는데 약 30초 정도 소요될 수 있습니다
- 프로덕션 환경에서는 유료 플랜 고려 권장

---

### 2. Northflank (무료 플랜 제공)

Northflank는 컨테이너 기반 배포 플랫폼으로, **무료 플랜을 제공**하며 Node.js 웹 서비스를 배포할 수 있습니다.

#### 배포 단계:

1. **Northflank 계정 생성**
   - https://app.northflank.com 접속
   - "Sign Up" 또는 "Get Started" 클릭
   - GitHub 계정으로 로그인 (또는 이메일로 가입)

2. **새 프로젝트 생성**
   - 대시보드에서 "New Project" 클릭
   - 프로젝트 이름 입력 (예: `timetable-app`)
   - "Create Project" 클릭

3. **서비스 생성**
   - 프로젝트 내에서 "Add Service" 클릭
   - "Combined" 또는 "Web Service" 선택
   - "From Source" 선택

4. **GitHub 저장소 연결**
   - "Connect Repository" 클릭
   - GitHub 저장소 선택
   - Branch: `main` (또는 기본 브랜치)

5. **서비스 설정**
   - **Service Name**: 원하는 서비스 이름 (예: `timetable-server`)
   - **Build Type**: `Dockerfile` 또는 `Buildpack` 선택
     - **Dockerfile 사용 시**: Dockerfile이 없으면 자동 생성되거나 아래 Dockerfile 생성 필요
     - **Buildpack 사용 시**: Node.js 자동 감지
   - **Port**: `3000` (또는 `$PORT` 환경변수 사용)
   - **Start Command**: `node server.js`
   - **Plan**: **Free** 선택

6. **환경 변수 설정** (선택사항)
   - Environment Variables 섹션에서:
     - `NODE_ENV`: `production` (선택사항)
     - `PORT`: (자동 설정되지만 필요시 명시)

7. **배포 시작**
   - "Create Service" 클릭
   - 자동으로 빌드 및 배포 시작

8. **도메인 확인**
   - 배포 완료 후 서비스 페이지에서 URL 확인
   - 형식: `서비스명-프로젝트명.northflank.app`
   - HTTPS 자동 적용

#### Dockerfile 생성 (선택사항)

Northflank가 자동으로 감지하지 못하는 경우, 프로젝트 루트에 `Dockerfile`을 생성할 수 있습니다:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### 장점:
- ✅ **무료 플랜 제공** (웹 서비스 배포 가능)
- ✅ 컨테이너 기반 배포 (Docker 지원)
- ✅ 자동 배포 (Git push 시 자동)
- ✅ 자동 HTTPS
- ✅ 다양한 빌드 옵션 (Dockerfile, Buildpack)
- ✅ 상세한 로그 및 모니터링

#### 주의사항:
- 무료 플랜은 리소스 제한이 있을 수 있습니다
- 정확한 제한사항은 Northflank 공식 문서 확인 권장
- 프로덕션 환경에서는 유료 플랜 고려 권장

---

### 3. Railway (제한적 - 무료 플랜은 데이터베이스만 가능)

⚠️ **주의**: Railway의 무료 플랜은 현재 **데이터베이스만 배포 가능**하며, 웹 서비스 배포는 유료 플랜이 필요합니다.

#### Railway 무료 플랜 제한사항:
- ❌ 웹 서비스 배포 불가 (데이터베이스만 가능)
- ✅ 유료 플랜 업그레이드 필요

#### 대안:
- **Render** 사용 권장 (무료 플랜으로 웹 서비스 배포 가능)

---

### 3. Heroku

전통적인 PaaS 플랫폼입니다.

#### 배포 단계:

1. **Heroku CLI 설치**
   ```bash
   # Mac
   brew tap heroku/brew && brew install heroku
   
   # Windows
   # https://devcenter.heroku.com/articles/heroku-cli 에서 다운로드
   ```

2. **Heroku 로그인**
   ```bash
   heroku login
   ```

3. **프로젝트 초기화**
   ```bash
   cd /Users/Tocsori/Downloads/timetable
   heroku create 시간표-관리-시스템
   ```

4. **배포**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

5. **앱 열기**
   ```bash
   heroku open
   ```

#### 주의사항:
- 무료 플랜이 제한적일 수 있음
- 신용카드 등록 필요할 수 있음

---

### 4. VPS (가상 서버)

더 많은 제어가 필요한 경우 VPS를 사용할 수 있습니다.

#### 추천 VPS 제공업체:
- **DigitalOcean**: https://www.digitalocean.com
- **Linode**: https://www.linode.com
- **AWS EC2**: https://aws.amazon.com/ec2
- **Google Cloud Platform**: https://cloud.google.com

#### VPS 배포 단계:

1. **서버 설정**
   ```bash
   # Node.js 설치
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # 프로젝트 업로드
   scp -r timetable/ user@your-server:/home/user/
   
   # 서버 접속
   ssh user@your-server
   ```

2. **PM2로 프로세스 관리**
   ```bash
   # PM2 설치
   npm install -g pm2
   
   # 앱 실행
   cd timetable
   pm2 start server.js --name timetable
   
   # 자동 시작 설정
   pm2 startup
   pm2 save
   ```

3. **Nginx 리버스 프록시 설정** (선택사항)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

### 5. 가정용 NAS (Network Attached Storage)

가정용 NAS로도 웹 서비스를 호스팅할 수 있습니다. 대부분의 최신 NAS는 Docker를 지원하여 Node.js 앱을 실행할 수 있습니다.

#### 지원하는 NAS 제조사:
- **Synology** (DSM 6.0 이상)
- **QNAP** (QTS 4.2 이상)
- **Asustor** (ADM 3.0 이상)
- **Western Digital My Cloud** (일부 모델)

#### 방법 1: Docker 사용 (권장)

대부분의 NAS에서 가장 간단한 방법입니다.

##### Synology NAS 배포:

1. **Docker 설치**
   - Package Center에서 "Docker" 검색 및 설치
   - Container Manager 실행

2. **프로젝트 파일 준비**
   - File Station에서 프로젝트 폴더 생성 (예: `/docker/timetable`)
   - 프로젝트 파일들을 NAS에 업로드
     - `server.js`
     - `package.json`
     - `*.html` 파일들
     - `*.json` 파일들 (필요한 경우)
     - `Dockerfile` (아래 참고)

3. **Dockerfile 생성**
   - 프로젝트 루트에 `Dockerfile` 생성 (아래 내용 참고)

4. **Docker 이미지 빌드**
   - Container Manager → Image → Add → "From file"
   - Dockerfile 선택 후 빌드

5. **컨테이너 실행**
   - Container Manager → Container → Create
   - 이미지 선택
   - 포트 설정: `3000:3000` (호스트:컨테이너)
   - 볼륨 마운트:
     - `/docker/timetable/data` → `/app/data` (데이터 저장용)
     - `/docker/timetable/accounts.json` → `/app/accounts.json` (계정 파일)
   - "Create" 클릭

6. **접속 확인**
   - NAS IP 주소:포트로 접속 (예: `http://192.168.1.100:3000`)

##### QNAP NAS 배포:

1. **Container Station 설치**
   - App Center에서 "Container Station" 설치

2. **프로젝트 준비**
   - File Station에서 프로젝트 폴더 생성
   - 파일 업로드

3. **Docker Compose 사용** (권장)
   - `docker-compose.yml` 파일 생성 (아래 참고)

4. **컨테이너 실행**
   - Container Station → Create → Compose
   - docker-compose.yml 파일 선택
   - "Create" 클릭

#### 방법 2: 직접 Node.js 설치 (Docker 미지원 NAS)

일부 구형 NAS는 Docker를 지원하지 않을 수 있습니다. 이 경우 직접 Node.js를 설치할 수 있습니다.

1. **SSH 활성화**
   - NAS 관리 페이지에서 SSH 서비스 활성화

2. **SSH 접속**
   ```bash
   ssh admin@nas-ip-address
   ```

3. **Node.js 설치** (NAS 모델에 따라 다름)
   ```bash
   # Synology의 경우
   # Entware 또는 ipkg 사용
   ipkg install node
   
   # 또는 직접 다운로드
   wget https://nodejs.org/dist/v18.x.x/node-v18.x.x-linux-x64.tar.xz
   tar -xf node-v18.x.x-linux-x64.tar.xz
   ```

4. **프로젝트 실행**
   ```bash
   cd /volume1/docker/timetable
   npm install
   node server.js
   ```

5. **PM2로 자동 실행 설정** (선택사항)
   ```bash
   npm install -g pm2
   pm2 start server.js --name timetable
   pm2 startup
   pm2 save
   ```

#### Dockerfile 예시:

프로젝트 루트에 `Dockerfile` 파일을 생성하세요:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm install --production

# 프로젝트 파일 복사
COPY . .

# 포트 노출
EXPOSE 3000

# 환경 변수 설정
ENV NODE_ENV=production
ENV PORT=3000

# 서버 실행
CMD ["node", "server.js"]
```

#### docker-compose.yml 예시 (QNAP 등):

프로젝트 루트에 `docker-compose.yml` 파일을 생성하세요:

```yaml
version: '3.8'

services:
  timetable:
    build: .
    container_name: timetable-app
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./accounts.json:/app/accounts.json
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
```

#### 장점:
- ✅ **완전 무료** (NAS가 이미 있는 경우)
- ✅ 데이터가 집에 저장되어 프라이버시 보호
- ✅ 인터넷 연결 없이도 로컬 네트워크에서 접속 가능
- ✅ 완전한 제어 가능

#### 주의사항:
- ⚠️ **외부 접속 설정 필요**: 외부에서 접속하려면 포트 포워딩 또는 DDNS 설정 필요
- ⚠️ **HTTPS 설정**: Let's Encrypt 등으로 SSL 인증서 설정 필요
- ⚠️ **NAS 성능**: 저사양 NAS는 느릴 수 있음
- ⚠️ **전력 소비**: NAS가 항상 켜져 있어야 함
- ⚠️ **보안**: 방화벽 및 보안 설정 필요

#### 외부 접속 설정 (선택사항):

1. **포트 포워딩**
   - 라우터 설정에서 NAS IP의 3000번 포트를 외부로 포워딩

2. **DDNS 설정**
   - Synology: QuickConnect 또는 DDNS 서비스 사용
   - QNAP: myQNAPcloud 사용

3. **역방향 프록시 설정** (HTTPS 사용 시)
   - NAS의 역방향 프록시 기능 사용
   - Let's Encrypt 인증서 자동 갱신 설정

---

## 📋 배포 전 체크리스트

### 필수 확인 사항:

- [ ] `package.json`에 `engines.node` 설정 확인
- [ ] `server.js`에서 `process.env.PORT` 사용 확인
- [ ] `.gitignore`에 민감한 파일 제외 확인
- [ ] 환경 변수 설정 (필요한 경우)

### 보안 강화 권장사항:

1. **비밀번호 해싱 추가** (현재는 평문 저장)
   ```javascript
   // bcrypt 사용 예시
   const bcrypt = require('bcrypt');
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

2. **환경 변수로 민감한 정보 관리**
   ```javascript
   // .env 파일 사용
   require('dotenv').config();
   const SECRET_KEY = process.env.SECRET_KEY;
   ```

3. **HTTPS 강제** (대부분 플랫폼에서 자동 제공)

---

## 🔧 환경 변수 설정

배포 플랫폼에서 다음 환경 변수를 설정할 수 있습니다:

- `PORT`: 서버 포트 (대부분 자동 설정)
- `NODE_ENV`: `production`으로 설정 권장

---

## 📝 배포 후 확인사항

1. **서버 접속 확인**
   - 제공된 URL로 접속 테스트
   - 로그인/회원가입 기능 테스트

2. **데이터 저장 확인**
   - 계정 생성 후 `accounts.json` 파일 확인
   - 시간표 데이터 저장 확인

3. **에러 로그 확인**
   - 플랫폼의 로그 기능 사용
   - 문제 발생 시 로그 확인

---

## 🆘 문제 해결

### 포트 오류
- `PORT` 환경 변수가 올바르게 설정되었는지 확인
- `process.env.PORT || 3000` 사용 확인

### 파일 쓰기 권한 오류
- 파일 시스템 권한 확인
- `data/` 디렉토리 생성 권한 확인

### 빌드 실패
- Node.js 버전 확인 (14.0.0 이상)
- `package.json`의 `engines` 설정 확인

---

## 💡 추천 배포 플랫폼

**초보자**: **Render** 또는 **Northflank** (권장)
- ✅ 무료 플랜으로 웹 서비스 배포 가능
- ✅ 설정이 간단하고 GitHub 연동으로 자동 배포
- ✅ Railway는 무료 플랜에서 웹 서비스 배포 불가

**컨테이너 기반 배포 원하는 경우**: **Northflank**
- Docker 지원
- 더 유연한 빌드 옵션

**고급 사용자**: VPS (DigitalOcean 등)
- 완전한 제어 가능
- 더 많은 커스터마이징 가능

---

## 📞 지원

배포 중 문제가 발생하면:
1. 플랫폼의 로그 확인
2. GitHub Issues에 문제 보고
3. 문서 확인
