# 🚀 Миграция с Supabase на собственную инфраструктуру

## Проблема: Превышение лимитов Supabase Free Plan

**Ваши текущие показатели:**
- **Egress:** 15.7 GB / 5 GB (314%) ⚠️ КРИТИЧНО
- **Database:** 0.035 GB / 0.5 GB (7%) ✅
- **Storage:** 0 GB / 1 GB ✅

**Основная проблема:** Исходящий трафик (Egress) превышен в 3 раза!

---

## 🎯 Решение: Полный переход на собственный стек

### Стек технологий:

1. **База данных:** PostgreSQL (самостоятельный или managed)
2. **Файловое хранилище:** MinIO / S3-совместимое хранилище
3. **Сервер:** Node.js + Express (уже есть)
4. **Хостинг:** VPS или Docker

### Преимущества:

✅ **Никаких лимитов на Egress**
✅ **Полный контроль над данными**
✅ **Стоимость:** $5-15/месяц вместо $25+ на Supabase Pro
✅ **Масштабируемость:** добавляйте ресурсы по мере роста
✅ **Независимость:** не зависите от внешних сервисов

---

## 📊 План миграции

### Этап 1: Настройка PostgreSQL

#### Вариант A: Managed PostgreSQL (рекомендуется для начала)

**1. Neon (бесплатно до 3 GB, без лимита Egress):**
```bash
# 1. Создайте аккаунт на https://neon.tech
# 2. Создайте новый проект
# 3. Скопируйте connection string:
# postgresql://user:password@ep-xxx.neon.tech/neoarchive?sslmode=require
```

**2. Railway (PostgreSQL + хостинг, $5/месяц):**
```bash
# 1. Создайте проект на https://railway.app
# 2. Добавьте PostgreSQL сервис
# 3. Connection string появится автоматически
```

**3. Supabase PostgreSQL (только БД, без их API):**
```bash
# Используйте прямое подключение к PostgreSQL
# Connection string: смотрите в Settings → Database → Connection string
```

#### Вариант B: Собственный VPS

**DigitalOcean / Hetzner / Contabo ($5-10/месяц):**

```bash
# 1. Создайте VPS (Ubuntu 22.04, 2GB RAM)
# 2. Установите PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# 3. Настройте PostgreSQL
sudo -u postgres psql
CREATE DATABASE neoarchive;
CREATE USER neoarchive_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE neoarchive TO neoarchive_user;
\q

# 4. Настройте удалённый доступ
sudo nano /etc/postgresql/14/main/postgresql.conf
# Измените: listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Добавьте: host all all 0.0.0.0/0 md5

sudo systemctl restart postgresql

# 5. Настройте firewall
sudo ufw allow 5432/tcp
```

**Connection string:**
```
postgresql://neoarchive_user:your_secure_password@your-vps-ip:5432/neoarchive
```

---

### Этап 2: Настройка файлового хранилища

У вас Storage = 0 GB, значит файлы не хранятся в Supabase Storage.

**Варианты для будущего:**

#### 1. MinIO (S3-совместимое, self-hosted)

```bash
# Docker setup
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=admin" \
  -e "MINIO_ROOT_PASSWORD=your_secure_password" \
  -v ~/minio/data:/data \
  quay.io/minio/minio server /data --console-address ":9001"

# Создайте bucket "neoarchive"
# Используйте MinIO Client или Web UI: http://your-server:9001
```

#### 2. Cloudflare R2 (S3-совместимое, $0.015/GB)

- Без Egress комиссии! ⚡
- 10 GB бесплатно
- S3-совместимый API

#### 3. Backblaze B2 ($0.005/GB storage, $0.01/GB egress после 3x)

- Очень дешёво
- S3-совместимый API

#### 4. Локальное хранилище (если файлов мало)

```javascript
// Просто храните в /uploads на сервере
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1y'
}));
```

---

### Этап 3: Миграция данных

#### Экспорт из Supabase

Используйте обновлённый скрипт `migration-export.js`:

```bash
# Установите переменные
export OLD_SUPABASE_URL="https://kovcgjtqbvmuzhsrcktd.supabase.co"
export OLD_SUPABASE_SERVICE_KEY="your-service-role-key"

# Экспортируйте данные
npm run migrate:export
```

#### Импорт в PostgreSQL

Используйте новый скрипт `migration-import-postgres.js` (создам ниже):

```bash
# Установите pg драйвер
npm install pg

# Установите connection string
export DATABASE_URL="postgresql://user:password@host:5432/neoarchive"

# Импортируйте данные
npm run migrate:import:pg
```

---

### Этап 4: Обновление кода приложения

#### Вариант 1: Прямое подключение к PostgreSQL (рекомендуется)

**Установите драйвер:**
```bash
npm install pg
```

**Создайте db.js:**
```javascript
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Тестируем подключение
pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err);
});

export default pool;
```

**Обновите API routes в server.js:**
```javascript
import pool from './db.js';

// GET /api/sync - получить все данные
app.get('/api/sync', async (req, res) => {
  try {
    const users = await pool.query('SELECT * FROM users');
    const exhibits = await pool.query('SELECT * FROM exhibits ORDER BY timestamp DESC');
    const collections = await pool.query('SELECT * FROM collections ORDER BY timestamp DESC');
    const notifications = await pool.query('SELECT * FROM notifications ORDER BY timestamp DESC');
    const messages = await pool.query('SELECT * FROM messages ORDER BY timestamp ASC');
    const guestbook = await pool.query('SELECT * FROM guestbook ORDER BY timestamp DESC');

    res.json({
      users: users.rows.map(r => r.data),
      exhibits: exhibits.rows.map(r => r.data),
      collections: collections.rows.map(r => r.data),
      notifications: notifications.rows.map(r => r.data),
      messages: messages.rows.map(r => r.data),
      guestbook: guestbook.rows.map(r => r.data),
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/update - обновить пользователя
app.post('/api/users/update', async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO users (username, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (username) DO UPDATE SET data = $2, updated_at = NOW()',
      [req.body.username, req.body]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/exhibits - создать/обновить экспонат
app.post('/api/exhibits', async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO exhibits (id, data, timestamp) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $2, timestamp = $3',
      [req.body.id, req.body, new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/exhibits/:id - удалить экспонат
app.delete('/api/exhibits/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM exhibits WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Аналогично для других таблиц...
```

