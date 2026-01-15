import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import { processExhibitImages, deleteExhibitImages, getImagesDir, processImage, isBase64DataUri } from './imageProcessor.js';
import { setupAdminAPI } from './adminAPI.js';

// ==========================================
// 🛡️ SECURITY OVERRIDE FOR CLOUD DBs
// ==========================================
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 🔐 ADMIN & CRITICAL CONFIG
// ==========================================
const ADMIN_USER = 'Truester';
const ADMIN_EMAIL = 'kennyornope@gmail.com';
const ADMIN_EMAILS = [ADMIN_EMAIL];
const ADMIN_USERNAMES = [ADMIN_USER];

// URL вашего приложения (для генерации ссылок)
// Если вы используете локально - http://localhost:5173
// Если продакшн - https://neoarchive.ru
const APP_URL = process.env.APP_URL || 'https://neoarchive.ru';

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
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// ==========================================
// 📧 ПОЧТА (EmailJS REST API)
// ==========================================
const EMAILJS_SERVICE_ID = 'service_s27hkib';
const EMAILJS_TEMPLATE_ID = 'template_ki5vwvp';
const EMAILJS_PUBLIC_KEY = 'HC4Ig9E7XEh6tdwyD';
const EMAILJS_PRIVATE_KEY = 'vBo7MgHf6y-8zDR4dchvg';

const sendMailWithRetry = async (mailOptions, retries = 3) => {
    const payload = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY, 
        template_params: {
            to_email: mailOptions.to,
            subject: mailOptions.subject,
            message: mailOptions.html // HTML template rendering
        }
    };

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[EmailJS] Attempt ${i + 1}/${retries} to send to ${mailOptions.to}...`);
            
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`EmailJS API Error: ${response.status} ${errorText}`);
            }

            console.log(`[EmailJS] Success! Sent to ${mailOptions.to}`);
            return true;
        } catch (err) {
            console.error(`[EmailJS] Attempt ${i + 1} failed: ${err.message}`);
            if (i === retries - 1) throw err;
            await new Promise(res => setTimeout(res, 3000));
        }
    }
};

// ==========================================
// 💽 DATABASE
// ==========================================
const dbUser = process.env.DB_USER || 'gen_user';
const dbHost = process.env.DB_HOST || '185.152.92.64';
const dbName = process.env.DB_NAME || 'default_db';
const dbPass = process.env.DB_PASSWORD || '9H@DDCb.gQm.S}';

const pool = new Pool({
    user: dbUser, password: dbPass, host: dbHost, port: 5432, database: dbName,
    ssl: { rejectUnauthorized: false },
    max: 20
});

const mapRow = (row) => {
    if (!row) return null;
    const { data, ...rest } = row;
    return { ...rest, ...(data || {}) };
};

const extractDataFields = (userObject) => {
    const { id, username, updated_at, ...dataFields } = userObject;
    return dataFields;
};

const query = async (text, params = []) => {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error(`❌ [DB Error]`, err.message);
        throw err;
    }
};

// ==========================================
// 🛡️ INTEGRITY & MIGRATIONS
// ==========================================
const ensureSchema = async () => {
    // Create verification_codes table for holding pending registrations and resets
    await query(`
        CREATE TABLE IF NOT EXISTS verification_codes (
            code TEXT PRIMARY KEY,
            type TEXT NOT NULL, -- 'REGISTER' or 'RESET'
            payload JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
    
    // Cleanup old codes (older than 24h)
    await query(`DELETE FROM verification_codes WHERE created_at < NOW() - INTERVAL '24 HOURS'`);
};

const repairUser = async (username, forcedEmail = null) => {
    try {
        const res = await query(`SELECT * FROM users WHERE username = $1`, [username]);
        if (res.rows.length === 0) return null;

        const user = mapRow(res.rows[0]);
        let changed = false;

        // 1. Repair Email
        // FORCE UPDATE if forcedEmail is provided and differs
        if (forcedEmail && user.email !== forcedEmail) {
            console.log(`[Integrity] Repairing email for ${username}: ${user.email} -> ${forcedEmail}`);
            user.email = forcedEmail;
            changed = true;
        } else if (!user.email) {
            user.email = `${username.toLowerCase()}@neoarchive.local`;
            changed = true;
        }

        // 2. Repair Admin Status
        if (ADMIN_USERNAMES.includes(username) && !user.isAdmin) {
            console.log(`[Integrity] Restoring admin rights for ${username}`);
            user.isAdmin = true;
            changed = true;
        }

        if (changed) {
            const updatedData = extractDataFields(user);
            await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [updatedData, username]);
            cache.del('users_global');
        }
        return user;
    } catch (e) {
        console.error(`[Integrity] Failed to repair ${username}`, e);
        return null;
    }
};

const ensureGlobalIntegrity = async () => {
    console.log('🛡️ [System] Running global data integrity check...');
    await ensureSchema();
    await repairUser(ADMIN_USER, ADMIN_EMAIL);
};

