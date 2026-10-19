import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Notice, PageTitle, TextInput } from '../components/ui'
import { errorText, money, slugify } from '../lib/text'
import {
  createProduct,
  fetchCategories,
  fetchProducts,
  type AdminCategory,
  type AdminProduct,
} from '../services/catalog'

export default function Products() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.all([fetchProducts(), fetchCategories()])
      .then(([nextProducts, nextCategories]) => {
        setProducts(nextProducts)
        setCategories(nextCategories)
        setCategoryId(nextCategories[0]?.id ?? '')
      })
      .catch((cause: unknown) => setError(errorText(cause)))
  }, [])

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    const slug = slugify(nameEn)
    const amount = Number(price)
    if (!slug || !categoryId || !Number.isFinite(amount) || amount < 0) {
      setError('أكمل القسم والاسم الإنجليزي والسعر.')
      return
    }
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
      setError(errorText(cause))
    }
  }

  return (
    <div>
      <PageTitle title="المنتجات" detail="المنتج الجديد يبقى مخفياً حتى تفعّله وتضيف متغيراً نشطاً." />
      <Card>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void onCreate(event)}>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-xl border border-[#e7ebf0] px-3 py-2 text-sm"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameAr}
              </option>
            ))}
          </select>
          <TextInput required inputMode="decimal" placeholder="السعر" value={price} onChange={(event) => setPrice(event.target.value)} />
          <TextInput required placeholder="الاسم بالعربية" value={nameAr} onChange={(event) => setNameAr(event.target.value)} />
          <TextInput required placeholder="English name" value={nameEn} onChange={(event) => setNameEn(event.target.value)} />
          <Button type="submit" disabled={!categoryId}>
            إنشاء منتج
          </Button>
        </form>
        <Notice error={error} />
      </Card>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#e7ebf0] bg-white">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="text-[#667085]">
            <tr className="border-b border-[#e7ebf0] text-right">
              <th className="px-4 py-3 font-medium">المنتج</th>
              <th className="px-4 py-3 font-medium">السعر</th>
              <th className="px-4 py-3 font-medium">المتغيرات</th>
              <th className="px-4 py-3 font-medium">الظهور</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((product) => (
              <tr key={product.id} className="border-b border-[#e7ebf0]">
                <td className="px-4 py-3">
                  <Link to={`/products/${product.id}`} className="font-medium text-[#0f766e]">
                    {product.nameAr}
                  </Link>
                  <p className="text-xs text-[#667085]">{product.nameEn}</p>
                </td>
                <td className="px-4 py-3">{money(product.price)}</td>
                <td className="px-4 py-3">{product.variants.length}</td>
                <td className="px-4 py-3">{product.visible ? 'ظاهر' : 'مخفي'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {products && products.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[#667085]">لا توجد منتجات بعد.</p>
        ) : null}
      </div>
    </div>
  )
}
