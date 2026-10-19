import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import GalleryEditor from '../components/GalleryEditor'
import { Button, Card, Notice, PageTitle, TextInput } from '../components/ui'
import { errorText, slugify } from '../lib/text'
import {
  createVariant,
  fetchCategories,
  fetchProducts,
  updateProduct,
  updateVariant,
  type AdminCategory,
  type AdminProduct,
  type AdminVariant,
} from '../services/catalog'

export default function ProductEditor() {
  const { id } = useParams()
  const [product, setProduct] = useState<AdminProduct | null | undefined>(undefined)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const [products, nextCategories] = await Promise.all([fetchProducts(), fetchCategories()])
    setCategories(nextCategories)
    setProduct(products.find((item) => item.id === id) ?? null)
  }

  useEffect(() => {
    void load().catch((cause: unknown) => setError(errorText(cause)))
  }, [id])

  if (product === undefined && !error) return <p className="text-sm text-[#667085]">جارٍ التحميل...</p>
  if (!product) {
    return (
      <div>
        <p className="text-sm text-[#b42318]">{error || 'المنتج غير موجود'}</p>
        <Link to="/products" className="mt-3 inline-block text-sm text-[#0f766e]">
          العودة للمنتجات
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageTitle title={product.nameAr} detail="السعر والمخزون والظهور تُحفظ في الجداول الحالية، والصور في مساحة التخزين." />
      <ProductForm
        product={product}
        categories={categories}
        onSaved={async () => {
          setMessage('تم حفظ المنتج')
          await load()
        }}
      />
      <Card>
        <GalleryEditor productId={product.id} images={product.images} onChanged={load} />
      </Card>
      <Variants product={product} onChanged={load} />
      <Notice error={error} message={message} />
    </div>
  )
}

function ProductForm({
  product,
  categories,
  onSaved,
}: {
  product: AdminProduct
  categories: AdminCategory[]
  onSaved: () => Promise<void>
}) {
  const [categoryId, setCategoryId] = useState(product.categoryId)
  const [nameAr, setNameAr] = useState(product.nameAr)
  const [nameEn, setNameEn] = useState(product.nameEn)
  const [slug, setSlug] = useState(product.slug)
  const [descriptionAr, setDescriptionAr] = useState(product.descriptionAr)
  const [descriptionEn, setDescriptionEn] = useState(product.descriptionEn)
  const [price, setPrice] = useState(String(product.price))
  const [compareAt, setCompareAt] = useState(product.compareAt === null ? '' : String(product.compareAt))
  const [visible, setVisible] = useState(product.visible)
  const [featured, setFeatured] = useState(product.featured)
  const [isNew, setIsNew] = useState(product.isNew)
  const [bestSeller, setBestSeller] = useState(product.bestSeller)
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const amount = Number(price)
    const compare = compareAt.trim() === '' ? null : Number(compareAt)
    if (!Number.isFinite(amount) || amount < 0) {
      setError('أدخل سعراً صحيحاً')
      return
    }
    if (compare !== null && (!Number.isFinite(compare) || compare <= amount)) {
      setError('سعر المقارنة يجب أن يكون أكبر من سعر البيع')
      return
    }
    const nextSlug = slugify(slug)
    if (!nextSlug) {
      setError('الرابط يجب أن يكون بحروف لاتينية')
      return
    }
    setError('')
    try {
      await updateProduct(product.id, {
        categoryId,
        slug: nextSlug,
        nameAr,
        nameEn,
        descriptionAr,
        descriptionEn,
        price: amount,
        compareAt: compare,
        visible,
        featured,
        isNew,
        bestSeller,
      })
      await onSaved()
    } catch (cause) {
      setError(errorText(cause))
    }
  }

  return (
    <Card>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onSubmit(event)}>
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-xl border border-[#e7ebf0] px-3 py-2 text-sm">
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nameAr}
            </option>
          ))}
        </select>
        <TextInput value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="slug" />
        <TextInput value={nameAr} onChange={(event) => setNameAr(event.target.value)} placeholder="الاسم بالعربية" />
        <TextInput value={nameEn} onChange={(event) => setNameEn(event.target.value)} placeholder="English name" />
        <textarea value={descriptionAr} onChange={(event) => setDescriptionAr(event.target.value)} rows={3} className="rounded-xl border border-[#e7ebf0] px-3 py-2 text-sm" placeholder="الوصف بالعربية" />
        <textarea value={descriptionEn} onChange={(event) => setDescriptionEn(event.target.value)} rows={3} className="rounded-xl border border-[#e7ebf0] px-3 py-2 text-sm" placeholder="English description" />
        <TextInput value={price} onChange={(event) => setPrice(event.target.value)} placeholder="سعر البيع" />
        <TextInput value={compareAt} onChange={(event) => setCompareAt(event.target.value)} placeholder="السعر قبل الخصم" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /> ظاهر في المتجر</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> مميز</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isNew} onChange={(event) => setIsNew(event.target.checked)} /> جديد</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bestSeller} onChange={(event) => setBestSeller(event.target.checked)} /> الأكثر مبيعاً</label>
        <Button type="submit">حفظ البيانات</Button>
      </form>
      <Notice error={error} />
    </Card>
  )
}

