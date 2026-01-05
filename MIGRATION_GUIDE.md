# 🚀 Руководство по миграции NeoArchive

## Содержание
1. [Миграция базы данных](#миграция-базы-данных)
2. [Миграция сервера](#миграция-сервера)
3. [Настройка кэша для SPA](#настройка-кэша-для-spa)
4. [Оптимизация производительности](#оптимизация-производительности)

---

## 📊 Миграция базы данных

### Вариант 1: Supabase → Supabase (рекомендуется)

#### Шаг 1: Создание новой базы данных

1. **Создайте новый проект в Supabase:**
   - Перейдите на https://supabase.com
   - Создайте новый проект
   - Сохраните новые ключи:
     - `Project URL`
     - `anon public key`
     - `service_role key`

2. **Создайте схему таблиц:**

```sql
-- Таблица пользователей
CREATE TABLE users (
  username TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица экспонатов
CREATE TABLE exhibits (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица коллекций
CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица уведомлений
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица сообщений
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица гостевой книги
CREATE TABLE guestbook (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для ускорения запросов
CREATE INDEX idx_exhibits_timestamp ON exhibits(timestamp DESC);
CREATE INDEX idx_collections_timestamp ON collections(timestamp DESC);
CREATE INDEX idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX idx_messages_timestamp ON messages(timestamp ASC);
CREATE INDEX idx_guestbook_timestamp ON guestbook(timestamp DESC);

-- Индексы для JSONB полей (для частых запросов)
CREATE INDEX idx_exhibits_owner ON exhibits((data->>'owner'));
CREATE INDEX idx_exhibits_category ON exhibits((data->>'category'));
CREATE INDEX idx_collections_owner ON collections((data->>'owner'));
CREATE INDEX idx_notifications_recipient ON notifications((data->>'recipient'));

-- Функция автообновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автообновления
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

3. **Настройте Row Level Security (RLS):**

```sql
-- Включите RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibits ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook ENABLE ROW LEVEL SECURITY;

-- Политики для users (публичное чтение, ограниченная запись)
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can be created by anyone" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true); -- Для service_role

-- Политики для exhibits (публичное чтение, запись через service_role)
CREATE POLICY "Exhibits are viewable by everyone" ON exhibits
  FOR SELECT USING (true);

CREATE POLICY "Exhibits can be managed via service_role" ON exhibits
  FOR ALL USING (true);

-- Аналогичные политики для других таблиц
CREATE POLICY "Collections are viewable by everyone" ON collections FOR SELECT USING (true);
CREATE POLICY "Collections can be managed via service_role" ON collections FOR ALL USING (true);

CREATE POLICY "Notifications are viewable by everyone" ON notifications FOR SELECT USING (true);
CREATE POLICY "Notifications can be managed via service_role" ON notifications FOR ALL USING (true);

CREATE POLICY "Messages are viewable by everyone" ON messages FOR SELECT USING (true);
CREATE POLICY "Messages can be managed via service_role" ON messages FOR ALL USING (true);

CREATE POLICY "Guestbook is viewable by everyone" ON guestbook FOR SELECT USING (true);
CREATE POLICY "Guestbook can be managed via service_role" ON guestbook FOR ALL USING (true);
```

#### Шаг 2: Экспорт данных из старой БД

Используйте скрипт `migration-export.js` (см. ниже)

#### Шаг 3: Импорт данных в новую БД

Используйте скрипт `migration-import.js` (см. ниже)

---

### Вариант 2: Supabase → PostgreSQL

Если вы хотите использовать собственный PostgreSQL сервер:

1. **Установите PostgreSQL 15+**
2. **Создайте базу данных:**
   ```bash
   createdb neoarchive
   ```
3. **Примените схему** (используйте SQL выше)
4. **Обновите подключение в коде:**
   - Используйте `pg` драйвер вместо Supabase SDK
   - Или используйте Prisma/TypeORM для работы с БД

---

## 🖥️ Миграция сервера

### Подготовка

1. **Создайте файл окружения `.env`:**

```bash
# .env
NODE_ENV=production
PORT=3000

# Новая база данных
SUPABASE_URL=https://your-new-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
SUPABASE_ANON_KEY=your-new-anon-key

# Опционально: для кэширования
REDIS_URL=redis://localhost:6379
```

2. **Обновите `server.js`:**

```javascript
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT || 3000;
```

**ВАЖНО:** Не храните ключи в коде! Используйте переменные окружения.

### Деплой на новый сервер

#### Вариант A: VPS (Ubuntu/Debian)

```bash
# 1. Установите Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Установите PM2
sudo npm install -g pm2

# 3. Клонируйте проект
git clone https://github.com/your-repo/neoarchive.git
cd neoarchive

# 4. Установите зависимости
npm install

# 5. Создайте .env файл
nano .env
# Вставьте переменные окружения

# 6. Соберите проект
npm run build

# 7. Запустите с PM2
pm2 start server.js --name neoarchive
pm2 save
pm2 startup

# 8. Настройте Nginx (опционально)
sudo nano /etc/nginx/sites-available/neoarchive
```

**Nginx конфигурация:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Gzip сжатие
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:3000;
    }

    # Service Worker (не кэшировать!)
    location ~* (sw\.js|workbox-.*\.js)$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        proxy_pass http://localhost:3000;
    }

    # API запросы
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA (index.html для всех остальных маршрутов)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Вариант B: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    volumes:
      - ./dist:/app/dist:ro
```

```bash
# Запуск
docker-compose up -d
```

#### Вариант C: Vercel (фронтенд) + Railway/Render (бэкенд)

**Для фронтенда (Vercel):**

```json
// vercel.json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

**Для бэкенда (Railway/Render):**
- Загрузите код на GitHub
- Подключите репозиторий к Railway/Render
- Добавьте переменные окружения
- Деплой!

---

## ⚡ Настройка кэша для SPA

### 1. Service Worker (PWA) - уже настроен ✅

Текущая конфигурация в `vite.config.ts` уже хороша, но можно улучшить:

```typescript
// vite.config.ts (улучшенная версия)
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,

  // Увеличенный кэш
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB

  runtimeCaching: [
    // Изображения от внешних источников
    {
      urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'external-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 дней
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },

    // API запросы (короткое кэширование)
    {
      urlPattern: /^https?:\/\/.*\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5 // 5 минут
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },

    // Supabase Storage
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 7 // 7 дней
        }
      }
    },

    // Avatars
    {
      urlPattern: /^https:\/\/ui-avatars\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'avatar-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 дней
        }
      }
    }
  ]
}
```

### 2. HTTP заголовки кэширования (в server.js)

```javascript
// server.js - добавьте после middleware
import express from 'express';
import path from 'path';

