import { ChevronDown } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button, Notice, Popup, Select, TextInput } from '../components/ui'
import { errorText } from '../lib/text'
import {
  createVariant,
  fetchProducts,
  updateVariant,
  type AdminProduct,
  type AdminVariant,
} from '../services/catalog'

const LOW_STOCK = 5

type StockRow = AdminVariant & { productPrice: number }

export default function Inventory() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setProducts(await fetchProducts())
  }

  useEffect(() => {
    void load().catch((cause: unknown) => setError(errorText(cause)))
  }, [])

  const listed = (products ?? []).filter((product) => product.variants.length > 0)
  const rows = listed.flatMap((product) => product.variants)
  const units = rows.reduce((sum, variant) => sum + variant.stock, 0)
  const lowCount = rows.filter((variant) => variant.stock <= LOW_STOCK).length

  return (
    <div className="w-full">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#121826]">المخزون</h1>
          <p className="mt-1 text-sm text-[#667085]">كل صف متغير مستقل. الكمية المحفوظة هنا هي ما يخصمه إتمام الطلب.</p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!products || products.length === 0}>
          إضافة متغير
        </Button>
      </header>
      <Notice error={error} message={message} />

      <section className="overflow-hidden rounded-2xl border border-[#e7ebf0] bg-white shadow-sm">
        {products === null ? (
          <p className="px-4 py-6 text-sm text-[#667085]">جارٍ التحميل...</p>
        ) : listed.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[#667085]">لا توجد متغيرات بعد.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-[#eef2f6] px-4 py-3 text-sm text-[#667085]">
              <span>
                <b className="font-semibold text-[#121826]">{rows.length}</b> متغير
              </span>
              <span>
                <b className="font-semibold text-[#121826]">{units}</b> قطعة
              </span>
              <span className={lowCount > 0 ? 'text-[#c2410c]' : ''}>
                <b className="font-semibold">{lowCount}</b> منخفض
              </span>
            </div>
            <div className="divide-y divide-[#eef2f6]">
              {listed.map((product) => (
                <ProductStock key={product.id} product={product} onSaved={load} />
              ))}
            </div>
          </>
        )}
      </section>

      {creating && products ? (
        <AddVariant
          products={products}
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false)
            setMessage('تمت إضافة المتغير')
            setError('')
            await load()
          }}
        />
      ) : null}
    </div>
  )
}

