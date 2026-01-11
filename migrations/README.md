# Database Migrations

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

---

## Fix Artifact Descriptions Migration

### Files:
- `fix-artifact-descriptions.sql` - SQL миграция
- `fix-artifacts-migration.js` - Node.js скрипт миграции

### Проблема

В базе данных обнаружены артефакты с:
- Отсутствующими или слишком короткими описаниями (обрывки текста)
- Отсутствующими массивами комментариев (comments)
- Отсутствующими объектами характеристик (specs)

### Решение

Миграция автоматически:
1. Генерирует описания для артефактов без описаний на основе title, category, subcategory
2. Добавляет пустой массив `comments: []` для артефактов без поля комментариев
3. Добавляет пустой объект `specs: {}` для артефактов без характеристик

### Как применить

#### Вариант 1: SQL миграция (быстрая)

```bash
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME -f migrations/fix-artifact-descriptions.sql
```

или через Supabase SQL Editor:
1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте содержимое `fix-artifact-descriptions.sql`
3. Вставьте и нажмите "Run"

#### Вариант 2: Node.js скрипт (детальный лог)

```bash
# Предварительный просмотр изменений (dry-run)
node migrations/fix-artifacts-migration.js --dry-run

# Применить изменения
node migrations/fix-artifacts-migration.js
```

**Требования:**
- Node.js 16+
- Настроенный файл `.env` с параметрами подключения к БД:
  ```env
  DB_USER=your_db_user
  DB_PASSWORD=your_db_password
  DB_HOST=your_db_host
  DB_NAME=your_db_name
  ```

### Что делает миграция

**До:**
```json
{
  "id": "artifact-123",
  "title": "Nokia 3310",
  "description": "",  // ❌ Пустое или короткое
  "category": "ТЕЛЕФОНЫ"
  // ❌ Нет поля comments
  // ❌ Нет поля specs
}
```

**После:**
```json
{
  "id": "artifact-123",
  "title": "Nokia 3310",
  "description": "Nokia 3310 - уникальный экспонат коллекции. Категория: ТЕЛЕФОНЫ.",  // ✅
  "category": "ТЕЛЕФОНЫ",
  "comments": [],  // ✅
  "specs": {}      // ✅
}
```

### Безопасность

- ✅ Миграция **НЕ изменяет** существующие корректные данные
- ✅ Только **добавляет** отсутствующие поля или **заполняет** пустые
- ✅ Поддерживает режим `--dry-run` для предварительного просмотра
- ✅ Транзакционная безопасность (rollback при ошибках)

### Проверка результатов

```sql
-- Проверить количество артефактов с корректными данными
SELECT
    COUNT(*) as total_artifacts,
    COUNT(CASE WHEN data->>'description' IS NOT NULL AND LENGTH(TRIM(data->>'description')) >= 5 THEN 1 END) as with_description,
    COUNT(CASE WHEN data->'comments' IS NOT NULL AND jsonb_typeof(data->'comments') = 'array' THEN 1 END) as with_comments_array,
    COUNT(CASE WHEN data->'specs' IS NOT NULL AND jsonb_typeof(data->'specs') = 'object' THEN 1 END) as with_specs_object
FROM exhibits;
```

### Откат (Rollback)

Эта миграция **не требует отката**, так как она только добавляет отсутствующие данные, не удаляя существующие. Если необходимо вернуть оригинальное состояние, восстановите из бэкапа БД.
