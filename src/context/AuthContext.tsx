import { createContext } from 'react'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

export interface AuthContextType {
  user: SupabaseUser | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)