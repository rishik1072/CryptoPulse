-- ==============================================================================
-- CryptoPulse Phase 3: Reliable User Persistence, Database Security & RLS Hardening
-- Migration: 20240102000000_phase3_user_persistence.sql
-- ==============================================================================

-- 1. Holdings table updates: support notes and image metadata
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS image TEXT;

-- 2. Watchlist items table updates: support image and pinned state
ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;

-- 3. Alerts table constraint adjustments: support uppercase and lowercase alert types
DO $$
BEGIN
    ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
    ALTER TABLE alerts ADD CONSTRAINT alerts_type_check 
        CHECK (type IN (
            'PRICE_ABOVE', 'PRICE_BELOW', 'PERCENT_CHANGE', 'DAILY_HIGH', 'DAILY_LOW', 'VOLUME_SPIKE',
            'price_above', 'price_below', 'price_change_24h', 'volume_spike', 'market_cap', 'fear_greed'
        ));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Make condition, coin_id, and name flexible for flexible alerts
ALTER TABLE alerts ALTER COLUMN condition DROP NOT NULL;
ALTER TABLE alerts ALTER COLUMN coin_id DROP NOT NULL;
ALTER TABLE alerts ALTER COLUMN name DROP NOT NULL;

-- 4. Enable Row Level Security (RLS) on all user-owned tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies with explicit WITH CHECK (auth.uid() = user_id)
-- Holdings: Prevent spoofed inserts/updates
DROP POLICY IF EXISTS "Users can manage own holdings" ON holdings;
DROP POLICY IF EXISTS "Users can view own holdings" ON holdings;

CREATE POLICY "Users can view own holdings" ON holdings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own holdings" ON holdings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own holdings" ON holdings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own holdings" ON holdings
    FOR DELETE USING (auth.uid() = user_id);

-- Watchlists & items: Prevent spoofed inserts/updates
DROP POLICY IF EXISTS "Users can manage own watchlists" ON watchlists;
DROP POLICY IF EXISTS "Users can view own watchlists" ON watchlists;

CREATE POLICY "Users can view own watchlists" ON watchlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlists" ON watchlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists" ON watchlists
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists" ON watchlists
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own watchlist items" ON watchlist_items;
DROP POLICY IF EXISTS "Users can view own watchlist items" ON watchlist_items;

CREATE POLICY "Users can view own watchlist items" ON watchlist_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist items" ON watchlist_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist items" ON watchlist_items
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist items" ON watchlist_items
    FOR DELETE USING (auth.uid() = user_id);

-- Alerts: Prevent spoofed inserts/updates
DROP POLICY IF EXISTS "Users can manage own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;

CREATE POLICY "Users can view own alerts" ON alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts" ON alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON alerts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts" ON alerts
    FOR DELETE USING (auth.uid() = user_id);

-- User Preferences: Prevent spoofed inserts/updates
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Profiles: Strict self-access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 6. Storage Bucket for User Avatars with Folder Isolation
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
