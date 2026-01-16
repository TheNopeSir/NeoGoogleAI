
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
    webpush.setVapidDetails(
        `mailto:${ADMIN_EMAIL}`,
        vapidPublicKey,
        vapidPrivateKey
    );
    console.log('✅ [Push] VAPID Keys Configured');
} else {
    console.warn('⚠️ [Push] VAPID Keys Missing. Push notifications disabled.');
    // Generate new ones for log info
    // const keys = webpush.generateVAPIDKeys();
    // console.log('Generated Keys:', keys);
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

// ... (Email Logic Omitted for brevity - assuming it's the same) ...
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
    await query(`
        CREATE TABLE IF NOT EXISTS verification_codes (
            code TEXT PRIMARY KEY,
            type TEXT NOT NULL, 
            payload JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
    
    // New Table for Push Subscriptions
    await query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            username TEXT NOT NULL,
            endpoint TEXT NOT NULL PRIMARY KEY,
            auth TEXT,
            p256dh TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await query(`DELETE FROM verification_codes WHERE created_at < NOW() - INTERVAL '24 HOURS'`);
};

pool.connect().then(() => {
    console.log(`✅ [DB] Connected`);
    ensureSchema();
});

// ==========================================
// API ROUTES
// ==========================================
const api = express.Router();

// ... (Auth Routes Omitted - same as before) ...

// PUSH SUBSCRIPTION
api.post('/push/subscribe', async (req, res) => {
    const { username, subscription } = req.body;
    if (!username || !subscription) return res.status(400).json({ error: "Missing data" });

    try {
        await query(`
            INSERT INTO push_subscriptions (username, endpoint, auth, p256dh)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (endpoint) DO UPDATE SET username = $1, created_at = NOW()
        `, [username, subscription.endpoint, subscription.keys.auth, subscription.keys.p256dh]);
        res.json({ success: true });
    } catch (e) {
        console.error("Push subscribe error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Helper to send push
const sendPushToUser = async (username, title, body, url = '/') => {
    if (!vapidPublicKey || !vapidPrivateKey) return;
    try {
        const res = await query('SELECT * FROM push_subscriptions WHERE username = $1', [username]);
        if (res.rows.length === 0) return;

        const payload = JSON.stringify({ title, body, url });

        const promises = res.rows.map(row => {
            const subscription = {
                endpoint: row.endpoint,
                keys: { auth: row.auth, p256dh: row.p256dh }
            };
            return webpush.sendNotification(subscription, payload).catch(err => {
                if (err.statusCode === 410) {
                    // Subscription expired
                    query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]);
                }
                console.error("Push send error", err);
            });
        });

        await Promise.all(promises);
    } catch (e) {
        console.error("Send Push Error:", e);
    }
};

// ... (CRUD) ...

// GENERIC CRUD WITH NOTIFICATION HOOK
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
        const r = await query(`SELECT * FROM "${table}" WHERE id = $1`, [req.params.id]);
        if (r.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(mapRow(r.rows[0]));
    });

    router.post(`/${table}`, async (req, res) => {
        const id = req.body.id;
        if (!id) return res.status(400).json({ error: "ID required" });
        
        await query(`INSERT INTO "${table}" (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`, [id, req.body]);
        cache.flushPattern(`${table}:`);

        // PUSH TRIGGER for Notifications
        if (table === 'notifications') {
            const notif = req.body;
            let title = 'NeoArchive';
            let body = 'Новое уведомление';
            if (notif.type === 'LIKE') { title = 'Новый лайк!'; body = `@${notif.actor} оценил ваш экспонат`; }
            else if (notif.type === 'COMMENT') { title = 'Новый комментарий'; body = `@${notif.actor}: ${notif.targetPreview || '...'}`; }
            else if (notif.type === 'FOLLOW') { title = 'Новый подписчик'; body = `@${notif.actor} подписался на вас`; }
            else if (notif.type === 'TRADE_OFFER') { title = 'Предложение обмена'; body = `@${notif.actor} хочет обменяться`; }
            
            // Do not send push to self
            if (notif.recipient !== notif.actor) {
                sendPushToUser(notif.recipient, title, body, `/activity`);
            }
        }

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

app.use('/api/*', (req, res) => { res.status(404).json({ error: 'Endpoint not found' }); });
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));
