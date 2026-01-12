-- ==========================================
-- 🔧 ПОДГОТОВКА БД К ИМПОРТУ ДАМПА
-- ==========================================
-- Этот скрипт нужно выполнить ПЕРЕД импортом дампа
-- Он удаляет все функции и триггеры, которые могут конфликтовать
-- ==========================================

-- Удаляем функцию с CASCADE (удалит все зависимые триггеры)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Если нужно удалить триггеры вручную (на случай если CASCADE не сработал)
DROP TRIGGER IF EXISTS update_users_updated_at ON users CASCADE;
DROP TRIGGER IF EXISTS update_exhibits_updated_at ON exhibits CASCADE;
DROP TRIGGER IF EXISTS update_wishlist_updated_at ON wishlist CASCADE;
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections CASCADE;
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications CASCADE;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages CASCADE;
DROP TRIGGER IF EXISTS update_guestbook_updated_at ON guestbook CASCADE;

-- Очищаем все таблицы (если нужен полный сброс)
-- ВНИМАНИЕ: Раскомментируйте следующие строки только если хотите удалить ВСЕ данные!
-- TRUNCATE TABLE users CASCADE;
-- TRUNCATE TABLE exhibits CASCADE;
-- TRUNCATE TABLE wishlist CASCADE;
-- TRUNCATE TABLE collections CASCADE;
-- TRUNCATE TABLE notifications CASCADE;
-- TRUNCATE TABLE messages CASCADE;
-- TRUNCATE TABLE guestbook CASCADE;

-- Альтернативный вариант: Удалить таблицы полностью и создать заново
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS exhibits CASCADE;
-- DROP TABLE IF EXISTS wishlist CASCADE;
-- DROP TABLE IF EXISTS collections CASCADE;
-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS guestbook CASCADE;

SELECT 'БД готова к импорту дампа!' as status;
