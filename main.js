// server.js
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt       = require('bcrypt');
const { Pool }     = require('pg');
const multer       = require('multer');
const fs           = require('fs');
const path         = require('path');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));

// ===== Подключение к PostgreSQL =====
const pool = new Pool({
    host: '127.0.0.1',
    port: 6432,
    database: 'KomfortDatabase',
    user: 'postgres',
    password: 'Dima0807',
});

const SALT_ROUNDS = 10;
const COOKIE_NAME = 'user_email_hash';
const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Директория для хранения данных заявок
const MINIDATA_DIR = path.join(__dirname, 'minidata');
if (!fs.existsSync(MINIDATA_DIR)) {
    fs.mkdirSync(MINIDATA_DIR);
}

// Настройка Multer (хранение в памяти для последующей записи в нужную папку)
const upload = multer({ storage: multer.memoryStorage() });

const redirectFor = (status) =>
    String(status || '').toLowerCase() === 'administrator' ? '/applications' : '/dashboard';

// Авто-создание таблиц
pool.query(`
    CREATE TABLE IF NOT EXISTS users ( 
        id SERIAL PRIMARY KEY, 
        name TEXT, 
        surname TEXT, 
        email TEXT, 
        password TEXT, 
        status TEXT DEFAULT 'user' 
    );

    -- Создаем таблицу requests согласно новому скриншоту
    CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        userid INTEGER,
        entrance INTEGER,
        floor INTEGER,
        category TEXT DEFAULT 'Уборка',
        status TEXT DEFAULT 'Оформлено'
    );
`).catch((e) => console.error('Ошибка создания таблиц:', e.message));

// Поиск пользователя по "сырой" почте
async function findUserByRawEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users');
    for (const row of rows) {
        if (await bcrypt.compare(email, row.email)) return row;
    }
    return null;
}

// Поиск пользователя по хэшу (из cookie)
async function findUserByHash(hash) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [hash]);
    return rows[0] || null;
}

// ================= РЕГИСТРАЦИЯ =================
app.post('/api/register', async (req, res) => {
    try {
        const { name, surname, email, password } = req.body || {};
        if (!name || !surname || !email || !password) {
            return res.status(400).json({ success: false, message: 'Заполните все поля' });
        }
        const existing = await findUserByRawEmail(email);
        if (existing) {
            return res.status(409).json({ success: false, message: 'Эта почта уже зарегистрирована' });
        }
        const [nameHash, surnameHash, emailHash, passwordHash] = await Promise.all([
            bcrypt.hash(name, SALT_ROUNDS),
            bcrypt.hash(surname, SALT_ROUNDS),
            bcrypt.hash(email, SALT_ROUNDS),
            bcrypt.hash(password, SALT_ROUNDS),
        ]);
        await pool.query(
            `INSERT INTO users (name, surname, email, password, status) VALUES ($1, $2, $3, $4, 'user')`,
            [nameHash, surnameHash, emailHash, passwordHash]
        );
        res.cookie(COOKIE_NAME, emailHash, COOKIE_OPTIONS);
        return res.json({ success: true, status: 'user', redirect: '/dashboard' });
    } catch (err) {
        console.error('REGISTER ERROR:', err);
        return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// ================= ВХОД =================
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Введите почту и пароль' });
        }
        const user = await findUserByRawEmail(email);
        if (!user) return res.status(401).json({ success: false, message: 'Неверная почта или пароль' });
        
        const passwordOk = await bcrypt.compare(password, user.password);
        if (!passwordOk) return res.status(401).json({ success: false, message: 'Неверная почта или пароль' });

        res.cookie(COOKIE_NAME, user.email, COOKIE_OPTIONS);
        return res.json({ success: true, status: user.status, redirect: redirectFor(user.status) });
    } catch (err) {
        console.error('LOGIN ERROR:', err);
        return res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// ================= ПРОВЕРКА СЕССИИ =================
app.get('/api/session', async (req, res) => {
    try {
        const hash = req.cookies[COOKIE_NAME];
        if (!hash) return res.json({ authenticated: false });
        const { rows } = await pool.query('SELECT status FROM users WHERE email = $1', [hash]);
        if (!rows.length) {
            res.clearCookie(COOKIE_NAME);
            return res.json({ authenticated: false });
        }
        return res.json({
            authenticated: true,
            status: rows[0].status,
            redirect: redirectFor(rows[0].status),
        });
    } catch (err) {
        console.error('SESSION ERROR:', err);
        return res.json({ authenticated: false });
    }
});

// ================= ВЫХОД =================
app.post('/api/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
});

// ================= СОЗДАНИЕ ЗАЯВКИ =================
app.post('/api/requests', upload.array('media', 5), async (req, res) => {
    try {
        // 1. Проверка авторизации
        const hash = req.cookies[COOKIE_NAME];
        if (!hash) return res.status(401).json({ success: false, message: 'Не авторизован' });
        
        const user = await findUserByHash(hash);
        if (!user) return res.status(401).json({ success: false, message: 'Пользователь не найден' });

        // 2. Получение данных
        // entrance и floor приходят как строки из формы, преобразуем в число или оставляем как есть (PG сам скастит если тип int)
        const { entrance, floor, category, description } = req.body;
        const files = req.files || [];

        // 3. Сохранение в БД (только поля из нового скриншота)
        const queryText = `
            INSERT INTO requests (userid, entrance, floor, category, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;
        // Значения по умолчанию: category='Уборка', status='Оформлено'
        const values = [
            user.id, 
            entrance, 
            floor, 
            category || 'Уборка', 
            'Оформлено'
        ];
        
        const { rows } = await pool.query(queryText, values);
        const requestId = rows[0].id;

        // 4. Работа с файловой системой (./minidata/{id})
        const requestDir = path.join(MINIDATA_DIR, String(requestId));
        fs.mkdirSync(requestDir, { recursive: true });

        // Сохраняем описание в текстовый файл
        fs.writeFileSync(path.join(requestDir, 'description.txt'), description || 'Нет описания');

        // Сохраняем медиафайлы
        files.forEach((file, index) => {
            // Определяем расширение
            const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video') ? '.mp4' : '.jpg');
            const filename = `media_${index}${ext}`;
            fs.writeFileSync(path.join(requestDir, filename), file.buffer);
        });

        // 5. Ответ клиенту
        return res.json({ 
            success: true, 
            message: 'Заявка успешно создана', 
            requestId: requestId 
        });

    } catch (err) {
        console.error('REQUEST CREATE ERROR:', err);
        return res.status(500).json({ success: false, message: 'Ошибка при создании заявки' });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Сервер запущен: http://localhost:${PORT}`));