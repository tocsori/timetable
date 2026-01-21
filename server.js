const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const ACCOUNTS_FILE = './accounts.json';
const DATA_DIR = './data';
const DATABASE_URL = process.env.DATABASE_URL;

// PostgreSQL 클라이언트 (DATABASE_URL이 있을 때만 사용)
let dbClient = null;
if (DATABASE_URL) {
    const { Client } = require('pg');
    dbClient = new Client({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
    });
    
    // 데이터베이스 연결 및 테이블 생성
    dbClient.connect()
        .then(() => {
            console.log('PostgreSQL 데이터베이스에 연결되었습니다.');
            return dbClient.query(`
                CREATE TABLE IF NOT EXISTS accounts (
                    id SERIAL PRIMARY KEY,
                    school_name VARCHAR(255) NOT NULL,
                    grade INTEGER NOT NULL,
                    nickname VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
        })
        .then(() => {
            return dbClient.query(`
                CREATE TABLE IF NOT EXISTS user_data (
                    nickname VARCHAR(255) PRIMARY KEY,
                    data TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
        })
        .then(() => {
            console.log('데이터베이스 테이블이 준비되었습니다.');
        })
        .catch(err => {
            console.error('데이터베이스 연결 오류:', err);
        });
}

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

// 계정 읽기 (PostgreSQL 또는 파일 시스템)
async function getAccounts() {
    if (dbClient) {
        try {
            const result = await dbClient.query('SELECT * FROM accounts ORDER BY created_at');
            return result.rows.map(row => ({
                schoolName: row.school_name,
                grade: row.grade,
                nickname: row.nickname,
                password: row.password,
                createdAt: row.created_at
            }));
        } catch (error) {
            console.error('계정 조회 오류:', error);
            return [];
        }
    } else {
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
}

// 계정 저장 (PostgreSQL 또는 파일 시스템)
async function saveAccounts(accounts) {
    if (dbClient) {
        // PostgreSQL은 개별 계정을 저장하므로, 전체 배열을 저장하는 대신
        // 개별 계정 저장 로직은 별도 함수로 처리
        return true; // 개별 계정 저장은 insertAccount 함수에서 처리
    } else {
        try {
            fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('계정 파일 저장 오류:', error);
            return false;
        }
    }
}

// 개별 계정 저장 (PostgreSQL용)
async function insertAccount(account) {
    if (dbClient) {
        try {
            await dbClient.query(
                'INSERT INTO accounts (school_name, grade, nickname, password) VALUES ($1, $2, $3, $4)',
                [account.schoolName, account.grade, account.nickname, account.password]
            );
            return true;
        } catch (error) {
            console.error('계정 저장 오류:', error);
            return false;
        }
    } else {
        const accounts = await getAccounts();
        accounts.push(account);
        return await saveAccounts(accounts);
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

// 사용자 데이터 읽기 (PostgreSQL 또는 파일 시스템)
async function getUserData(nickname) {
    if (dbClient) {
        try {
            const result = await dbClient.query('SELECT data FROM user_data WHERE nickname = $1', [nickname]);
            if (result.rows.length > 0) {
                return JSON.parse(result.rows[0].data);
            }
        } catch (error) {
            console.error('사용자 데이터 조회 오류:', error);
        }
        return null;
    } else {
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
}

// 사용자 데이터 저장 (PostgreSQL 또는 파일 시스템)
async function saveUserData(nickname, data) {
    if (dbClient) {
        try {
            const dataJson = JSON.stringify(data);
            await dbClient.query(
                'INSERT INTO user_data (nickname, data) VALUES ($1, $2) ON CONFLICT (nickname) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP',
                [nickname, dataJson]
            );
            return true;
        } catch (error) {
            console.error('사용자 데이터 저장 오류:', error);
            return false;
        }
    } else {
        try {
            const filePath = getUserDataFile(nickname);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('데이터 파일 저장 오류:', error);
            return false;
        }
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
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { schoolName, grade, nickname, password } = data;

                if (!schoolName || !grade || !nickname || !password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '모든 항목을 입력해주세요.' }));
                    return;
                }

                const accounts = await getAccounts();
                
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

                if (await insertAccount(newAccount)) {
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: '계정이 생성되었습니다.' }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: '계정 저장 중 오류가 발생했습니다.' }));
                }
            } catch (error) {
                console.error('계정 생성 오류:', error);
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
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { nickname, password } = data;

                if (!nickname || !password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '닉네임과 비밀번호를 입력해주세요.' }));
                    return;
                }

                const accounts = await getAccounts();
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
                console.error('로그인 오류:', error);
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: '잘못된 요청입니다.' }));
            }
        });
        return;
    }

    // 계정 목록 조회 API (관리용)
    if (pathname === '/api/accounts' && method === 'GET') {
        (async () => {
            try {
                const accounts = await getAccounts();
                // 비밀번호 제외하고 반환
                const safeAccounts = accounts.map(acc => ({
                    schoolName: acc.schoolName,
                    grade: acc.grade,
                    nickname: acc.nickname,
                    createdAt: acc.createdAt
                }));
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, accounts: safeAccounts }));
            } catch (error) {
                console.error('계정 목록 조회 오류:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: '계정 목록 조회 중 오류가 발생했습니다.' }));
            }
        })();
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

        (async () => {
            try {
                const data = await getUserData(nickname);
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
            } catch (error) {
                console.error('데이터 불러오기 오류:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: '데이터 불러오기 중 오류가 발생했습니다.' }));
            }
        })();
        return;
    }

    // 시간표 데이터 저장 API
    if (pathname === '/api/data' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { nickname, state: stateData } = data;

                if (!nickname || !stateData) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '닉네임과 데이터가 필요합니다.' }));
                    return;
                }

                if (await saveUserData(nickname, stateData)) {
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: '데이터가 저장되었습니다.' }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: '데이터 저장 중 오류가 발생했습니다.' }));
                }
            } catch (error) {
                console.error('데이터 저장 오류:', error);
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

        // 학기 값 검증 (1 또는 2만 허용)
        if (semester !== '1' && semester !== '2') {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, message: '학기는 1 또는 2만 가능합니다.' }));
            return;
        }

        (async () => {
            try {
                const userData = await getUserData(nickname);
                if (userData) {
                    const key = semester === '1' ? 'annualTableData1' : 'annualTableData2';
                    const annualData = userData[key] || [];
                    console.log(`[연간시수표 불러오기] 닉네임: ${nickname}, 학기: ${semester}, 데이터 행 수: ${annualData.length}`);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, data: annualData }));
                } else {
                    console.log(`[연간시수표 불러오기] 닉네임: ${nickname}, 학기: ${semester}, 사용자 데이터 없음`);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, data: [] }));
                }
            } catch (error) {
                console.error('연간시수표 불러오기 오류:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: '연간시수표 불러오기 중 오류가 발생했습니다.' }));
            }
        })();
        return;
    }

    // 연간시수표 데이터 저장 API
    if (pathname === '/api/annual-data' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { nickname, semester, annualData } = data;

                if (!nickname || !semester || annualData === undefined) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '닉네임, 학기, 데이터가 필요합니다.' }));
                    return;
                }

                // 학기 값 검증 (1 또는 2만 허용)
                if (semester !== '1' && semester !== '2') {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '학기는 1 또는 2만 가능합니다.' }));
                    return;
                }

                // annualData가 배열인지 확인
                if (!Array.isArray(annualData)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '데이터는 배열 형식이어야 합니다.' }));
                    return;
                }

                // 사용자 데이터 불러오기
                let userData = await getUserData(nickname);
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

                // 연간시수표 데이터 저장 (다른 학기 데이터는 유지)
                const key = semester === '1' ? 'annualTableData1' : 'annualTableData2';
                const otherKey = semester === '1' ? 'annualTableData2' : 'annualTableData1';
                
                // 다른 학기 데이터 보존 (이미 있으면 유지)
                const otherSemesterData = userData[otherKey] || [];
                
                userData[key] = annualData;
                // 다른 학기 데이터가 없었다면 빈 배열로 설정 (덮어쓰지 않음)
                if (!userData[otherKey] && otherSemesterData.length === 0) {
                    userData[otherKey] = [];
                }

                console.log(`[연간시수표 저장] 닉네임: ${nickname}, 학기: ${semester}, 데이터 행 수: ${annualData.length}`);

                if (await saveUserData(nickname, userData)) {
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: `${semester}학기 연간시수표가 저장되었습니다.` }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: '연간시수표 저장 중 오류가 발생했습니다.' }));
                }
            } catch (error) {
                console.error('연간시수표 저장 오류:', error);
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: '잘못된 요청입니다: ' + error.message }));
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
    if (!dbClient) {
        ensureDataDir();
    }
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`브라우저에서 http://localhost:${PORT} 를 열어주세요.`);
    if (dbClient) {
        console.log(`데이터는 PostgreSQL 데이터베이스에 저장됩니다.`);
    } else {
        console.log(`계정 정보는 ${ACCOUNTS_FILE} 파일에 저장됩니다.`);
        console.log(`사용자 데이터는 ${DATA_DIR} 디렉토리에 저장됩니다.`);
    }
});
