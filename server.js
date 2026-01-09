
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';

// Загружаем настройки из файла .env
dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 🚀 SERVER-SIDE CACHING (REDIS-LIKE)
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
        this.cache.set(key, {
            value,
            expiry: Date.now() + t
        });
    }

    del(key) {
        this.cache.delete(key);
    }
    
    // Pattern match delete (e.g., delete all 'exhibit:*')
    flushPattern(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
}

const cache = new ServerCache(60); // Default 1 minute cache

// ==========================================
// ⚙️ НАСТРОЙКИ СЕРВЕРА
// ==========================================

const PORT = 3002;
const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '50mb' }));

// Логгер запросов
app.use((req, res, next) => {
    // console.log(`[REQUEST] ${req.method} ${req.url}`); // Reduced logging spam
    next();
});

// ==========================================
// 📧 НАСТРОЙКА ПОЧТЫ (TIMEWEB SMTP)
// ==========================================

const SMTP_EMAIL = process.env.SMTP_EMAIL || 'morpheus@neoarch.ru';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || 'tntgz9o3e9';

// FIX: Using port 587 (STARTTLS) which is most universally supported and less likely to timeout
const transporter = nodemailer.createTransport({
    host: 'smtp.timeweb.ru',
    port: 587, 
    secure: false, // Must be false for 587 (it upgrades via STARTTLS)
    auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000
});

transporter.verify(function (error, success) {
    if (error) {
        console.error("⚠️ [Mail] SMTP Config Error:", error.message);
    } else {
        console.log(`✅ [Mail] SMTP Server is ready. User: ${SMTP_EMAIL}`);
    }
});

// ==========================================
// 💽 DATABASE CONNECTION
// ==========================================

const pool = new Pool({
    user: process.env.DB_USER || 'gen_user',
    host: process.env.DB_HOST || '89.169.46.157',
    database: process.env.DB_NAME || 'default_db',
    password: process.env.DB_PASSWORD || '9H@DDCb.gQm.S}',
    port: 5432,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.error('❌ [Database] Unexpected error on idle client', err);
});

const query = async (text, params = []) => {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error(`❌ [Database] Query Failed: ${text}`, err.message);
        throw err;
    }
};

const mapRow = (row) => {
    if (!row) return null;
    const { data, ...rest } = row;
    return { ...(data || {}), ...rest };
};

// ==========================================
// API ROUTER
// ==========================================

const api = express.Router();

// Explicit root check
api.get('/', (req, res) => res.json({ status: 'NeoArchive API Online' }));

// HEALTH CHECK
api.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), port: PORT, cacheSize: cache.cache.size });
});

// AUTH: REGISTER
api.post('/auth/register', async (req, res) => {
    const { username, password, tagline, email } = req.body;
    if (!username || !password || !email) return res.status(400).json({ error: "Заполните все поля" });

    // Sanitize inputs
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
        // Case insensitive check for existence
        const check = await query(
            `SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(data->>'email') = LOWER($2)`, 
            [cleanUsername, cleanEmail]
        );
        if (check.rows.length > 0) return res.status(400).json({ error: "Пользователь или Email уже занят" });

        const newUser = {
            username: cleanUsername,
            email: cleanEmail, 
            password: cleanPassword, 
            tagline: tagline || "Новый пользователь",
            avatarUrl: `https://ui-avatars.com/api/?name=${cleanUsername}&background=random&color=fff`,
            joinedDate: new Date().toLocaleDateString(),
            following: [],
            followers: [],
            achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
            settings: { theme: 'dark' },
            isAdmin: false
        };

        await query(
            `INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW()) RETURNING *`, 
            [cleanUsername, newUser]
        );
        
        try {
            await transporter.sendMail({
                from: `"NeoArchive" <${SMTP_EMAIL}>`,
                to: cleanEmail,
                subject: 'WELCOME TO THE ARCHIVE',
                html: `<div style="background: black; color: #00ff00; padding: 20px;"><h1>NEO_ARCHIVE // CONNECTED</h1><p>Добро пожаловать, <strong>${cleanUsername}</strong>.</p></div>`
            });
        } catch (mailError) {
            console.error("[MAIL] Failed:", mailError.message);
        }

        res.json(newUser);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// AUTH: LOGIN
api.post('/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    
    // Sanitize
    const cleanIdentifier = identifier ? identifier.trim() : '';
    const cleanPassword = password ? password.trim() : '';

    try {
        // Case insensitive lookup for username OR email
        const result = await query(
            `SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(data->>'email') = LOWER($1)`, 
            [cleanIdentifier]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: "Пользователь не найден" });
        
        const user = mapRow(result.rows[0]);
        
        // Robust Password Check:
        // 1. Strict match
        // 2. Trimmed DB match (fixes legacy users with accidental trailing spaces)
        let passIsValid = user.password === cleanPassword;
        if (!passIsValid && user.password && user.password.trim() === cleanPassword) {
            passIsValid = true;
        }

        if (!passIsValid) return res.status(401).json({ error: "Неверный пароль" });
        
        res.json(user);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка сервера при входе: " + e.message });
    }
});

