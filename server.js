
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
// nodemailer заменён на EmailJS REST API (SMTP заблокирован из Docker Timeweb)
import { processExhibitImages, deleteExhibitImages, getImagesDir, processImage, isBase64DataUri, processSingleImage } from './imageProcessor.js';
import { setupAdminAPI } from './adminAPI.js';
import webpush from 'web-push';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import {
    verificationTemplate,
    welcomeTemplate,
    resetPasswordTemplate,
    changePasswordTemplate,
    passwordChangedAlertTemplate,
    changeEmailTemplate,
} from './emailTemplates.js';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 🔐 ADMIN & CRITICAL CONFIG
// ==========================================
const ADMIN_USER = process.env.ADMIN_USERNAME || 'Truester';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kennyornope@gmail.com';
const ADMIN_EMAILS = [ADMIN_EMAIL];
const ADMIN_USERNAMES = [ADMIN_USER];
const APP_URL = process.env.APP_URL || 'https://neoarchive.ru';

// Push Notification Config
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
    try {
        webpush.setVapidDetails(
            `mailto:${ADMIN_EMAIL}`,
            vapidPublicKey,
            vapidPrivateKey
        );
        console.log('✅ [Push] VAPID Keys Configured');
    } catch (e) {
        console.error('⚠️ [Push] Error configuring VAPID:', e.message);
    }
} else {
    console.warn('⚠️ [Push] VAPID Keys Missing. Push notifications disabled.');
}

const shouldBeAdmin = (username, email) => {
    return ADMIN_USERNAMES.includes(username) || (email && ADMIN_EMAILS.includes(email));
};

// ==========================================
// 🚀 SERVER-SIDE CACHING
// ==========================================
class ServerCache {
    constructor(ttlSeconds = 60) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000;
    }
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }
    set(key, value, customTtl = null) {
        const t = customTtl ? customTtl * 1000 : this.ttl;
        this.cache.set(key, { value, expiry: Date.now() + t });
    }
    del(key) { this.cache.delete(key); }
    flushPattern(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) this.cache.delete(key);
        }
    }
}
const cache = new ServerCache(60);

// ==========================================
// ⚙️ СЕРВЕР
// ==========================================
const PORT = 3002;
const app = express();
app.disable('x-powered-by');
// Timeweb использует nginx reverse proxy → доверяем первому proxy для корректной работы rate-limiter
app.set('trust proxy', 1);
app.use(compression());
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://neoarchive.ru').split(',').map(o => o.trim());
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// --- SECURITY HEADERS ---
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https:; frame-src https://oauth.telegram.org"
    );
    next();
});

