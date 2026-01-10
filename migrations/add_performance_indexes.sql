-- Performance optimization indexes
-- Add indexes for ORDER BY updated_at DESC queries

-- Index for exhibits feed (most critical)
CREATE INDEX IF NOT EXISTS idx_exhibits_updated_at ON exhibits(updated_at DESC);

-- Index for users list
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at DESC);

-- Index for wishlist
CREATE INDEX IF NOT EXISTS idx_wishlist_updated_at ON wishlist(updated_at DESC);

-- Index for collections
CREATE INDEX IF NOT EXISTS idx_collections_updated_at ON collections(updated_at DESC);

-- Index for notifications (filtered queries)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications((data->>'recipient'));
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications((data->>'timestamp') DESC);

-- Composite index for notifications (most efficient for common query)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_timestamp ON notifications((data->>'recipient'), (data->>'timestamp') DESC);

-- Optional: Analyze tables to update statistics
ANALYZE exhibits;
ANALYZE users;
ANALYZE wishlist;
ANALYZE collections;
ANALYZE notifications;
