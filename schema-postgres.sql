-- ==========================================
-- NeoArchive PostgreSQL Schema
-- Схема для миграции с Supabase
-- ==========================================

-- Удаляем существующие таблицы (если нужен полный сброс)
-- DROP TABLE IF EXISTS users, exhibits, collections, notifications, messages, guestbook CASCADE;

-- ==========================================
-- ТАБЛИЦЫ
-- ==========================================

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица экспонатов
CREATE TABLE IF NOT EXISTS exhibits (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица коллекций
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица уведомлений
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица гостевой книги
CREATE TABLE IF NOT EXISTS guestbook (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ИНДЕКСЫ для ускорения запросов
-- ==========================================

-- Индексы на timestamp для сортировки
CREATE INDEX IF NOT EXISTS idx_exhibits_timestamp ON exhibits(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_collections_timestamp ON collections(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_guestbook_timestamp ON guestbook(timestamp DESC);

-- Индексы на JSONB поля для частых запросов
CREATE INDEX IF NOT EXISTS idx_exhibits_owner ON exhibits USING gin ((data->'owner'));
CREATE INDEX IF NOT EXISTS idx_exhibits_category ON exhibits USING gin ((data->'category'));
CREATE INDEX IF NOT EXISTS idx_collections_owner ON collections USING gin ((data->'owner'));
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications USING gin ((data->'recipient'));
CREATE INDEX IF NOT EXISTS idx_users_username ON users USING gin ((data->'username'));

-- Полнотекстовый поиск (опционально)
-- CREATE INDEX IF NOT EXISTS idx_exhibits_fulltext ON exhibits USING gin (to_tsvector('english', data::text));

-- ==========================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ==========================================

-- Функция автообновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- СТАТИСТИКА И ОПТИМИЗАЦИЯ
-- ==========================================

-- Обновляем статистику для оптимизатора
ANALYZE users;
ANALYZE exhibits;
ANALYZE collections;
ANALYZE notifications;
ANALYZE messages;
ANALYZE guestbook;

-- ==========================================
-- ГОТОВО!
-- ==========================================

-- Проверяем созданные таблицы
\dt

-- Проверяем индексы
\di

-- Информация о размерах таблиц
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Примеры запросов для проверки
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM exhibits;
-- SELECT data->>'username' as username FROM users LIMIT 5;
-- SELECT data->>'title' as title, data->>'owner' as owner FROM exhibits LIMIT 5;
