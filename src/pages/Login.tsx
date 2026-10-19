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
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-[#121826] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm text-white/60">Modern Home</p>
          <h1 className="mt-6 max-w-sm text-4xl font-semibold leading-tight">
            إدارة المتجر من لوحة مستقلة.
          </h1>
        </div>
        <p className="max-w-sm text-sm leading-6 text-white/70">
          الدخول متاح فقط للحساب الذي تم تثبيت دور الإدارة له في قاعدة البيانات.
        </p>
      </section>
      <section className="grid place-items-center px-4 py-16">
        <form className="w-full max-w-sm" onSubmit={(event) => void onSubmit(event)}>
          <h2 className="text-2xl font-semibold">تسجيل الدخول</h2>
          <p className="mt-2 text-sm text-[#667085]">لوحة إدارة Modern Home</p>
          <label className="mt-6 block text-sm">
            البريد الإلكتروني
            <TextInput
              className="mt-1"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm">
            كلمة المرور
            <TextInput
              className="mt-1"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
          <Button type="submit" className="mt-5 w-full" disabled={busy}>
            {busy ? 'جارٍ الدخول...' : 'دخول'}
          </Button>
        </form>
      </section>
    </div>
  )
}