function ProductStock({ product, onSaved }: { product: AdminProduct; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const low = product.variants.filter((variant) => variant.stock <= LOW_STOCK).length

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right hover:bg-[#f8fafc]"
      >
        <span className="font-semibold text-[#121826]">{product.nameAr}</span>
        <span className="flex items-center gap-2 text-xs text-[#667085]">
          <span>
            {product.variants.length} متغير
            {low > 0 ? <span className="text-[#c2410c]"> · {low} منخفض</span> : null}
          </span>
          <ChevronDown size={16} className={`text-[#98a2b3] transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open ? (
        <div className="overflow-x-auto border-t border-[#eef2f6]">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f3f5f8] text-right text-xs text-[#667085]">
                <th className="px-4 py-3 font-medium whitespace-nowrap">اللون</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">المقاس</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">الكود</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">المخزون</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">السعر الخاص</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">الحالة</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <VariantStockRow key={variant.id} variant={{ ...variant, productPrice: product.price }} onSaved={onSaved} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function VariantStockRow({
  variant,
  onSaved,
}: {
  variant: StockRow
  onSaved: () => Promise<void>
}) {
  const [stock, setStock] = useState(String(variant.stock))
  const [price, setPrice] = useState(variant.price === null ? '' : String(variant.price))
  const [active, setActive] = useState(variant.active)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const quantity = Number(stock)
  const low = Number.isInteger(quantity) && quantity > 0 && quantity <= LOW_STOCK
  const empty = Number.isInteger(quantity) && quantity === 0
  const savedPrice = variant.price === null ? '' : String(variant.price)
  const dirty = stock !== String(variant.stock) || price !== savedPrice || active !== variant.active

  async function save() {
    if (busy) return
    const amount = price.trim() === '' ? null : Number(price)
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('المخزون رقم صحيح غير سالب')
      return
    }
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      setError('السعر الخاص يجب أن يكون أكبر من صفر')
      return
    }
    setBusy(true)
    setError('')
    try {
      await updateVariant(variant.id, { stock: quantity, price: amount, active })
      await onSaved()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <tr className="border-t border-[#eef2f6] bg-white">
        <td className="px-4 py-2.5 whitespace-nowrap text-[#344054]">{variant.color || '—'}</td>
        <td className="px-4 py-2.5 whitespace-nowrap text-[#344054]">{variant.size || '—'}</td>
        <td className="px-4 py-2.5 whitespace-nowrap">
          {variant.sku ? (
            <span className="inline-flex rounded-lg bg-[#f3f5f8] px-2 py-1 text-xs text-[#344054]" dir="ltr">
              {variant.sku}
            </span>
          ) : (
            <span className="text-[#98a2b3]">—</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-16 shrink-0">
              <TextInput
                className="!py-1.5 text-center"
                dir="ltr"
                inputMode="numeric"
                value={stock}
                aria-label="المخزون"
                onChange={(event) => setStock(event.target.value)}
              />
            </div>
            {empty ? (
              <span className="inline-flex rounded-full bg-[#fef3f2] px-2 py-0.5 text-xs whitespace-nowrap text-[#b42318]">
                نفد
              </span>
            ) : low ? (
              <span className="inline-flex rounded-full bg-[#fff7ed] px-2 py-0.5 text-xs whitespace-nowrap text-[#c2410c]">
                منخفض
              </span>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-24 shrink-0">
              <TextInput
                className="!py-1.5 text-center placeholder:text-[#98a2b3]"
                dir="ltr"
                inputMode="decimal"
                value={price}
                placeholder={String(variant.productPrice)}
                aria-label="السعر الخاص"
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
            <span className="text-xs whitespace-nowrap text-[#98a2b3]">ج.م</span>
          </div>
        </td>
        <td className="px-4 py-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label={active ? 'متاح' : 'متوقف'}
            disabled={busy}
            onClick={() => setActive((current) => !current)}
            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs font-medium disabled:opacity-50"
          >
            <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${active ? 'bg-[#0f766e]' : 'bg-[#d0d5dd]'}`}>
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${active ? 'end-0.5' : 'start-0.5'}`}
              />
            </span>
            <span className={active ? 'text-[#067647]' : 'text-[#667085]'}>{active ? 'متاح' : 'متوقف'}</span>
          </button>
        </td>
        <td className="px-4 py-2.5">
          <Button tone={dirty ? 'primary' : 'ghost'} className="!py-1.5" disabled={busy} onClick={() => void save()}>
            {busy ? '...' : 'حفظ'}
          </Button>
        </td>
      </tr>
      {error ? (
        <tr className="bg-white">
          <td colSpan={7} className="px-4 pb-2 text-xs text-[#b42318]">
            {error}
          </td>
        </tr>
      ) : null}
    </>
  )
}

function AddVariant({
  products,
  onCancel,
  onCreated,
}: {
  products: AdminProduct[]
  onCancel: () => void
  onCreated: () => Promise<void>
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const amount = price.trim() === '' ? null : Number(price)
    const quantity = Number(stock)
    if (!productId || !color.trim() || !size.trim()) {
      setError('اختر المنتج وأدخل اللون والمقاس.')
      return
    }
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      setError('سعر المتغير يجب أن يكون أكبر من صفر، أو اتركه فارغاً ليأخذ سعر المنتج')
      return
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('المخزون رقم صحيح غير سالب')
      return
    }
    setBusy(true)
    setError('')
    try {
      await createVariant({
        productId,
        color,
        size,
        sku,
        price: amount,
        stock: quantity,
        active: true,
      })
      await onCreated()
    } catch (cause) {
      setError(errorText(cause))
      setBusy(false)
    }
  }

  return (
    <Popup title="إضافة متغير" busy={busy} wide onCancel={onCancel}>
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
        <label className="block text-xs text-[#667085] sm:col-span-2">
          المنتج
          <Select
            className="mt-1.5"
            value={productId}
            placeholder="اختر المنتج"
            onChange={setProductId}
            options={products.map((product) => ({ value: product.id, label: product.nameAr }))}
          />
        </label>
        <label className="block text-xs text-[#667085]">
          اللون
          <TextInput className="mt-1.5" required value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <label className="block text-xs text-[#667085]">
          المقاس
          <TextInput className="mt-1.5" required value={size} onChange={(event) => setSize(event.target.value)} />
        </label>
        <label className="block text-xs text-[#667085]">
          SKU
          <TextInput className="mt-1.5" dir="ltr" value={sku} onChange={(event) => setSku(event.target.value)} />
        </label>
        <label className="block text-xs text-[#667085]">
          المخزون
          <TextInput
            className="mt-1.5"
            required
            inputMode="numeric"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
          />
        </label>
        <label className="block text-xs text-[#667085] sm:col-span-2">
          سعر خاص
          <TextInput
            className="mt-1.5"
            inputMode="decimal"
            placeholder="اتركه فارغاً لاستخدام سعر المنتج"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-[#b42318] sm:col-span-2">{error}</p> : null}
        <div className="mt-2 flex flex-wrap gap-2 sm:col-span-2">
          <Button tone="ghost" disabled={busy} onClick={onCancel}>
            إلغاء
          </Button>
          <Button type="submit" disabled={busy || !productId}>
            {busy ? 'جارٍ الحفظ...' : 'إضافة متغير'}
          </Button>
        </div>
      </form>
    </Popup>
  )
}
