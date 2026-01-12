-- ==========================================
-- 🔧 ВОССТАНОВЛЕНИЕ СТРУКТУРЫ БД ПОСЛЕ ИМПОРТА
-- ==========================================
-- Этот скрипт нужно выполнить ПОСЛЕ импорта дампа
-- Он создаёт функции и триггеры для автоматического обновления updated_at
-- ==========================================

-- Создаём функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаём триггеры для всех таблиц
-- Users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Exhibits
DROP TRIGGER IF EXISTS update_exhibits_updated_at ON exhibits;
CREATE TRIGGER update_exhibits_updated_at
    BEFORE UPDATE ON exhibits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Wishlist
DROP TRIGGER IF EXISTS update_wishlist_updated_at ON wishlist;
CREATE TRIGGER update_wishlist_updated_at
    BEFORE UPDATE ON wishlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Collections
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Notifications
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Messages
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Guestbook
DROP TRIGGER IF EXISTS update_guestbook_updated_at ON guestbook;
CREATE TRIGGER update_guestbook_updated_at
    BEFORE UPDATE ON guestbook
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Создаём индексы производительности (если их нет)
-- (Эти индексы могут уже быть в дампе, поэтому используем IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_exhibits_updated_at ON exhibits(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_updated_at ON wishlist(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications((data->>'recipient'));
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications((data->>'timestamp') DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_timestamp ON notifications((data->>'recipient'), (data->>'timestamp') DESC);

-- Анализируем таблицы для обновления статистики
ANALYZE users;
ANALYZE exhibits;
ANALYZE wishlist;
ANALYZE collections;
ANALYZE notifications;
ANALYZE messages;
ANALYZE guestbook;

SELECT 'Структура БД успешно восстановлена!' as status;