// AUTH: TELEGRAM
api.post('/auth/telegram', async (req, res) => {
    const tgUser = req.body;
    if (!tgUser || !tgUser.id) return res.status(400).json({ error: "Invalid Telegram data" });

    try {
        const username = tgUser.username || `user_${tgUser.id}`;
        
        // Check if user exists (Case insensitive)
        const check = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, [username]);
        
        let user;
        if (check.rows.length > 0) {
            // LOGIN EXISTING
            user = mapRow(check.rows[0]);
            // Update Avatar if changed
            if (tgUser.photo_url && user.avatarUrl !== tgUser.photo_url) {
                user.avatarUrl = tgUser.photo_url;
                await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [user, user.username]);
            }
        } else {
            // REGISTER NEW
            user = {
                username,
                email: `tg_${tgUser.id}@neoarchive.placeholder`,
                password: crypto.randomBytes(16).toString('hex'),
                tagline: `Странник из Telegram`,
                avatarUrl: tgUser.photo_url || `https://ui-avatars.com/api/?name=${username}&background=random&color=fff`,
                joinedDate: new Date().toLocaleDateString(),
                following: [],
                followers: [],
                achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
                settings: { theme: 'dark' },
                isAdmin: false,
                telegramId: tgUser.id
            };
            
            await query(
                `INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW()) RETURNING *`, 
                [username, user]
            );
        }
        
        res.json(user);
    } catch (e) {
        console.error("Telegram Auth Error:", e);
        res.status(500).json({ error: "Server error during Telegram auth: " + e.message });
    }
});

// AUTH: RECOVER
api.post('/auth/recover', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email обязателен" });
    const cleanEmail = email.trim();

    try {
        const result = await query(`SELECT * FROM users WHERE LOWER(data->>'email') = LOWER($1)`, [cleanEmail]);
        if (result.rows.length === 0) return res.json({ success: true, message: "Если email существует, мы отправили инструкцию." });

        const rawUser = result.rows[0];
        const user = mapRow(rawUser);
        const newPass = crypto.randomBytes(4).toString('hex');
        user.password = newPass;
        
        await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [user, user.username]);

        try {
            await transporter.sendMail({
                from: `"NeoArchive Security" <${SMTP_EMAIL}>`,
                to: cleanEmail,
                subject: 'PASSWORD RESET // NEO_ARCHIVE',
                html: `
                <div style="background: #000; color: #0f0; padding: 20px; font-family: monospace;">
                    <h2>/// SYSTEM OVERRIDE</h2>
                    <p>New Access Key:</p>
                    <h1 style="border: 1px dashed #0f0; display: inline-block; padding: 10px;">${newPass}</h1>
                </div>`
            });
        } catch (mailError) {
            console.error("[MAIL] Recovery Failed:", mailError);
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка восстановления" });
    }
});

