
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import { processExhibitImages, deleteExhibitImages, getImagesDir, processImage, isBase64DataUri, processSingleImage } from './imageProcessor.js';
import { setupAdminAPI } from './adminAPI.js';
import webpush from 'web-push';

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
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// ... (Email Logic) ...
const EMAILJS_SERVICE_ID = 'service_s27hkib';
const EMAILJS_TEMPLATE_WELCOME = 'template_w89ggy9';
const EMAILJS_TEMPLATE_RESET = 'template_gsrqbjb';
const EMAILJS_PUBLIC_KEY = 'HC4Ig9E7XEh6tdwyD';
const EMAILJS_PRIVATE_KEY = 'vBo7MgHf6y-8zDR4dchvg';

const sendMailWithRetry = async (mailOptions, templateId, extraParams = {}, retries = 3) => {
    const payload = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: templateId,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY, 
        template_params: {
            to_email: mailOptions.to, 
            email: mailOptions.to,    
            recipient: mailOptions.to,
            user_email: mailOptions.to, 
            subject: mailOptions.subject,
            message: mailOptions.html, 
            ...extraParams 
        }
    };
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Origin': APP_URL, 'User-Agent': 'Mozilla/5.0' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`EmailJS API Error`);
            return true;
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(res => setTimeout(res, 3000));
        }
    }
};

// ==========================================
// 💽 DATABASE
// ==========================================
const dbUser = process.env.DB_USER || 'gen_user';
const dbHost = process.env.DB_HOST || '5.42.101.48';
const dbName = process.env.DB_NAME || 'default_db';
const dbPass = process.env.DB_PASSWORD || '9H@DDCb.gQm.S}';

