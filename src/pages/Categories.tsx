import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ActionIcon, Button, ConfirmPopup, Notice, Popup, TextInput } from '../components/ui'
import { errorText, slugify } from '../lib/text'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type AdminCategory,
} from '../services/catalog'

export default function Categories() {
  const [categories, setCategories] = useState<AdminCategory[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(8)
  const sectionRef = useRef<HTMLElement>(null)

  async function load() {
    const next = await fetchCategories()
    setCategories(next)
    return next
  }

  useEffect(() => {
    void load().catch((cause: unknown) => setError(errorText(cause)))
  }, [])

  function openCreate() {
    setFormError('')
    setMessage('')
    setNameAr('')
    setNameEn('')
    setSlug('')
    setSlugEdited(false)
    setCreating(true)
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setFormError('')
    const nextSlug = slugify(slug)
    if (!nameAr.trim() || !nextSlug) {
      setFormError('الاسم العربي مطلوب، والرابط بحروف لاتينية.')
      return
    }
    setBusy(true)
    try {
      await createCategory({ nameAr, nameEn, slug: nextSlug, visible: true })
      setCreating(false)
      setMessage('تمت إضافة القسم')
      const next = await load()
      setPage(Math.max(0, Math.ceil(next.length / pageSize) - 1))
    } catch (cause) {
      setFormError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!categories?.length) return
    const list = categories
    function measure() {
      const section = sectionRef.current
      if (!section) return
      const naturalTop = section.getBoundingClientRect().top + window.scrollY
      const available = window.innerHeight - naturalTop - 24
      const rowHeight = section.querySelector('tbody tr')?.getBoundingClientRect().height || 56
      const headHeight = section.querySelector('thead')?.getBoundingClientRect().height || 44
      const fit = Math.max(5, Math.floor((available - headHeight) / rowHeight))
      const nextSize =
        list.length > fit ? Math.max(5, Math.floor((available - headHeight - 56) / rowHeight)) : list.length
      setPageSize((current) => (current === nextSize ? current : nextSize))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [categories])

  const pageCount = categories ? Math.max(1, Math.ceil(categories.length / pageSize)) : 1
  const safePage = Math.min(page, pageCount - 1)
  const visible = categories?.slice(safePage * pageSize, safePage * pageSize + pageSize) ?? []

  function goTo(next: number) {
    setPage(next)
    sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <div className="w-full ">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#121826]">الأقسام</h1>
          <p className="mt-1 text-sm text-[#667085]">الأقسام الظاهرة تصل إلى المتجر. المخفية تبقى للإدارة فقط.</p>
        </div>
        <Button onClick={openCreate}>إضافة قسم</Button>
      </header>
      <Notice error={error} message={message} />

      <section ref={sectionRef} className="overflow-hidden rounded-2xl border border-[#e7ebf0] bg-white shadow-sm">
        {categories === null ? (
          <p className="px-4 py-6 text-sm text-[#667085]">جارٍ التحميل...</p>
        ) : categories.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[#667085]">لا توجد أقسام بعد.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f3f5f8] text-right text-xs text-[#667085]">
                    <th className="px-4 py-3 font-medium">الاسم بالعربية</th>
                    <th className="px-4 py-3 font-medium">English name</th>
                    <th className="px-4 py-3 font-medium">الرابط</th>
                    <th className="px-4 py-3 font-medium">الظهور</th>
                    <th className="px-4 py-3 font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((category, index) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      striped={index % 2 === 1}
                      onSaved={async () => {
                        await load()
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {pageCount > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f6] px-4 py-3">
                <p className="text-xs text-[#667085]">
                  {safePage * pageSize + 1}–{Math.min(categories.length, (safePage + 1) * pageSize)} من {categories.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    tone="ghost"
                    className="inline-flex items-center gap-1"
                    disabled={safePage === 0}
                    onClick={() => goTo(safePage - 1)}
                  >
                    <ChevronRight size={16} />
                    السابق
                  </Button>
                  {Array.from({ length: pageCount }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-current={index === safePage ? 'page' : undefined}
                      className={`grid size-8 place-items-center rounded-lg text-sm ${
                        index === safePage ? 'bg-[#0f766e] text-white' : 'text-[#344054] hover:bg-[#f3f5f8]'
                      }`}
                      onClick={() => goTo(index)}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <Button
                    tone="ghost"
                    className="inline-flex items-center gap-1"
                    disabled={safePage >= pageCount - 1}
                    onClick={() => goTo(safePage + 1)}
                  >
                    التالي
                    <ChevronLeft size={16} />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {creating ? (
        <Popup title="إضافة قسم" busy={busy} onCancel={() => setCreating(false)}>
          <form className="mt-4 grid gap-3" onSubmit={(event) => void onCreate(event)}>
            <label className="block text-xs text-[#667085]">
              الاسم بالعربية
              <TextInput
                className="mt-1.5"
                required
                placeholder="مثال: الأواني"
                value={nameAr}
                onChange={(event) => setNameAr(event.target.value)}
              />
            </label>
            <label className="block text-xs text-[#667085]">
              English name
              <TextInput
                className="mt-1.5"
                required
                dir="ltr"
                placeholder="Cookware"
                value={nameEn}
                onChange={(event) => {
                  const value = event.target.value
                  setNameEn(value)
                  if (!slugEdited) setSlug(slugify(value))
                }}
              />
            </label>
            <label className="block text-xs text-[#667085]">
              الرابط
              <TextInput
                className="mt-1.5"
                required
                dir="ltr"
                placeholder="cookware"
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true)
                  setSlug(event.target.value)
                }}
              />
            </label>
            {formError ? <p className="text-sm text-[#b42318]">{formError}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button tone="ghost" disabled={busy} onClick={() => setCreating(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'جارٍ الحفظ...' : 'إضافة قسم'}
              </Button>
            </div>
          </form>
        </Popup>
      ) : null}
    </div>
  )
}

function CategoryRow({
  category,
  striped,
  onSaved,
}: {
  category: AdminCategory
  striped: boolean
  onSaved: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nameAr, setNameAr] = useState(category.nameAr)
  const [nameEn, setNameEn] = useState(category.nameEn)
  const [slug, setSlug] = useState(category.slug)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (editing) return
    setNameAr(category.nameAr)
    setNameEn(category.nameEn)
    setSlug(category.slug)
  }, [category.nameAr, category.nameEn, category.slug, editing])

  async function saveNames() {
    if (busy) return
    const nextSlug = slugify(slug)
    if (!nameAr.trim() || !nameEn.trim() || !nextSlug) {
      setError('الاسم العربي والإنجليزي مطلوبان، والرابط بحروف لاتينية.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await updateCategory(category.id, {
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        slug: nextSlug,
      })
      setEditing(false)
      await onSaved()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  async function toggleVisible() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await updateCategory(category.id, { visible: !category.visible })
      await onSaved()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await deleteCategory(category.id)
      await onSaved()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  const rowTone = striped ? 'bg-[#f6f8fa]' : 'bg-white'

  return (
    <>
      <tr className={`${rowTone} hover:bg-[#eef3f8]`}>
        <td className="px-4 py-3">
          <span className="font-medium text-[#121826]">{category.nameAr}</span>
        </td>
        <td className="px-4 py-3">
          <span dir="ltr">{category.nameEn}</span>
        </td>
        <td className="px-4 py-3 text-xs text-[#667085]" dir="ltr">
          /{category.slug}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            role="switch"
            aria-checked={category.visible}
            aria-label={category.visible ? 'ظاهر' : 'مخفي'}
            disabled={busy}
            onClick={() => {
              setEditing(false)
              setConfirmDelete(false)
              void toggleVisible()
            }}
            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs font-medium disabled:opacity-50"
          >
            <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${category.visible ? 'bg-[#0f766e]' : 'bg-[#d0d5dd]'}`}>
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${category.visible ? 'end-0.5' : 'start-0.5'}`}
              />
            </span>
            <span className={category.visible ? 'text-[#067647]' : 'text-[#667085]'}>{category.visible ? 'ظاهر' : 'مخفي'}</span>
          </button>
          {error && !confirmDelete && !editing ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            <ActionIcon
              label="تعديل"
              disabled={busy}
              onClick={() => {
                setNameAr(category.nameAr)
                setNameEn(category.nameEn)
                setSlug(category.slug)
                setError('')
                setConfirmDelete(false)
                setEditing(true)
              }}
            >
              <Pencil size={15} />
            </ActionIcon>
            <ActionIcon
              label="حذف"
              tone="danger"
              disabled={busy}
              onClick={() => {
                setEditing(false)
                setError('')
                setConfirmDelete(true)
              }}
            >
              <Trash2 size={15} />
            </ActionIcon>
          </div>
        </td>
      </tr>
      {editing ? (
        <Popup
          title="تعديل القسم"
          busy={busy}
          onCancel={() => {
            setEditing(false)
            setError('')
          }}
        >
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void saveNames()
            }}
          >
            <label className="block text-xs text-[#667085]">
              الاسم بالعربية
              <TextInput
                className="mt-1.5"
                required
                value={nameAr}
                onChange={(event) => setNameAr(event.target.value)}
              />
            </label>
            <label className="block text-xs text-[#667085]">
              English name
              <TextInput
                dir="ltr"
                placeholder="اختياري"
                value={nameEn}
                onChange={(event) => setNameEn(event.target.value)}
              />
            </label>
            <label className="block text-xs text-[#667085]">
              الرابط
              <TextInput
                className="mt-1.5"
                required
                dir="ltr"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                tone="ghost"
                disabled={busy}
                onClick={() => {
                  setEditing(false)
                  setError('')
                }}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'جارٍ الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </form>
        </Popup>
      ) : null}
      {confirmDelete ? (
        <ConfirmPopup
          title="حذف القسم"
          message={`هل تريد حذف «${category.nameAr}»؟`}
          confirmLabel="تأكيد الحذف"
          tone="danger"
          busy={busy}
          error={error}
          onConfirm={() => void remove()}
          onCancel={() => {
            setConfirmDelete(false)
            setError('')
          }}
        />
      ) : null}
    </>
  )
}