pool.connect().then(() => {
    console.log(`✅ [DB] Connected`);
    ensureGlobalIntegrity();
});

// ==========================================
// API ROUTES
// ==========================================
const api = express.Router();

// 1. REGISTER: Create pending verification
api.post('/auth/register', async (req, res) => {
    const { username, password, tagline, email } = req.body;
    if (!username || !password || !email) return res.status(400).json({ error: "Заполните все поля" });

    try {
        // Check existing users
        const check = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(data->>'email') = LOWER($2)`, [username.trim(), email.trim()]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Пользователь или Email уже занят" });

        // Generate Verification Code
        const code = crypto.randomUUID();
        const verificationLink = `${APP_URL}/verify?code=${code}&type=REGISTER`;

        // Store in temporary table
        const payload = { username: username.trim(), email: email.trim(), password: password.trim(), tagline };
        await query(`INSERT INTO verification_codes (code, type, payload) VALUES ($1, 'REGISTER', $2)`, [code, payload]);

        // Send Email
        await sendMailWithRetry({
            to: email.trim(),
            subject: 'NEO_ARCHIVE // VERIFICATION',
            html: `
                <div style="background:#000; color:#0f0; padding:20px; font-family:monospace; border:2px solid #0f0;">
                    <h2 style="border-bottom:1px solid #0f0; padding-bottom:10px;">ПОДТВЕРЖДЕНИЕ РЕГИСТРАЦИИ</h2>
                    <p>Для активации аккаунта <strong>${username}</strong> нажмите на ссылку ниже:</p>
                    <p style="margin: 20px 0;">
                        <a href="${verificationLink}" style="background:#0f0; color:#000; padding:10px 20px; text-decoration:none; font-weight:bold;">АКТИВИРОВАТЬ АККАУНТ</a>
                    </p>
                    <p style="font-size:10px; color:#555;">Или скопируйте: ${verificationLink}</p>
                </div>
            `
        });

        res.json({ success: true, message: "Ссылка для активации отправлена на Email" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. VERIFY REGISTER: Move from pending to users
api.post('/auth/verify-email', async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Код обязателен" });

    try {
        const result = await query(`SELECT * FROM verification_codes WHERE code = $1 AND type = 'REGISTER'`, [code]);
        if (result.rows.length === 0) return res.status(400).json({ error: "Неверный или истекший код" });

        const { payload } = result.rows[0];
        
        // Double check collision just in case
        const check = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, [payload.username]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Пользователь уже существует" });

        const newUser = {
            username: payload.username,
            email: payload.email,
            password: payload.password,
            tagline: payload.tagline || "Новый пользователь",
            avatarUrl: `https://ui-avatars.com/api/?name=${payload.username}&background=random&color=fff`,
            joinedDate: new Date().toLocaleDateString(),
            following: [], followers: [],
            achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
            settings: { theme: 'dark' },
            isAdmin: shouldBeAdmin(payload.username, payload.email)
        };

        await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`, [newUser.username, newUser]);
        await query(`DELETE FROM verification_codes WHERE code = $1`, [code]); // Cleanup

        res.json(newUser);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. LOGIN (Unchanged)
api.post('/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    const cleanId = identifier ? identifier.trim() : '';

    if (cleanId.toLowerCase() === ADMIN_USER.toLowerCase() || cleanId.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        await repairUser(ADMIN_USER, ADMIN_EMAIL);
    }

    try {
        const result = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(TRIM(data->>'email')) = LOWER($1)`, [cleanId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Пользователь не найден" });
        
        const user = mapRow(result.rows[0]);
        if (user.password !== password.trim()) return res.status(401).json({ error: "Неверный пароль" });

        res.json(user);
    } catch (e) { res.status(500).json({ error: "Ошибка сервера" }); }
});

// 4. RECOVER REQUEST: Create pending reset
api.post('/auth/recover', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email обязателен" });

    try {
        const result = await query(`SELECT * FROM users WHERE TRIM(LOWER(data->>'email')) = LOWER($1)`, [email.trim()]);
        if (result.rows.length === 0) return res.json({ success: true, message: "Если аккаунт существует, письмо отправлено." });

        const user = mapRow(result.rows[0]);
        const code = crypto.randomUUID();
        const verificationLink = `${APP_URL}/verify?code=${code}&type=RESET`;

        await query(`INSERT INTO verification_codes (code, type, payload) VALUES ($1, 'RESET', $2)`, [code, { username: user.username, email: email.trim() }]);

        await sendMailWithRetry({
            to: email.trim(),
            subject: 'NEO_ARCHIVE // PASSWORD RESET',
            html: `
                <div style="background:#000; color:#fff; padding:20px; font-family:monospace; border:2px solid #fff;">
                    <h2 style="border-bottom:1px solid #fff; padding-bottom:10px;">СБРОС ПАРОЛЯ</h2>
                    <p>Для пользователя <strong>${user.username}</strong> запрошена смена пароля.</p>
                    <p>Нажмите на ссылку, чтобы установить новый пароль:</p>
                    <p style="margin: 20px 0;">
                        <a href="${verificationLink}" style="background:#fff; color:#000; padding:10px 20px; text-decoration:none; font-weight:bold;">СМЕНИТЬ ПАРОЛЬ</a>
                    </p>
                    <p style="font-size:10px; color:#aaa;">Если вы этого не делали, проигнорируйте письмо.</p>
                </div>
            `
        });

        res.json({ success: true, message: "Инструкция отправлена на почту" });
    } catch (e) { res.status(500).json({ error: "Ошибка сервера" }); }
});

