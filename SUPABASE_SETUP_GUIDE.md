# Supabase Setup Guide for CryptoPulse

This guide walks you through setting up Supabase for the CryptoPulse application, covering authentication, database tables, Row Level Security (RLS), and storage.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in/sign up
2. Click **"New Project"**
3. Choose your organization
4. Enter project details:
   - **Name**: `cryptopulse` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"**
6. Wait for the project to be ready (2-3 minutes)

---

## 2. Get API Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

3. Update your `.env` file:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 3. Configure Authentication

### 3.1 Enable Email/Password Auth
1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled (it's enabled by default)

### 3.2 Enable Google OAuth
1. Go to **Authentication** → **Providers** → **Google**
2. Toggle **Enable Google provider**
3. You'll need Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: Add your Supabase callback URL:
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     ```
   - Copy **Client ID** and **Client Secret**
4. Paste them in Supabase Google provider settings
5. Click **Save**

### 3.3 Configure Auth Settings
1. Go to **Authentication** → **Settings**
2. **Site URL**: `http://localhost:5173` (for dev) or your production URL
3. **Redirect URLs**: Add:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5173/reset-password`
   - Your production URLs
4. **Email Templates** (optional): Customize confirmation, reset password emails

---

## 4. Create Database Tables

Go to **SQL Editor** in Supabase dashboard and run each migration.

### 4.1 Users Table (extends auth.users)
```sql
-- Create profiles table that extends auth.users
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4.2 Portfolio Table
```sql
CREATE TABLE public.portfolio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity DECIMAL(30, 10) NOT NULL DEFAULT 0,
  avg_buy_price DECIMAL(30, 10) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, coin_id)
);

ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio" ON public.portfolio
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolio" ON public.portfolio
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio" ON public.portfolio
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio" ON public.portfolio
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_portfolio_user_id ON public.portfolio(user_id);
```

### 4.3 Transactions Table
```sql
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  quantity DECIMAL(30, 10) NOT NULL,
  price DECIMAL(30, 10) NOT NULL,
  total_value DECIMAL(30, 10) NOT NULL,
  fee DECIMAL(30, 10) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
```

### 4.4 Watchlist Table
```sql
CREATE TABLE public.watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, coin_id)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist" ON public.watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist" ON public.watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON public.watchlist
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_watchlist_user_id ON public.watchlist(user_id);
```

### 4.5 Alerts Table
```sql
CREATE TABLE public.alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('price_above', 'price_below', 'change_24h', 'volume_spike', 'market_cap', 'fear_greed')),
  target_value DECIMAL(30, 10) NOT NULL,
  current_value DECIMAL(30, 10),
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  notification_methods TEXT[] DEFAULT ARRAY['browser'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts" ON public.alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON public.alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts" ON public.alerts
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_active ON public.alerts(user_id, is_active) WHERE is_active = TRUE;
```

### 4.6 Settings/Preferences Table
```sql
CREATE TABLE public.user_settings (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  notifications BOOLEAN DEFAULT TRUE,
  browser_notifications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  price_alerts BOOLEAN DEFAULT TRUE,
  privacy_mode BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  connected_google BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();
```

### 4.7 Notifications Table
```sql
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
```

### 4.8 Sessions/Devices Table (for security page)
```sql
CREATE TABLE public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device TEXT NOT NULL,
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  location TEXT,
  user_agent TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
```

---

## 5. Set Up Storage for Avatars

1. Go to **Storage** in Supabase dashboard
2. Click **Create bucket**
3. Name: `avatars`
4. **Public bucket**: Enable (so avatars can be displayed publicly)
5. Click **Create bucket**

### Storage Policies
Run in SQL Editor:
```sql
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

---

## 6. Verify Setup

1. Start your dev server:
```bash
npm run dev
```

2. Navigate to `http://localhost:5173`

3. Test the following:
   - **Sign Up** with email/password
   - **Sign In** with email/password
   - **Sign In with Google** (if configured)
   - **Forgot Password** flow
   - **Settings page** - all tabs should work
   - **Profile page** - should show user data
   - **Portfolio** - should persist data
   - **Watchlist** - should persist data
   - **Alerts** - should persist data

---

## 7. Production Deployment

### 7.1 Update Environment Variables
In your hosting platform (Vercel, Netlify, etc.), add:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 7.2 Update Supabase Auth Settings
1. **Site URL**: Your production URL (e.g., `https://cryptopulse.app`)
2. **Redirect URLs**: Add production callback URLs:
   - `https://cryptopulse.app/auth/callback`
   - `https://cryptopulse.app/reset-password`

### 7.3 Google OAuth Production
1. In Google Cloud Console, add production redirect URI:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```
2. Update Supabase Google provider with production credentials if different

---

## 8. Database Maintenance

### 8.1 Backup
Supabase provides automatic daily backups on paid plans. For manual backup:
```bash
# Using Supabase CLI
supabase db dump --data-only -f backup.sql
```

### 8.2 Monitoring
- Go to **Database** → **Logs** for query performance
- Go to **Reports** for usage statistics

---

## 9. Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env` file is in project root
- Restart dev server after changing `.env`
- Check variable names match exactly: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### "Row Level Security policy violation"
- Check that user is authenticated
- Verify RLS policies allow the operation
- Check `auth.uid()` matches the user_id in the table

### Google OAuth not working
- Verify redirect URI in Google Cloud Console matches Supabase
- Check that Google provider is enabled in Supabase
- Ensure Site URL and Redirect URLs are configured in Supabase Auth settings

### Avatar upload fails
- Check Storage bucket `avatars` exists and is public
- Verify storage policies allow upload for authenticated users
- Check file size limits (default 50MB)

---

## 10. Useful Supabase CLI Commands

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Generate types
supabase gen types typescript --project-id your-project-ref > src/types/supabase.ts

# Run migrations locally
supabase db push

# Pull schema changes
supabase db pull
```

---

## Next Steps

After completing this setup:
1. The authentication system will work with real Supabase Auth
2. All user data will persist in PostgreSQL with RLS
3. Avatars will upload to Supabase Storage
4. Settings, Portfolio, Watchlist, Alerts will all be per-user and synced across devices

You can then proceed with the remaining phases of the CryptoPulse transformation.