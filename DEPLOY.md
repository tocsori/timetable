# 배포 가이드 (Deployment Guide)

이 시간표 관리 시스템을 실제 서버에 배포하는 방법을 안내합니다.

## 🚀 배포 옵션

### 1. Railway (권장 - 가장 간단)

Railway는 Node.js 앱을 쉽게 배포할 수 있는 플랫폼입니다.

#### 배포 단계:

1. **Railway 계정 생성**
   - https://railway.app 접속
   - GitHub 계정으로 로그인

2. **프로젝트 배포**
   - "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - GitHub 저장소 선택 또는 새로 생성
   - 자동으로 배포 시작

3. **환경 변수 설정** (선택사항)
   - Settings → Variables에서 설정 가능
   - PORT는 자동으로 설정됨

4. **도메인 설정**
   - Settings → Domains에서 커스텀 도메인 설정 가능
   - 기본적으로 `프로젝트명.railway.app` 도메인 제공

#### 장점:
- 무료 플랜 제공
- 자동 배포 (Git push 시 자동)
- 간단한 설정
- HTTPS 자동 지원

---

### 2. Render

Render도 Node.js 앱 배포에 적합합니다.

#### 배포 단계:

1. **Render 계정 생성**
   - https://render.com 접속
   - GitHub 계정으로 로그인

2. **새 Web Service 생성**
   - "New +" → "Web Service" 선택
   - GitHub 저장소 연결
   - 설정:
     - **Build Command**: (비워두기)
     - **Start Command**: `node server.js`
     - **Environment**: Node

3. **배포**
   - "Create Web Service" 클릭
   - 자동으로 빌드 및 배포 시작

#### 장점:
- 무료 플랜 제공
- 자동 HTTPS
- 쉬운 설정

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

**초보자**: Railway 또는 Render
- 설정이 간단하고 무료 플랜 제공
- GitHub 연동으로 자동 배포

**고급 사용자**: VPS (DigitalOcean 등)
- 완전한 제어 가능
- 더 많은 커스터마이징 가능

---

## 📞 지원

배포 중 문제가 발생하면:
1. 플랫폼의 로그 확인
2. GitHub Issues에 문제 보고
3. 문서 확인
