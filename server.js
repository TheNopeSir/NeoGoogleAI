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
// ⚙️ НАСТРОЙКИ СЕРВЕРА
// ==========================================

// Switch to 3002 to avoid 3000/3001 conflicts
const PORT = process.env.PORT || 3002;
const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '50mb' }));

// Логгер запросов
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// ==========================================
// 📧 SMTP CONFIGURATION
// ==========================================

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("\n⚠️  ВНИМАНИЕ: Настройки SMTP (почты) не найдены в файле .env!");
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.timeweb.ru',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: parseInt(process.env.SMTP_PORT || '465') === 465, 
    auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS,
    },
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
// API ROUTES
// ==========================================

// Explicitly handle root /api to avoid confusion
app.get('/api', (req, res) => res.json({ status: 'NeoArchive API Online' }));

// HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), port: PORT });
});

// AUTH: REGISTER
app.post('/api/auth/register', async (req, res) => {
    const { username, password, tagline, email } = req.body;
    if (!username || !password || !email) return res.status(400).json({ error: "Заполните все поля" });

    try {
        const check = await query(`SELECT * FROM users WHERE username = $1 OR email = $2`, [username, email]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Пользователь или Email уже занят" });

        const newUser = {
            username,
            email,
            password, 
            tagline: tagline || "Новый пользователь",
            avatarUrl: `https://ui-avatars.com/api/?name=${username}&background=random&color=fff`,
            joinedDate: new Date().toLocaleDateString(),
            following: [],
            followers: [],
            achievements: [{ id: 'HELLO_WORLD', current: 1, target: 1, unlocked: true }],
            settings: { theme: 'dark' },
            isAdmin: false
        };

        await query(
            `INSERT INTO users (username, email, data) VALUES ($1, $2, $3) RETURNING *`, 
            [username, email, newUser]
        );
        
        try {
            await transporter.sendMail({
                from: `"NeoArchive" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'WELCOME TO THE ARCHIVE',
                html: `<div style="background: black; color: #00ff00; padding: 20px;"><h1>NEO_ARCHIVE // CONNECTED</h1><p>Добро пожаловать, <strong>${username}</strong>.</p></div>`
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
app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    try {
        const result = await query(
            `SELECT * FROM users WHERE username = $1 OR email = $1`, 
            [identifier]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Пользователь не найден" });
        const user = mapRow(result.rows[0]);
        if (user.password !== password) return res.status(401).json({ error: "Неверный пароль" });
        res.json(user);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка сервера при входе" });
    }
});

// AUTH: RECOVER
app.post('/api/auth/recover', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email обязателен" });
    try {
        const result = await query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (result.rows.length === 0) return res.json({ success: true, message: "Если email существует, мы отправили инструкцию." });

        const rawUser = result.rows[0];
        const user = mapRow(rawUser);
        const newPass = crypto.randomBytes(4).toString('hex');
        user.password = newPass;
        await query(`UPDATE users SET data = $1 WHERE email = $2`, [user, email]);

        try {
            await transporter.sendMail({
                from: `"NeoArchive Security" <${process.env.SMTP_USER}>`,
                to: email,
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
            return res.status(500).json({ error: "Ошибка отправки письма" });
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка восстановления" });
    }
});

// FEED
app.get('/api/feed', async (req, res) => {
    try {
        const result = await query(`SELECT * FROM exhibits ORDER BY created_at DESC LIMIT 100`);
        const items = result.rows.map(mapRow);
        res.json(items);
    } catch (e) {
        console.error("Feed Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// SYNC
app.get('/api/sync', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.json({});
    try {
        const userRes = await query(`SELECT * FROM users WHERE username = $1`, [username]);
        const colsRes = await query(`SELECT * FROM collections WHERE owner = $1`, [username]);
        res.json({ users: userRes.rows.map(mapRow), collections: colsRes.rows.map(mapRow) });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// CRUD
const createCrudRoutes = (table) => {
    app.get(`/api/${table}/:id`, async (req, res) => {
        try {
            const result = await query(`SELECT * FROM "${table}" WHERE id = $1`, [req.params.id]);
            if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
            res.json(mapRow(result.rows[0]));
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.post(`/api/${table}`, async (req, res) => {
        try {
            const { id } = req.body;
            const recordId = id || req.body.id;
            if (!recordId) return res.status(400).json({ error: "ID required" });
            const owner = req.body.owner || null;

            await query(`
                INSERT INTO "${table}" (id, data, updated_at) 
                VALUES ($1, $2, NOW())
                ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()
            `, [recordId, req.body]);
            
            if (table === 'exhibits' && owner) {
                try { await query(`UPDATE "${table}" SET owner = $2, likes = $3 WHERE id = $1`, [recordId, owner, req.body.likes || 0]); } catch (ign) {}
            }
            res.json({ success: true });
        } catch (e) { 
            console.error(`Save ${table} error:`, e.message);
            res.status(500).json({ success: false, error: e.message }); 
        }
    });

    app.delete(`/api/${table}/:id`, async (req, res) => {
        try {
            await query(`DELETE FROM "${table}" WHERE id = $1`, [req.params.id]);
            res.json({ success: true });
        } catch (e) { res.status(500).json({ success: false, error: e.message }); }
    });
};

['exhibits', 'collections', 'notifications', 'messages', 'guestbook', 'wishlist'].forEach(t => createCrudRoutes(t));

// Notifications Fallback
app.get('/api/notifications', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Username required" });
    try {
        const result = await query(`SELECT * FROM notifications WHERE data->>'recipient' = $1`, [username]);
        res.json(result.rows.map(mapRow));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// STATIC FILES & SPA FALLBACK
// ==========================================

// Serve static files from 'dist' (if exists)
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all for SPA
app.get('*', (req, res) => {
    const filePath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // Only return this fallback if we really miss the API routes above
        res.status(200).send(`
            <style>body{background:#000;color:#0f0;font-family:monospace;padding:2rem;}</style>
            <h1>NeoArchive Server Online</h1>
            <p>API is listening on port ${PORT}.</p>
            <p>Frontend build not found in /dist. If you are developing, ensure 'npm run dev' is running on port 5173.</p>
        `);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 NeoArchive Server running on port ${PORT}`);
    console.log(`➜  API Endpoint: http://localhost:${PORT}/api/feed`);
});