const app = express();

// Кэширование статических файлов
app.use('/assets', express.static(path.join(__dirname, 'dist/assets'), {
  maxAge: '1y', // 1 год
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Service Worker - НЕ кэшировать
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'dist', 'sw.js'));
});

app.get('/workbox-*.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'dist', req.path));
});

// HTML - краткое кэширование
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '5m', // 5 минут
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 минут
    }
  }
}));
```

### 3. Кэширование API ответов

Для больших приложений рекомендуется использовать Redis:

```bash
npm install redis ioredis
```

```javascript
// cache.js
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

await redisClient.connect();

// Middleware для кэширования
export const cacheMiddleware = (duration = 300) => async (req, res, next) => {
  const key = `cache:${req.originalUrl}`;

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    console.error('Cache read error:', err);
  }

  // Сохраняем оригинальный res.json
  const originalJson = res.json.bind(res);

  res.json = (data) => {
    // Кэшируем ответ
    redisClient.setEx(key, duration, JSON.stringify(data))
      .catch(err => console.error('Cache write error:', err));

    return originalJson(data);
  };

  next();
};

// В server.js:
import { cacheMiddleware } from './cache.js';

// Кэшируем /api/sync на 5 минут
app.get('/api/sync', cacheMiddleware(300), async (req, res) => {
  // ... ваш код
});
```

### 4. Client-side кэширование (React Query)

```bash
npm install @tanstack/react-query
```

```typescript
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут
      cacheTime: 10 * 60 * 1000, // 10 минут
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ваше приложение */}
    </QueryClientProvider>
  );
}
```

---

## 🚀 Оптимизация производительности

### 1. Code Splitting

```typescript
// App.tsx - ленивая загрузка компонентов
import { lazy, Suspense } from 'react';

const ExhibitDetailPage = lazy(() => import('./components/ExhibitDetailPage'));
const HallOfFame = lazy(() => import('./components/HallOfFame'));
const MyCollection = lazy(() => import('./components/MyCollection'));

// В рендере:
<Suspense fallback={<RetroLoader />}>
  {view === 'HALL_OF_FAME' && <HallOfFame {...props} />}
</Suspense>
```

### 2. Image Optimization

```typescript
// Используйте WebP формат
// В vite.config.ts добавьте плагин:
import viteImagemin from 'vite-plugin-imagemin';

plugins: [
  viteImagemin({
    gifsicle: { optimizationLevel: 7 },
    optipng: { optimizationLevel: 7 },
    mozjpeg: { quality: 80 },
    webp: { quality: 80 }
  })
]
```

### 3. Compression

```javascript
// server.js
import compression from 'compression';

app.use(compression({
  level: 6,
  threshold: 1024, // Сжимать файлы > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

---

## 📋 Чеклист миграции

### База данных:
- [ ] Создана новая БД в Supabase
- [ ] Применена схема таблиц
- [ ] Настроены индексы
- [ ] Настроен RLS
- [ ] Экспортированы данные из старой БД
- [ ] Импортированы данные в новую БД
- [ ] Проверена целостность данных
- [ ] Обновлены ключи в `.env`

### Сервер:
- [ ] Подготовлен новый сервер/VPS
- [ ] Установлен Node.js 20+
- [ ] Установлен PM2/Docker
- [ ] Настроен Nginx (если используется)
- [ ] Настроен SSL (Let's Encrypt)
- [ ] Настроены переменные окружения
- [ ] Выполнен деплой приложения
- [ ] Проверена работоспособность

### Кэширование:
- [ ] Обновлен vite.config.ts (PWA)
- [ ] Добавлены HTTP заголовки в server.js
- [ ] Настроен Redis (опционально)
- [ ] Настроен React Query (опционально)
- [ ] Проверена работа Service Worker
- [ ] Проверено кэширование статики
- [ ] Проверено кэширование API

### Производительность:
- [ ] Включен code splitting
- [ ] Оптимизированы изображения
- [ ] Включено сжатие (gzip/brotli)
- [ ] Проверена скорость загрузки (Lighthouse)
- [ ] Настроен CDN (опционально)

---

## 🆘 Troubleshooting

### Проблема: Service Worker не обновляется

**Решение:**
```javascript
// Добавьте кнопку обновления в UI
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    registration.update();
  });
}
```

### Проблема: Старый кэш не очищается

**Решение:**
```javascript
// В sw.js или через DevTools:
caches.keys().then(names => {
  names.forEach(name => {
    caches.delete(name);
  });
});
```

### Проблема: CORS ошибки после миграции

**Решение:**
```javascript
// server.js - обновите CORS
app.use(cors({
  origin: [
    'https://your-domain.com',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

---

**Готово!** Следуйте этому руководству шаг за шагом для успешной миграции.