// FEED (CACHED)
api.get('/feed', async (req, res) => {
    const cacheKey = 'feed_global';
    const cached = cache.get(cacheKey);
    if (cached) {
        return res.json(cached);
    }

    try {
        const result = await query(`SELECT * FROM exhibits ORDER BY updated_at DESC LIMIT 100`);
        const items = result.rows.map(mapRow);
        cache.set(cacheKey, items, 30); // Cache for 30 seconds
        res.json(items);
    } catch (e) {
        console.error("Feed Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// GET ALL USERS (CACHED, Public Data Only)
api.get('/users', async (req, res) => {
    const cacheKey = 'users_global';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        // Return mostly full objects but frontend will filter sensitive
        // We select data directly. 
        const result = await query('SELECT username, data FROM users LIMIT 200');
        const users = result.rows.map(row => {
            const u = mapRow(row);
            // sanitize server-side just in case
            if(u) {
                delete u.password;
                delete u.email;
                delete u.settings;
            }
            return u;
        });
        cache.set(cacheKey, users, 60);
        res.json(users);
    } catch (e) { res.status(500).json({error: e.message}); }
});

// GET GLOBAL WISHLIST
api.get('/wishlist', async (req, res) => {
    const cacheKey = 'wishlist_global';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        const result = await query('SELECT * FROM wishlist ORDER BY updated_at DESC LIMIT 100');
        const items = result.rows.map(mapRow);
        cache.set(cacheKey, items, 60);
        res.json(items);
    } catch (e) { res.status(500).json({error: e.message}); }
});

// GET GLOBAL COLLECTIONS
api.get('/collections', async (req, res) => {
    const cacheKey = 'collections_global';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        const result = await query('SELECT * FROM collections ORDER BY updated_at DESC LIMIT 50');
        const items = result.rows.map(mapRow);
        cache.set(cacheKey, items, 60);
        res.json(items);
    } catch (e) { res.status(500).json({error: e.message}); }
});

// GET MESSAGES (For User) - Case Insensitive
api.get('/messages', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        // Fetch sent or received messages using case-insensitive check
        const result = await query(
            `SELECT * FROM messages WHERE LOWER(data->>'sender') = LOWER($1) OR LOWER(data->>'receiver') = LOWER($1) ORDER BY updated_at DESC LIMIT 200`, 
            [username]
        );
        res.json(result.rows.map(mapRow));
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// GET GUESTBOOK (For Profile or All)
api.get('/guestbook', async (req, res) => {
    try {
        // Fetch all guestbook entries (or optimize to filter by user if provided)
        const result = await query(`SELECT * FROM guestbook ORDER BY updated_at DESC LIMIT 200`);
        res.json(result.rows.map(mapRow));
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// SYNC (Active User Data)
api.get('/sync', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.json({});
    try {
        const userRes = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, [username]);
        const colsRes = await query(`SELECT * FROM collections WHERE LOWER(data->>'owner') = LOWER($1)`, [username]);
        res.json({ users: userRes.rows.map(mapRow), collections: colsRes.rows.map(mapRow) });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// USERS CRUD
api.post('/users', async (req, res) => {
    try {
        const userData = req.body;
        const username = userData.username || userData.id;
        
        if (!username) return res.status(400).json({ error: "Username required" });

        await query(`
            INSERT INTO users (username, data, updated_at) 
            VALUES ($1, $2, NOW())
            ON CONFLICT (username) DO UPDATE SET data = $2, updated_at = NOW()
        `, [username, userData]);
        
        cache.del('users_global'); // Invalidate global list
        res.json({ success: true });
    } catch (e) { 
        console.error(`Save users error:`, e.message);
        res.status(500).json({ success: false, error: e.message }); 
    }
});

// GENERIC CRUD Helper
const createCrudRoutes = (router, table) => {
    router.get(`/${table}/:id`, async (req, res) => {
        try {
            const result = await query(`SELECT * FROM "${table}" WHERE id = $1`, [req.params.id]);
            if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
            res.json(mapRow(result.rows[0]));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    router.post(`/${table}`, async (req, res) => {
        try {
            const { id } = req.body;
            const recordId = id || req.body.id;
            if (!recordId) return res.status(400).json({ error: "ID required" });
            
            await query(`
                INSERT INTO "${table}" (id, data, updated_at) 
                VALUES ($1, $2, NOW())
                ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()
            `, [recordId, req.body]);
            
            // Invalidate Caches
            if (table === 'exhibits') cache.del('feed_global');
            if (table === 'wishlist') cache.del('wishlist_global');
            if (table === 'collections') cache.del('collections_global');

            res.json({ success: true });
        } catch (e) { 
            console.error(`Save ${table} error:`, e.message);
            res.status(500).json({ success: false, error: e.message }); 
        }
    });

    router.delete(`/${table}/:id`, async (req, res) => {
        try {
            await query(`DELETE FROM "${table}" WHERE id = $1`, [req.params.id]);
            // Invalidate Caches
            if (table === 'exhibits') cache.del('feed_global');
            if (table === 'wishlist') cache.del('wishlist_global');
            if (table === 'collections') cache.del('collections_global');
            res.json({ success: true });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    });
};

['exhibits', 'collections', 'notifications', 'messages', 'guestbook', 'wishlist'].forEach(t => createCrudRoutes(api, t));

// Notifications Fallback - Case Insensitive
api.get('/notifications', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        const result = await query(`SELECT * FROM notifications WHERE LOWER(data->>'recipient') = LOWER($1)`, [username]);
        res.json(result.rows.map(mapRow));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// MOUNT API
app.use('/api', api);

// ==========================================
// STATIC FILES & SPA FALLBACK
// ==========================================

// Serve static files with Cache-Control headers to fix PWA/caching issues
app.use(express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
            // Prevent caching of entry point and service worker to ensure updates
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            // Cache static assets (images, js chunks)
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

app.get('*', (req, res) => {
    const filePath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(filePath)) {
        // Prevent caching of index.html
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(filePath);
    } else {
        res.status(200).send(`
            <style>body{background:#000;color:#0f0;font-family:monospace;padding:2rem;}</style>
            <h1>NeoArchive Server Online</h1>
            <p>API is listening on port ${PORT}.</p>
            <p>Frontend build not found in /dist. Run 'npm run build' to generate frontend assets.</p>
        `);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 NeoArchive Server running on port ${PORT}`);
    console.log(`➜  API Endpoint: http://localhost:${PORT}/api/feed`);
});