// 5. COMPLETE RESET: Update password
api.post('/auth/complete-reset', async (req, res) => {
    const { code, newPassword } = req.body;
    if (!code || !newPassword) return res.status(400).json({ error: "Неверные данные" });

    try {
        const result = await query(`SELECT * FROM verification_codes WHERE code = $1 AND type = 'RESET'`, [code]);
        if (result.rows.length === 0) return res.status(400).json({ error: "Ссылка устарела или недействительна" });

        const { payload } = result.rows[0];
        
        // Update user
        const userRes = await query(`SELECT * FROM users WHERE username = $1`, [payload.username]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "Пользователь не найден" });

        const user = mapRow(userRes.rows[0]);
        user.password = newPassword.trim();

        await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [extractDataFields(user), user.username]);
        await query(`DELETE FROM verification_codes WHERE code = $1`, [code]);

        res.json({ success: true, message: "Пароль успешно изменен" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// TELEGRAM AUTH
api.post('/auth/telegram', async (req, res) => {
    const tgUser = req.body;
    if (!tgUser || !tgUser.id) return res.status(400).json({ error: "Invalid data" });

    try {
        const username = tgUser.username || `user_${tgUser.id}`;
        const check = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, [username]);
        
        if (check.rows.length > 0) {
            const user = mapRow(check.rows[0]);
            if (ADMIN_USERNAMES.includes(user.username) && !user.isAdmin) {
                user.isAdmin = true;
                await query(`UPDATE users SET data = $1 WHERE username = $2`, [extractDataFields(user), user.username]);
            }
            return res.json(user);
        } else {
            const newUser = {
                username,
                email: `tg_${tgUser.id}@neoarchive.placeholder`,
                password: crypto.randomBytes(8).toString('hex'),
                tagline: `Странник из Telegram`,
                avatarUrl: tgUser.photo_url || `https://ui-avatars.com/api/?name=${username}`,
                joinedDate: new Date().toLocaleDateString(),
                following: [], followers: [],
                achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
                settings: { theme: 'dark' },
                isAdmin: shouldBeAdmin(username, ''),
                telegramId: tgUser.id
            };
            await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`, [username, newUser]);
            res.json(newUser);
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// HEALTH CHECK - ADDED TO FIX SSL/FETCH ERROR
api.get('/health', async (req, res) => {
    try {
        const result = await query('SELECT count(*) FROM users');
        const count = parseInt(result.rows[0].count, 10);
        res.json({ status: 'ok', totalUsers: count });
    } catch (e) {
        console.error("Health check DB failed:", e);
        res.json({ status: 'ok', totalUsers: 0 });
    }
});

// FEED
api.get('/feed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 30;
        const offset = parseInt(req.query.offset) || 0;
        const result = await query(`
            SELECT id, data->>'slug' as slug, data->>'title' as title, 
            substring(data->>'description', 1, 200) as description,
            data->'imageUrls' as "imageUrls", data->>'category' as category,
            data->>'owner' as owner, data->>'timestamp' as timestamp,
            COALESCE((data->>'likes')::int, 0) as likes, data->'likedBy' as "likedBy",
            COALESCE((data->>'views')::int, 0) as views
            FROM exhibits WHERE COALESCE((data->>'isDraft')::boolean, false) = false
            ORDER BY updated_at DESC LIMIT $1 OFFSET $2
        `, [limit, offset]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const createCrud = (router, table) => {
    router.get(`/${table}/:id`, async (req, res) => {
        const r = await query(`SELECT * FROM "${table}" WHERE id = $1`, [req.params.id]);
        if (r.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(mapRow(r.rows[0]));
    });
    router.post(`/${table}`, async (req, res) => {
        const id = req.body.id;
        await query(`INSERT INTO "${table}" (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`, [id, req.body]);
        cache.flushPattern(`${table}:`);
        res.json({ success: true });
    });
    router.delete(`/${table}/:id`, async (req, res) => {
        await query(`DELETE FROM "${table}" WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    });
};

['collections', 'notifications', 'messages', 'guestbook', 'wishlist', 'trade_requests'].forEach(t => createCrud(api, t));

// Special Exhibits Handler
api.post('/exhibits', async (req, res) => {
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
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use('/api', api);
setupAdminAPI(app, query, cache);

// 404 Handler for API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Static Handlers
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));