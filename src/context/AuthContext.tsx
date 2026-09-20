import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, type Profile } from '../lib/supabase'
import { fetchProfile } from '../lib/queries'

type AuthContextValue = {
  session: import('@supabase/supabase-js').Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthContextValue['session']>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session) {
        fetchProfile(session.user.id).then((p) => {
          if (mounted) {
            setProfile(p)
            setLoading(false)
          }
        })
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      ;(async () => {
        if (event === 'SIGNED_OUT') {
          if (mounted) {
            setSession(null)
            setProfile(null)
          }
          return
        }
        if (session) {
          if (mounted) setSession(session)
          const p = await fetchProfile(session.user.id)
          if (mounted) setProfile(p)
        }
        if (mounted) setLoading(false)
      })()
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }

  const refreshProfile = async () => {
    if (!session) return
    const p = await fetchProfile(session.user.id)
    setProfile(p)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
