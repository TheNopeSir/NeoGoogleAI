# Database Migrations

## 🔄 Database Restore from Backup

### Проблема: Ошибка при импорте дампа

Если при импорте дампа вы видите ошибку:
```
ERROR: cannot drop function update_updated_at_column() because other objects depend on it
DETAIL: trigger update_users_updated_at on table users depends on function update_updated_at_column()
HINT: Use DROP ... CASCADE to drop the dependent objects too.
```

### Решение: 3 шага

#### Шаг 1: Подготовка БД (перед импортом)

Выполните скрипт `prepare_db_for_restore.sql`:

```bash
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME -f migrations/prepare_db_for_restore.sql
```

**Или через Adminer/pgAdmin:**
1. Откройте файл `migrations/prepare_db_for_restore.sql`
2. Скопируйте содержимое
3. Вставьте в SQL редактор и выполните

#### Шаг 2: Импорт дампа

Теперь импортируйте ваш дамп:

```bash
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME -f your_backup.sql
```

**Или через Adminer:**
1. Перейдите в раздел "Импорт"
2. Выберите ваш SQL файл
3. **Установите галочку "Остановить при ошибке"** (необязательно)
4. Нажмите "Выполнить"

#### Шаг 3: Восстановление структуры (после импорта)

Выполните скрипт `restore_db_structure.sql`:

```bash
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME -f migrations/restore_db_structure.sql
```

**Или через Adminer/pgAdmin:**
1. Откройте файл `migrations/restore_db_structure.sql`
2. Скопируйте содержимое
3. Вставьте в SQL редактор и выполните

### Что делают эти скрипты?

- **prepare_db_for_restore.sql** - удаляет все триггеры, функции и индексы, которые могут конфликтовать с импортом
- **restore_db_structure.sql** - восстанавливает функцию `update_updated_at_column()`, все триггеры и индексы для правильной работы БД

### ⚠️ Важные примечания

- Если при импорте дампа вы видите ошибки типа `ERROR: zero-length delimited identifier`, это нормально - просто продолжайте импорт
- Эти ошибки возникают из-за конфликтующих индексов в старом дампе
- После выполнения Шага 3 (restore_db_structure.sql) все индексы будут созданы правильно
- Если Adminer показывает ошибки при импорте - **не паникуйте**, главное чтобы данные были импортированы (проверьте таблицы после импорта)

---

## Performance Optimization Migration

### File: `add_performance_indexes.sql`

This migration adds database indexes to improve query performance.

### How to Apply

**Option 1: Using psql**
```bash
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME -f migrations/add_performance_indexes.sql
```

**Option 2: Using Supabase SQL Editor**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `add_performance_indexes.sql`
3. Paste and click "Run"

**Option 3: Programmatically (Node.js)**
```javascript
import fs from 'fs';
import pg from 'pg';

const pool = new pg.Pool({ /* your config */ });
const sql = fs.readFileSync('./migrations/add_performance_indexes.sql', 'utf8');
await pool.query(sql);
```

### Expected Impact

- **70-90% faster** ORDER BY queries on large tables
- **Instant** feed loading (with caching)
- **Reduced** database CPU usage

### Verify Indexes

```sql
-- Check if indexes were created
SELECT indexname, tablename FROM pg_indexes WHERE tablename IN ('exhibits', 'users', 'wishlist', 'collections', 'notifications');
```

### Rollback (if needed)

```sql
DROP INDEX IF EXISTS idx_exhibits_updated_at;
DROP INDEX IF EXISTS idx_users_updated_at;
DROP INDEX IF EXISTS idx_wishlist_updated_at;
DROP INDEX IF EXISTS idx_collections_updated_at;
DROP INDEX IF EXISTS idx_notifications_recipient;
DROP INDEX IF EXISTS idx_notifications_timestamp;
DROP INDEX IF EXISTS idx_notifications_recipient_timestamp;
```
