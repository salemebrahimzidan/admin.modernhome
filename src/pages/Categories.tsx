import { useEffect, useState, type FormEvent } from 'react'
import { Button, Card, Notice, PageTitle, TextInput } from '../components/ui'
import { errorText, slugify } from '../lib/text'
import { createCategory, fetchCategories, updateCategory, type AdminCategory } from '../services/catalog'

export default function Categories() {
  const [categories, setCategories] = useState<AdminCategory[] | null>(null)
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setCategories(await fetchCategories())
  }

  useEffect(() => {
    void load().catch((cause: unknown) => setError(errorText(cause)))
  }, [])

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    const slug = slugify(nameEn)
    if (!slug) {
      setError('اكتب الاسم الإنجليزي بحروف لاتينية ليُنشأ الرابط.')
      return
    }
    try {
      await createCategory({ nameAr, nameEn, slug, visible: true })
      setNameAr('')
      setNameEn('')
      setMessage('تم حفظ القسم')
      await load()
    } catch (cause) {
      setError(errorText(cause))
    }
  }

  return (
    <div>
      <PageTitle title="الأقسام" detail="الأقسام الظاهرة تصل إلى المتجر. المخفية تبقى للإدارة فقط." />
      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => void onCreate(event)}>
          <TextInput required placeholder="الاسم بالعربية" value={nameAr} onChange={(event) => setNameAr(event.target.value)} />
          <TextInput required placeholder="English name" value={nameEn} onChange={(event) => setNameEn(event.target.value)} />
          <Button type="submit">إضافة قسم</Button>
        </form>
        <Notice error={error} message={message} />
      </Card>
      <div className="mt-4 space-y-3">
        {(categories ?? []).map((category) => (
          <CategoryRow key={category.id} category={category} onSaved={load} />
        ))}
        {categories && categories.length === 0 ? (
          <p className="text-sm text-[#667085]">لا توجد أقسام بعد.</p>
        ) : null}
      </div>
    </div>
  )
}

function CategoryRow({ category, onSaved }: { category: AdminCategory; onSaved: () => Promise<void> }) {
  const [nameAr, setNameAr] = useState(category.nameAr)
  const [nameEn, setNameEn] = useState(category.nameEn)
  const [error, setError] = useState('')

  async function save(patch: { nameAr?: string; nameEn?: string; visible?: boolean }) {
    setError('')
    try {
      await updateCategory(category.id, patch)
      await onSaved()
    } catch (cause) {
      setError(errorText(cause))
    }
  }

  return (
    <Card>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
        <TextInput value={nameAr} onChange={(event) => setNameAr(event.target.value)} />
        <TextInput value={nameEn} onChange={(event) => setNameEn(event.target.value)} />
        <Button tone="ghost" onClick={() => void save({ nameAr, nameEn })}>
          حفظ الاسم
        </Button>
        <Button tone="ghost" onClick={() => void save({ visible: !category.visible })}>
          {category.visible ? 'إخفاء' : 'إظهار'}
        </Button>
      </div>
      <p className="mt-2 text-xs text-[#667085]">/{category.slug}</p>
      <Notice error={error} />
    </Card>
  )
}
