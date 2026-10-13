import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      removeItem: (key: string) => localStorage.removeItem(key),
    },
  },
})

// Auth helpers
export const signUpWithEmail = async (email: string, password: string, name: string) => {
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
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
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
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

export const uploadAvatar = async (file: File, userId: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/avatar.${fileExt}`
  
  const { error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
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
