import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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

export function ActionIcon({
  label,
  tone = 'ghost',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'ghost' | 'primary' | 'danger'; children: ReactNode }) {
  const tones = {
    ghost: 'border border-[#e7ebf0] bg-white text-[#344054] hover:bg-[#f3f5f8]',
    primary: 'bg-[#0f766e] text-white hover:bg-[#115e59]',
    danger: 'bg-[#fff1f2] text-[#b42318] hover:bg-[#ffe4e6]',
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...props}
      className={`grid size-8 place-items-center rounded-lg disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

export function Popup({
  title,
  busy,
  onCancel,
  children,
}: {
  title: string
  busy: boolean
  onCancel: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const cancelRef = useRef(onCancel)
  const busyRef = useRef(busy)
  cancelRef.current = onCancel
  busyRef.current = busy

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busyRef.current) cancelRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#121826]/40 p-4"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl border border-[#e7ebf0] bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold text-[#121826]">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmPopup({
  title,
  message,
  confirmLabel,
  tone = 'primary',
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  tone?: 'primary' | 'danger'
  busy: boolean
  error: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Popup title={title} busy={busy} onCancel={onCancel}>
      <p className="mt-2 text-sm leading-6 text-[#667085]">{message}</p>
      {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button tone="ghost" disabled={busy} onClick={onCancel}>
          إلغاء
        </Button>
        <Button tone={tone} disabled={busy} onClick={onConfirm}>
          {busy ? 'جارٍ الحفظ...' : confirmLabel}
        </Button>
      </div>
    </Popup>
  )
}
