/**
 * NeoArchive Server - PostgreSQL Version
 * Работает без Supabase, напрямую с PostgreSQL
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import pool, { getAll, upsert, deleteRecord } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// ⚙️ НАСТРОЙКИ СЕРВЕРА
// ==========================================

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('\n❌ ОШИБКА: DATABASE_URL не установлен!');
    console.error('   Установите переменную окружения:');
    console.error('   export DATABASE_URL="postgresql://user:password@host:5432/neoarchive"\n');
    process.exit(1);
}

// ==========================================

const app = express();

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));

// ==========================================
// ⚡ КЭШИРОВАНИЕ СТАТИЧЕСКИХ ФАЙЛОВ
// ==========================================

// Service Worker - НЕ кэшировать (всегда свежий)
app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'dist', 'sw.js'));
});

// Workbox files - no cache (use regex for Express 5)
app.get(/^\/workbox-.*\.js$/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'dist', req.path));
});

// Assets (JS, CSS, изображения) - долгое кэширование с immutable
app.use('/assets', express.static(path.join(__dirname, 'dist/assets'), {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
    }
}));

// Manifest и иконки - среднее кэширование
app.get('/manifest.webmanifest', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(__dirname, 'dist', 'manifest.webmanifest'));
});

// Остальные статические файлы - краткое кэширование
app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: '5m',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
        }
    }
}));

// ==========================================
// 📡 API ROUTES
// ==========================================

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// 1. GLOBAL SYNC - получить все данные
app.get('/api/sync', async (req, res) => {
    try {
        const [users, exhibits, collections, notifications, messages, guestbook] = await Promise.all([
            getAll('users'),
            getAll('exhibits', 'timestamp', 'DESC'),
            getAll('collections', 'timestamp', 'DESC'),
            getAll('notifications', 'timestamp', 'DESC'),
            getAll('messages', 'timestamp', 'ASC'),
            getAll('guestbook', 'timestamp', 'DESC')
        ]);

        res.json({
            users: users || [],
            exhibits: exhibits || [],
            collections: collections || [],
            notifications: notifications || [],
            messages: messages || [],
            guestbook: guestbook || []
        });
    } catch (err) {
        console.error('❌ Sync Error:', err.message);
        res.status(500).json({
            error: err.message,
            users: [], exhibits: [], collections: [],
            notifications: [], messages: [], guestbook: []
        });
    }
});

// 2. USER PROFILE SYNC
app.post('/api/users/update', async (req, res) => {
    try {
        await upsert('users', req.body, 'username');
        res.json({ success: true });
    } catch (err) {
        console.error('❌ User Update Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. CRUD OPERATIONS

// CREATE/UPDATE
const createCrudRoutes = (resourceName) => {
    // Create/Update
    app.post(`/api/${resourceName}`, async (req, res) => {
        try {
            await upsert(resourceName, req.body);
            res.json({ success: true });
        } catch (err) {
            console.error(`❌ ${resourceName} Update Error:`, err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // Delete
    app.delete(`/api/${resourceName}/:id`, async (req, res) => {
        try {
            await deleteRecord(resourceName, req.params.id);
            res.json({ success: true });
        } catch (err) {
            console.error(`❌ ${resourceName} Delete Error:`, err.message);
            res.status(500).json({ success: false, error: err.message });
        }
    });
};

createCrudRoutes('exhibits');
createCrudRoutes('collections');
createCrudRoutes('notifications');
createCrudRoutes('messages');
createCrudRoutes('guestbook');

// Handle 404 for API (use regex for Express 5)
app.all(/^\/api\/.*/, (req, res) => {
    res.status(404).json({ error: `API Endpoint ${req.path} not found` });
});

// Fallback for SPA (Must be last)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ==========================================
// 🚀 START SERVER
// ==========================================

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0';
}

app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIp();
    console.log('\n🚀 NeoArchive Server running!');
    console.log(`   > Database: PostgreSQL`);
    console.log(`   > Status: 🟢 ONLINE`);
    console.log(`   > Local:   http://localhost:${PORT}`);
    console.log(`   > Network: http://${ip}:${PORT}`);
    console.log('\n   ✅ Работаем без Supabase!');
    console.log('   ✅ Без лимитов на Egress!\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('\n⏸️  SIGTERM received, closing server...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\n⏸️  SIGINT received, closing server...');
    await pool.end();
    process.exit(0);
});
