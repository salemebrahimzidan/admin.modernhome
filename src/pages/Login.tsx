import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Button, TextInput } from '../components/ui'

export default function Login() {
  const { ready, session, isAdmin, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (ready && session && isAdmin) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const message = await signIn(email, password)
    setBusy(false)
    if (message) {
      setError(
        message.toLowerCase().includes('invalid')
          ? 'البريد أو كلمة المرور غير صحيحة'
          : message,
      )
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="relative min-h-dvh bg-[#faf9f5] md:grid md:grid-cols-2">
      <section className="absolute inset-0 overflow-hidden md:relative md:inset-auto md:min-h-dvh">
        <img
          src="/login-hero.jpg"
          alt="مطبخ حديث بأواني على سطح رخامي"
          className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
        />
        <div className="absolute inset-0 bg-[#1c1915]/30 md:bg-gradient-to-t md:from-[#1c1915]/50 md:via-transparent md:to-transparent" />
        <div className="absolute bottom-0 start-0 hidden max-w-md p-6 text-white sm:p-10 md:block">
          <p className="text-[11px] tracking-[0.28em] text-white/80" dir="ltr">
            MODERN HOME
          </p>
          <h1 className="mt-3 text-3xl font-medium leading-snug sm:text-4xl">إدارة المتجر من لوحة مستقلة.</h1>
        </div>
      </section>

      <section className="relative z-10 flex min-h-dvh items-center justify-center px-5 py-10 sm:px-10">
        <form
          className="w-full max-w-[420px] rounded-3xl border border-[#e7e4d8] bg-white px-7 py-8 shadow-[0_18px_50px_rgba(28,25,21,0.06)] sm:px-9 sm:py-10"
          onSubmit={(event) => void onSubmit(event)}
        >
          <p className="text-xs tracking-[0.22em] text-[#8a785a]" dir="ltr">
            MODERN HOME
          </p>
          <h2 className="mt-3 text-[32px] font-medium leading-tight text-[#303b2c]">تسجيل الدخول</h2>
          <p className="mt-2 text-sm leading-6 text-[#73796d]">أدخل بريد حساب الإدارة وكلمة المرور للمتابعة.</p>

          <label className="mt-8 block" htmlFor="login-email">
            <span className="text-sm font-medium text-[#303b2c]">البريد الإلكتروني</span>
            <TextInput
              id="login-email"
              className="mt-2 border-[#e3e5da] bg-[#faf9f5] py-3 focus:bg-white"
              type="email"
              dir="ltr"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="mt-4 block" htmlFor="login-password">
            <span className="text-sm font-medium text-[#303b2c]">كلمة المرور</span>
            <span className="relative mt-2 block">
              <TextInput
                id="login-password"
                className="border-[#e3e5da] bg-[#faf9f5] py-3 pr-12 focus:bg-white"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-lg text-[#73796d] hover:text-[#303b2c]"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error ? (
            <p role="alert" className="mt-4 rounded-xl bg-[#fef3f2] px-3 py-2.5 text-sm text-[#b42318]">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="mt-6 w-full bg-[#303b2c] py-3 hover:bg-[#243026]" disabled={busy}>
            {busy ? 'جارٍ الدخول...' : 'دخول'}
          </Button>
        </form>
      </section>
    </div>
  )
}
