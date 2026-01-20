const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const ACCOUNTS_FILE = './accounts.json';
const DATA_DIR = './data';

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// 계정 파일 읽기
function getAccounts() {
    try {
        if (fs.existsSync(ACCOUNTS_FILE)) {
            const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('계정 파일 읽기 오류:', error);
    }
    return [];
}

// 계정 파일 저장
function saveAccounts(accounts) {
    try {
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('계정 파일 저장 오류:', error);
        return false;
    }
}

// 데이터 디렉토리 생성
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

// 사용자 데이터 파일 경로
function getUserDataFile(nickname) {
    ensureDataDir();
    return path.join(DATA_DIR, `${nickname}_data.json`);
}

// 사용자 데이터 읽기
function getUserData(nickname) {
    try {
        const filePath = getUserDataFile(nickname);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('데이터 파일 읽기 오류:', error);
    }
    return null;
}

// 사용자 데이터 저장
function saveUserData(nickname, data) {
    try {
        const filePath = getUserDataFile(nickname);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('데이터 파일 저장 오류:', error);
        return false;
    }
}

// API 요청 처리
function handleAPI(req, res, pathname, method, parsedUrl) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // 디버깅 로그
    console.log(`[API] ${method} ${pathname}`, parsedUrl.query);

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 계정 생성 API
    if (pathname === '/api/accounts/create' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { schoolName, grade, nickname, password } = data;

                if (!schoolName || !grade || !nickname || !password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '모든 항목을 입력해주세요.' }));
                    return;
                }

                const accounts = getAccounts();
                
                // 중복 체크
                if (accounts.find(acc => acc.nickname === nickname)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '이미 존재하는 닉네임입니다.' }));
                    return;
                }

                // 새 계정 추가
                const newAccount = {
                    schoolName: schoolName,
                    grade: parseInt(grade),
                    nickname: nickname,
                    password: password, // 실제 운영 환경에서는 해싱 필요
                    createdAt: new Date().toISOString()
                };

                accounts.push(newAccount);
                
                if (saveAccounts(accounts)) {
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: '계정이 생성되었습니다.' }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: '계정 저장 중 오류가 발생했습니다.' }));
                }
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: '잘못된 요청입니다.' }));
            }
        });
        return;
    }

    // 로그인 API
    if (pathname === '/api/accounts/login' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { nickname, password } = data;

                if (!nickname || !password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '닉네임과 비밀번호를 입력해주세요.' }));
                    return;
                }

                const accounts = getAccounts();
                const account = accounts.find(acc => acc.nickname === nickname && acc.password === password);

                if (account) {
                    // 비밀번호는 제외하고 반환
                    const loginInfo = {
                        schoolName: account.schoolName,
                        grade: account.grade,
                        nickname: account.nickname,
                        loginTime: new Date().toISOString()
                    };
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, account: loginInfo }));
                } else {
                    res.writeHead(401);
                    res.end(JSON.stringify({ success: false, message: '일치하는 내용이 없습니다. 계정을 새로 만들어주세요.' }));
                }
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: '잘못된 요청입니다.' }));
            }
        });
        return;
    }

    // 계정 목록 조회 API (관리용)
    if (pathname === '/api/accounts' && method === 'GET') {
        const accounts = getAccounts();
        // 비밀번호 제외하고 반환
        const safeAccounts = accounts.map(acc => ({
            schoolName: acc.schoolName,
            grade: acc.grade,
            nickname: acc.nickname,
            createdAt: acc.createdAt
        }));
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, accounts: safeAccounts }));
        return;
    }

    // 시간표 데이터 불러오기 API
    if (pathname === '/api/data' && method === 'GET') {
        const nickname = parsedUrl.query.nickname;
        if (!nickname) {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, message: '닉네임이 필요합니다.' }));
            return;
        }

        const data = getUserData(nickname);
        if (data) {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, data: data }));
        } else {
            // 데이터가 없으면 초기 데이터 반환
            res.writeHead(200);
            res.end(JSON.stringify({ 
                success: true, 
                data: {
                    classCount: 3,
                    periodCount: 7,
                    subjectSheets: [],
                    classData: {},
                    preferences: {},
                    currentWeek: new Date().toISOString(),
                    annualHours: {},
                    weeklyData: {}
                }
            }));
        }
        return;
    }

    // 시간표 데이터 저장 API
    if (pathname === '/api/data' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { nickname, state: stateData } = data;

                if (!nickname || !stateData) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '닉네임과 데이터가 필요합니다.' }));
                    return;
                }

                if (saveUserData(nickname, stateData)) {
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: '데이터가 저장되었습니다.' }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: '데이터 저장 중 오류가 발생했습니다.' }));
                }
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: '잘못된 요청입니다.' }));
            }
        });
        return;
    }

    // 연간시수표 데이터 불러오기 API
    if (pathname === '/api/annual-data' && method === 'GET') {
        const nickname = parsedUrl.query.nickname;
        const semester = parsedUrl.query.semester;
        
        if (!nickname || !semester) {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, message: '닉네임과 학기가 필요합니다.' }));
            return;
        }

        const userData = getUserData(nickname);
        if (userData) {
            const key = semester === '1' ? 'annualTableData1' : 'annualTableData2';
            const annualData = userData[key] || [];
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, data: annualData }));
        } else {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, data: [] }));
        }
        return;
    }

    // 연간시수표 데이터 저장 API
    if (pathname === '/api/annual-data' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { nickname, semester, annualData } = data;

                if (!nickname || !semester || !annualData) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '닉네임, 학기, 데이터가 필요합니다.' }));
                    return;
                }

                // 사용자 데이터 불러오기
                let userData = getUserData(nickname);
                if (!userData) {
                    userData = {
                        classCount: 3,
                        periodCount: 7,
                        subjectSheets: [],
                        classData: {},
                        preferences: {},
                        currentWeek: new Date().toISOString(),
                        annualHours: {},
                        weeklyData: {}
                    };
                }

                // 연간시수표 데이터 저장
                const key = semester === '1' ? 'annualTableData1' : 'annualTableData2';
                userData[key] = annualData;

                if (saveUserData(nickname, userData)) {
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: '연간시수표가 저장되었습니다.' }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: '연간시수표 저장 중 오류가 발생했습니다.' }));
                }
            } catch (error) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: '잘못된 요청입니다.' }));
            }
        });
        return;
    }

    // 알 수 없는 API 경로
    console.log(`[API] 알 수 없는 경로: ${method} ${pathname}`);
    res.writeHead(404);
    res.end(JSON.stringify({ success: false, message: `API를 찾을 수 없습니다: ${method} ${pathname}` }));
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // API 요청 처리
    if (pathname.startsWith('/api/')) {
        handleAPI(req, res, pathname, method, parsedUrl);
        return;
    }

    // 정적 파일 서빙
    let filePath = '.' + pathname;
    if (filePath === './') {
        filePath = './main1.html';
    }

    // 파일 확장자 확인
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // 파일 읽기
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - 파일을 찾을 수 없습니다</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`서버 오류: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    ensureDataDir();
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`브라우저에서 http://localhost:${PORT} 를 열어주세요.`);
    console.log(`계정 정보는 ${ACCOUNTS_FILE} 파일에 저장됩니다.`);
    console.log(`사용자 데이터는 ${DATA_DIR} 디렉토리에 저장됩니다.`);
});
