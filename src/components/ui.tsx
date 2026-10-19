import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function PageTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {detail ? <p className="mt-1 text-sm text-[#667085]">{detail}</p> : null}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-sm ${className}`}>
      {children}
    </section>
  )
}

export function Button({
  children,
  tone = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'ghost' | 'danger' }) {
  const tones = {
    primary: 'bg-[#0f766e] text-white hover:bg-[#115e59]',
    ghost: 'border border-[#e7ebf0] bg-white hover:bg-[#f3f5f8]',
    danger: 'bg-[#b42318] text-white hover:bg-[#912018]',
  }
  return (
    <button
      type={type}
      {...props}
      className={`rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-[#e7ebf0] bg-white px-3 py-2 text-sm outline-none focus:border-[#0f766e] ${className}`}
    />
  )
}

export function Notice({ error, message }: { error?: string; message?: string }) {
  if (error) return <p className="mt-3 text-sm text-[#b42318]">{error}</p>
  if (message) return <p className="mt-3 text-sm text-[#0f766e]">{message}</p>
  return null
}
