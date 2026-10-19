import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
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

  async function load() {
    setCategories(await fetchCategories())
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
    if (!nameAr.trim() || !nameEn.trim() || !nextSlug) {
      setFormError('الاسم العربي والإنجليزي مطلوبان، والرابط بحروف لاتينية.')
      return
    }
    setBusy(true)
    try {
      await createCategory({ nameAr, nameEn, slug: nextSlug, visible: true })
      setCreating(false)
      setMessage('تمت إضافة القسم')
      await load()
    } catch (cause) {
      setFormError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#121826]">الأقسام</h1>
          <p className="mt-1 text-sm text-[#667085]">الأقسام الظاهرة تصل إلى المتجر. المخفية تبقى للإدارة فقط.</p>
        </div>
        <Button onClick={openCreate}>إضافة قسم</Button>
      </header>
      <Notice error={error} message={message} />

      <section className="overflow-hidden rounded-2xl border border-[#e7ebf0] bg-white shadow-sm">
        {categories === null ? (
          <p className="px-4 py-6 text-sm text-[#667085]">جارٍ التحميل...</p>
        ) : categories.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[#667085]">لا توجد أقسام بعد.</p>
        ) : (
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
                {categories.map((category, index) => (
                  <CategoryRow key={category.id} category={category} striped={index % 2 === 1} onSaved={load} />
                ))}
              </tbody>
            </table>
          </div>
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
  const [confirmVisible, setConfirmVisible] = useState(false)
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
      setConfirmVisible(false)
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
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
              category.visible ? 'bg-[#ecfdf3] text-[#16a34a]' : 'bg-[#f3f5f8] text-[#667085]'
            }`}
          >
            {category.visible ? 'ظاهر' : 'مخفي'}
          </span>
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
                setConfirmVisible(false)
                setConfirmDelete(false)
                setEditing(true)
              }}
            >
              <Pencil size={15} />
            </ActionIcon>
            <ActionIcon
              label={category.visible ? 'إخفاء' : 'إظهار'}
              disabled={busy}
              onClick={() => {
                setEditing(false)
                setConfirmDelete(false)
                setError('')
                setConfirmVisible(true)
              }}
            >
              {category.visible ? <EyeOff size={15} /> : <Eye size={15} />}
            </ActionIcon>
            <ActionIcon
              label="حذف"
              tone="danger"
              disabled={busy}
              onClick={() => {
                setEditing(false)
                setConfirmVisible(false)
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
                className="mt-1.5"
                required
                dir="ltr"
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
      {confirmVisible ? (
        <ConfirmPopup
          title={category.visible ? 'إخفاء القسم' : 'إظهار القسم'}
          message={
            category.visible
              ? `هل تريد إخفاء «${category.nameAr}» من المتجر؟`
              : `هل تريد إظهار «${category.nameAr}» في المتجر؟`
          }
          confirmLabel={category.visible ? 'تأكيد الإخفاء' : 'تأكيد الإظهار'}
          busy={busy}
          error={error}
          onConfirm={() => void toggleVisible()}
          onCancel={() => {
            setConfirmVisible(false)
            setError('')
          }}
        />
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
