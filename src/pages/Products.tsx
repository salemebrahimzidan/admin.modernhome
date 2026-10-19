import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionIcon, Button, ConfirmPopup, Notice, Popup, TextInput } from '../components/ui'
import { errorText, money, slugify } from '../lib/text'
import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  type AdminCategory,
  type AdminProduct,
} from '../services/catalog'

export default function Products() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [creating, setCreating] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [nextProducts, nextCategories] = await Promise.all([fetchProducts(), fetchCategories()])
    setProducts(nextProducts)
    setCategories(nextCategories)
    setCategoryId((current) => current || nextCategories[0]?.id || '')
  }

  useEffect(() => {
    void load().catch((cause: unknown) => setError(errorText(cause)))
  }, [])

  function openCreate() {
    setFormError('')
    setNameAr('')
    setNameEn('')
    setPrice('')
    setCategoryId(categories[0]?.id ?? '')
    setCreating(true)
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const slug = slugify(nameEn)
    const amount = Number(price)
    if (!slug || !categoryId || !nameAr.trim() || !Number.isFinite(amount) || amount < 0) {
      setFormError('أكمل القسم والاسمين والسعر.')
      return
    }
    setBusy(true)
    setFormError('')
    try {
      const id = await createProduct({
        categoryId,
        slug,
        nameAr,
        nameEn,
        price: amount,
        visible: false,
      })
      navigate(`/products/${id}`)
    } catch (cause) {
      setFormError(errorText(cause))
      setBusy(false)
    }
  }

  return (
    <div className="w-full">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#121826]">المنتجات</h1>
          <p className="mt-1 text-sm text-[#667085]">المنتج الجديد يبقى مخفياً حتى تفعّله وتضيف متغيراً نشطاً.</p>
        </div>
        <Button onClick={openCreate} disabled={categories.length === 0}>
          إضافة منتج
        </Button>
      </header>
      {error ? <Notice error={error} /> : null}

      <section className="overflow-hidden rounded-2xl border border-[#e7ebf0] bg-white shadow-sm">
        {products === null ? (
          <p className="px-4 py-6 text-sm text-[#667085]">جارٍ التحميل...</p>
        ) : products.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[#667085]">لا توجد منتجات بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#f3f5f8] text-right text-xs text-[#667085]">
                  <th className="px-4 py-3 font-medium">المنتج</th>
                  <th className="px-4 py-3 font-medium">السعر</th>
                  <th className="px-4 py-3 font-medium">المتغيرات</th>
                  <th className="px-4 py-3 font-medium">الظهور</th>
                  <th className="px-4 py-3 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    striped={index % 2 === 1}
                    onEdit={() => navigate(`/products/${product.id}`)}
                    onSaved={load}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating ? (
        <Popup title="إضافة منتج" busy={busy} onCancel={() => setCreating(false)}>
          <form className="mt-4 grid gap-3" onSubmit={(event) => void onCreate(event)}>
            <label className="block text-xs text-[#667085]">
              القسم
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#e7ebf0] bg-white px-3 py-2 text-sm outline-none focus:border-[#0f766e]"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nameAr}
                  </option>
                ))}
              </select>
            </label>
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
              السعر
              <TextInput
                className="mt-1.5"
                required
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>
            {formError ? <p className="text-sm text-[#b42318]">{formError}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button tone="ghost" disabled={busy} onClick={() => setCreating(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={busy || !categoryId}>
                {busy ? 'جارٍ الحفظ...' : 'إنشاء منتج'}
              </Button>
            </div>
          </form>
        </Popup>
      ) : null}
    </div>
  )
}

function ProductRow({
  product,
  striped,
  onEdit,
  onSaved,
}: {
  product: AdminProduct
  striped: boolean
  onEdit: () => void
  onSaved: () => Promise<void>
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const rowTone = striped ? 'bg-[#f6f8fa]' : 'bg-white'

  async function remove() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await deleteProduct(product)
      setConfirmDelete(false)
      await onSaved()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr className={`${rowTone} hover:bg-[#eef3f8]`}>
      <td className="px-4 py-3">
        <span className="font-medium text-[#121826]">{product.nameAr}</span>
        <p className="text-xs text-[#667085]" dir="ltr">
          {product.nameEn}
        </p>
      </td>
      <td className="px-4 py-3">{money(product.price)}</td>
      <td className="px-4 py-3">{product.variants.length}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
            product.visible ? 'bg-[#ecfdf3] text-[#16a34a]' : 'bg-[#f3f5f8] text-[#667085]'
          }`}
        >
          {product.visible ? 'ظاهر' : 'مخفي'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <ActionIcon label="تعديل" disabled={busy} onClick={onEdit}>
            <Pencil size={15} />
          </ActionIcon>
          <ActionIcon
            label="حذف"
            tone="danger"
            disabled={busy}
            onClick={() => {
              setError('')
              setConfirmDelete(true)
            }}
          >
            <Trash2 size={15} />
          </ActionIcon>
        </div>
        {confirmDelete ? (
          <ConfirmPopup
            title="حذف المنتج"
            message={`هل تريد حذف «${product.nameAr}»؟`}
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
      </td>
    </tr>
  )
}
