import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Notice, PageTitle, TextInput } from '../components/ui'
import { errorText } from '../lib/text'
import { fetchProducts, updateVariant, type AdminVariant } from '../services/catalog'

export default function Inventory() {
  const [rows, setRows] = useState<AdminVariant[] | null>(null)
  const [error, setError] = useState('')

  async function load() {
    const products = await fetchProducts()
    setRows(products.flatMap((product) => product.variants))
  }

  useEffect(() => {
    void load().catch((cause: unknown) => setError(errorText(cause)))
  }, [])

  return (
    <div>
      <PageTitle title="المخزون" detail="كل صف متغير مستقل. تعديل الكمية هنا هو ما يخصمه إتمام الطلب." />
      {error ? <p className="mb-3 text-sm text-[#b42318]">{error}</p> : null}
      <div className="space-y-3">
        {(rows ?? []).map((variant) => (
          <StockRow key={variant.id} variant={variant} onSaved={load} />
        ))}
        {rows && rows.length === 0 ? <p className="text-sm text-[#667085]">لا توجد متغيرات بعد.</p> : null}
      </div>
    </div>
  )
}

function StockRow({ variant, onSaved }: { variant: AdminVariant; onSaved: () => Promise<void> }) {
  const [stock, setStock] = useState(String(variant.stock))
  const [price, setPrice] = useState(variant.price === null ? '' : String(variant.price))
  const [active, setActive] = useState(variant.active)
  const [error, setError] = useState('')

  async function save() {
    const quantity = Number(stock)
    const amount = price.trim() === '' ? null : Number(price)
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('المخزون رقم صحيح غير سالب')
      return
    }
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      setError('السعر الخاص يجب أن يكون أكبر من صفر')
      return
    }
    setError('')
    try {
      await updateVariant(variant.id, { stock: quantity, price: amount, active })
      await onSaved()
    } catch (cause) {
      setError(errorText(cause))
    }
  }

  return (
    <Card>
      <div className="grid items-center gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
        <div>
          <Link to={`/products/${variant.productId}`} className="font-medium text-[#0f766e]">
            {variant.productName}
          </Link>
          <p className="text-xs text-[#667085]">
            {variant.color} / {variant.size}
            {variant.sku ? ` · ${variant.sku}` : ''}
          </p>
        </div>
        <TextInput value={stock} onChange={(event) => setStock(event.target.value)} aria-label="المخزون" />
        <TextInput value={price} onChange={(event) => setPrice(event.target.value)} placeholder="سعر خاص" aria-label="السعر" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          متاح
        </label>
        <Button tone="ghost" onClick={() => void save()}>
          حفظ
        </Button>
      </div>
      <Notice error={error} />
    </Card>
  )
}
