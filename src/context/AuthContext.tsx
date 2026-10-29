import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
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
  const profileUserId = useRef<string | null>(null)
  // Increments on every profile fetch so a slower, older fetch can't overwrite a newer profile.
  const profileReq = useRef(0)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session) {
        const req = ++profileReq.current
        fetchProfile(session.user.id).then((p) => {
          if (mounted && req === profileReq.current) {
            profileUserId.current = p ? session.user.id : null
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
            profileUserId.current = null
            setSession(null)
            setProfile(null)
          }
          return
        }
        if (session) {
          if (!mounted) return
          setSession(session)
          // A different user just signed in: hold routes on the loader until their profile arrives,
          // otherwise protected routes see session-without-profile and bounce back to /auth.
          if (profileUserId.current !== session.user.id) setLoading(true)
          const req = ++profileReq.current
          const p = await fetchProfile(session.user.id)
          if (!mounted) return
          if (req !== profileReq.current) {
            setLoading(false)
            return
          }
          profileUserId.current = p ? session.user.id : null
          setProfile(p)
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
    profileUserId.current = null
    setProfile(null)
    setSession(null)
  }

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession()
    const current = data.session
    if (!current) return
    const req = ++profileReq.current
    const p = await fetchProfile(current.user.id)
    if (req !== profileReq.current) return
    profileUserId.current = p ? current.user.id : null
    setProfile(p)
    setLoading(false)
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
