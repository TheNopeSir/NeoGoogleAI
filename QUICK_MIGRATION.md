# ⚡ Быстрая миграция NeoArchive

## 🚀 Миграция базы данных (3 шага)

### Шаг 1: Экспорт данных из старой БД

```bash
# Установите переменные окружения для старой БД
export OLD_SUPABASE_URL="https://kovcgjtqbvmuzhsrcktd.supabase.co"
export OLD_SUPABASE_SERVICE_KEY="your-old-service-role-key"

# Запустите экспорт
npm run migrate:export
```

Данные будут сохранены в папку `./migration-data/`

### Шаг 2: Создайте новую БД в Supabase

1. Перейдите на https://supabase.com
2. Создайте новый проект
3. Скопируйте SQL из `MIGRATION_GUIDE.md` (раздел "Создайте схему таблиц")
4. Выполните SQL в SQL Editor вашего нового проекта

### Шаг 3: Импорт данных в новую БД

```bash
# Установите переменные окружения для новой БД
export NEW_SUPABASE_URL="https://your-new-project.supabase.co"
export NEW_SUPABASE_SERVICE_KEY="your-new-service-role-key"

# Запустите импорт
npm run migrate:import
```

### ✅ Готово!

Обновите конфигурацию:

```bash
# Создайте .env файл
cat > .env << EOF
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-new-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
EOF

# Обновите server.js (строки 17, 20)
# Замените хардкоженные значения на:
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

---

## ⚡ Кэширование (уже настроено!)

### ✅ Что уже работает:

1. **Service Worker (PWA)**
   - Автоматическое кэширование статики
   - Офлайн-режим
   - Умное кэширование изображений и API

2. **HTTP заголовки**
   - Assets: кэш на 1 год (immutable)
   - HTML: кэш на 5 минут
   - Service Worker: без кэша (всегда свежий)

3. **Оптимизация**
   - Gzip/Brotli сжатие
   - Code splitting готов
   - Lazy loading компонентов

### 🎯 Проверьте кэш:

```bash
# Пересоберите проект
npm run build

# Запустите сервер
npm start

# Откройте DevTools → Application → Cache Storage
# Вы должны увидеть:
# - workbox-precache-...
# - external-images
# - api-cache
# - supabase-storage
# - avatar-cache
```

---

## 📊 Сравнение до/после

### Было:
- ❌ Простое кэширование
- ❌ Нет оптимизации для мобильных
- ❌ Медленная загрузка повторных посещений

### Стало:
- ✅ Многоуровневое кэширование
- ✅ PWA с офлайн-режимом
- ✅ Быстрая загрузка (кэш на 1 год для assets)
- ✅ Service Worker с умными стратегиями
- ✅ API кэш на 5 минут

---

## 🔧 Дополнительная оптимизация (опционально)

### Redis для API кэширования:

```bash
# Установите Redis
npm install ioredis

# Создайте cache.js (см. MIGRATION_GUIDE.md)
# Используйте в API routes
```

### React Query для client-side кэша:

```bash
npm install @tanstack/react-query

# Добавьте в App.tsx (см. MIGRATION_GUIDE.md)
```

### CDN для статики:

- Cloudflare: бесплатно
- Vercel: бесплатно для фронтенда
- AWS CloudFront: pay-as-you-go

---

## 🆘 Помощь

### Проблемы с миграцией?

```bash
# Проверьте логи
cat ./migration-data/_metadata.json
cat ./migration-data/_import-report.json

# Повторите импорт (безопасно - upsert)
npm run migrate:import
```

### Service Worker не обновляется?

```javascript
// В DevTools Console:
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(reg => reg.unregister()));

// Обновите страницу
location.reload();
```

### Кэш не работает?

```bash
# Проверьте заголовки
curl -I http://localhost:3000/assets/index-Bu2Mz4Vh.js

# Должны быть:
# Cache-Control: public, max-age=31536000, immutable
```

---

**Готово!** Полное руководство см. в `MIGRATION_GUIDE.md`
