import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppFrame } from './components/Shell'
import { BlockSkeleton } from './components/ui'
import { supabase } from './lib/supabase'

interface AuthValue {
  ready: boolean
  session: Session | null
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

async function readIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return data === true
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [roleReady, setRoleReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setIsAdmin(false)
      setRoleReady(true)
      return
    }
    setRoleReady(false)
    let active = true
    void readIsAdmin().then((admin) => {
      if (!active) return
      setIsAdmin(admin)
      setRoleReady(true)
    })
    return () => {
      active = false
    }
  }, [session])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return error?.message ?? null
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({
      ready: ready && (!session || roleReady),
      session,
      isAdmin,
      signIn,
      signOut,
    }),
    [ready, roleReady, session, isAdmin, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}

export function AdminGate() {
  const { ready, session, isAdmin, signOut } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <AppFrame email={session?.user.email} onSignOut={() => void signOut()}>
        <BlockSkeleton />
      </AppFrame>
    )
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md rounded-2xl border border-[#e7ebf0] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">هذه اللوحة للمسؤولين فقط</h1>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            الحساب الذي سجل الدخول لا يملك دور الإدارة. التحقق يتم من قاعدة البيانات عبر is_admin().
          </p>
          <button
            type="button"
            className="mt-6 rounded-xl bg-[#121826] px-4 py-2 text-sm text-white"
            onClick={() => void signOut()}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    )
  }
  return <Outlet />
}
