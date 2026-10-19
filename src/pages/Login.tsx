import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Button, TextInput } from '../components/ui'

export default function Login() {
  const { ready, session, isAdmin, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="min-h-dvh bg-[#faf9f5] md:grid md:grid-cols-[minmax(0,1fr)_420px]">
      <section className="relative h-[46vh] min-h-[260px] overflow-hidden md:h-auto md:min-h-dvh">
        <img
          src="/login-hero.jpg"
          alt="مطبخ حديث بأواني على سطح رخامي"
          className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
        />
        <div className="absolute bottom-5 start-5 end-5 max-w-sm bg-[#faf9f5]/95 p-5 text-[#303b2c] shadow-[0_16px_40px_rgba(28,25,21,0.12)] sm:bottom-8 sm:start-8">
          <p className="text-[10px] tracking-[0.22em] text-[#8a785a]" dir="ltr">
            MODERN HOME
          </p>
          <h1 className="mt-2 text-2xl font-medium leading-snug sm:text-[28px]">
            إدارة المتجر من لوحة مستقلة.
          </h1>
        </div>
      </section>

      <section className="flex items-center px-5 py-8 sm:px-10">
        <form className="w-full" onSubmit={(event) => void onSubmit(event)}>
          <p className="text-sm text-[#8a785a]">لوحة الإدارة</p>
          <h2 className="mt-2 text-3xl font-medium text-[#303b2c]">تسجيل الدخول</h2>
          <p className="mt-3 text-sm leading-6 text-[#73796d]">
            الدخول متاح فقط للحساب الذي تم تثبيت دور الإدارة له في قاعدة البيانات.
          </p>
          <label className="mt-8 block text-sm text-[#303b2c]">
            البريد الإلكتروني
            <TextInput
              className="mt-2 border-[#e3e5da] bg-white py-3"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm text-[#303b2c]">
            كلمة المرور
            <TextInput
              className="mt-2 border-[#e3e5da] bg-white py-3"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
          <Button type="submit" className="mt-6 w-full bg-[#303b2c] py-3 hover:bg-[#243026]" disabled={busy}>
            {busy ? 'جارٍ الدخول...' : 'دخول'}
          </Button>
        </form>
      </section>
    </div>
  )
}
