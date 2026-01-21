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