const pool = new Pool({
    user: dbUser, 
    password: dbPass, 
    host: dbHost, 
    port: 5432, 
    database: dbName,
    ssl: { rejectUnauthorized: false },
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
    const tables = ['exhibits', 'collections', 'notifications', 'messages', 'guestbook', 'wishlist', 'trade_requests'];
    
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

pool.connect()
    .then(client => {
        console.log(`✅ [DB] Connected`);
        client.release();
        ensureSchema().catch(e => console.error("❌ [Schema Error]:", e));
    })
    .catch(err => {
        console.error("❌ [DB Connection Error]:", err);
    });

// ==========================================
// API ROUTES
// ==========================================
const api = express.Router();

// --- AUTH ROUTES ---

api.post('/auth/register', async (req, res) => {
    try {
        const { username, password, tagline, email } = req.body;
        if (!username || !password || !email) return res.status(400).json({ error: "Заполните все поля" });

        // Use 'username' column, fallback to 'id' if 'username' not found (hybrid support)
        const check = await query(`SELECT * FROM users WHERE username = $1 OR data->>'email' = $2`, [username, email]);
        if (check.rows.length > 0) return res.status(409).json({ error: "Имя пользователя или Email заняты" });

        const newUser = {
            username,
            password, // В реальном продакшене здесь должен быть хеш
            email,
            tagline,
            joinedDate: new Date().toLocaleDateString('ru-RU'),
            following: [],
            followers: [],
            achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
            settings: { theme: 'dark' },
            isAdmin: shouldBeAdmin(username, email)
        };

        // Insert using username
        await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`, [username, newUser]);
        
        // Also try to set ID if column exists
        try { await query(`UPDATE users SET id = username WHERE username = $1`, [username]); } catch(e){}

        res.json(newUser);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

api.post('/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        
        // Updated query to use 'username' column instead of 'id'
        const result = await query(`
            SELECT * FROM users 
            WHERE (username = $1 OR data->>'email' = $1) 
            AND data->>'password' = $2
        `, [identifier, password]);
        
        if (result.rows.length === 0) return res.status(401).json({ error: "Неверный логин или пароль" });
        
        const user = mapRow(result.rows[0]);
        
        if (shouldBeAdmin(user.username, user.email) && !user.isAdmin) {
            user.isAdmin = true;
            await query(`UPDATE users SET data = $1 WHERE username = $2`, [user, user.username]);
        }

        res.json(user);
    } catch (e) {
        console.error("Login Error:", e);
        res.status(500).json({ error: e.message });
    }
});

api.post('/auth/recover', async (req, res) => {
    try {
        const { email } = req.body;
        const result = await query(`SELECT * FROM users WHERE data->>'email' = $1`, [email]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Email не найден" });

        const code = crypto.randomBytes(16).toString('hex');
        await query(`INSERT INTO verification_codes (code, type, payload) VALUES ($1, 'RESET', $2)`, [code, { email }]);

        const resetLink = `${APP_URL}/?code=${code}&type=RESET`;
        try {
            await sendMailWithRetry({ 
                to: email, 
                subject: 'Сброс пароля NeoArchive', 
                html: `Для сброса пароля перейдите по ссылке: ${resetLink}` 
            }, EMAILJS_TEMPLATE_RESET, { reset_link: resetLink });
        } catch (e) {
            console.error("Email send failed:", e);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

api.post('/auth/telegram', async (req, res) => {
    try {
        const tgUser = req.body;
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
        res.status(500).json({ error: e.message });
    }
});

api.post('/auth/verify-email', async (req, res) => {
    res.json({ success: true });
});

api.post('/auth/complete-reset', async (req, res) => {
    try {
        const { code, newPassword } = req.body;
        const codeRes = await query(`SELECT * FROM verification_codes WHERE code = $1 AND type = 'RESET'`, [code]);
        if (codeRes.rows.length === 0) return res.status(400).json({ error: "Неверный или устаревший код" });
        
        const email = codeRes.rows[0].payload.email;
        await query(`UPDATE users SET data = jsonb_set(data, '{password}', to_jsonb($1::text)) WHERE data->>'email' = $2`, [newPassword, email]);
        await query(`DELETE FROM verification_codes WHERE code = $1`, [code]);
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
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
        res.status(500).json({ error: e.message });
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
    try {
        const result = await query('SELECT count(*) FROM users');
        res.json({ status: 'ok', totalUsers: parseInt(result.rows[0].count) });
    } catch (e) {
        res.status(500).json({ status: 'error', error: e.message });
    }
});

// --- FEED & USERS ---
api.get('/feed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const result = await query('SELECT * FROM exhibits ORDER BY updated_at DESC LIMIT $1', [limit]);
        res.json(result.rows.map(mapRow));
    } catch (e) {
        res.status(500).json({ error: e.message });
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
        res.status(500).json({error: e.message});
    }
});

// USERS CRUD (Fixed to use username)
api.get('/users', async (req, res) => {
    try {
        const result = await query('SELECT * FROM users LIMIT 100');
        res.json(result.rows.map(mapRow));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

api.post('/users', async (req, res) => {
    const { id, username } = req.body;
    const targetKey = username || id;
    if (!targetKey) return res.status(400).json({ error: "Username required" });
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
        res.status(500).json({ error: e.message });
    }
});

// Exhibits GET/DELETE (POST is separate)
api.get('/exhibits', async (req, res) => {
    try {
        const result = await query('SELECT * FROM exhibits ORDER BY updated_at DESC LIMIT 100');
        res.json(result.rows.map(mapRow));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

api.get('/exhibits/:id', async (req, res) => {
    try {
        const result = await query('SELECT * FROM exhibits WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(mapRow(result.rows[0]));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

api.delete('/exhibits/:id', async (req, res) => {
    try {
        await query('DELETE FROM exhibits WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
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
            const limit = parseInt(req.query.limit) || 100;
            q += ` ORDER BY updated_at DESC LIMIT ${limit}`;
            const r = await query(q, params);
            res.json(r.rows.map(mapRow));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.get(`/${table}/:id`, async (req, res) => {
        try {
            const r = await query(`SELECT * FROM "${table}" WHERE id = $1`, [req.params.id]);
            if (r.rows.length === 0) return res.status(404).json({ error: "Not found" });
            res.json(mapRow(r.rows[0]));
        } catch (e) {
            res.status(500).json({ error: e.message });
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
            res.status(500).json({ error: e.message });
        }
    });

    router.delete(`/${table}/:id`, async (req, res) => {
        try {
            await query(`DELETE FROM "${table}" WHERE id = $1`, [req.params.id]);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
};

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
        res.status(500).json({ error: e.message });
    }
});

// Special Exhibits Handler (POST)
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

app.use('/api/*', (req, res) => { res.status(404).json({ error: 'Endpoint not found' }); });
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));