#### Вариант 2: Использовать Prisma ORM (современный подход)

```bash
npm install prisma @prisma/client
npx prisma init
```

**prisma/schema.prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  username  String   @id
  data      Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Exhibit {
  id        String   @id
  data      Json
  timestamp DateTime
  createdAt DateTime @default(now()) @map("created_at")

  @@map("exhibits")
}

// ... другие модели
```

```bash
# Создайте миграцию
npx prisma migrate dev --name init

# Сгенерируйте клиент
npx prisma generate
```

**Использование в server.js:**
```javascript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

app.get('/api/sync', async (req, res) => {
  const users = await prisma.user.findMany();
  const exhibits = await prisma.exhibit.findMany({
    orderBy: { timestamp: 'desc' }
  });
  // ...
});
```

---

### Этап 5: Деплой

#### Вариант A: Railway (самый простой)

1. Push код на GitHub
2. Создайте проект на Railway
3. Добавьте PostgreSQL сервис
4. Подключите GitHub репозиторий
5. Добавьте переменную окружения: `DATABASE_URL` (автоматически)
6. Deploy! 🚀

**Стоимость:** ~$5-10/месяц (PostgreSQL + веб-сервер)

#### Вариант B: VPS (полный контроль)

**DigitalOcean / Hetzner ($5-10/месяц):**

```bash
# 1. Подключитесь к VPS
ssh root@your-vps-ip

# 2. Установите Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Установите PM2
sudo npm install -g pm2

# 4. Клонируйте проект
cd /var/www
git clone https://github.com/your-repo/neoarchive.git
cd neoarchive

# 5. Настройте окружение
cat > .env << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/neoarchive
EOF

# 6. Установите зависимости
npm install

# 7. Соберите проект
npm run build

# 8. Запустите с PM2
pm2 start server.js --name neoarchive
pm2 save
pm2 startup

# 9. Настройте Nginx (опционально)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/neoarchive
```

**Nginx конфигурация:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

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

#### Вариант C: Docker (переносимость)

**Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm ci --only=production

# Копирование кода
COPY . .

# Сборка
RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: neoarchive
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: neoarchive
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://neoarchive:your_password@postgres:5432/neoarchive
      NODE_ENV: production
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
# Запуск
docker-compose up -d

# Миграция данных
docker-compose exec app npm run migrate:import:pg
```

---

## 💰 Сравнение стоимости

### Supabase Pro:
- **$25/месяц**
- 50 GB Egress (вы уже превысили на Free)
- 8 GB Database
- 100 GB Storage

### Самостоятельный стек:

**Вариант 1: Railway**
- PostgreSQL: $5/месяц
- Web Server: $5/месяц
- **Итого: $10/месяц**
- ✅ Без лимитов Egress

**Вариант 2: VPS (Hetzner/Contabo)**
- VPS (4GB RAM): $5-10/месяц
- PostgreSQL: включено
- Web Server: включено
- **Итого: $5-10/месяц**
- ✅ Без лимитов Egress
- ✅ Полный контроль

**Вариант 3: VPS + Managed DB**
- VPS: $5/месяц
- Neon PostgreSQL: бесплатно (до 3 GB)
- **Итого: $5/месяц**
- ✅ Без лимитов Egress

---

## 📋 Чеклист миграции

### Подготовка:
- [ ] Выберите PostgreSQL провайдер (Neon/Railway/VPS)
- [ ] Создайте базу данных
- [ ] Получите connection string
- [ ] (Опционально) Настройте файловое хранилище

### Миграция данных:
- [ ] Экспортируйте данные: `npm run migrate:export`
- [ ] Создайте схему в новой БД (SQL скрипт ниже)
- [ ] Импортируйте данные: `npm run migrate:import:pg`
- [ ] Проверьте данные в новой БД

### Обновление кода:
- [ ] Установите `pg`: `npm install pg`
- [ ] Создайте `db.js` (скрипт ниже)
- [ ] Обновите `server.js` (скрипт ниже)
- [ ] Удалите Supabase SDK: `npm uninstall @supabase/supabase-js`
- [ ] Обновите `.env` с `DATABASE_URL`

### Деплой:
- [ ] Выберите хостинг (Railway/VPS/Docker)
- [ ] Деплойте приложение
- [ ] Настройте домен и SSL
- [ ] Проверьте работу всех API endpoints

### Очистка:
- [ ] Удалите старые данные из Supabase
- [ ] Удалите проект Supabase (если не нужен)
- [ ] Обновите документацию

---

## 🎯 Следующие шаги

Я создам для вас:

1. ✅ SQL схему для PostgreSQL
2. ✅ `migration-import-postgres.js` - импорт в PostgreSQL
3. ✅ `db.js` - подключение к PostgreSQL
4. ✅ Обновлённый `server.js` - без Supabase
5. ✅ Инструкции для разных хостингов

**Готов начать?** Сообщите:
- Какой вариант PostgreSQL выбираете? (Neon/Railway/VPS)
- Нужно ли файловое хранилище? (MinIO/R2/локально)
- Какой хостинг предпочитаете? (Railway/VPS/Docker)

Я обновлю код под ваш выбор! 🚀
