
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { Resend } from 'resend';
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
// 📧 ПОЧТА (Resend Integration)
// ==========================================
const RESEND_API_KEY = 're_PTJX3b96_Ds6T37QBCSXsdneHEnupes9d';
const resend = new Resend(RESEND_API_KEY);
const EMAIL_FROM = 'NeoArchive <morpheus@neoarch.ru>';

// Helper for sending mail with retries
const sendMailWithRetry = async (mailOptions, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[Mail] Attempt ${i + 1}/${retries} to send to ${mailOptions.to}...`);
            
            const { data, error } = await resend.emails.send({
                from: EMAIL_FROM,
                to: mailOptions.to,
                subject: mailOptions.subject,
                html: mailOptions.html
            });

            if (error) {
                console.error(`[Mail] Resend API Error:`, error);
                throw new Error(error.message);
            }

            console.log(`[Mail] Success! ID: ${data.id}`);
            return data;
        } catch (err) {
            console.error(`[Mail] Attempt ${i + 1} failed: ${err.message}`);
            if (i === retries - 1) throw err;
            // Wait 5 seconds before retry
            await new Promise(res => setTimeout(res, 5000));
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
// 🛡️ INTEGRITY REPAIR MECHANISM
// ==========================================
const repairUser = async (username, forcedEmail = null) => {
    try {
        const res = await query(`SELECT * FROM users WHERE username = $1`, [username]);
        if (res.rows.length === 0) return null;

        const user = mapRow(res.rows[0]);
        let changed = false;

        // 1. Repair Email
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

api.post('/auth/register', async (req, res) => {
    const { username, password, tagline, email } = req.body;
    if (!username || !password || !email) return res.status(400).json({ error: "Заполните все поля" });

    try {
        const check = await query(`SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(data->>'email') = LOWER($2)`, [username.trim(), email.trim()]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Пользователь или Email уже занят" });

        const newUser = {
            username: username.trim(),
            email: email.trim(),
            password: password.trim(),
            tagline: tagline || "Новый пользователь",
            avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=random&color=fff`,
            joinedDate: new Date().toLocaleDateString(),
            following: [], followers: [],
            achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
            settings: { theme: 'dark' },
            isAdmin: shouldBeAdmin(username.trim(), email.trim())
        };

        await query(`INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW())`, [newUser.username, newUser]);
        
        // Robust welcome email sending
        sendMailWithRetry({
            to: newUser.email,
            subject: 'WELCOME TO THE ARCHIVE',
            html: `<h1>Добро пожаловать, ${newUser.username}</h1><p>Вы успешно зарегистрировались в NeoArchive.</p>`
        }).catch(e => console.error("[Mail] Welcome fail after all retries (ignored):", e.message));

        res.json(newUser);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

api.post('/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    const cleanId = identifier ? identifier.trim() : '';

    // CRITICAL PROTECTION: Ensure admin user is okay
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

api.post('/auth/recover', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email обязателен" });

    try {
        const result = await query(`SELECT * FROM users WHERE TRIM(LOWER(data->>'email')) = LOWER($1)`, [email.trim()]);
        if (result.rows.length === 0) return res.json({ success: true, message: "Проверьте почту" });

        const user = mapRow(result.rows[0]);
        const newPass = crypto.randomBytes(4).toString('hex');
        
        // 🚨 CRITICAL FALLBACK: Always log code in giant box in logs
        console.log(`\n\n`);
        console.log(`╔══════════════════════════════════════════════════════════════╗`);
        console.log(`║                  NEO_ARCHIVE SECURITY ALERT                  ║`);
        console.log(`╠══════════════════════════════════════════════════════════════╣`);
        console.log(`║ User: ${user.username.padEnd(54)} ║`);
        console.log(`║ Email: ${email.padEnd(53)} ║`);
        console.log(`║ NEW_ACCESS_CODE: ${newPass.padEnd(44)} ║`);
        console.log(`╚══════════════════════════════════════════════════════════════╝`);
        console.log(`\n\n`);

        try {
            await sendMailWithRetry({
                to: email.trim(),
                subject: 'PASSWORD RESET // NEO_ARCHIVE',
                html: `<div style="font-family:monospace; background:#000; color:#0f0; padding:20px; border: 2px solid #0f0;">
                    <h2 style="color: #0f0; border-bottom: 1px solid #0f0; padding-bottom: 10px;">NEO_ARCHIVE // RECOVERY PROTOCOL</h2>
                    <p>Запрошен сброс пароля для узла <strong>${user.username}</strong>.</p>
                    <div style="background: #111; border: 1px dashed #0f0; padding: 15px; margin: 20px 0; text-align: center;">
                        <span style="font-size: 24px; letter-spacing: 5px;">${newPass}</span>
                    </div>
                    <p style="font-size: 10px; color: #008800;">Если вы не запрашивали этот код, немедленно проверьте целостность своего соединения.</p>
                </div>`
            });
        } catch (mailError) {
            console.error(`[Recover] Resend Failed after retries, but code is logged above.`);
        }

        user.password = newPass;
        await query(`UPDATE users SET data = $1, updated_at = NOW() WHERE username = $2`, [extractDataFields(user), user.username]);
        res.json({ success: true, note: "Check server logs if email does not arrive." });
    } catch (e) { res.status(500).json({ error: "Ошибка сервера" }); }
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

// Static Handlers
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));
