
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import { processExhibitImages, deleteExhibitImages, getImagesDir, isBase64DataUri, migrateOldImages, processImage } from './imageProcessor.js';
import { setupAdminAPI } from './adminAPI.js';

// ==========================================
// 🛡️ SECURITY OVERRIDE FOR CLOUD DBs
// ==========================================
// Fix for "self-signed certificate in certificate chain" error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
app.use(compression()); // Enable gzip compression
app.use(cors({ origin: true, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '50mb' }));

// Логгер запросов
app.use((req, res, next) => {
    // console.log(`[Request] ${req.method} ${req.path}`);
    next();
});

// ==========================================
// 📧 НАСТРОЙКА ПОЧТЫ (TIMEWEB SMTP)
// ==========================================

const SMTP_EMAIL = process.env.SMTP_EMAIL || 'morpheus@neoarch.ru';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || 'tntgz9o3e9';

// FIX: Port 465 (SSL) is standard for secure connections.
const transporter = nodemailer.createTransport({
    host: 'smtp.timeweb.ru',
    port: 465,
    secure: true, // True for 465
    auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 60000, // Increased to 60s
    greetingTimeout: 60000,   // Increased to 60s
    socketTimeout: 60000,      // Added socket timeout
    debug: true, // Enable debug output
    logger: true // Log to console
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

const dbUser = process.env.DB_USER || 'gen_user';
const dbHost = process.env.DB_HOST || '185.152.92.64';
const dbName = process.env.DB_NAME || 'default_db';
const dbPass = process.env.DB_PASSWORD || '9H@DDCb.gQm.S}';
const dbPort = 5432;

// Explicit object configuration ensures SSL settings are respected correctly
const pool = new Pool({
    user: dbUser,
    password: dbPass,
    host: dbHost,
    port: dbPort,
    database: dbName,
    ssl: {
        rejectUnauthorized: false // REQUIRED for "no encryption" error fix
    },
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 30000,
    max: 20,
    keepAlive: true
});

// Test DB Connection immediately
pool.connect().then(client => {
    console.log(`✅ [Database] Successfully connected to ${dbHost} as ${dbUser}`);
    client.release();
}).catch(err => {
    console.error(`❌ [Database] Initial connection failed:`, err.message);
});

pool.on('error', (err) => {
    console.error('❌ [Database] Unexpected error on idle client', err.message);
});

const query = async (text, params = []) => {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error(`❌ [Database] Query Failed: ${text.slice(0, 50)}...`, err.message);
        throw err;
    }
};

const mapRow = (row) => {
    if (!row) return null;
    const { data, ...rest } = row;
    return { ...rest, ...(data || {}) };
};

// Helper to extract data fields for saving back to DB
const extractDataFields = (userObject) => {
    const { id, username, updated_at, ...dataFields } = userObject;
    return dataFields;
};

// ==========================================
// API ROUTER
// ==========================================

const api = express.Router();

// Middleware to prevent caching for API requests
api.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

api.get('/', (req, res) => res.json({ status: 'NeoArchive API Online' }));

api.get('/health', async (req, res) => {
    let totalUsers = 0;
    try {
        const resCount = await query('SELECT COUNT(*) FROM users');
        totalUsers = parseInt(resCount.rows[0].count);
    } catch (e) {
        console.error("Health check DB stats failed:", e.message);
    }
    res.json({ 
        status: 'ok', 
        timestamp: new Date(), 
        port: PORT, 
        cacheSize: cache.cache.size,
        totalUsers: totalUsers
    });
});

// AUTH: REGISTER
api.post('/auth/register', async (req, res) => {
    const { username, password, tagline, email } = req.body;
    if (!username || !password || !email) return res.status(400).json({ error: "Заполните все поля" });

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
        // Robust duplicate check
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
        
        // Try sending email, but don't fail registration if it fails
        transporter.sendMail({
            from: `"NeoArchive" <${SMTP_EMAIL}>`,
            to: cleanEmail,
            subject: 'WELCOME TO THE ARCHIVE',
            html: `<div style="background: black; color: #00ff00; padding: 20px;"><h1>NEO_ARCHIVE // CONNECTED</h1><p>Добро пожаловать, <strong>${cleanUsername}</strong>.</p></div>`
        }).catch(err => console.error("[MAIL] Welcome Email Failed:", err.message));

        res.json(newUser);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// AUTH: LOGIN (ROBUST)
api.post('/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    const cleanIdentifier = identifier ? identifier.trim() : '';
    const cleanPassword = password ? password.trim() : '';

    console.log(`[Auth] Login attempt: ${cleanIdentifier}`);

    try {
        // 1. Try finding by Username (case-insensitive)
        let result = await query(
            `SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, 
            [cleanIdentifier]
        );

        // 2. If not found, try finding by Email inside JSON (case-insensitive, trimmed)
        if (result.rows.length === 0) {
            result = await query(
                `SELECT * FROM users WHERE LOWER(TRIM(data->>'email')) = LOWER($1)`,
                [cleanIdentifier]
            );
        }
        
        if (result.rows.length === 0) {
            console.warn(`[Auth] 404 User not found: ${cleanIdentifier}`);
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        
        const user = mapRow(result.rows[0]);
        let passIsValid = user.password === cleanPassword;
        
        // Fallback for whitespace issues in older records
        if (!passIsValid && user.password && user.password.trim() === cleanPassword) {
            passIsValid = true;
        }

        if (!passIsValid) {
            console.warn(`[Auth] 401 Invalid password for: ${user.username}`); 
            return res.status(401).json({ error: "Неверный пароль" });
        }
        
        console.log(`[Auth] Success: ${user.username}`);
        res.json(user);
    } catch (e) {
        console.error("[Auth] Login Error:", e);
        res.status(500).json({ error: "Ошибка сервера при входе" });
    }
});

// AUTH: TELEGRAM
api.post('/auth/telegram', async (req, res) => {
    const tgUser = req.body;
    if (!tgUser || !tgUser.id) return res.status(400).json({ error: "Invalid Telegram data" });

    try {
        const username = tgUser.username || `user_${tgUser.id}`;
        const check = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, [username]);
        
        let user;
        if (check.rows.length > 0) {
            user = mapRow(check.rows[0]);
            // Auto-update avatar if changed on TG
            if (tgUser.photo_url && user.avatarUrl !== tgUser.photo_url) {
                user.avatarUrl = tgUser.photo_url;
                const updatedData = extractDataFields(user);
                await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [updatedData, user.username]);
            }
        } else {
            user = {
                username,
                // PLACEHOLDER EMAIL - Real issue for login by email
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
        // 1. Check if user exists
        const result = await query(`SELECT * FROM users WHERE TRIM(LOWER(data->>'email')) = LOWER($1)`, [cleanEmail]);
        if (result.rows.length === 0) {
            console.log(`[Recover] Email not found: ${cleanEmail}`);
            // Security: always return success
            return res.json({ success: true, message: "Если email существует, мы отправили инструкцию." });
        }

        const rawUser = result.rows[0];
        const user = mapRow(rawUser);
        const newPass = crypto.randomBytes(6).toString('hex'); // 12 chars
        
        // 2. SEND EMAIL FIRST
        // If this fails, we do NOT update the password in DB, preventing lockout.
        try {
            await transporter.sendMail({
                from: `"NeoArchive Security" <${SMTP_EMAIL}>`,
                to: cleanEmail,
                subject: 'PASSWORD RESET // NEO_ARCHIVE',
                html: `
                    <div style="background: #000; color: #00ff00; padding: 20px; font-family: monospace;">
                        <h2>NEO_ARCHIVE // SECURITY PROTOCOL</h2>
                        <p>Ваш новый ключ доступа:</p>
                        <h1 style="border: 1px dashed #00ff00; padding: 10px; display: inline-block;">${newPass}</h1>
                        <p>Используйте его для входа. Рекомендуем сменить пароль в профиле.</p>
                    </div>
                `
            });
            console.log(`[Recover] Email sent to ${cleanEmail}`);
        } catch (mailError) {
            console.error(`[Recover] SMTP Failed for ${cleanEmail}:`, mailError);
            return res.status(500).json({ error: "Ошибка отправки письма. Попробуйте позже или свяжитесь с поддержкой." });
        }

        // 3. Update DB only if email sent
        user.password = newPass;
        const updatedData = extractDataFields(user);
        await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [updatedData, user.username]);

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// FEED (Optimized with pagination and caching)
api.get('/feed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const cacheKey = `feed:${limit}:${offset}`;

        // Check cache first (30 second TTL)
        let items = cache.get(cacheKey);

        if (!items) {
            // OPTIMIZED: Select only needed fields from JSONB (10-20x faster)
            const result = await query(`
                SELECT
                    id,
                    data->>'slug' as slug,
                    data->>'title' as title,
                    substring(data->>'description', 1, 200) as description,
                    jsonb_build_array(data->'imageUrls'->0) as "imageUrls",
                    data->>'category' as category,
                    data->>'subcategory' as subcategory,
                    data->>'owner' as owner,
                    data->>'timestamp' as timestamp,
                    COALESCE((data->>'likes')::int, 0) as likes,
                    COALESCE((data->>'views')::int, 0) as views,
                    data->>'quality' as quality,
                    COALESCE((data->>'isDraft')::boolean, false) as "isDraft"
                FROM exhibits
                WHERE COALESCE((data->>'isDraft')::boolean, false) = false
                ORDER BY updated_at DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);

            items = result.rows.map(row => ({
                id: row.id,
                slug: row.slug,
                title: row.title,
                description: row.description || '',
                imageUrls: row.imageUrls || [],
                category: row.category,
                subcategory: row.subcategory,
                owner: row.owner,
                timestamp: row.timestamp,
                likes: row.likes,
                views: row.views,
                quality: row.quality,
                isDraft: row.isDraft,
                _isLite: true
            }));

            // Cache for 30 seconds
            cache.set(cacheKey, items, 30);
        }

        // Set HTTP cache headers (30 seconds)
        res.set('Cache-Control', 'public, max-age=30');
        res.json(items);
    } catch (e) {
        console.error("Feed Error:", e);
        res.status(500).json({ error: e.message });
    }
});

api.get('/users', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const cacheKey = `users:${limit}`;

        let users = cache.get(cacheKey);
        if (!users) {
            const result = await query('SELECT username, data FROM users ORDER BY updated_at DESC LIMIT $1', [limit]);
            users = result.rows.map(row => {
                const u = mapRow(row);
                if(u) { delete u.password; delete u.email; delete u.settings; }
                return u;
            });
            cache.set(cacheKey, users, 60); // Cache for 60 seconds
        }

        res.set('Cache-Control', 'public, max-age=60');
        res.json(users);
    } catch (e) { res.status(500).json({error: e.message}); }
});

