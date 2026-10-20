import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
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
      className={`w-full rounded-xl border border-[#e7ebf0] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 ${className}`}
    />
  )
}

export type SelectOption = {
  value: string
  label: string
  hint?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'اختر',
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [openUp, setOpenUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value)
  const showSearch = options.length > 6
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) => `${option.label} ${option.hint ?? ''}`.toLowerCase().includes(needle))
  }, [options, query])
  const current = Math.min(active, Math.max(filtered.length - 1, 0))

  useEffect(() => {
    if (!open) return
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUp(spaceBelow < 280 && rect.top > spaceBelow)
    }
    const frame = requestAnimationFrame(() => searchRef.current?.focus())
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    document.getElementById(`${listId}-option-${current}`)?.scrollIntoView({ block: 'nearest' })
  }, [current, listId, open])

  function openMenu() {
    const index = options.findIndex((option) => option.value === value)
    setQuery('')
    setActive(index < 0 ? 0 : index)
    setOpen(true)
  }

  function choose(next: string) {
    onChange(next)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openMenu()
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(Math.min(current + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && filtered[current]) {
      event.preventDefault()
      choose(filtered[current].value)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-sm outline-none ${
          open ? 'border-[#0f766e]' : 'border-[#e7ebf0] hover:border-[#cfd6df]'
        }`}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className={`min-w-0 truncate ${selected ? 'text-[#121826]' : 'text-[#98a2b3]'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-[#667085] transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div
          className={`absolute inset-x-0 z-20 overflow-hidden rounded-xl border border-[#e7ebf0] bg-white shadow-lg ${
            openUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {showSearch ? (
            <div className="border-b border-[#eef2f6] p-2">
              <input
                ref={searchRef}
                value={query}
                placeholder="بحث"
                className="w-full rounded-lg border border-[#e7ebf0] px-2.5 py-1.5 text-sm outline-none focus:border-[#0f766e]"
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActive(0)
                }}
              />
            </div>
          ) : null}
          <ul id={listId} role="listbox" className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-[#667085]">لا توجد نتائج</li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value
                const isActive = index === current
                return (
                  <li key={option.value}>
                    <button
                      id={`${listId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm ${
                        isSelected ? 'bg-[#f0fdfa] text-[#0f766e]' : isActive ? 'bg-[#f6f8fa] text-[#121826]' : 'text-[#121826] hover:bg-[#f6f8fa]'
                      }`}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(option.value)}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {option.hint ? (
                        <span dir="ltr" className="max-w-[46%] shrink-0 truncate text-xs text-[#98a2b3]">
                          {option.hint}
                        </span>
                      ) : null}
                      {isSelected ? <Check size={14} className="shrink-0" /> : null}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
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
  wide = false,
  children,
}: {
  title: string
  busy: boolean
  onCancel: () => void
  wide?: boolean
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
    function onKey(event: globalThis.KeyboardEvent) {
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
        className={`w-full rounded-2xl border border-[#e7ebf0] bg-white p-5 shadow-lg ${wide ? 'max-w-lg' : 'max-w-sm'}`}
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
