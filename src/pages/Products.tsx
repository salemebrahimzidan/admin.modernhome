import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionIcon, Button, ConfirmPopup, Notice } from '../components/ui'
import { errorText, money } from '../lib/text'
import {
  deleteProduct,
  fetchCategories,
  fetchProducts,
  updateProduct,
  type AdminCategory,
  type AdminProduct,
} from '../services/catalog'

export default function Products() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [error, setError] = useState('')

  async function load() {
    const [nextProducts, nextCategories] = await Promise.all([fetchProducts(), fetchCategories()])
    setProducts(nextProducts)
    setCategories(nextCategories)
  }

  useEffect(() => {
    void load().catch((cause: unknown) => setError(errorText(cause)))
  }, [])

  return (
    <div className="w-full">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#121826]">المنتجات</h1>
          <p className="mt-1 text-sm text-[#667085]">أضف الاسم والوصف والسعر والصور والمخزون من صفحة واحدة.</p>
        </div>
        <Button onClick={() => navigate('/products/new')} disabled={categories.length === 0}>
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

  async function toggleVisible() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await updateProduct(product.id, {
        categoryId: product.categoryId,
        slug: product.slug,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        descriptionAr: product.descriptionAr,
        descriptionEn: product.descriptionEn,
        price: product.price,
        compareAt: product.compareAt,
        visible: !product.visible,
        featured: product.featured,
        isNew: product.isNew,
        bestSeller: product.bestSeller,
      })
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
        <Link to={`/products/${product.id}`} className="font-medium text-[#121826] hover:text-[#0f766e]">
          {product.nameAr}
        </Link>
      </td>
      <td className="px-4 py-3">{money(product.price)}</td>
      <td className="px-4 py-3">{product.variants.length}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          role="switch"
          aria-checked={product.visible}
          aria-label={product.visible ? 'ظاهر' : 'مخفي'}
          disabled={busy}
          onClick={() => void toggleVisible()}
          className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs font-medium disabled:opacity-50"
        >
          <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${product.visible ? 'bg-[#0f766e]' : 'bg-[#d0d5dd]'}`}>
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${product.visible ? 'end-0.5' : 'start-0.5'}`}
            />
          </span>
          <span className={product.visible ? 'text-[#067647]' : 'text-[#667085]'}>{product.visible ? 'ظاهر' : 'مخفي'}</span>
        </button>
        {error && !confirmDelete ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
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
