import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { ProfileRow } from '../types/database.types'

type AuthState = {
  loading: boolean
  profileLoading: boolean
  adminCheckLoading: boolean
  session: Session | null
  user: User | null
  profile: ProfileRow | null
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, updated_at, phone, birth_date, gender, role')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data as ProfileRow
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [profileLoading, setProfileLoading] = useState(false)
  const [adminCheckLoading, setAdminCheckLoading] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const refreshProfile = useCallback(async () => {
    if (!supabase || !user) {
      setProfile(null)
      return
    }
    setProfileLoading(true)
    try {
      const p = await fetchProfile(user.id)
      setProfile(p)
    } finally {
      setProfileLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    let ignore = false
    fetchProfile(user.id).then((p) => {
      if (!ignore) {
        setProfile(p)
        setProfileLoading(false)
      }
    })
    return () => {
      ignore = true
    }
  }, [user?.id])

  useEffect(() => {
    let ignore = false

    const checkAdmin = async () => {
      if (!supabase || !user) {
        setAdminCheckLoading(false)
        setIsAdmin(false)
        return
      }

      setAdminCheckLoading(true)
      try {
        const { data, error } = await supabase.rpc('is_admin')
        if (ignore) return
        if (error) {
          setIsAdmin(false)
          return
        }
        setIsAdmin(Boolean(data))
      } finally {
        if (!ignore) {
          setAdminCheckLoading(false)
        }
      }
    }

    checkAdmin()
    return () => {
      ignore = true
    }
  }, [user?.id, session?.access_token])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase sozlanmagan' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      loading,
      profileLoading,
      adminCheckLoading,
      session,
      user,
      profile,
      isAdmin,
      signIn,
      signOut,
      refreshProfile,
    }),
    [
      loading,
      profileLoading,
      adminCheckLoading,
      session,
      user,
      profile,
      isAdmin,
      signIn,
      signOut,
      refreshProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth AuthProvider ichida bo‘lishi kerak')
  return ctx
}
