
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
import { processExhibitImages, deleteExhibitImages, getImagesDir, isBase64DataUri } from './imageProcessor.js';
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
// 🔐 ADMIN CONFIGURATION
// ==========================================
const ADMIN_EMAILS = ['kennyornope@gmail.com'];
const ADMIN_USERNAMES = ['Truester'];

// Helper function to check if user should be admin
const shouldBeAdmin = (username, email) => {
    return ADMIN_USERNAMES.includes(username) ||
           (email && ADMIN_EMAILS.includes(email));
};

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

// FIX: Port 465 requires ssl:// prefix per Timeweb documentation
const transporter = nodemailer.createTransport({
    host: 'ssl://smtp.timeweb.ru',
    port: 465,
    secure: true, // True for 465
    auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 60000, 
    greetingTimeout: 60000,   
    socketTimeout: 60000,      
    debug: true, 
    logger: true 
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

const pool = new Pool({
    user: dbUser,
    password: dbPass,
    host: dbHost,
    port: dbPort,
    database: dbName,
    ssl: {
        rejectUnauthorized: false 
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

api.get('/', (req, res) => res.json({ status: 'NeoArchive API Online (S3 Enabled)' }));

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
        totalUsers: totalUsers,
        s3: !!process.env.S3_ENDPOINT
    });
});

// ... [Auth routes remain unchanged] ...
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
            isAdmin: shouldBeAdmin(cleanUsername, cleanEmail)
        };

        if (newUser.isAdmin) {
            console.log(`[Auth] Registering new admin user: ${cleanUsername}`);
        }

        await query(
            `INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW()) RETURNING *`, 
            [cleanUsername, newUser]
        );
        
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

api.post('/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    const cleanIdentifier = identifier ? identifier.trim() : '';
    const cleanPassword = password ? password.trim() : '';

    console.log(`[Auth] Login attempt: ${cleanIdentifier}`);

    try {
        let result = await query(
            `SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, 
            [cleanIdentifier]
        );

        if (result.rows.length === 0) {
            result = await query(
                `SELECT * FROM users WHERE LOWER(TRIM(data->>'email')) = LOWER($1)`,
                [cleanIdentifier]
            );
        }
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        
        const user = mapRow(result.rows[0]);
        let passIsValid = user.password === cleanPassword;
        
        if (!passIsValid && user.password && user.password.trim() === cleanPassword) {
            passIsValid = true;
        }

        if (!passIsValid) {
            return res.status(401).json({ error: "Неверный пароль" });
        }

        const shouldUpgrade = shouldBeAdmin(user.username, user.email) && !user.isAdmin;
        if (shouldUpgrade) {
            user.isAdmin = true;
            const updatedData = extractDataFields(user);
            await query(
                `UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`,
                [updatedData, user.username]
            );
        }

        res.json(user);
    } catch (e) {
        console.error("[Auth] Login Error:", e);
        res.status(500).json({ error: "Ошибка сервера при входе" });
    }
});

api.post('/auth/telegram', async (req, res) => {
    const tgUser = req.body;
    if (!tgUser || !tgUser.id) return res.status(400).json({ error: "Invalid Telegram data" });

    try {
        const username = tgUser.username || `user_${tgUser.id}`;
        const check = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1)`, [username]);
        
        let user;
        if (check.rows.length > 0) {
            user = mapRow(check.rows[0]);
            let needsUpdate = false;
            if (tgUser.photo_url && user.avatarUrl !== tgUser.photo_url) {
                user.avatarUrl = tgUser.photo_url;
                needsUpdate = true;
            }
            if (shouldBeAdmin(user.username, user.email) && !user.isAdmin) {
                user.isAdmin = true;
                needsUpdate = true;
            }
            if (needsUpdate) {
                const updatedData = extractDataFields(user);
                await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [updatedData, user.username]);
            }
        } else {
            const tgEmail = `tg_${tgUser.id}@neoarchive.placeholder`;
            user = {
                username,
                email: tgEmail,
                password: crypto.randomBytes(16).toString('hex'),
                tagline: `Странник из Telegram`,
                avatarUrl: tgUser.photo_url || `https://ui-avatars.com/api/?name=${username}&background=random&color=fff`,
                joinedDate: new Date().toLocaleDateString(),
                following: [],
                followers: [],
                achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
                settings: { theme: 'dark' },
                isAdmin: shouldBeAdmin(username, tgEmail),
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
        res.status(500).json({ error: "Server error: " + e.message });
    }
});

