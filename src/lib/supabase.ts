import { createClient } from '@supabase/supabase-js'

const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key])
  }
  const globalProc = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process
  if (globalProc?.env?.[key]) {
    return String(globalProc.env[key])
  }
  return ''
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://placeholder-project-ref.supabase.co'
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-signature-here'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key: string) => {
        try {
          return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
        } catch {
          return null
        }
      },
      setItem: (key: string, value: string) => {
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
        } catch {}
      },
      removeItem: (key: string) => {
        try {
          if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
        } catch {}
      },
    },
  },
})

export const isSupabaseConfigured = (): boolean => {
  const url = getEnvVar('VITE_SUPABASE_URL')
  const key = getEnvVar('VITE_SUPABASE_ANON_KEY')
  return Boolean(
    url &&
    !url.includes('placeholder-project-ref') &&
    url.startsWith('https://') &&
    key &&
    !key.includes('dummy-signature') &&
    key.length > 20
  )
}

// Auth helpers
export const signUpWithEmail = async (email: string, password: string, name: string) => {
  if (!isSupabaseConfigured()) {
    return {
      data: { user: null, session: null },
      error: new Error('Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'),
    }
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  })
  return { data, error }
}

export const signInWithEmail = async (email: string, password: string) => {
  if (!isSupabaseConfigured()) {
    return {
      data: { user: null, session: null },
      error: new Error('Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'),
    }
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: new Error('Supabase is not configured yet. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'),
    }
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const resetPassword = async (email: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })
  return { data, error }
}

export const updatePassword = async (password: string) => {
  const { data, error } = await supabase.auth.updateUser({ password })
  return { data, error }
}

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  return { data, error }
}

export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}

export const onAuthStateChange = (callback: (event: string, session: import('@supabase/supabase-js').Session | null) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

export const updateProfile = async (updates: { full_name?: string; avatar_url?: string; phone?: string }) => {
  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  })
  return { data, error }
}

export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_AVATAR_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export const uploadAvatar = async (file: File, userId: string) => {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    return { data: null, error: new Error('User must be authenticated to upload an avatar.') }
  }

  if (file.size > MAX_AVATAR_FILE_SIZE_BYTES) {
    return { data: null, error: new Error('Avatar image must be smaller than 2MB.') }
  }

  const mimeType = file.type?.toLowerCase()
  if (!mimeType || !ALLOWED_AVATAR_MIME_TYPES.includes(mimeType as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
    return { data: null, error: new Error('Invalid image format. Allowed formats: JPEG, PNG, WebP.') }
  }

  // Derive normalized extension from validated MIME type
  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const fileExt = extensionMap[mimeType] || 'jpg'
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '')
  const fileName = `${sanitizedUserId}/avatar.${fileExt}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      contentType: mimeType,
      upsert: true,
    })

  if (error) return { data: null, error }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  return { data: { publicUrl }, error: null }
}

export function formatAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.'
  const msg = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error)

  if (msg.toLowerCase().includes('invalid login credentials')) {
    return 'Invalid email or password. Please verify your credentials.'
  }
  if (msg.toLowerCase().includes('user already registered')) {
    return 'An account with this email already exists. Please sign in instead.'
  }
  if (msg.toLowerCase().includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.'
  }
  if (msg.toLowerCase().includes('password should be at least')) {
    return 'Password must be at least 6 characters long.'
  }
  if (msg.toLowerCase().includes('rate limit')) {
    return 'Too many attempts. Please try again in a few moments.'
  }
  if (msg.toLowerCase().includes('failed to fetch')) {
    return 'Unable to connect to Supabase services. Please check your network connection.'
  }
  return msg
}

export const deleteAccount = async (): Promise<{ data?: unknown; error: Error | null }> => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { error: new Error('You must be signed in to delete your account.') }
  }

  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: { confirm: true },
    })

    if (error) {
      const message = error.message || 'The server-side deletion function is not configured or reachable.'
      return { error: new Error(message) }
    }

    if (data?.error) {
      return { error: new Error(data.error) }
    }

    // Terminate local session following successful deletion
    await supabase.auth.signOut()
    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Account deletion service failed to execute.'
    return { error: new Error(message) }
  }
}

// Session management
export const getSessions = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) return { data: [], error }
  
  // Get all active sessions for the user
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', data.session.user.id)
    .order('last_seen', { ascending: false })
  
  return { data: sessionsData || [], error: sessionsError }
}

export const revokeSession = async (sessionId: string) => {
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('id', sessionId)
  return { error }
}

export const revokeAllOtherSessions = async (currentSessionId: string) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: new Error('No active session') }
  
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', session.user.id)
    .neq('id', currentSessionId)
  return { error }
}

// Device management
export const getDevices = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: [], error: new Error('No active session') }
  
  const { data, error } = await supabase
    .from('user_devices')
    .select('*')
    .eq('user_id', session.user.id)
    .order('last_seen', { ascending: false })
  
  return { data: data || [], error }
}

export const revokeDevice = async (deviceId: string) => {
  const { error } = await supabase
    .from('user_devices')
    .delete()
    .eq('id', deviceId)
  return { error }
}

// Connected accounts
export const getConnectedAccounts = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: [], error: new Error('No active session') }
  
  const { data, error } = await supabase
    .from('user_connected_accounts')
    .select('*')
    .eq('user_id', session.user.id)
  
  return { data: data || [], error }
}

export const unlinkAccount = async (provider: string) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: new Error('No active session') }
  
  const { error } = await supabase
    .from('user_connected_accounts')
    .delete()
    .eq('user_id', session.user.id)
    .eq('provider', provider)
  
  // Also unlink from auth
  if (!error) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.identities) {
      const identity = user.identities.find((id) => id.provider === provider)
      if (identity) {
        await supabase.auth.unlinkIdentity(identity)
      }
    }
  }
  
  return { error }
}

// User profile from database (extended profile)
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export const updateUserProfile = async (userId: string, updates: Record<string, unknown>) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single()
  
  return { data, error }
}

// Activity logs
export const getActivityLogs = async (userId: string, limit = 50) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  return { data: data || [], error }
}

export const addActivityLog = async (userId: string, action: string, metadata?: Record<string, unknown>) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: userId,
      action,
      metadata,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  
  return { data, error }
}

// Preferences
export const getUserPreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  return { data, error }
}

export const updateUserPreferences = async (userId: string, preferences: Record<string, unknown>) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...preferences, updated_at: new Date().toISOString() })
    .select()
    .single()
  
  return { data, error }
}

// Export user data
export const exportUserData = async (userId: string) => {
  const [profile, preferences, sessions, devices, accounts, activity] = await Promise.all([
    getUserProfile(userId),
    getUserPreferences(userId),
    getSessions(),
    getDevices(),
    getConnectedAccounts(),
    getActivityLogs(userId, 100),
  ])
  
  return {
    profile: profile.data,
    preferences: preferences.data,
    sessions: sessions.data,
    devices: devices.data,
    connectedAccounts: accounts.data,
    activityLogs: activity.data,
    exportedAt: new Date().toISOString(),
  }
}
