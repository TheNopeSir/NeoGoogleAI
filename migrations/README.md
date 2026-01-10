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