api.get('/wishlist', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const cacheKey = `wishlist:${limit}`;

        let items = cache.get(cacheKey);
        if (!items) {
            const result = await query('SELECT * FROM wishlist ORDER BY updated_at DESC LIMIT $1', [limit]);
            items = result.rows.map(mapRow);
            cache.set(cacheKey, items, 60); // Cache for 60 seconds
        }

        res.set('Cache-Control', 'public, max-age=60');
        res.json(items);
    } catch (e) { res.status(500).json({error: e.message}); }
});

api.get('/collections', async (req, res) => {
    try {
        const cacheKey = 'collections:all';
        let collections = cache.get(cacheKey);

        if (!collections) {
            const result = await query('SELECT * FROM collections ORDER BY updated_at DESC LIMIT 20');
            collections = result.rows.map(mapRow);
            cache.set(cacheKey, collections, 60); // Cache for 60 seconds
        }

        res.set('Cache-Control', 'public, max-age=60');
        res.json(collections);
    } catch (e) { res.status(500).json({error: e.message}); }
});

api.get('/messages', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        const cacheKey = `messages:${username}`;
        let messages = cache.get(cacheKey);

        if (!messages) {
            const result = await query(
                `SELECT * FROM messages WHERE LOWER(data->>'sender') = LOWER($1) OR LOWER(data->>'receiver') = LOWER($1) ORDER BY updated_at DESC LIMIT 50`,
                [username]
            );
            messages = result.rows.map(mapRow);
            cache.set(cacheKey, messages, 30); // Cache for 30 seconds (more dynamic data)
        }

        res.set('Cache-Control', 'private, max-age=30'); // Private cache for user data
        res.json(messages);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

api.get('/guestbook', async (req, res) => {
    try {
        const cacheKey = 'guestbook:all';
        let entries = cache.get(cacheKey);

        if (!entries) {
            const result = await query(`SELECT * FROM guestbook ORDER BY updated_at DESC LIMIT 50`);
            entries = result.rows.map(mapRow);
            cache.set(cacheKey, entries, 60); // Cache for 60 seconds
        }

        res.set('Cache-Control', 'public, max-age=60');
        res.json(entries);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

api.get('/sync', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.json({});
    try {
        const cacheKey = `sync:${username}`;
        let syncData = cache.get(cacheKey);

        if (!syncData) {
            const userRes = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, [username]);
            const colsRes = await query(`SELECT * FROM collections WHERE LOWER(data->>'owner') = LOWER($1)`, [username]);
            syncData = { users: userRes.rows.map(mapRow), collections: colsRes.rows.map(mapRow) };
            cache.set(cacheKey, syncData, 30); // Cache for 30 seconds
        }

        res.set('Cache-Control', 'private, max-age=30'); // Private cache for user data
        res.json(syncData);
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

        cache.del('users_global');
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ADMIN: Fix user email (emergency endpoint)
api.post('/admin/fix-user-email', async (req, res) => {
    try {
        const { username, email, adminKey } = req.body;

        // Simple admin key check (change this to a secure value in production)
        const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-in-production';
        if (adminKey !== ADMIN_KEY) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        if (!username || !email) {
            return res.status(400).json({ error: "Username and email required" });
        }

        // Get current user data
        const result = await query(
            `SELECT * FROM users WHERE LOWER(username) = LOWER($1)`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = mapRow(result.rows[0]);
        const oldEmail = user.email;

        // Update email
        user.email = email.trim();

        const updatedData = extractDataFields(user);
        await query(
            `UPDATE users SET data = $1, updated_at = NOW() WHERE LOWER(username) = LOWER($2)`,
            [updatedData, username]
        );

        cache.del('users_global');

        console.log(`[Admin] Email restored for ${username}: ${oldEmail} → ${email}`);
        res.json({
            success: true,
            username: username,
            oldEmail: oldEmail || '(none)',
            newEmail: email
        });
    } catch (e) {
        console.error('[Admin] Fix email error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Admin endpoint to clean up corrupted user data
api.post('/admin/cleanup-user-data', async (req, res) => {
    try {
        const { adminKey } = req.body;

        const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-in-production';
        if (adminKey !== ADMIN_KEY) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Get all users
        const result = await query('SELECT * FROM users');
        let fixedCount = 0;
        let errors = [];

        for (const row of result.rows) {
            try {
                const { data } = row;

                // Check if data contains database fields (signs of corruption)
                if (data && (data.id !== undefined || data.updated_at !== undefined)) {
                    console.log(`[Cleanup] Fixing corrupted data for user: ${row.username}`);

                    // Extract only data fields
                    const cleanData = extractDataFields(data);

                    await query(
                        'UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2',
                        [cleanData, row.username]
                    );

                    fixedCount++;
                }
            } catch (err) {
                errors.push({ username: row.username, error: err.message });
            }
        }

        cache.del('users_global');

        console.log(`[Cleanup] Fixed ${fixedCount} corrupted user records`);
        res.json({
            success: true,
            totalUsers: result.rows.length,
            fixedCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (e) {
        console.error('[Cleanup] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

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

            // Invalidate all related caches
            if (table === 'exhibits') {
                cache.flushPattern('feed:');
            } else if (table === 'wishlist') {
                cache.flushPattern('wishlist:');
            }

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    router.delete(`/${table}/:id`, async (req, res) => {
        try {
            await query(`DELETE FROM "${table}" WHERE id = $1`, [req.params.id]);

            // Invalidate all related caches
            if (table === 'exhibits') {
                cache.flushPattern('feed:');
            } else if (table === 'wishlist') {
                cache.flushPattern('wishlist:');
            }

            res.json({ success: true });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    });
};

// Создаем CRUD маршруты для всех таблиц кроме exhibits (для него свой обработчик)
['collections', 'notifications', 'messages', 'guestbook', 'wishlist'].forEach(t => createCrudRoutes(api, t));

// ==========================================
// 🖼️ СПЕЦИАЛЬНЫЙ ОБРАБОТЧИК ДЛЯ EXHIBITS
// ==========================================

// GET /exhibits/:id - стандартный CRUD
api.get('/exhibits/:id', async (req, res) => {
    try {
        const result = await query(`SELECT * FROM exhibits WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(mapRow(result.rows[0]));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /exhibits - с обработкой изображений
api.post('/exhibits', async (req, res) => {
    try {
        const { id, imageUrls } = req.body;
        const recordId = id || req.body.id;
        if (!recordId) return res.status(400).json({ error: "ID required" });

        let processedData = { ...req.body };

        // Обработка изображений если они есть и являются Base64
        if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
            const hasBase64Images = imageUrls.some(url => isBase64DataUri(url));

            if (hasBase64Images) {
                console.log(`[Exhibits] Processing ${imageUrls.length} images for exhibit ${recordId}...`);
                const startTime = Date.now();

                try {
                    // Обрабатываем только Base64 изображения
                    const base64Images = imageUrls.filter(url => isBase64DataUri(url));
                    const alreadyProcessed = imageUrls.filter(url => !isBase64DataUri(url));

                    const processedImages = await processExhibitImages(base64Images, recordId);

                    // Объединяем уже обработанные и новые изображения
                    processedData.imageUrls = [...alreadyProcessed, ...processedImages];

                    const duration = Date.now() - startTime;
                    console.log(`[Exhibits] ✅ Processed ${processedImages.length} images in ${duration}ms`);
                } catch (imgError) {
                    console.error('[Exhibits] Image processing error:', imgError);
                    // В случае ошибки оставляем оригинальные изображения
                    processedData.imageUrls = imageUrls;
                }
            } else {
                // Изображения уже обработаны (объекты с путями)
                processedData.imageUrls = imageUrls;
            }
        }

        // Сохраняем в БД
        await query(`
            INSERT INTO exhibits (id, data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()
        `, [recordId, processedData]);

        // Инвалидируем кеш фида
        cache.flushPattern('feed:');

        // Возвращаем обработанные данные с imageUrls для клиента
        res.json({
            success: true,
            imageUrls: processedData.imageUrls,
            processedImages: processedData.imageUrls?.length || 0
        });
    } catch (e) {
        console.error('[Exhibits] Save error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /exhibits/:id - с удалением изображений
api.delete('/exhibits/:id', async (req, res) => {
    try {
        const exhibitId = req.params.id;

        // Удаляем изображения из файловой системы
        await deleteExhibitImages(exhibitId);

        // Удаляем запись из БД
        await query(`DELETE FROM exhibits WHERE id = $1`, [exhibitId]);

        // Инвалидируем кеш
        cache.flushPattern('feed:');

        res.json({ success: true });
    } catch (e) {
        console.error('[Exhibits] Delete error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 🖼️ ENDPOINT ДЛЯ РАЗДАЧИ ИЗОБРАЖЕНИЙ
// ==========================================

api.get('/images/:exhibitId/:filename', (req, res) => {
    try {
        const { exhibitId, filename } = req.params;
        const imagePath = path.join(getImagesDir(), exhibitId, filename);

        console.log(`[Images] Request for: ${imagePath}`);

        // Проверяем существование файла
        if (!fs.existsSync(imagePath)) {
            console.warn(`[Images] File not found: ${imagePath}`);
            console.warn(`[Images] Images dir: ${getImagesDir()}`);
            console.warn(`[Images] Exhibit ID: ${exhibitId}`);
            console.warn(`[Images] Filename: ${filename}`);
            return res.status(404).json({ error: 'Image not found', path: imagePath });
        }

        console.log(`[Images] Serving file: ${imagePath}`);

        // Устанавливаем агрессивное кеширование для изображений (1 год)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Type', 'image/webp');

        // Отправляем файл
        res.sendFile(imagePath);
    } catch (e) {
        console.error('[Images] Error serving image:', e);
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// 🔄 ENDPOINT ДЛЯ МИГРАЦИИ ИЗОБРАЖЕНИЙ
// ==========================================

api.get('/migrate-images', async (req, res) => {
    try {
        const mode = req.query.mode || 'analyze';
        const limit = parseInt(req.query.limit) || null;

        console.log(`[Migration] Starting image migration - mode: ${mode}, limit: ${limit || 'all'}`);

        // Получаем все артефакты с изображениями
        const result = await query(`
            SELECT id, data
            FROM exhibits
            ORDER BY updated_at DESC
        `);

        const stats = {
            total: result.rows.length,
            withImages: 0,
            withBase64: 0,
            withOptimized: 0,
            processed: 0,
            migrated: 0,
            errors: 0,
            needsMigration: []
        };

        // Анализируем артефакты
        for (const row of result.rows) {
            const data = row.data;
            const imageUrls = data.imageUrls;

            if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
                continue;
            }

            stats.withImages++;

            const firstImage = imageUrls[0];

            if (typeof firstImage === 'string' && isBase64DataUri(firstImage)) {
                stats.withBase64++;
                stats.needsMigration.push({
                    id: row.id,
                    title: data.title,
                    imagesCount: imageUrls.length
                });
            } else if (typeof firstImage === 'object' && firstImage.thumbnail) {
                stats.withOptimized++;
            }
        }

        // Если режим только анализ - возвращаем статистику
        if (mode === 'analyze') {
            return res.json({
                success: true,
                mode: 'analyze',
                stats: {
                    total: stats.total,
                    withImages: stats.withImages,
                    withBase64: stats.withBase64,
                    withOptimized: stats.withOptimized
                },
                needsMigration: stats.needsMigration.slice(0, 20) // Первые 20 для примера
            });
        }

        // Режим выполнения - мигрируем изображения
        if (mode === 'execute') {
            const toProcess = limit ? stats.needsMigration.slice(0, limit) : stats.needsMigration;

            console.log(`[Migration] Will process ${toProcess.length} exhibits`);

            for (const item of toProcess) {
                stats.processed++;

                try {
                    // Получаем полные данные артефакта
                    const exhibitResult = await query(`SELECT data FROM exhibits WHERE id = $1`, [item.id]);
                    if (exhibitResult.rows.length === 0) continue;

                    const exhibitData = exhibitResult.rows[0].data;
                    const imageUrls = exhibitData.imageUrls;

                    // Проверяем наличие base64
                    const hasBase64 = imageUrls.some(img =>
                        typeof img === 'string' && isBase64DataUri(img)
                    );

                    if (!hasBase64) continue;

                    console.log(`[Migration] Processing exhibit ${item.id}: "${item.title}"`);

                    // Мигрируем изображения
                    const newImageUrls = await migrateOldImages(imageUrls, item.id);

                    if (newImageUrls.length > 0) {
                        // Обновляем артефакт в БД
                        exhibitData.imageUrls = newImageUrls;

                        await query(
                            'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                            [JSON.stringify(exhibitData), item.id]
                        );

                        stats.migrated++;
                        console.log(`[Migration] ✓ Migrated exhibit ${item.id}`);
                    }

                } catch (error) {
                    stats.errors++;
                    console.error(`[Migration] ✗ Error processing exhibit ${item.id}:`, error.message);
                }
            }

            // Очищаем кеш после миграции
            cache.cache.clear();

            return res.json({
                success: true,
                mode: 'execute',
                results: {
                    processed: stats.processed,
                    migrated: stats.migrated,
                    errors: stats.errors
                }
            });
        }

        res.status(400).json({ error: 'Invalid mode. Use ?mode=analyze or ?mode=execute' });

    } catch (e) {
        console.error('[Migration] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// 🔍 ENDPOINT ДЛЯ ПРОВЕРКИ ФАЙЛОВ ИЗОБРАЖЕНИЙ
// ==========================================

api.get('/verify-image-files', async (req, res) => {
    try {
        console.log(`[VerifyFiles] Checking physical image files...`);

        // Получаем все артефакты с изображениями
        const result = await query(`
            SELECT id, data
            FROM exhibits
            ORDER BY updated_at DESC
            LIMIT 100
        `);

        const stats = {
            checked: 0,
            filesExist: 0,
            filesMissing: 0,
            missingFiles: []
        };

        // Проверяем каждый артефакт
        for (const row of result.rows) {
            const data = row.data;
            const imageUrls = data.imageUrls;

            if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
                continue;
            }

            stats.checked++;

            const firstImage = imageUrls[0];

            // Проверяем только оптимизированный формат
            if (typeof firstImage === 'object' && firstImage.thumbnail) {
                const thumbnailPath = firstImage.thumbnail.replace('/api/images/', '');
                const fullPath = path.join(getImagesDir(), thumbnailPath);

                if (fs.existsSync(fullPath)) {
                    stats.filesExist++;
                } else {
                    stats.filesMissing++;
                    stats.missingFiles.push({
                        id: row.id,
                        title: data.title,
                        expectedPath: thumbnailPath,
                        fullPath: fullPath,
                        imageData: firstImage
                    });
                }
            }
        }

        res.json({
            success: true,
            stats,
            imagesDir: getImagesDir(),
            missingFiles: stats.missingFiles.slice(0, 10)
        });

    } catch (e) {
        console.error('[VerifyFiles] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// 🧹 ENDPOINT ДЛЯ ОЧИСТКИ ПУТЕЙ К НЕСУЩЕСТВУЮЩИМ ИЗОБРАЖЕНИЯМ
// ==========================================

api.get('/cleanup-orphaned-images', async (req, res) => {
    try {
        const mode = req.query.mode || 'analyze';

        console.log(`[Cleanup] Starting cleanup - mode: ${mode}`);

        // Получаем все артефакты
        const result = await query(`SELECT id, data FROM exhibits ORDER BY updated_at DESC`);

        const stats = {
            total: result.rows.length,
            withImages: 0,
            validImages: 0,
            orphanedImages: 0,
            cleaned: 0,
            errors: 0,
            orphanedExhibits: []
        };

        // Функция проверки существования файла
        function checkImageFileExists(imagePath) {
            if (!imagePath) return false;
            const relativePath = imagePath.replace('/api/images/', '');
            const fullPath = path.join(getImagesDir(), relativePath);
            return fs.existsSync(fullPath);
        }

        // Анализируем все артефакты
        for (const row of result.rows) {
            const data = row.data;
            const imageUrls = data.imageUrls;

            if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) continue;

            stats.withImages++;
            const firstImage = imageUrls[0];

            if (typeof firstImage === 'object' && firstImage.thumbnail) {
                const fileExists = checkImageFileExists(firstImage.thumbnail);

                if (fileExists) {
                    stats.validImages++;
                } else {
                    stats.orphanedImages++;
                    stats.orphanedExhibits.push({
                        id: row.id,
                        title: data.title,
                        missingPath: firstImage.thumbnail
                    });
                }
            }
        }

        // Режим анализа
        if (mode === 'analyze') {
            return res.json({
                success: true,
                mode: 'analyze',
                stats: {
                    total: stats.total,
                    withImages: stats.withImages,
                    validImages: stats.validImages,
                    orphanedImages: stats.orphanedImages
                },
                orphanedExhibits: stats.orphanedExhibits.slice(0, 20)
            });
        }

        // Режим очистки
        if (mode === 'cleanup') {
            for (const item of stats.orphanedExhibits) {
                try {
                    const exhibitResult = await query(`SELECT data FROM exhibits WHERE id = $1`, [item.id]);
                    if (exhibitResult.rows.length === 0) continue;

                    const exhibitData = exhibitResult.rows[0].data;
                    delete exhibitData.imageUrls;

                    await query(
                        'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                        [JSON.stringify(exhibitData), item.id]
                    );

                    stats.cleaned++;
                    console.log(`[Cleanup] ✓ Cleaned ${item.id}`);
                } catch (error) {
                    stats.errors++;
                    console.error(`[Cleanup] ✗ Error ${item.id}:`, error.message);
                }
            }

            cache.cache.clear();

            return res.json({
                success: true,
                mode: 'cleanup',
                results: {
                    orphanedImages: stats.orphanedImages,
                    cleaned: stats.cleaned,
                    errors: stats.errors
                }
            });
        }

        res.status(400).json({ error: 'Invalid mode' });
    } catch (e) {
        console.error('[Cleanup] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Migration endpoint: Convert all reactions to LIKE
api.post('/migrate-reactions', async (req, res) => {
    try {
        console.log('[Migration] Starting reactions migration...');

        const result = await pool.query('SELECT id, data FROM exhibits');
        const exhibits = result.rows;

        console.log(`[Migration] Found ${exhibits.length} exhibits to process`);

        let updated = 0;
        let skipped = 0;
        const errors = [];

        for (const exhibit of exhibits) {
            try {
                const data = exhibit.data;
                let needsUpdate = false;

                // Handle reactions
                if (data.reactions && Array.isArray(data.reactions) && data.reactions.length > 0) {
                    // Collect all users who reacted with any type
                    const allUsers = new Set();

                    for (const reaction of data.reactions) {
                        if (reaction.users && Array.isArray(reaction.users)) {
                            reaction.users.forEach(user => allUsers.add(user));
                        }
                    }

                    // Convert to single LIKE reaction
                    if (allUsers.size > 0) {
                        data.reactions = [{
                            type: 'LIKE',
                            users: Array.from(allUsers)
                        }];
                        needsUpdate = true;
                    }
                } else if (data.likedBy && Array.isArray(data.likedBy) && data.likedBy.length > 0) {
                    // Migrate from legacy likedBy
                    data.reactions = [{
                        type: 'LIKE',
                        users: data.likedBy
                    }];
                    needsUpdate = true;
                }

                // Update likes counter
                if (data.reactions && data.reactions.length > 0) {
                    const totalLikes = data.reactions.reduce((sum, r) => sum + (r.users?.length || 0), 0);
                    data.likes = totalLikes;
                    data.likedBy = data.reactions.flatMap(r => r.users || []);
                    needsUpdate = true;
                } else {
                    // Ensure likes counter is 0 if no reactions
                    if (data.likes !== 0) {
                        data.likes = 0;
                        data.likedBy = [];
                        needsUpdate = true;
                    }
                }

                // Ensure views counter exists and is a number
                if (typeof data.views !== 'number') {
                    data.views = data.views ? parseInt(data.views, 10) : 0;
                    if (isNaN(data.views)) data.views = 0;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await pool.query(
                        'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                        [data, exhibit.id]
                    );
                    updated++;
                } else {
                    skipped++;
                }
            } catch (err) {
                console.error(`[Migration] Error processing exhibit ${exhibit.id}:`, err);
                errors.push(`Exhibit ${exhibit.id}: ${err.message}`);
            }
        }

        // Clear cache after migration
        cache.flushPattern('exhibits:');
        cache.flushPattern('feed:');

        console.log(`[Migration] Complete! Updated: ${updated}, Skipped: ${skipped}`);

        res.json({
            success: true,
            updated,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            message: `Миграция завершена успешно!`
        });
    } catch (e) {
        console.error('[Migration] Fatal error:', e);
        res.status(500).json({
            success: false,
            error: e.message,
            updated: 0,
            skipped: 0
        });
    }
});

// Guestbook verification endpoint
api.get('/verify-guestbook', async (req, res) => {
    try {
        console.log('[Guestbook] Verifying guestbook...');

        const result = await pool.query(
            'SELECT id, data, created_at, updated_at FROM guestbook ORDER BY updated_at DESC LIMIT 50'
        );

        const entries = result.rows.map(row => ({
            id: row.id,
            author: row.data.author || 'Unknown',
            targetUser: row.data.targetUser || 'Unknown',
            text: row.data.text || '',
            timestamp: row.data.timestamp || row.updated_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        console.log(`[Guestbook] Found ${entries.length} entries`);

        res.json({
            success: true,
            total: entries.length,
            entries
        });
    } catch (e) {
        console.error('[Guestbook] Error:', e);
        res.status(500).json({
            success: false,
            error: e.message,
            total: 0,
            entries: []
        });
    }
});

api.get('/notifications', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        const cacheKey = `notifications:${username}`;
        let notifications = cache.get(cacheKey);

        if (!notifications) {
            const result = await query(`SELECT * FROM notifications WHERE LOWER(data->>'recipient') = LOWER($1) ORDER BY (data->>'timestamp') DESC LIMIT 50`, [username]);
            notifications = result.rows.map(mapRow);
            cache.set(cacheKey, notifications, 30); // Cache for 30 seconds
        }

        res.set('Cache-Control', 'private, max-age=30'); // Private cache for user data
        res.json(notifications);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use('/api', api);

// ==========================================
// 🔐 ADMIN API ENDPOINTS
// ==========================================
setupAdminAPI(app, query, cache);

// ==========================================
// 🔧 ADMIN ENDPOINT: RESET ALL IMAGES
// ==========================================
// Временный endpoint для обнуления изображений во всех артефактах
app.post('/admin/reset-images', async (req, res) => {
    try {
        console.log('🔄 Начинаем обнуление изображений во всех артефактах...');

        // Получаем все артефакты
        const result = await query('SELECT id, data FROM exhibits');

        let updated = 0;
        let skipped = 0;

        for (const row of result.rows) {
            const data = row.data;

            // Проверяем, есть ли изображения
            if (!data.imageUrls || data.imageUrls.length === 0) {
                skipped++;
                continue;
            }

            // Обнуляем imageUrls
            data.imageUrls = [];

            // Обновляем запись в БД
            await query(
                'UPDATE exhibits SET data = $1, updated_at = NOW() WHERE id = $2',
                [data, row.id]
            );

            updated++;
        }

        // Инвалидируем кеш
        cache.flushPattern('feed:');

        console.log(`✅ Готово! Обновлено: ${updated}, Пропущено: ${skipped}`);

        res.json({
            success: true,
            updated,
            skipped,
            total: result.rows.length,
            message: 'Все изображения успешно обнулены. Теперь можно заново загрузить их через интерфейс.'
        });
    } catch (e) {
        console.error('❌ Ошибка обнуления изображений:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 🖼️ IMAGE SERVING ENDPOINT
// ==========================================
// Раздача оптимизированных изображений из uploads/images
app.use('/api/images', express.static(getImagesDir(), {
    setHeaders: (res, filePath) => {
        // Долгий кеш для изображений (они иммутабельные, имена генерируются по хешу)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Type', 'image/webp');
    }
}));

// Раздача публичных статических файлов (migration UI, etc.)
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

app.get('*', (req, res) => {
    const filePath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(filePath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(filePath);
    } else {
        res.status(200).send('API Online. Build required.');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 NeoArchive Server running on port ${PORT}`);
});