function Variants({ product, onChanged }: { product: AdminProduct; onChanged: () => Promise<void> }) {
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [error, setError] = useState('')

  async function add(event: FormEvent) {
    event.preventDefault()
    const amount = price.trim() === '' ? null : Number(price)
    const quantity = Number(stock)
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      setError('سعر المتغير يجب أن يكون أكبر من صفر، أو اتركه فارغاً ليأخذ سعر المنتج')
      return
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('المخزون رقم صحيح غير سالب')
      return
    }
    setError('')
    try {
      await createVariant({
        productId: product.id,
        color,
        size,
        sku,
        price: amount,
        stock: quantity,
        active: true,
      })
      setColor('')
      setSize('')
      setSku('')
      setPrice('')
      setStock('0')
      await onChanged()
    } catch (cause) {
      setError(errorText(cause))
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">المتغيرات والمخزون</h2>
      <form className="mt-3 grid gap-2 md:grid-cols-6" onSubmit={(event) => void add(event)}>
        <TextInput required placeholder="اللون" value={color} onChange={(event) => setColor(event.target.value)} />
        <TextInput required placeholder="المقاس" value={size} onChange={(event) => setSize(event.target.value)} />
        <TextInput placeholder="SKU" value={sku} onChange={(event) => setSku(event.target.value)} />
        <TextInput placeholder="سعر خاص" value={price} onChange={(event) => setPrice(event.target.value)} />
        <TextInput required placeholder="المخزون" value={stock} onChange={(event) => setStock(event.target.value)} />
        <Button type="submit">إضافة</Button>
      </form>
      <Notice error={error} />
      <div className="mt-4 space-y-3">
        {product.variants.map((variant) => (
          <VariantRow key={variant.id} variant={variant} onChanged={onChanged} />
        ))}
      </div>
    </Card>
  )
}

function VariantRow({ variant, onChanged }: { variant: AdminVariant; onChanged: () => Promise<void> }) {
  const [price, setPrice] = useState(variant.price === null ? '' : String(variant.price))
  const [stock, setStock] = useState(String(variant.stock))
  const [active, setActive] = useState(variant.active)
  const [error, setError] = useState('')

  async function save() {
    const amount = price.trim() === '' ? null : Number(price)
    const quantity = Number(stock)
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      setError('سعر غير صالح')
      return
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('مخزون غير صالح')
      return
    }
    setError('')
    try {
      await updateVariant(variant.id, { price: amount, stock: quantity, active })
      await onChanged()
    } catch (cause) {
      setError(errorText(cause))
    }
  }

  return (
    <div className="grid gap-2 border-t border-[#e7ebf0] pt-3 md:grid-cols-[1.2fr_1fr_1fr_auto_auto]">
      <p className="text-sm">
        {variant.color} / {variant.size}
        {variant.sku ? ` · ${variant.sku}` : ''}
      </p>
      <TextInput value={price} onChange={(event) => setPrice(event.target.value)} placeholder="سعر خاص" />
      <TextInput value={stock} onChange={(event) => setStock(event.target.value)} placeholder="المخزون" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
        متاح
      </label>
      <Button tone="ghost" onClick={() => void save()}>
        حفظ
      </Button>
      <Notice error={error} />
    </div>
  )
}
