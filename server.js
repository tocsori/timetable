const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 웹호스팅 환경을 위한 절대 경로 사용
const BASE_DIR = __dirname;
const ACCOUNTS_FILE = path.join(BASE_DIR, 'accounts.json');
const DATA_DIR = path.join(BASE_DIR, 'data');
const DATABASE_URL = process.env.DATABASE_URL;

// PostgreSQL 클라이언트 (DATABASE_URL이 있을 때만 사용)
let dbClient = null;
if (DATABASE_URL) {
    const { Client } = require('pg');
    dbClient = new Client({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('render.com') || DATABASE_URL.includes('amazonaws.com') || DATABASE_URL.includes('heroku') 
            ? { rejectUnauthorized: false } 
            : false
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
                    annual_data_1 TEXT,
                    annual_data_2 TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
        })
        .then(() => {
            // 기존 테이블에 컬럼이 없으면 추가 (마이그레이션)
            return dbClient.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='user_data' AND column_name='annual_data_1') THEN
                        ALTER TABLE user_data ADD COLUMN annual_data_1 TEXT;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='user_data' AND column_name='annual_data_2') THEN
                        ALTER TABLE user_data ADD COLUMN annual_data_2 TEXT;
                    END IF;
                END $$;
            `);
        })
        .then(() => {
            console.log('데이터베이스 테이블이 준비되었습니다.');
        })
        .catch(err => {
            console.error('데이터베이스 연결 오류:', err);
            // 프로덕션 환경에서는 데이터베이스 연결 실패 시 프로세스 종료 고려
            if (NODE_ENV === 'production') {
                console.error('프로덕션 환경에서 데이터베이스 연결 실패. 서버를 종료합니다.');
                process.exit(1);
            }
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

// 연간시수표 데이터 저장 (PostgreSQL 또는 파일 시스템)
async function saveAnnualData(nickname, semester, annualData) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:227',message:'saveAnnualData entry',data:{nickname,semester,hasDbClient:!!dbClient,annualDataType:typeof annualData,annualDataIsArray:Array.isArray(annualData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (dbClient) {
        try {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:230',message:'PostgreSQL path - before stringify',data:{nickname,semester},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            const dataJson = JSON.stringify(annualData);
            const columnName = semester === '1' ? 'annual_data_1' : 'annual_data_2';
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:233',message:'PostgreSQL path - before query',data:{nickname,semester,columnName,dataJsonLength:dataJson.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            // 먼저 user_data 레코드가 존재하는지 확인하고, 없으면 생성
            const checkResult = await dbClient.query('SELECT nickname FROM user_data WHERE nickname = $1', [nickname]);
            if (checkResult.rows.length === 0) {
                // 레코드가 없으면 data 컬럼에 빈 객체를 넣어서 생성
                await dbClient.query(
                    'INSERT INTO user_data (nickname, data) VALUES ($1, $2)',
                    [nickname, '{}']
                );
            }
            await dbClient.query(
                `UPDATE user_data SET ${columnName} = $1, updated_at = CURRENT_TIMESTAMP WHERE nickname = $2`,
                [dataJson, nickname]
            );
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:245',message:'PostgreSQL path - query success',data:{nickname,semester},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            return true;
        } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:247',message:'PostgreSQL path - error',data:{nickname,semester,errorMessage:error.message,errorCode:error.code,errorDetail:error.detail},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            console.error('연간시수표 데이터 저장 오류:', error);
            return false;
        }
    } else {
        try {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:252',message:'File system path - before ensureDataDir',data:{nickname,semester,DATA_DIR},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            ensureDataDir();
            const annualFilePath = path.join(DATA_DIR, `${nickname}_annual_${semester}.json`);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:255',message:'File system path - before writeFileSync',data:{nickname,semester,annualFilePath,dirExists:fs.existsSync(DATA_DIR)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            fs.writeFileSync(annualFilePath, JSON.stringify(annualData, null, 2), 'utf8');
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:257',message:'File system path - writeFileSync success',data:{nickname,semester,annualFilePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            return true;
        } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:259',message:'File system path - error',data:{nickname,semester,errorMessage:error.message,errorCode:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            console.error('연간시수표 파일 저장 오류:', error);
            return false;
        }
    }
}

// 연간시수표 데이터 읽기 (PostgreSQL 또는 파일 시스템)
async function getAnnualData(nickname, semester) {
    if (dbClient) {
        try {
            const columnName = semester === '1' ? 'annual_data_1' : 'annual_data_2';
            const result = await dbClient.query(`SELECT ${columnName} FROM user_data WHERE nickname = $1`, [nickname]);
            if (result.rows.length > 0 && result.rows[0][columnName]) {
                return JSON.parse(result.rows[0][columnName]);
            }
        } catch (error) {
            console.error('연간시수표 데이터 조회 오류:', error);
        }
        return null;
    } else {
        try {
            const annualFilePath = path.join(DATA_DIR, `${nickname}_annual_${semester}.json`);
            if (fs.existsSync(annualFilePath)) {
                const data = fs.readFileSync(annualFilePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('연간시수표 파일 읽기 오류:', error);
        }
        return null;
    }
}

// API 요청 처리
function handleAPI(req, res, pathname, method, parsedUrl) {
    // CORS 헤더 설정 (프로덕션에서는 특정 도메인만 허용하도록 개선 가능)
    const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
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

    // 계정 정보 수정 API
    if (pathname === '/api/accounts/update' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { nickname, schoolName, grade, currentPassword, newPassword } = data;

                if (!nickname || !schoolName || !grade) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '필수 정보가 누락되었습니다.' }));
                    return;
                }

                const accounts = await getAccounts();
                const accountIndex = accounts.findIndex(acc => acc.nickname === nickname);

                if (accountIndex === -1) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ success: false, message: '계정을 찾을 수 없습니다.' }));
                    return;
                }

                // 비밀번호 변경이 요청된 경우
                if (newPassword) {
                    if (!currentPassword) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ success: false, message: '기존 비밀번호를 입력해주세요.' }));
                        return;
                    }
                    
                    // 기존 비밀번호 확인
                    if (accounts[accountIndex].password !== currentPassword) {
                        res.writeHead(401);
                        res.end(JSON.stringify({ success: false, message: '기존 비밀번호가 일치하지 않습니다.' }));
                        return;
                    }
                    
                    accounts[accountIndex].password = newPassword;
                }

                // 계정 정보 업데이트
                accounts[accountIndex].schoolName = schoolName;
                accounts[accountIndex].grade = grade;

                // 저장
                if (dbClient) {
                    // PostgreSQL 업데이트
                    try {
                        await dbClient.query(
                            'UPDATE accounts SET school_name = $1, grade = $2, password = $3 WHERE nickname = $4',
                            [schoolName, grade, accounts[accountIndex].password, nickname]
                        );
                    } catch (error) {
                        console.error('계정 업데이트 오류:', error);
                        res.writeHead(500);
                        res.end(JSON.stringify({ success: false, message: '계정 업데이트 중 오류가 발생했습니다.' }));
                        return;
                    }
                } else {
                    // 파일 시스템 저장
                    if (!(await saveAccounts(accounts))) {
                        res.writeHead(500);
                        res.end(JSON.stringify({ success: false, message: '계정 저장 중 오류가 발생했습니다.' }));
                        return;
                    }
                }

                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: '계정 정보가 수정되었습니다.' }));
            } catch (error) {
                console.error('계정 수정 오류:', error);
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, message: '잘못된 요청입니다.' }));
            }
        });
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
                    // annualTableData1과 annualTableData2는 별도 파일에 저장되므로 제외
                    const filteredData = { ...data };
                    delete filteredData.annualTableData1;
                    delete filteredData.annualTableData2;
                    delete filteredData.annualTableData;  // 혹시 있을 수 있는 일반 annualTableData도 제외
                    
                    console.log(`[일반 데이터 불러오기] 닉네임: ${nickname}, 연간시수표 데이터 제외됨`);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, data: filteredData }));
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

                // 연간시수표 데이터는 별도 파일에 저장되므로 제거
                const filteredStateData = { ...stateData };
                delete filteredStateData.annualTableData1;
                delete filteredStateData.annualTableData2;
                delete filteredStateData.annualTableData;

                console.log(`[일반 데이터 저장] 닉네임: ${nickname}, 연간시수표 데이터 제외됨`);

                if (await saveUserData(nickname, filteredStateData)) {
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
        const semester = parsedUrl.query.semester || '1';
        
        if (!nickname) {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, message: '닉네임이 필요합니다.' }));
            return;
        }

        (async () => {
            try {
                const data = await getAnnualData(nickname, semester);
                if (data) {
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, data: data }));
                } else {
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, data: [] }));
                }
            } catch (error) {
                console.error('연간시수표 데이터 불러오기 오류:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: '연간시수표 데이터 불러오기 중 오류가 발생했습니다.' }));
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
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:625',message:'API POST /api/annual-data - before parse',data:{bodyLength:body.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                const data = JSON.parse(body);
                const { nickname, semester, annualData } = data;
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:628',message:'API POST /api/annual-data - after parse',data:{nickname,semester,hasAnnualData:!!annualData,annualDataType:typeof annualData,annualDataIsArray:Array.isArray(annualData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion

                if (!nickname || !semester || !annualData) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:631',message:'API POST - validation failed',data:{nickname:!!nickname,semester:!!semester,annualData:!!annualData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                    // #endregion
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '닉네임, 학기, 데이터가 필요합니다.' }));
                    return;
                }

                if (semester !== '1' && semester !== '2') {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: '학기는 1 또는 2여야 합니다.' }));
                    return;
                }

                console.log(`[연간시수표 데이터 저장] 닉네임: ${nickname}, 학기: ${semester}`);

                const saveResult = await saveAnnualData(nickname, semester, annualData);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:643',message:'API POST - saveAnnualData result',data:{nickname,semester,saveResult},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                if (saveResult) {
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: '연간시수표 데이터가 저장되었습니다.' }));
                } else {
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, message: '연간시수표 데이터 저장 중 오류가 발생했습니다.' }));
                }
            } catch (error) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/2ae70c89-3e54-4e0a-97f2-b15d8970d568',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:651',message:'API POST - catch error',data:{errorMessage:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                console.error('연간시수표 데이터 저장 오류:', error);
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
    // 경로 보안: 상위 디렉토리 접근 방지
    let filePath = pathname;
    if (filePath === '/' || filePath === '') {
        filePath = '/main.html';
    }
    
    // 상대 경로 및 상위 디렉토리 접근 방지
    if (filePath.includes('..') || filePath.includes('~')) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 - 접근이 거부되었습니다</h1>', 'utf-8');
        return;
    }
    
    // 절대 경로로 변환
    const fullPath = path.join(BASE_DIR, filePath);
    
    // BASE_DIR 밖으로 나가는 경로 방지
    if (!fullPath.startsWith(BASE_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 - 접근이 거부되었습니다</h1>', 'utf-8');
        return;
    }

    // 파일 확장자 확인
    const extname = String(path.extname(fullPath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // 파일 읽기
    fs.readFile(fullPath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - 파일을 찾을 수 없습니다</h1>', 'utf-8');
            } else {
                console.error('파일 읽기 오류:', error);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`<h1>500 - 서버 오류</h1><p>${NODE_ENV === 'development' ? error.message : '서버 내부 오류가 발생했습니다.'}</p>`, 'utf-8');
            }
        } else {
            const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': allowedOrigin
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    if (!dbClient) {
        ensureDataDir();
    }
    
    const host = process.env.HOST || '0.0.0.0';
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`환경: ${NODE_ENV}`);
    
    if (NODE_ENV === 'development') {
        console.log(`로컬 접속: http://localhost:${PORT}`);
    }
    
    if (dbClient) {
        console.log(`데이터는 PostgreSQL 데이터베이스에 저장됩니다.`);
    } else {
        console.log(`계정 정보는 파일 시스템에 저장됩니다.`);
        console.log(`계정 파일: ${ACCOUNTS_FILE}`);
        console.log(`데이터 디렉토리: ${DATA_DIR}`);
    }
    
    // 프로세스 종료 시 정리 작업
    process.on('SIGTERM', () => {
        console.log('SIGTERM 신호를 받았습니다. 서버를 종료합니다...');
        if (dbClient) {
            dbClient.end(() => {
                console.log('데이터베이스 연결이 종료되었습니다.');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
    
    process.on('SIGINT', () => {
        console.log('\nSIGINT 신호를 받았습니다. 서버를 종료합니다...');
        if (dbClient) {
            dbClient.end(() => {
                console.log('데이터베이스 연결이 종료되었습니다.');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
});
