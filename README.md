# 시간표 관리 시스템

## 📦 빠른 시작

### 로컬 실행
```bash
node server.js
```
브라우저에서 `http://localhost:3000` 접속

### 웹호스팅 배포

이 애플리케이션은 웹호스팅 환경에서 실행할 수 있도록 최적화되어 있습니다.

**주요 특징:**
- ✅ 환경 변수 기반 설정 (PORT, DATABASE_URL 등)
- ✅ PostgreSQL 데이터베이스 지원 (선택사항)
- ✅ 파일 시스템 저장 지원 (데이터베이스 없이도 작동)
- ✅ 보안 강화된 경로 처리
- ✅ 프로덕션 환경 최적화

**추천 배포 플랫폼:**
- 🚂 [Railway](https://railway.app) - 가장 간단
- 🎨 [Render](https://render.com) - 무료 플랜 제공 (데이터베이스 가이드: [RENDER_DATABASE_GUIDE.md](./RENDER_DATABASE_GUIDE.md))
- ☁️ [Heroku](https://heroku.com) - 전통적인 PaaS
- 🌐 [Vercel](https://vercel.com) - 서버리스 함수 지원
- 🐳 [Fly.io](https://fly.io) - Docker 기반 배포

**환경 변수 설정:**
- `PORT`: 서버 포트 (대부분의 플랫폼에서 자동 설정)
- `NODE_ENV`: `production` 또는 `development` (기본값: `development`)
- `DATABASE_URL`: PostgreSQL 연결 문자열 (선택사항, 없으면 파일 시스템 사용)
- `ALLOWED_ORIGIN`: CORS 허용 도메인 (선택사항, 기본값: `*`)

자세한 배포 가이드는 [DEPLOY.md](./DEPLOY.md)를 참조하세요.

---

# 시간표 관리 시스템 - 서버 실행 가이드

## 📋 목차
1. [서버 실행이 필요한 이유](#서버-실행이-필요한-이유)
2. [Node.js로 실행하기 (권장)](#nodejs로-실행하기-권장)
3. [Python으로 실행하기](#python으로-실행하기)
4. [기타 방법](#기타-방법)
5. [문제 해결](#문제-해결)

---

## 서버 실행이 필요한 이유

이 시간표 관리 시스템은 연간시수표 데이터를 자동으로 불러오기 위해 서버 환경이 필요합니다. 파일을 직접 열면(파일:// 프로토콜) 브라우저의 보안 정책 때문에 JSON 파일을 불러올 수 없습니다.

---

## Node.js로 실행하기 (권장)

### 1단계: Node.js 설치 확인

터미널(또는 명령 프롬프트)을 열고 다음 명령어를 입력하세요:

```bash
node --version
```

**결과가 나오면**: Node.js가 설치되어 있습니다. 2단계로 진행하세요.
**오류가 나오면**: Node.js를 먼저 설치해야 합니다.

#### Node.js 설치 방법:
- **Windows/Mac**: https://nodejs.org/ 에서 다운로드
- **Mac (Homebrew 사용)**: `brew install node`
- **Linux**: `sudo apt-get install nodejs` (Ubuntu/Debian) 또는 해당 배포판의 패키지 매니저 사용

### 2단계: 프로젝트 폴더로 이동

터미널에서 프로젝트 폴더로 이동합니다:

```bash
cd /Users/Tocsori/Downloads/timetable
```

또는 Windows의 경우:
```bash
cd C:\Users\사용자명\Downloads\timetable
```

### 3단계: 서버 실행

다음 명령어 중 하나를 실행하세요:

**방법 1: 직접 실행**
```bash
node server.js
```

**방법 2: npm 사용**
```bash
npm start
```

### 4단계: 브라우저에서 접속

서버가 시작되면 다음과 같은 메시지가 표시됩니다:
```
서버가 http://localhost:3000 에서 실행 중입니다.
브라우저에서 http://localhost:3000 를 열어주세요.
```

브라우저를 열고 다음 주소로 접속하세요:
```
http://localhost:3000
```

### 5단계: 서버 종료

서버를 종료하려면 터미널에서 `Ctrl + C` (Mac/Linux) 또는 `Ctrl + C` (Windows)를 누르세요.

---

## Python으로 실행하기

Node.js가 설치되어 있지 않다면 Python을 사용할 수 있습니다.

### 1단계: Python 설치 확인

터미널에서 다음 명령어를 입력하세요:

```bash
python3 --version
```

또는:

```bash
python --version
```

**결과가 나오면**: Python이 설치되어 있습니다. 2단계로 진행하세요.
**오류가 나오면**: Python을 먼저 설치해야 합니다.

#### Python 설치 방법:
- **Mac**: 대부분 기본 설치되어 있음. 없으면 https://www.python.org/ 에서 다운로드
- **Windows**: https://www.python.org/ 에서 다운로드
- **Linux**: `sudo apt-get install python3` (Ubuntu/Debian)

### 2단계: 프로젝트 폴더로 이동

```bash
cd /Users/Tocsori/Downloads/timetable
```

### 3단계: 서버 실행

**Python 3 사용:**
```bash
python3 -m http.server 3000
```

**Python 2 사용 (권장하지 않음):**
```bash
python -m SimpleHTTPServer 3000
```

### 4단계: 브라우저에서 접속

브라우저를 열고 다음 주소로 접속하세요:
```
http://localhost:3000
```

### 5단계: 서버 종료

터미널에서 `Ctrl + C`를 누르세요.

---

## 기타 방법

### PHP 사용

PHP가 설치되어 있다면:

```bash
php -S localhost:3000
```

### Ruby 사용

Ruby가 설치되어 있다면:

```bash
ruby -run -e httpd . -p 3000
```

---

## 문제 해결

### 문제 1: "포트가 이미 사용 중입니다" 오류

**해결 방법:**
- 다른 포트 번호를 사용하세요 (예: 3001, 8080)
- `server.js` 파일에서 `PORT` 값을 변경하거나
- Python의 경우: `python3 -m http.server 3001`

### 문제 2: "파일을 찾을 수 없습니다" 오류

**해결 방법:**
- `annualTableData1.json`과 `annualTableData2.json` 파일이 프로젝트 폴더에 있는지 확인하세요
- 파일 이름이 정확한지 확인하세요 (대소문자 구분)

### 문제 3: 브라우저에서 "연결할 수 없습니다"

**해결 방법:**
- 서버가 실행 중인지 확인하세요
- `localhost:3000` 대신 `127.0.0.1:3000`을 시도해보세요
- 방화벽 설정을 확인하세요

### 문제 4: Node.js 명령어를 찾을 수 없습니다

**해결 방법:**
- Node.js가 제대로 설치되었는지 확인하세요
- 터미널을 재시작하세요
- 시스템 환경 변수(PATH)에 Node.js가 포함되어 있는지 확인하세요

---

## 사용 방법

### 1. 로그인
- 처음 접속하면 로그인 페이지가 나타납니다
- 계정이 없으면 "계정 만들기" 버튼을 클릭하세요

### 2. 연간시수표 로드
- 메인 페이지에서 학기를 선택하고 "로드" 버튼을 클릭하세요
- 1학기 또는 2학기 데이터가 자동으로 로드됩니다

### 3. 주 변경
- 화살표 버튼(< >)을 사용하여 주를 변경할 수 있습니다
- 각 주의 데이터는 자동으로 저장되고 불러와집니다

### 4. 데이터 저장
- 모든 변경사항은 자동으로 브라우저의 localStorage에 저장됩니다
- "파일로 저장" 버튼을 클릭하면 JSON 파일로 다운로드할 수 있습니다

---

## 파일 구조

```
timetable/
├── main.html              # 메인 시간표 페이지
├── admin.html             # 관리자 페이지
├── annual.html            # 연간시수표 페이지
├── login.html             # 로그인 페이지
├── csv.js                 # CSV 파싱 유틸리티
├── server.js              # Node.js 서버 파일
├── package.json           # Node.js 프로젝트 설정
├── accounts.json          # 계정 정보 파일 (서버에 저장, 자동 생성)
├── annualTableData1.json  # 1학기 연간시수표 데이터
└── annualTableData2.json  # 2학기 연간시수표 데이터
```

## 계정 정보 저장 방식

### 서버 측 저장 (현재 구현)
- 계정 정보는 서버의 `accounts.json` 파일에 저장됩니다
- 서버를 재시작해도 계정 정보가 유지됩니다
- 모든 사용자가 동일한 계정 데이터베이스를 공유합니다

### 보안 주의사항
- 현재 비밀번호는 평문으로 저장됩니다 (테스트용)
- 실제 운영 환경에서는 비밀번호 해싱(bcrypt 등)을 사용해야 합니다
- `accounts.json` 파일은 `.gitignore`에 포함되어 있어 Git에 업로드되지 않습니다

---

## 추가 정보

- 서버는 로컬 네트워크에서만 접근 가능합니다
- 다른 컴퓨터에서 접근하려면 서버를 실행한 컴퓨터의 IP 주소를 사용하세요
- 예: `http://192.168.1.100:3000` (IP 주소는 실제 IP로 변경)

---

## 문의 및 지원

문제가 발생하면 다음을 확인하세요:
1. 서버가 실행 중인지 확인
2. 브라우저 콘솔에서 오류 메시지 확인 (F12 키)
3. 파일이 모두 올바른 위치에 있는지 확인
