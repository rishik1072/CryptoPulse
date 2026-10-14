-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PROFILES TABLE (Extended user profile)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    date_of_birth DATE,
    country TEXT,
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    currency TEXT DEFAULT 'USD',
    theme TEXT DEFAULT 'system',
    bio TEXT,
    website TEXT,
    twitter TEXT,
    linkedin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, phone)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    price_alerts BOOLEAN DEFAULT TRUE,
    volume_alerts BOOLEAN DEFAULT TRUE,
    news_alerts BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    weekly_report BOOLEAN DEFAULT TRUE,
    -- Security preferences
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    login_alerts BOOLEAN DEFAULT TRUE,
    session_timeout INTEGER DEFAULT 3600, -- seconds
    -- Display preferences
    compact_mode BOOLEAN DEFAULT FALSE,
    show_percentages BOOLEAN DEFAULT TRUE,
    default_chart_type TEXT DEFAULT 'candlestick',
    default_timeframe TEXT DEFAULT '1D',
    -- Trading preferences
    default_order_type TEXT DEFAULT 'market',
    confirm_orders BOOLEAN DEFAULT TRUE,
    slippage_tolerance DECIMAL(5,2) DEFAULT 0.5,
    -- Privacy preferences
    profile_visibility TEXT DEFAULT 'private', -- private, public, connections
    show_portfolio_value BOOLEAN DEFAULT FALSE,
    show_holdings BOOLEAN DEFAULT FALSE,
    analytics_opt_out BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-create preferences on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();

-- ============================================
-- PORTFOLIO TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Main Portfolio',
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    total_value DECIMAL(20, 8) DEFAULT 0,
    total_cost DECIMAL(20, 8) DEFAULT 0,
    total_pnl DECIMAL(20, 8) DEFAULT 0,
    total_pnl_percent DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolios" ON portfolios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolios" ON portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON portfolios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON portfolios
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- HOLDINGS TABLE (Current positions)
-- ============================================
CREATE TABLE IF NOT EXISTS holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coin_id TEXT NOT NULL, -- CoinGecko ID
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity DECIMAL(30, 10) NOT NULL DEFAULT 0,
    average_cost DECIMAL(20, 8) NOT NULL DEFAULT 0,
    current_price DECIMAL(20, 8) DEFAULT 0,
    current_value DECIMAL(20, 8) DEFAULT 0,
    unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
    unrealized_pnl_percent DECIMAL(10, 2) DEFAULT 0,
    allocation_percent DECIMAL(10, 2) DEFAULT 0,
    first_bought_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_id, coin_id)
);

ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own holdings" ON holdings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own holdings" ON holdings
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance and RLS filtering
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_id ON holdings(portfolio_id);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,
    coin_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'staking_reward', 'airdrop', 'other')),
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(30, 10) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    total_value DECIMAL(20, 8) NOT NULL,
    fee DECIMAL(20, 8) DEFAULT 0,
    fee_currency TEXT DEFAULT 'USD',
    exchange TEXT,
    transaction_hash TEXT,
    block_number BIGINT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    notes TEXT,
    tags TEXT[],
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_coin_id ON transactions(coin_id);
CREATE INDEX IF NOT EXISTS idx_transactions_executed_at ON transactions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- ============================================
-- WATCHLIST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Default Watchlist',
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlists" ON watchlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own watchlists" ON watchlists
    FOR ALL USING (auth.uid() = user_id);

-- Watchlist items
CREATE TABLE IF NOT EXISTS watchlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coin_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    target_price_above DECIMAL(20, 8),
    target_price_below DECIMAL(20, 8),
    alert_on_24h_change DECIMAL(10, 2),
    alert_on_volume_spike BOOLEAN DEFAULT FALSE,
    UNIQUE(watchlist_id, coin_id)
);

ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist items" ON watchlist_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own watchlist items" ON watchlist_items
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coin_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('price_above', 'price_below', 'price_change_24h', 'volume_spike', 'market_cap', 'fear_greed')),
    condition TEXT NOT NULL CHECK (condition IN ('above', 'below', 'increase', 'decrease')),
    target_value DECIMAL(20, 8) NOT NULL,
    current_value DECIMAL(20, 8),
    is_active BOOLEAN DEFAULT TRUE,
    is_triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMPTZ,
    triggered_value DECIMAL(20, 8),
    notification_methods TEXT[] DEFAULT ARRAY['browser'],
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own alerts" ON alerts
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_coin_id ON alerts(coin_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON alerts(is_active) WHERE is_active = TRUE;

-- ============================================
-- USER SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    location JSONB,
    is_current BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions" ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);

-- ============================================
-- USER DEVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT, -- mobile, desktop, tablet
    os TEXT,
    browser TEXT,
    push_token TEXT,
    is_trusted BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices" ON user_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own devices" ON user_devices
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CONNECTED ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_connected_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- google, github, twitter, etc.
    provider_user_id TEXT NOT NULL,
    provider_email TEXT,
    provider_data JSONB,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    UNIQUE(user_id, provider)
);