api.post('/auth/recover', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email обязателен" });
    const cleanEmail = email.trim();

    try {
        const result = await query(`SELECT * FROM users WHERE TRIM(LOWER(data->>'email')) = LOWER($1)`, [cleanEmail]);
        if (result.rows.length === 0) {
            return res.json({ success: true, message: "Если email существует, мы отправили инструкцию." });
        }
        const rawUser = result.rows[0];
        const user = mapRow(rawUser);
        const newPass = crypto.randomBytes(6).toString('hex');
        
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
        } catch (mailError) {
            console.error(`[Recover] SMTP Failed for ${cleanEmail}:`, mailError);
            return res.status(500).json({ error: "Ошибка отправки письма." });
        }

        user.password = newPass;
        const updatedData = extractDataFields(user);
        await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [updatedData, user.username]);

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// FEED (Optimized)
api.get('/feed', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const cacheKey = `feed:${limit}:${offset}`;

        let items = cache.get(cacheKey);

        if (!items) {
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

            cache.set(cacheKey, items, 30);
        }

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
            cache.set(cacheKey, users, 60);
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
            cache.set(cacheKey, items, 60);
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
            cache.set(cacheKey, collections, 60);
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
            cache.set(cacheKey, messages, 30);
        }
        res.set('Cache-Control', 'private, max-age=30');
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
            cache.set(cacheKey, entries, 60);
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
            cache.set(cacheKey, syncData, 30);
        }
        res.set('Cache-Control', 'private, max-age=30');
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

// Generic CRUD handlers
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

            if (table === 'exhibits') cache.flushPattern('feed:');
            else if (table === 'wishlist') cache.flushPattern('wishlist:');

            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    router.delete(`/${table}/:id`, async (req, res) => {
        try {
            await query(`DELETE FROM "${table}" WHERE id = $1`, [req.params.id]);

            if (table === 'exhibits') cache.flushPattern('feed:');
            else if (table === 'wishlist') cache.flushPattern('wishlist:');

            res.json({ success: true });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    });
};

['collections', 'notifications', 'messages', 'guestbook', 'wishlist'].forEach(t => createCrudRoutes(api, t));

// ==========================================
// 🖼️ СПЕЦИАЛЬНЫЙ ОБРАБОТЧИК ДЛЯ EXHIBITS
// ==========================================

// GET /exhibits/:id
api.get('/exhibits/:id', async (req, res) => {
    try {
        const result = await query(`SELECT * FROM exhibits WHERE id = $1`, [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(mapRow(result.rows[0]));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /exhibits - с загрузкой в S3
api.post('/exhibits', async (req, res) => {
    try {
        const { id, imageUrls } = req.body;
        const recordId = id || req.body.id;
        if (!recordId) return res.status(400).json({ error: "ID required" });

        let processedData = { ...req.body };

        // Обработка изображений: конвертация и загрузка в S3
        if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
            // Проверяем, есть ли новые (Base64) изображения
            const hasBase64Images = imageUrls.some(url => isBase64DataUri(url));
            
            if (hasBase64Images) {
                console.log(`[Exhibits] Processing ${imageUrls.length} images for exhibit ${recordId}...`);
                const startTime = Date.now();

                try {
                    // Передаем массив изображений в процессор (теперь он грузит в S3)
                    const processedImages = await processExhibitImages(imageUrls, recordId);
                    
                    // Заменяем массив картинок на обработанный (теперь это объекты с URL S3)
                    processedData.imageUrls = processedImages;

                    const duration = Date.now() - startTime;
                    console.log(`[Exhibits] ✅ Uploaded ${processedImages.length} images to S3 in ${duration}ms`);
                } catch (imgError) {
                    console.error('[Exhibits] Image processing error:', imgError);
                    // В случае ошибки с S3, пробуем сохранить то что пришло (Base64), чтобы не потерять данные
                    // Хотя это и плохо для базы
                    processedData.imageUrls = imageUrls;
                }
            }
        }

        // Сохраняем в БД (теперь ссылки на S3)
        await query(`
            INSERT INTO exhibits (id, data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()
        `, [recordId, processedData]);

        // Инвалидируем кеш фида
        cache.flushPattern('feed:');

        // Возвращаем обработанные данные клиенту
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

// DELETE /exhibits/:id - с удалением из S3
api.delete('/exhibits/:id', async (req, res) => {
    try {
        const exhibitId = req.params.id;
        
        // Сначала получаем данные, чтобы узнать какие картинки удалять
        const result = await query(`SELECT data FROM exhibits WHERE id = $1`, [exhibitId]);
        
        if (result.rows.length > 0) {
            const data = result.rows[0].data;
            if (data.imageUrls && Array.isArray(data.imageUrls)) {
                // Удаляем файлы из S3
                await deleteExhibitImages(exhibitId, data.imageUrls);
            }
        }

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

// Admin endpoints
api.post('/grant-admin', async (req, res) => { /* ... existing code ... */ });

// Use Admin Router
setupAdminAPI(app, query, cache);

// Use Main API Router
app.use('/api', api);

// Static serving (Frontend)
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
    console.log(`\n🚀 NeoArchive Server running on port ${PORT} (S3 Enabled)`);
});