// --- RATE LIMITING ---
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 10,
    message: { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 5,
    message: { error: 'Слишком много регистраций с этого IP. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 20,
    message: { error: 'Слишком много сообщений. Подождите минуту.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const guestbookLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 минут
    max: 10,
    message: { error: 'Слишком много записей в гостевой книге. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const contentCreateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 минут
    max: 15,
    message: { error: 'Слишком много операций создания. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const notificationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 60,
    message: { error: 'Слишком много запросов.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- ANTI-SPAM CONTENT FILTER ---
const spamFilter = (req, res, next) => {
    const text = req.body?.text || req.body?.description || req.body?.notes || '';
    if (typeof text !== 'string' || !text.trim()) return next();

    const trimmed = text.trim();

    if (trimmed.length > 2000)
        return res.status(400).json({ error: 'Сообщение слишком длинное (максимум 2000 символов).' });

    // Повторяющиеся символы: "аааааааааа", "!!!!!!!!!"
    if (/(.)\1{9,}/u.test(trimmed))
        return res.status(400).json({ error: 'Обнаружен спам: слишком много повторяющихся символов.' });

    // Всё заглавными (кириллица + латиница через Unicode \p{Lu})
    if (trimmed.length > 15) {
        const letters = trimmed.match(/[\p{L}]/gu) || [];
        const upper = trimmed.match(/[\p{Lu}]/gu) || [];
        if (letters.length > 10 && upper.length / letters.length > 0.85)
            return res.status(400).json({ error: 'Не используйте CAPS LOCK.' });
    }

    // Слишком много ссылок
    if ((trimmed.match(/https?:\/\//gi) || []).length > 3)
        return res.status(400).json({ error: 'Слишком много ссылок в сообщении.' });

    // Защита от дублей (60 секунд, по IP + содержимому)
    const dupKey = `spam_dup:${req.ip}:${trimmed.toLowerCase().replace(/\s+/g, ' ')}`;
    if (cache.get(dupKey))
        return res.status(429).json({ error: 'Такое сообщение уже было отправлено недавно.' });
    cache.set(dupKey, true, 60);

    next();
};

// ==========================================
// 📧 EMAIL (EmailJS REST API)
// SMTP заблокирован из Docker Timeweb — используем EmailJS как прокси.
// EmailJS подключается к smtp.timeweb.ru со своих серверов,
// а мы вызываем его REST API по HTTPS (порт 443, всегда открыт).
// ==========================================
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATES = {
    welcome: process.env.EMAILJS_TEMPLATE_WELCOME,   // регистрация, приветствие, смена email
    reset:   process.env.EMAILJS_TEMPLATE_RESET,      // сброс/смена пароля, уведомления о пароле
};
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

if (EMAILJS_SERVICE_ID && EMAILJS_PUBLIC_KEY) {
    console.log(`[EMAIL] ✅ EmailJS настроен (service: ${EMAILJS_SERVICE_ID}, templates: welcome=${EMAILJS_TEMPLATES.welcome}, reset=${EMAILJS_TEMPLATES.reset})`);
} else {
    console.warn('[EMAIL] ⚠️  EmailJS не настроен — письма не будут отправляться. Добавьте EMAILJS_* переменные.');
}

// type: 'welcome' | 'reset' — выбирает шаблон EmailJS
const sendMailWithRetry = async (mailOptions, retries = 2) => {
    const templateId = EMAILJS_TEMPLATES[mailOptions.type] || EMAILJS_TEMPLATES.welcome;

    if (!EMAILJS_SERVICE_ID || !templateId || !EMAILJS_PUBLIC_KEY) {
        console.warn('[EMAIL] Пропуск отправки — EmailJS не настроен:', mailOptions.subject);
        return false;
    }

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: EMAILJS_SERVICE_ID,
                    template_id: templateId,
                    user_id: EMAILJS_PUBLIC_KEY,
                    accessToken: EMAILJS_PRIVATE_KEY,
                    template_params: {
                        to_email: mailOptions.to,
                        subject: mailOptions.subject,
                        html_content: mailOptions.html,
                        ...(mailOptions.params || {}),
                    }
                }),
                signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`EmailJS ${response.status}: ${text}`);
            }

            console.log(`[EMAIL] ✉️  Отправлено → ${mailOptions.to} [${mailOptions.type}] (${mailOptions.subject})`);
            return true;
        } catch (err) {
            console.error(`[EMAIL] Попытка ${i + 1}/${retries} — ошибка:`, err.message);
            if (i === retries - 1) throw err;
            await new Promise(res => setTimeout(res, 2000));
        }
    }
};

// ==========================================
// 💽 DATABASE
// ==========================================
const dbUser = process.env.DB_USER;
const dbHost = process.env.DB_HOST;
const dbName = process.env.DB_NAME;
const dbPass = process.env.DB_PASSWORD;

const pool = new Pool({
    user: dbUser, 
    password: dbPass, 
    host: dbHost, 
    port: 5432, 
    database: dbName,
    ssl: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? { rejectUnauthorized: false } : { rejectUnauthorized: true },
    max: 20,
    keepAlive: true
});

// КРИТИЧЕСКИ ВАЖНО: Обработка ошибок пула для предотвращения падения Node.js
pool.on('error', (err, client) => {
    console.error('❌ [DB] Unexpected error on idle client:', err.message);
    // Не завершаем процесс, пул сам пересоздаст соединение при необходимости
});

const mapRow = (row) => {
    if (!row) return null;
    const { data, ...rest } = row;
    return { ...rest, ...(data || {}) };
};

const query = async (text, params = []) => {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error(`❌ [DB Error] ${err.message}`, text);
        throw err;
    }
};

// ==========================================
// 🛡️ INTEGRITY & MIGRATIONS
// ==========================================
const ensureSchema = async () => {
    const commonSchema = `(
        id TEXT PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMP DEFAULT NOW()
    )`;

    // Tables logic
    const tables = ['exhibits', 'collections', 'notifications', 'messages', 'guestbook', 'wishlist', 'trade_requests', 'battles'];
    
    // Ensure USERS table (special case: might have username instead of id)
    await query(`CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        data JSONB,
        updated_at TIMESTAMP DEFAULT NOW()
    )`);

    // Ensure other tables
    for (const table of tables) {
        await query(`CREATE TABLE IF NOT EXISTS "${table}" ${commonSchema}`);
        
        // Add 'id' column to tables if missing (except users initially)
        try {
            await query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS id TEXT`);
        } catch(e) {}
    }

    // Attempt to add 'id' to users for consistency (alias for username)
    try {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS id TEXT`);
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`);
        await query(`UPDATE users SET id = username WHERE id IS NULL AND username IS NOT NULL`);
        await query(`UPDATE users SET username = id WHERE username IS NULL AND id IS NOT NULL`);
    } catch (e) {
        console.warn("[Schema] Could not alias username/id on users table (non-critical):", e.message);
    }

    await query(`
        CREATE TABLE IF NOT EXISTS verification_codes (
            code TEXT PRIMARY KEY,
            type TEXT NOT NULL, 
            payload JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
    
    await query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            username TEXT NOT NULL,
            endpoint TEXT NOT NULL PRIMARY KEY,
            auth TEXT,
            p256dh TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    try {
        await query(`DELETE FROM verification_codes WHERE created_at < NOW() - INTERVAL '24 HOURS'`);
    } catch (e) {
        console.warn("[Schema] Could not clean up old verification codes:", e.message);
    }
};

// DB-ready flag — routes will return 503 until DB is initialised
let dbReady = false;

pool.connect()
    .then(async client => {
        console.log(`✅ [DB] Connected`);
        client.release();
        await ensureSchema();
        dbReady = true;
        console.log(`✅ [DB] Schema ready`);
    })
    .catch(err => {
        console.error("❌ [DB Connection Error]:", err.message || err);
        // Keep running so health-checks can report the error
    });

// ==========================================
// API ROUTES
// ==========================================
const api = express.Router();

// Guard: return 503 for all API calls until DB schema is ready
api.use((req, res, next) => {
    if (!dbReady && req.path !== '/health') {
        return res.status(503).json({ error: 'Сервер запускается, попробуйте через несколько секунд' });
    }
    next();
});

// --- AUTH ROUTES ---

api.post('/auth/register', registerLimiter, async (req, res) => {
    try {
        const { username, password, tagline, email } = req.body;
        if (!username || !password || !email) return res.status(400).json({ error: "Заполните все поля" });
        const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: "Имя пользователя: только латинские буквы, цифры, _ и - (3–30 символов)." });
        }

        // Проверяем, не занят ли username/email уже в users (раздельно для точных ошибок)
        const checkUser = await query(`SELECT username FROM users WHERE username = $1`, [username]);
        if (checkUser.rows.length > 0) return res.status(409).json({ error: "Имя пользователя уже занято" });

        const checkEmail = await query(`SELECT username FROM users WHERE data->>'email' = $1`, [email]);
        if (checkEmail.rows.length > 0) return res.status(409).json({ error: "Email уже зарегистрирован. Попробуйте восстановить пароль." });

        // Удаляем старые pending-регистрации для этого username/email (позволяем перерегистрацию)
        await query(
            `DELETE FROM verification_codes WHERE type = 'REGISTER' AND (payload->>'username' = $1 OR payload->>'email' = $2)`,
            [username, email]
        );

        const hashedPassword = await bcrypt.hash(password, 12);
        const code = crypto.randomBytes(16).toString('hex');

        const pendingUser = {
            username,
            password: hashedPassword,
            email,
            tagline: tagline || 'Новый пользователь',
            joinedDate: new Date().toLocaleDateString('ru-RU'),
            following: [],
            followers: [],
            achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
            settings: { theme: 'dark' },
            isAdmin: shouldBeAdmin(username, email)
        };

        await query(`INSERT INTO verification_codes (code, type, payload) VALUES ($1, 'REGISTER', $2)`, [code, pendingUser]);

        const verifyLink = `${APP_URL}/?code=${code}&type=REGISTER`;
        // Fire-and-forget — не блокируем ответ пользователю
        sendMailWithRetry({
            type: 'welcome',
            to: email,
            subject: 'Подтверждение регистрации — NeoArchive',
            html: verificationTemplate(username, verifyLink),
            params: { username, verification_link: verifyLink },
        }).catch(e => console.error("[EMAIL] Register email failed:", e.message));

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.post('/auth/login', authLimiter, async (req, res) => {
    try {
        const { identifier, password } = req.body;

        const result = await query(`
            SELECT * FROM users WHERE username = $1 OR data->>'email' = $1
        `, [identifier]);

        if (result.rows.length === 0) return res.status(401).json({ error: "Неверный логин или пароль" });

        const user = mapRow(result.rows[0]);
        const storedPassword = user.password;

        let passwordMatch = false;
        const isBcrypt = storedPassword?.startsWith('$2b$') || storedPassword?.startsWith('$2a$');

        if (isBcrypt) {
            passwordMatch = await bcrypt.compare(password, storedPassword);
        } else {
            // Старый plaintext-пароль: проверяем и мигрируем на bcrypt
            passwordMatch = (storedPassword === password);
            if (passwordMatch) {
                const newHash = await bcrypt.hash(password, 12);
                user.password = newHash;
                await query(
                    `UPDATE users SET data = jsonb_set(data, '{password}', to_jsonb($1::text)) WHERE username = $2`,
                    [newHash, user.username]
                );
            }
        }

        if (!passwordMatch) return res.status(401).json({ error: "Неверный логин или пароль" });

        if (shouldBeAdmin(user.username, user.email) && !user.isAdmin) {
            user.isAdmin = true;
            await query(`UPDATE users SET data = $1 WHERE username = $2`, [user, user.username]);
        }

        res.json(user);
    } catch (e) {
        console.error("Login Error:", e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.post('/auth/recover', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const result = await query(`SELECT * FROM users WHERE data->>'email' = $1`, [email]);
        if (result.rows.length === 0) {
            // Проверяем, может email застрял в pending-регистрации
            const pending = await query(
                `SELECT code FROM verification_codes WHERE type = 'REGISTER' AND payload->>'email' = $1`,
                [email]
            );
            if (pending.rows.length > 0) {
                // Удаляем старую pending-регистрацию, чтобы пользователь мог зарегистрироваться заново
                await query(`DELETE FROM verification_codes WHERE type = 'REGISTER' AND payload->>'email' = $1`, [email]);
                return res.status(404).json({ error: "Регистрация не была завершена. Мы очистили старую заявку — попробуйте зарегистрироваться заново." });
            }
            return res.status(404).json({ error: "Email не найден" });
        }

        const code = crypto.randomBytes(16).toString('hex');
        await query(`INSERT INTO verification_codes (code, type, payload) VALUES ($1, 'RESET', $2)`, [code, { email }]);

        const resetLink = `${APP_URL}/?code=${code}&type=RESET`;
        const username = mapRow(result.rows[0]).username;
        await sendMailWithRetry({
            type: 'reset',
            to: email,
            subject: 'Сброс пароля — NeoArchive',
            html: resetPasswordTemplate(username, resetLink),
            params: { username, verification_link: resetLink },
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Verify Telegram login data using HMAC-SHA256 as per Telegram Bot API spec
const verifyTelegramHash = (data) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return false;
    const { hash, ...rest } = data;
    if (!hash) return false;
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const dataCheckString = Object.keys(rest)
        .filter(k => rest[k] !== null && rest[k] !== undefined)
        .sort()
        .map(k => `${k}=${rest[k]}`)
        .join('\n');
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return hmac === hash;
};

api.post('/auth/telegram', async (req, res) => {
    try {
        const tgUser = req.body;

        // Verify Telegram data integrity (requires TELEGRAM_BOT_TOKEN in .env)
        if (process.env.TELEGRAM_BOT_TOKEN) {
            if (!verifyTelegramHash(tgUser)) {
                return res.status(401).json({ error: 'Неверная подпись Telegram данных' });
            }
        }

        const username = tgUser.username || `tg_${tgUser.id}`;
        
        const result = await query(`SELECT * FROM users WHERE username = $1`, [username]);
        if (result.rows.length > 0) {
            return res.json(mapRow(result.rows[0]));
        }

        const newUser = {
            username,
            email: `tg_${tgUser.id}@placeholder.com`,
            tagline: 'Telegram User',
            joinedDate: new Date().toLocaleDateString('ru-RU'),
            following: [],
            followers: [],
            achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
            avatarUrl: tgUser.photo_url || null,
            settings: { theme: 'dark' }
        };

        await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`, [username, newUser]);
        res.json(newUser);
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.post('/auth/verify-email', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Код не указан" });

        const codeRes = await query(
            `SELECT * FROM verification_codes WHERE code = $1 AND type = 'REGISTER' AND created_at > NOW() - INTERVAL '24 HOURS'`,
            [code]
        );
        if (codeRes.rows.length === 0) return res.status(400).json({ error: "Неверный или устаревший код" });

        const newUser = codeRes.rows[0].payload;
        const username = newUser.username;

        // Проверяем ещё раз на случай гонки
        const check = await query(`SELECT username FROM users WHERE username = $1 OR data->>'email' = $2`, [username, newUser.email]);
        if (check.rows.length > 0) {
            await query(`DELETE FROM verification_codes WHERE code = $1`, [code]);
            return res.status(409).json({ error: "Аккаунт уже существует. Попробуйте войти." });
        }

        await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`, [username, newUser]);
        try { await query(`UPDATE users SET id = username WHERE username = $1`, [username]); } catch(e){}
        await query(`DELETE FROM verification_codes WHERE code = $1`, [code]);

        // Приветственное письмо
        sendMailWithRetry({
            type: 'welcome',
            to: newUser.email,
            subject: `Добро пожаловать в NeoArchive, @${username}!`,
            html: welcomeTemplate(username),
            params: { username, verification_link: '' },
        }).catch(e => console.error("[EMAIL] Welcome email failed:", e.message));

        res.json({ success: true });
    } catch (e) {
        console.error("Verify email error:", e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.post('/auth/complete-reset', async (req, res) => {
    try {
        const { code, newPassword } = req.body;
        const codeRes = await query(`SELECT * FROM verification_codes WHERE code = $1 AND type = 'RESET'`, [code]);
        if (codeRes.rows.length === 0) return res.status(400).json({ error: "Неверный или устаревший код" });
        
        const email = codeRes.rows[0].payload.email;
        const userRes = await query(`SELECT * FROM users WHERE data->>'email' = $1`, [email]);
        const username = userRes.rows.length > 0 ? mapRow(userRes.rows[0]).username : '';
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await query(`UPDATE users SET data = jsonb_set(data, '{password}', to_jsonb($1::text)) WHERE data->>'email' = $2`, [hashedPassword, email]);
        await query(`DELETE FROM verification_codes WHERE code = $1`, [code]);

        // Уведомление об изменении пароля
        sendMailWithRetry({
            type: 'reset',
            to: email,
            subject: 'Пароль изменён — NeoArchive',
            html: passwordChangedAlertTemplate(username),
            params: { username, verification_link: '' },
        }).catch(e => console.error("[EMAIL] Password alert email failed:", e.message));

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- СМЕНА ПАРОЛЯ ИЗ ПРОФИЛЯ (с подтверждением по email) ---
api.post('/auth/change-password', authLimiter, async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        if (!username || !newPassword) return res.status(400).json({ error: "Данные не указаны" });

        const userRes = await query(`SELECT * FROM users WHERE username = $1`, [username]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "Пользователь не найден" });
        const user = mapRow(userRes.rows[0]);

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const code = crypto.randomBytes(16).toString('hex');

        await query(
            `INSERT INTO verification_codes (code, type, payload) VALUES ($1, 'CHANGE_PASSWORD', $2)`,
            [code, { username, hashedPassword }]
        );

        const confirmLink = `${APP_URL}/?code=${code}&type=CHANGE_PASSWORD`;
        await sendMailWithRetry({
            type: 'reset',
            to: user.email,
            subject: 'Подтвердите смену пароля — NeoArchive',
            html: changePasswordTemplate(username, confirmLink),
            params: { username, verification_link: confirmLink },
        });

        res.json({ success: true });
    } catch (e) {
        console.error("Change password request error:", e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.post('/auth/confirm-password-change', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Код не указан" });

        const codeRes = await query(
            `SELECT * FROM verification_codes WHERE code = $1 AND type = 'CHANGE_PASSWORD' AND created_at > NOW() - INTERVAL '2 HOURS'`,
            [code]
        );
        if (codeRes.rows.length === 0) return res.status(400).json({ error: "Неверный или устаревший код" });

        const { username, hashedPassword } = codeRes.rows[0].payload;
        await query(
            `UPDATE users SET data = jsonb_set(data, '{password}', to_jsonb($1::text)) WHERE username = $2`,
            [hashedPassword, username]
        );
        await query(`DELETE FROM verification_codes WHERE code = $1`, [code]);

        // Уведомление об успешной смене пароля
        const userRes = await query(`SELECT data->>'email' AS email FROM users WHERE username = $1`, [username]);
        if (userRes.rows.length > 0) {
            sendMailWithRetry({
                type: 'reset',
                to: userRes.rows[0].email,
                subject: 'Пароль изменён — NeoArchive',
                html: passwordChangedAlertTemplate(username),
                params: { username, verification_link: '' },
            }).catch(e => console.error("[EMAIL] Password alert email failed:", e.message));
        }

        res.json({ success: true });
    } catch (e) {
        console.error("Confirm password change error:", e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- СМЕНА EMAIL ИЗ ПРОФИЛЯ (с подтверждением по новому адресу) ---
api.post('/auth/change-email', authLimiter, async (req, res) => {
    try {
        const { username, newEmail } = req.body;
        if (!username || !newEmail) return res.status(400).json({ error: "Данные не указаны" });

        // Проверяем, не занят ли новый email
        const check = await query(`SELECT username FROM users WHERE data->>'email' = $1 AND username != $2`, [newEmail, username]);
        if (check.rows.length > 0) return res.status(409).json({ error: "Email уже используется другим аккаунтом" });

        const code = crypto.randomBytes(16).toString('hex');
        await query(
            `INSERT INTO verification_codes (code, type, payload) VALUES ($1, 'CHANGE_EMAIL', $2)`,
            [code, { username, newEmail }]
        );

        const confirmLink = `${APP_URL}/?code=${code}&type=CHANGE_EMAIL`;
        await sendMailWithRetry({
            type: 'welcome',
            to: newEmail,
            subject: 'Подтвердите новый email — NeoArchive',
            html: changeEmailTemplate(username, newEmail, confirmLink),
            params: { username, verification_link: confirmLink },
        });

        res.json({ success: true });
    } catch (e) {
        console.error("Change email request error:", e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.post('/auth/confirm-email-change', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: "Код не указан" });

        const codeRes = await query(
            `SELECT * FROM verification_codes WHERE code = $1 AND type = 'CHANGE_EMAIL' AND created_at > NOW() - INTERVAL '24 HOURS'`,
            [code]
        );
        if (codeRes.rows.length === 0) return res.status(400).json({ error: "Неверный или устаревший код" });

        const { username, newEmail } = codeRes.rows[0].payload;

        // Финальная проверка на занятость
        const conflict = await query(`SELECT username FROM users WHERE data->>'email' = $1 AND username != $2`, [newEmail, username]);
        if (conflict.rows.length > 0) {
            await query(`DELETE FROM verification_codes WHERE code = $1`, [code]);
            return res.status(409).json({ error: "Email уже занят другим аккаунтом" });
        }

        await query(
            `UPDATE users SET data = jsonb_set(data, '{email}', to_jsonb($1::text)) WHERE username = $2`,
            [newEmail, username]
        );
        await query(`DELETE FROM verification_codes WHERE code = $1`, [code]);

        res.json({ success: true });
    } catch (e) {
        console.error("Confirm email change error:", e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- PUSH SUBSCRIPTION ---
api.post('/push/subscribe', async (req, res) => {
    const { username, subscription } = req.body;
    if (!username || !subscription) return res.status(400).json({ error: "Missing data" });
    try {
        await query(`INSERT INTO push_subscriptions (username, endpoint, auth, p256dh) VALUES ($1, $2, $3, $4) ON CONFLICT (endpoint) DO UPDATE SET username = $1, created_at = NOW()`, [username, subscription.endpoint, subscription.keys.auth, subscription.keys.p256dh]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.delete('/push/subscribe', async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
    try {
        await query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- FOLLOW / UNFOLLOW (atomic PostgreSQL JSON ops) ---
api.post('/follow', authLimiter, async (req, res) => {
    try {
        const { follower, following, unfollow = false } = req.body;
        if (!follower || !following) return res.status(400).json({ error: 'follower and following required' });

        if (unfollow) {
            // Remove from follower's following list
            await query(`
                UPDATE users SET data = jsonb_set(data, '{following}',
                    COALESCE((SELECT jsonb_agg(v) FROM jsonb_array_elements(COALESCE(data->'following','[]'::jsonb)) v WHERE v <> to_jsonb($1::text)), '[]'::jsonb)
                ), updated_at = NOW() WHERE username = $2
            `, [following, follower]);
            // Remove follower from following's followers list
            await query(`
                UPDATE users SET data = jsonb_set(data, '{followers}',
                    COALESCE((SELECT jsonb_agg(v) FROM jsonb_array_elements(COALESCE(data->'followers','[]'::jsonb)) v WHERE v <> to_jsonb($1::text)), '[]'::jsonb)
                ), updated_at = NOW() WHERE username = $2
            `, [follower, following]);
        } else {
            // Add to follower's following list (idempotent)
            await query(`
                UPDATE users SET data = jsonb_set(data, '{following}',
                    CASE WHEN COALESCE(data->'following','[]'::jsonb) @> to_jsonb($1::text)
                        THEN COALESCE(data->'following','[]'::jsonb)
                        ELSE COALESCE(data->'following','[]'::jsonb) || to_jsonb($1::text)
                    END
                ), updated_at = NOW() WHERE username = $2
            `, [following, follower]);
            // Add to following's followers list (idempotent)
            await query(`
                UPDATE users SET data = jsonb_set(data, '{followers}',
                    CASE WHEN COALESCE(data->'followers','[]'::jsonb) @> to_jsonb($1::text)
                        THEN COALESCE(data->'followers','[]'::jsonb)
                        ELSE COALESCE(data->'followers','[]'::jsonb) || to_jsonb($1::text)
                    END
                ), updated_at = NOW() WHERE username = $2
            `, [follower, following]);
        }

        // Return updated profiles so client can sync hotCache
        const [followerResult, followingResult] = await Promise.all([
            query(`SELECT * FROM users WHERE username = $1`, [follower]),
            query(`SELECT * FROM users WHERE username = $1`, [following]),
        ]);
        res.json({
            success: true,
            followerProfile:  followerResult.rows[0]  ? mapRow(followerResult.rows[0])  : null,
            followingProfile: followingResult.rows[0] ? mapRow(followingResult.rows[0]) : null,
        });
    } catch (e) {
        console.error('[FOLLOW] Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const sendPushToUser = async (username, title, body, url = '/') => {
    if (!vapidPublicKey || !vapidPrivateKey) return;
    try {
        const res = await query('SELECT * FROM push_subscriptions WHERE username = $1', [username]);
        if (res.rows.length === 0) return;
        const payload = JSON.stringify({ title, body, url });
        const promises = res.rows.map(row => {
            const subscription = { endpoint: row.endpoint, keys: { auth: row.auth, p256dh: row.p256dh } };
            return webpush.sendNotification(subscription, payload).catch(err => {
                if (err.statusCode === 410) {
                    query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint])
                        .catch(e => console.error("Push cleanup error:", e));
                }
            });
        });
        await Promise.all(promises);
    } catch (e) { console.error("Send Push Error:", e); }
};

// --- HEALTH & SYSTEM ---
api.get('/health', async (req, res) => {
    const health = { status: 'ok', dbReady, totalUsers: 0 };
    try {
        const result = await query('SELECT count(*) FROM users');
        health.totalUsers = parseInt(result.rows[0].count);
    } catch (e) {
        health.status = 'error';
        health.dbError = 'Database connection failed';
        return res.status(500).json(health);
    }
    res.json(health);
});

// --- FEED & USERS ---
api.get('/feed', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const offset = parseInt(req.query.offset) || 0;
        const result = await query('SELECT * FROM exhibits ORDER BY updated_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        res.json(result.rows.map(mapRow));
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.get('/sync', async (req, res) => {
    const { username } = req.query;
    if(!username) return res.json({});
    try {
        const tradeRequests = await query(`SELECT * FROM trade_requests WHERE data->>'recipient' = $1 OR data->>'sender' = $1`, [username]);
        res.json({
            tradeRequests: tradeRequests.rows.map(mapRow)
        });
    } catch(e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// USERS CRUD (Fixed to use username)
api.get('/users', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const offset = parseInt(req.query.offset) || 0;
        const result = await query('SELECT * FROM users ORDER BY updated_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        res.json(result.rows.map(mapRow));
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.post('/users', async (req, res) => {
    const { id, username } = req.body;
    const targetKey = username || id;
    if (!targetKey) return res.status(400).json({ error: "Username required" });

    // Verify the requester claims ownership: X-Requested-By header must match the target username
    const requestedBy = req.headers['x-requested-by'];
    if (!requestedBy || requestedBy !== targetKey) {
        return res.status(403).json({ error: "Нет прав для изменения этого профиля" });
    }

    try {
        // IMAGE PROCESSING FOR AVATAR/COVER
        if (req.body.avatarUrl && isBase64DataUri(req.body.avatarUrl)) {
            req.body.avatarUrl = await processSingleImage(req.body.avatarUrl, `user_${targetKey}_avatar`);
        }
        if (req.body.coverUrl && isBase64DataUri(req.body.coverUrl)) {
            req.body.coverUrl = await processSingleImage(req.body.coverUrl, `user_${targetKey}_cover`);
        }

        await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (username) DO UPDATE SET data = $2, updated_at = NOW()`, [targetKey, req.body]);
        try { await query(`UPDATE users SET id = username WHERE username = $1`, [targetKey]); } catch(e){}
        res.json({ success: true, avatarUrl: req.body.avatarUrl, coverUrl: req.body.coverUrl });
    } catch(e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Exhibits GET/DELETE (POST is separate)
api.get('/exhibits', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 200);
        const offset = parseInt(req.query.offset) || 0;
        const result = await query('SELECT * FROM exhibits ORDER BY updated_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
        res.json(result.rows.map(mapRow));
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.get('/exhibits/:id', async (req, res) => {
    try {
        const result = await query('SELECT * FROM exhibits WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(mapRow(result.rows[0]));
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

api.delete('/exhibits/:id', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ error: "Username required" });
        const isAdminUser = ADMIN_USERNAMES.includes(username);
        if (isAdminUser) {
            const check = await query(`SELECT id FROM exhibits WHERE id = $1`, [req.params.id]);
            if (check.rows.length === 0) return res.status(404).json({ error: "Артефакт не найден" });
        } else {
            const check = await query(`SELECT id FROM exhibits WHERE id = $1 AND data->>'owner' = $2`, [req.params.id, username]);
            if (check.rows.length === 0) return res.status(403).json({ error: "Нет прав для удаления" });
        }
        await query('DELETE FROM exhibits WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- GENERIC CRUD ---
const createCrud = (router, table) => {
    router.get(`/${table}`, async (req, res) => {
        try {
            let q = `SELECT * FROM "${table}"`;
            let params = [];
            let conditions = [];
            if (req.query.username) {
                if (table === 'messages') {
                    conditions.push(`(data->>'sender' = $${params.length + 1} OR data->>'receiver' = $${params.length + 1})`);
                    params.push(req.query.username);
                } else if (table === 'notifications') {
                    conditions.push(`data->>'recipient' = $${params.length + 1}`);
                    params.push(req.query.username);
                }
            }
            ['owner', 'recipient', 'sender'].forEach(field => {
                if (req.query[field]) {
                     conditions.push(`data->>'${field}' = $${params.length + 1}`);
                     params.push(req.query[field]);
                }
            });
            if (conditions.length > 0) q += ` WHERE ${conditions.join(' AND ')}`;
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
            q += ` ORDER BY updated_at DESC LIMIT $${params.length + 1}`;
            params.push(limit);
            const r = await query(q, params);
            res.json(r.rows.map(mapRow));
        } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
    });

    router.get(`/${table}/:id`, async (req, res) => {
        try {
            const r = await query(`SELECT * FROM "${table}" WHERE id = $1`, [req.params.id]);
            if (r.rows.length === 0) return res.status(404).json({ error: "Not found" });
            res.json(mapRow(r.rows[0]));
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.post(`/${table}`, async (req, res) => {
        const id = req.body.id;
        if (!id) return res.status(400).json({ error: "ID required" });
        
        try {
            // Processing for specific tables
            if (table === 'collections') {
                if (req.body.coverImage && isBase64DataUri(req.body.coverImage)) {
                    req.body.coverImage = await processSingleImage(req.body.coverImage, `col_${id}_cover`);
                }
            }
            if (table === 'wishlist') {
                if (req.body.referenceImageUrl && isBase64DataUri(req.body.referenceImageUrl)) {
                    req.body.referenceImageUrl = await processSingleImage(req.body.referenceImageUrl, `wish_${id}_ref`);
                }
            }

            await query(`INSERT INTO "${table}" (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`, [id, req.body]);
            cache.flushPattern(`${table}:`);

            if (table === 'notifications') {
                const notif = req.body;
                let title = 'NeoArchive';
                let body = 'Новое уведомление';
                if (notif.type === 'LIKE') { title = 'Новый лайк!'; body = `@${notif.actor} оценил ваш экспонат`; }
                else if (notif.type === 'COMMENT') { title = 'Новый комментарий'; body = `@${notif.actor}: ${notif.targetPreview || '...'}`; }
                else if (notif.type === 'FOLLOW') { title = 'Новый подписчик'; body = `@${notif.actor} подписался на вас`; }
                else if (notif.type === 'TRADE_OFFER') { title = 'Предложение обмена'; body = `@${notif.actor} хочет обменяться`; }
                if (notif.recipient !== notif.actor) sendPushToUser(notif.recipient, title, body, `/activity`);
            }
            res.json({ success: true, data: req.body });
        } catch (e) {
            console.error(`Error saving to ${table}:`, e);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    router.delete(`/${table}/:id`, async (req, res) => {
        try {
            const { username } = req.query;
            if (table === 'collections' || table === 'wishlist') {
                if (!username) return res.status(400).json({ error: "Username required" });
                const check = await query(`SELECT id FROM "${table}" WHERE id = $1 AND data->>'owner' = $2`, [req.params.id, username]);
                if (check.rows.length === 0) return res.status(403).json({ error: "Нет прав для удаления" });
            }
            await query(`DELETE FROM "${table}" WHERE id = $1`, [req.params.id]);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
};

// --- ANTI-SPAM ROUTE BINDINGS ---
// Должны быть зарегистрированы ДО createCrud, чтобы middleware выполнялся первым (порядок регистрации в Express).
api.post('/messages',       messageLimiter,       spamFilter);
api.post('/guestbook',      guestbookLimiter,     spamFilter);
api.post('/collections',    contentCreateLimiter);
api.post('/wishlist',       contentCreateLimiter);
api.post('/trade_requests', contentCreateLimiter);
api.post('/notifications',  notificationLimiter);

['collections', 'notifications', 'messages', 'guestbook', 'wishlist', 'trade_requests'].forEach(t => createCrud(api, t));

// Special Route for marking notifications read
api.post('/notifications/read-all', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        // Update JSONB data field: set isRead to true for all notifications for this recipient
        await query(`
            UPDATE notifications 
            SET data = jsonb_set(data, '{isRead}', 'true'::jsonb), updated_at = NOW()
            WHERE data->>'recipient' = $1 AND (data->>'isRead')::boolean = false
        `, [username]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Special Exhibits Handler (POST)
api.post('/exhibits', contentCreateLimiter, async (req, res) => {
    try {
        const { id, imageUrls } = req.body;
        let processedData = { ...req.body };
        if (imageUrls && Array.isArray(imageUrls) && imageUrls.some(u => isBase64DataUri(u))) {
            const base64Only = imageUrls.filter(u => isBase64DataUri(u));
            const processed = await processExhibitImages(base64Only, id);
            processedData.imageUrls = imageUrls.map(u => isBase64DataUri(u) ? processed.shift() : u);
        }
        await query(`INSERT INTO exhibits (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`, [id, processedData]);
        cache.flushPattern('feed:');
        res.json({ success: true, imageUrls: processedData.imageUrls });
    } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
});

// ─── Delivery Proxy (Yandex Delivery) ────────────────────────────────────────
// If YANDEX_DELIVERY_TOKEN is empty, all endpoints return mock data.

const YANDEX_DELIVERY_TOKEN = process.env.YANDEX_DELIVERY_TOKEN || '';
const YANDEX_API_BASE = process.env.YANDEX_DELIVERY_SANDBOX === 'true'
    ? 'https://b2b.taxi.tst.yandex.net/b2b/cargo/integration/v1'
    : 'https://b2b.taxi.yandex.net/b2b/cargo/integration/v1';

const isMockDelivery = !YANDEX_DELIVERY_TOKEN;

// Mock data
const MOCK_PICKUP_POINTS = [
    { id: 'pvz-msk-001', name: 'Яндекс ПВЗ — Арбат', address: 'Москва, ул. Арбат, д. 12', lat: 55.7494, lon: 37.5929, workingHours: 'Пн–Вс: 9:00–21:00', provider: 'yandex' },
    { id: 'pvz-msk-002', name: 'Яндекс ПВЗ — Тверская', address: 'Москва, Тверская ул., д. 7', lat: 55.7634, lon: 37.6066, workingHours: 'Пн–Сб: 10:00–22:00', provider: 'yandex' },
    { id: 'pvz-msk-003', name: 'Яндекс ПВЗ — Таганская', address: 'Москва, Таганская ул., д. 3', lat: 55.7388, lon: 37.6539, workingHours: 'Пн–Вс: 8:00–22:00', provider: 'yandex' },
];

async function yandexPost(path, body) {
    const https = await import('https');
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }));
    const res = await fetch(YANDEX_API_BASE + path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${YANDEX_DELIVERY_TOKEN}`,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Yandex Delivery API ${res.status}: ${await res.text()}`);
    return res.json();
}

api.post('/delivery/tariffs', async (req, res) => {
    try {
        if (isMockDelivery) {
            return res.json([
                { method: 'COURIER', cost: 390, days: 2, label: 'Курьер до двери' },
                { method: 'PICKUP_POINT', cost: 290, days: 3, label: 'Пункт выдачи' },
            ]);
        }
        const { from, to, weightKg = 1 } = req.body;
        const data = await yandexPost('/check-price', {
            items: [{ quantity: 1, size: { height: 0.1, length: 0.3, width: 0.2 }, weight: weightKg, cost_value: '100', cost_currency: 'RUB', droppof_point: 1, pickup_point: 1 }],
            route_points: [
                { coordinates: { lat: 55.75, lon: 37.61 } },
                { coordinates: { lat: 55.76, lon: 37.62 } },
            ],
            fullname: 'Стандарт',
        });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'Delivery API error' });
    }
});

api.post('/delivery/pickup-points', async (req, res) => {
    try {
        if (isMockDelivery) return res.json(MOCK_PICKUP_POINTS);
        const { city } = req.body;
        // Yandex Delivery uses location-based search; simplified version
        const data = await yandexPost('/pickup-points', { city });
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: 'Delivery API error' });
    }
});

api.post('/delivery/create', async (req, res) => {
    try {
        if (isMockDelivery) {
            const trackingId = 'MOCK-' + Math.random().toString(16).slice(2, 10).toUpperCase();
            return res.json({ trackingId });
        }
        const { tradeId, senderAddress, recipientAddress, method, cost } = req.body;
        const data = await yandexPost('/claims/create', {
            client_requirements: { taxi_class: 'express' },
            route_points: [
                { address: { fullname: senderAddress.street + ', ' + senderAddress.house, city: senderAddress.city }, type: 'source', visit_order: 1, contact: { name: senderAddress.fullName, phone: senderAddress.phone } },
                { address: { fullname: recipientAddress?.street + ', ' + recipientAddress?.house, city: recipientAddress?.city }, type: 'destination', visit_order: 2, contact: { name: recipientAddress?.fullName, phone: recipientAddress?.phone } },
            ],
            items: [{ title: `Посылка по трейду ${tradeId}`, size: { height: 0.1, length: 0.3, width: 0.2 }, weight: 1, cost_value: String(cost || 0), cost_currency: 'RUB', quantity: 1, droppof_point: 2, pickup_point: 1 }],
        });
        res.json({ trackingId: data.id });
    } catch (e) {
        res.status(500).json({ error: 'Delivery API error' });
    }
});

api.get('/delivery/track/:trackingId', async (req, res) => {
    try {
        if (isMockDelivery) {
            const char = req.params.trackingId.at(-1) ?? '0';
            const statuses = ['CREATED', 'IN_TRANSIT', 'IN_TRANSIT', 'DELIVERED'];
            const idx = parseInt(char, 16) % 4;
            return res.json({ status: statuses[idx] });
        }
        const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }));
        const r = await fetch(`${YANDEX_API_BASE}/claims/info?claim_id=${req.params.trackingId}`, {
            headers: { 'Authorization': `Bearer ${YANDEX_DELIVERY_TOKEN}` },
        });
        if (!r.ok) throw new Error(`Yandex track error ${r.status}`);
        const data = await r.json();
        res.json({ status: data.status });
    } catch (e) {
        res.status(500).json({ error: 'Delivery API error' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// ⚔️ DAILY BATTLES
// ─────────────────────────────────────────────────────────────────────────────

// 4-day period bucket: 72h active battles + 24h pause (stable across restarts)
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
function getPeriodStart() {
    const bucketStart = new Date(Math.floor(Date.now() / FOUR_DAYS_MS) * FOUR_DAYS_MS);
    return bucketStart.toISOString().slice(0, 10); // YYYY-MM-DD
}
// Keep getTodayUTC as alias for compatibility
const getTodayUTC = getPeriodStart;

// Semi-final duration: 36h; final duration: 36h → total 72h active; remaining 24h = pause
const SEMI_DURATION_MS = 36 * 60 * 60 * 1000;
const FINAL_DURATION_MS = 36 * 60 * 60 * 1000;

function buildBracket(category, participants, now) {
    const date = getPeriodStart();
    const bracketId = `${category}_${date}`;
    const startTime = now.toISOString();
    const semiEnd = new Date(now.getTime() + SEMI_DURATION_MS).toISOString();
    const finalStart = semiEnd;
    const finalEnd = new Date(now.getTime() + SEMI_DURATION_MS + FINAL_DURATION_MS).toISOString();

    const battles = [
        {
            id: `${bracketId}_sf1`,
            bracketId,
            category,
            date,
            round: 1,
            slotIndex: 0,
            participant1: participants[0],
            participant2: participants[1],
            votes1: [],
            votes2: [],
            winner: undefined,
            status: 'ACTIVE',
            startTime,
            endTime: semiEnd,
        },
        {
            id: `${bracketId}_sf2`,
            bracketId,
            category,
            date,
            round: 1,
            slotIndex: 1,
            participant1: participants[2],
            participant2: participants[3],
            votes1: [],
            votes2: [],
            winner: undefined,
            status: 'ACTIVE',
            startTime,
            endTime: semiEnd,
        },
        {
            id: `${bracketId}_final`,
            bracketId,
            category,
            date,
            round: 2,
            slotIndex: 0,
            participant1: null,
            participant2: null,
            votes1: [],
            votes2: [],
            winner: undefined,
            status: 'PENDING',
            startTime: finalStart,
            endTime: finalEnd,
        },
    ];

    return {
        id: bracketId,
        category,
        date,
        participants,
        battles,
        winner: undefined,
        status: 'ACTIVE',
        createdAt: startTime,
    };
}

function finalizeBracket(bracket, now) {
    let changed = false;
    const nowTs = now.getTime();

    // Finalize expired semi-finals
    bracket.battles.forEach(battle => {
        if (battle.status === 'ACTIVE' && battle.round === 1 && new Date(battle.endTime).getTime() <= nowTs) {
            battle.winner = battle.votes1.length >= battle.votes2.length ? battle.participant1 : battle.participant2;
            battle.status = 'COMPLETED';
            changed = true;
        }
    });

    // Check if both semi-finals done -> activate final
    const sf1 = bracket.battles.find(b => b.round === 1 && b.slotIndex === 0);
    const sf2 = bracket.battles.find(b => b.round === 1 && b.slotIndex === 1);
    const final = bracket.battles.find(b => b.round === 2);

    if (sf1?.status === 'COMPLETED' && sf2?.status === 'COMPLETED' && final?.status === 'PENDING') {
        final.participant1 = sf1.winner;
        final.participant2 = sf2.winner;
        final.status = 'ACTIVE';
        changed = true;
    }

    // Finalize expired final
    if (final?.status === 'ACTIVE' && new Date(final.endTime).getTime() <= nowTs) {
        final.winner = final.votes1.length >= final.votes2.length ? final.participant1 : final.participant2;
        final.status = 'COMPLETED';
        bracket.winner = final.winner;
        bracket.status = 'COMPLETED';
        changed = true;
    }

    return changed;
}

// GET /api/battles?category=X  (main category like МУЗЫКА)
// Auto-picks 2 random subcategories (≥2 items each) → SF1 = subA vs subA, SF2 = subB vs subB
api.get('/battles', async (req, res) => {
    try {
        const category = req.query.category || req.query.subcategory; // subcategory kept for backward compat
        if (!category) return res.status(400).json({ error: 'category required' });
        const date = getPeriodStart();
        const bracketId = `${encodeURIComponent(category)}_${date}`;

        const { rows } = await query(`SELECT data FROM battles WHERE id = $1`, [bracketId]);
        let bracket = rows[0]?.data;
        const now = new Date();

        if (!bracket) {
            // Find 2 distinct subcategories within this category, each with ≥2 items
            const { rows: subcatRows } = await query(
                `SELECT data->>'subcategory' AS subcategory, COUNT(*) AS cnt
                 FROM exhibits
                 WHERE data->>'category' = $1
                   AND data->>'subcategory' IS NOT NULL
                   AND data->>'subcategory' != ''
                   AND (data->>'isDraft' IS NULL OR data->>'isDraft' = 'false')
                 GROUP BY data->>'subcategory'
                 HAVING COUNT(*) >= 2
                 ORDER BY RANDOM()
                 LIMIT 2`,
                [category]
            );

            if (subcatRows.length >= 2) {
                const subA = subcatRows[0].subcategory;
                const subB = subcatRows[1].subcategory;
                const [resA, resB] = await Promise.all([
                    query(`SELECT id FROM exhibits WHERE data->>'subcategory' = $1 AND (data->>'isDraft' IS NULL OR data->>'isDraft' = 'false') ORDER BY RANDOM() LIMIT 2`, [subA]),
                    query(`SELECT id FROM exhibits WHERE data->>'subcategory' = $1 AND (data->>'isDraft' IS NULL OR data->>'isDraft' = 'false') ORDER BY RANDOM() LIMIT 2`, [subB]),
                ]);
                if (resA.rows.length < 2 || resB.rows.length < 2) {
                    return res.json({ bracket: null, reason: 'not_enough_artifacts' });
                }
                // participants: [A1, A2, B1, B2] — SF1 = A1 vs A2, SF2 = B1 vs B2
                const participants = [resA.rows[0].id, resA.rows[1].id, resB.rows[0].id, resB.rows[1].id];
                bracket = buildBracket(category, participants, now);
                bracket.id = bracketId;
                bracket.battles.forEach(b => { b.bracketId = bracketId; });
                // Tag each semi-final with its subcategory for display
                bracket.battles[0].category = subA;
                bracket.battles[1].category = subB;
                bracket.subcategoryA = subA;
                bracket.subcategoryB = subB;
            } else {
                // Fallback: try picking any 4 from main category (no subcategory constraint)
                const { rows: fallbackRows } = await query(
                    `SELECT id FROM exhibits WHERE data->>'category' = $1 AND (data->>'isDraft' IS NULL OR data->>'isDraft' = 'false') ORDER BY RANDOM() LIMIT 4`,
                    [category]
                );
                if (fallbackRows.length < 4) return res.json({ bracket: null, reason: 'not_enough_artifacts' });
                const participants = fallbackRows.map(r => r.id);
                bracket = buildBracket(category, participants, now);
                bracket.id = bracketId;
                bracket.battles.forEach(b => { b.bracketId = bracketId; });
            }
            await query(`INSERT INTO battles (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`, [bracketId, bracket]);
        } else {
            const changed = finalizeBracket(bracket, now);
            if (changed) {
                // Grant BATTLE_CHAMPION achievement to the winning exhibit's owner
                if (bracket.status === 'COMPLETED' && bracket.winner && !bracket.achievementGranted) {
                    try {
                        const { rows: exhibitRows } = await query(
                            `SELECT data->>'owner' AS owner FROM exhibits WHERE id = $1`,
                            [bracket.winner]
                        );
                        const owner = exhibitRows[0]?.owner;
                        if (owner) {
                            const { rows: userRows } = await query(
                                `SELECT data FROM users WHERE username = $1`, [owner]
                            );
                            if (userRows[0]) {
                                const userData = userRows[0].data;
                                const achievements = userData.achievements || [];
                                const existing = achievements.find(a => a.id === 'BATTLE_CHAMPION');
                                if (existing) {
                                    existing.current = (existing.current || 1) + 1;
                                } else {
                                    achievements.push({ id: 'BATTLE_CHAMPION', current: 1, target: 1, unlocked: true });
                                }
                                userData.achievements = achievements;
                                await query(
                                    `UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`,
                                    [userData, owner]
                                );
                            }
                            bracket.achievementGranted = true;
                        }
                    } catch (e) {
                        console.error('[BATTLE] Achievement grant error:', e.message);
                    }
                }
                await query(`UPDATE battles SET data = $1, updated_at = NOW() WHERE id = $2`, [bracket, bracketId]);
            }
        }
        res.json({ bracket });
    } catch (e) {
        res.status(500).json({ error: 'Battle fetch error' });
    }
});

// POST /api/battles/vote
api.post('/battles/vote', async (req, res) => {
    try {
        const { bracketId, battleId, exhibitId, username } = req.body;
        if (!bracketId || !battleId || !exhibitId || !username) return res.status(400).json({ error: 'Missing fields' });

        const { rows } = await query(`SELECT data FROM battles WHERE id = $1`, [bracketId]);
        if (!rows[0]) return res.status(404).json({ error: 'Bracket not found' });

        const bracket = rows[0].data;

        // Ensure bracket state is up-to-date (activates final if both semi-finals are done)
        const stateChanged = finalizeBracket(bracket, new Date());
        if (stateChanged) {
            await query(`UPDATE battles SET data = $1, updated_at = NOW() WHERE id = $2`, [bracket, bracketId]);
        }

        const battle = bracket.battles.find(b => b.id === battleId);
        if (!battle) return res.status(404).json({ error: 'Battle not found' });
        if (battle.status !== 'ACTIVE') return res.status(400).json({ error: 'Battle is not active' });
        if (new Date(battle.endTime).getTime() <= Date.now()) return res.status(400).json({ error: 'Voting period ended' });

        // Check already voted
        if (battle.votes1.includes(username) || battle.votes2.includes(username)) {
            return res.status(400).json({ error: 'Already voted' });
        }

        if (exhibitId === battle.participant1) battle.votes1.push(username);
        else if (exhibitId === battle.participant2) battle.votes2.push(username);
        else return res.status(400).json({ error: 'Invalid participant' });

        await query(`UPDATE battles SET data = $1, updated_at = NOW() WHERE id = $2`, [bracket, bracketId]);
        res.json({ battle });
    } catch (e) {
        res.status(500).json({ error: 'Vote error' });
    }
});

// GET /api/battles/history?subcategory=X&limit=5
api.get('/battles/history', async (req, res) => {
    try {
        const subcategory = req.query.subcategory || req.query.category; // backward compat
        const limit = req.query.limit || 5;
        if (!subcategory) return res.status(400).json({ error: 'subcategory required' });
        const { rows } = await query(
            `SELECT data FROM battles WHERE data->>'category' = $1 AND data->>'status' = 'COMPLETED' ORDER BY data->>'date' DESC LIMIT $2`,
            [subcategory, parseInt(limit)]
        );
        res.json({ history: rows.map(r => r.data) });
    } catch (e) {
        res.status(500).json({ error: 'History fetch error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────

app.use('/api', api);
setupAdminAPI(app, query, cache);

app.use('/api/*', (req, res) => { res.status(404).json({ error: 'Endpoint not found' }); });
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));