ALTER TABLE user_connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connected accounts" ON user_connected_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own connected accounts" ON user_connected_accounts
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    category TEXT, -- auth, portfolio, trading, security, settings, etc.
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs" ON activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" ON activity_logs
    FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- price_alert, volume_alert, news, system, security, portfolio
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- SETTINGS TABLE (App-level settings)
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON app_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own settings" ON app_settings
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- PORTFOLIO SNAPSHOTS (for performance charts)
-- ============================================
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    total_value DECIMAL(20, 8) NOT NULL,
    total_cost DECIMAL(20, 8) NOT NULL,
    total_pnl DECIMAL(20, 8) NOT NULL,
    total_pnl_percent DECIMAL(10, 2) NOT NULL,
    holdings_snapshot JSONB, -- JSON snapshot of holdings at this time
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio snapshots" ON portfolio_snapshots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert portfolio snapshots" ON portfolio_snapshots
    FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_id ON portfolio_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_recorded_at ON portfolio_snapshots(recorded_at DESC);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portfolios_updated_at ON portfolios;
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_holdings_updated_at ON holdings;
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON holdings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_watchlists_updated_at ON watchlists;
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_devices_updated_at ON user_devices;
CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON user_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
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

-- ============================================
-- FUNCTIONS FOR PORTFOLIO CALCULATIONS
-- ============================================
CREATE OR REPLACE FUNCTION calculate_portfolio_totals(p_portfolio_id UUID)
RETURNS TABLE (
    total_value DECIMAL(20, 8),
    total_cost DECIMAL(20, 8),
    total_pnl DECIMAL(20, 8),
    total_pnl_percent DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(h.current_value), 0) as total_value,
        COALESCE(SUM(h.quantity * h.average_cost), 0) as total_cost,
        COALESCE(SUM(h.unrealized_pnl), 0) as total_pnl,
        CASE 
            WHEN COALESCE(SUM(h.quantity * h.average_cost), 0) > 0 
            THEN ROUND((COALESCE(SUM(h.unrealized_pnl), 0) / COALESCE(SUM(h.quantity * h.average_cost), 0)) * 100, 2)
            ELSE 0
        END as total_pnl_percent
    FROM holdings h
    WHERE h.portfolio_id = p_portfolio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update portfolio totals
CREATE OR REPLACE FUNCTION update_portfolio_totals(p_portfolio_id UUID)
RETURNS VOID AS $$
DECLARE
    v_totals RECORD;
BEGIN
    SELECT * INTO v_totals FROM calculate_portfolio_totals(p_portfolio_id);
    
    UPDATE portfolios
    SET 
        total_value = v_totals.total_value,
        total_cost = v_totals.total_cost,
        total_pnl = v_totals.total_pnl,
        total_pnl_percent = v_totals.total_pnl_percent,
        updated_at = NOW()
    WHERE id = p_portfolio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update portfolio totals when holdings change
CREATE OR REPLACE FUNCTION trigger_update_portfolio_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM update_portfolio_totals(OLD.portfolio_id);
        RETURN OLD;
    ELSE
        PERFORM update_portfolio_totals(NEW.portfolio_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_holdings_portfolio_totals ON holdings;
CREATE TRIGGER trigger_holdings_portfolio_totals
    AFTER INSERT OR UPDATE OR DELETE ON holdings
    FOR EACH ROW EXECUTE FUNCTION trigger_update_portfolio_totals();

-- ============================================
-- DEFAULT PORTFOLIO CREATION
-- ============================================
CREATE OR REPLACE FUNCTION create_default_portfolio()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO portfolios (user_id, name, is_default)
    VALUES (NEW.id, 'Main Portfolio', TRUE)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_portfolio ON auth.users;
CREATE TRIGGER on_auth_user_created_portfolio
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_portfolio();

-- ============================================
-- DEFAULT WATCHLIST CREATION
-- ============================================
CREATE OR REPLACE FUNCTION create_default_watchlist()
RETURNS TRIGGER AS $$
DECLARE
    v_watchlist_id UUID;
BEGIN
    INSERT INTO watchlists (user_id, name, is_default)
    VALUES (NEW.id, 'Default Watchlist', TRUE)
    RETURNING id INTO v_watchlist_id;
    
    -- Add some default coins to watchlist
    INSERT INTO watchlist_items (watchlist_id, user_id, coin_id, symbol, name)
    VALUES 
        (v_watchlist_id, NEW.id, 'bitcoin', 'BTC', 'Bitcoin'),
        (v_watchlist_id, NEW.id, 'ethereum', 'ETH', 'Ethereum'),
        (v_watchlist_id, NEW.id, 'solana', 'SOL', 'Solana'),
        (v_watchlist_id, NEW.id, 'cardano', 'ADA', 'Cardano'),
        (v_watchlist_id, NEW.id, 'polkadot', 'DOT', 'Polkadot')
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_watchlist ON auth.users;
CREATE TRIGGER on_auth_user_created_watchlist
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_watchlist();