// server.js
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt       = require('bcrypt');
const { Pool }     = require('pg');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:3000',   // React-приложение
  credentials: true,                 // разрешаем cookie между портами
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
  httpOnly: true,        // JS на фронте не может прочитать/подделать
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
};

// Куда redirect в зависимости от статуса
const redirectFor = (status) =>
  String(status || '').toLowerCase() === 'administrator' ? '/applications' : '/dashboard';

// Авто-создание таблицы, если её нет (id увеличивается сам благодаря SERIAL)
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id      SERIAL PRIMARY KEY,
    name    TEXT,
    surname TEXT,
    email   TEXT,
    password TEXT,
    status  TEXT DEFAULT 'user'
  );
`).catch((e) => console.error('Ошибка создания таблицы:', e.message));

// Поиск пользователя по "сырой" почте.
// Т.к. почта хранится как bcrypt-хэш, сравниваем через bcrypt.compare
async function findUserByRawEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users');
  for (const row of rows) {
    if (await bcrypt.compare(email, row.email)) return row;
  }
  return null;
}

// ================= РЕГИСТРАЦИЯ =================
app.post('/api/register', async (req, res) => {
  try {
    const { name, surname, email, password } = req.body || {};
    if (!name || !surname || !email || !password) {
      return res.status(400).json({ success: false, message: 'Заполните все поля' });
    }

    // Проверка: не зарегистрирована ли уже эта почта
    const existing = await findUserByRawEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Эта почта уже зарегистрирована' });
    }

    // Шифруем ВСЁ: имя, фамилию, почту и пароль
    const [nameHash, surnameHash, emailHash, passwordHash] = await Promise.all([
      bcrypt.hash(name,     SALT_ROUNDS),
      bcrypt.hash(surname,  SALT_ROUNDS),
      bcrypt.hash(email,    SALT_ROUNDS),
      bcrypt.hash(password, SALT_ROUNDS),
    ]);

    // Сохраняем в БД (status по умолчанию 'user')
    await pool.query(
      `INSERT INTO users (name, surname, email, password, status)
       VALUES ($1, $2, $3, $4, 'user')`,
      [nameHash, surnameHash, emailHash, passwordHash]
    );

    // Сохраняем хэш почты в cookie
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
    if (!user) {
      return res.status(401).json({ success: false, message: 'Неверная почта или пароль' });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Неверная почта или пароль' });
    }

    // user.email в БД — это и есть хэш, кладём его в cookie
    res.cookie(COOKIE_NAME, user.email, COOKIE_OPTIONS);

    // Redirect в зависимости от статуса
    return res.json({ success: true, status: user.status, redirect: redirectFor(user.status) });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// ================= ПРОВЕРКА COOKIE (повторный заход) =================
app.get('/api/session', async (req, res) => {
  try {
    const hash = req.cookies[COOKIE_NAME];
    if (!hash) return res.json({ authenticated: false });

    // Ищем пользователя, у которого хэш почты совпадает с cookie
    const { rows } = await pool.query('SELECT status FROM users WHERE email = $1', [hash]);
    if (!rows.length) {
      res.clearCookie(COOKIE_NAME); // cookie недействительна
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

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Сервер запущен: http://localhost:${PORT}`));