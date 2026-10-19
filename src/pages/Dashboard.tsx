import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, PageTitle } from '../components/ui'
import { money, orderStatusLabel, paymentStatusLabel, when } from '../lib/text'
import { fetchProducts, type AdminProduct } from '../services/catalog'
import { fetchOrders, type AdminOrder } from '../services/orders'

const LOW_STOCK = 5

export default function Dashboard() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void Promise.all([fetchProducts(), fetchOrders()])
      .then(([nextProducts, nextOrders]) => {
        if (!active) return
        setProducts(nextProducts)
        setOrders(nextOrders)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'تعذر تحميل المؤشرات')
      })
    return () => {
      active = false
    }
  }, [])

  if (error) return <p className="text-sm text-[#b42318]">{error}</p>
  if (!products || !orders) return <p className="text-sm text-[#667085]">جارٍ تحميل المؤشرات...</p>

  const variants = products.flatMap((product) => product.variants)
  const activeStock = variants.filter((variant) => variant.active).reduce((sum, variant) => sum + variant.stock, 0)
  const lowStock = variants.filter((variant) => variant.active && variant.stock <= LOW_STOCK)
  const awaiting = orders.filter(
    (order) => order.paymentStatus === 'awaiting_verification' || order.paymentStatus === 'pending',
  )
  const paidTotal = orders
    .filter((order) => order.paymentStatus === 'paid')
    .reduce((sum, order) => sum + order.total, 0)
  const statusCounts = orders.reduce<Record<string, number>>((counts, order) => {
    counts[order.status] = (counts[order.status] ?? 0) + 1
    return counts
  }, {})

  const stats = [
    { label: 'المنتجات', value: String(products.length) },
    { label: 'الظاهرة في المتجر', value: String(products.filter((product) => product.visible).length) },
    { label: 'وحدات المخزون النشط', value: String(activeStock) },
    { label: 'مخزون منخفض', value: String(lowStock.length) },
    { label: 'مدفوعات بانتظار الإجراء', value: String(awaiting.length) },
    { label: 'محصّل', value: money(paidTotal) },
  ]

  return (
    <div>
      <PageTitle title="المؤشرات" detail="ملخص الكتالوج والطلبات والمدفوعات من قاعدة البيانات الحالية." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-[#667085]">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">حالة الطلبات</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.entries(orderStatusLabel).map(([status, label]) => (
              <li key={status} className="flex justify-between border-b border-[#e7ebf0] py-2">
                <span>{label}</span>
                <span className="font-medium">{statusCounts[status] ?? 0}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">مخزون يحتاج متابعة</h2>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-[#667085]">لا توجد متغيرات نشطة بكمية {LOW_STOCK} أو أقل.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {lowStock.slice(0, 8).map((variant) => (
                <li key={variant.id} className="flex justify-between gap-3">
                  <span>
                    {variant.productName} · {variant.color} / {variant.size}
                  </span>
                  <span className="font-medium">{variant.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">أحدث الطلبات</h2>
          <Link to="/orders" className="text-sm text-[#0f766e]">
            كل الطلبات
          </Link>
        </div>
        <OrderTable orders={orders.slice(0, 6)} />
      </Card>
    </div>
  )
}

export function OrderTable({ orders }: { orders: AdminOrder[] }) {
  if (orders.length === 0) return <p className="text-sm text-[#667085]">لا توجد طلبات.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-[#667085]">
          <tr className="border-b border-[#e7ebf0] text-right">
            <th className="py-2 font-medium">الطلب</th>
            <th className="py-2 font-medium">الحالة</th>
            <th className="py-2 font-medium">الدفع</th>
            <th className="py-2 font-medium">الإجمالي</th>
            <th className="py-2 font-medium">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-[#e7ebf0]">
              <td className="py-3">
                <Link to={`/orders/${order.id}`} className="font-medium text-[#0f766e]">
                  {order.reference}
                </Link>
                <p className="text-xs text-[#667085]">{order.recipientName}</p>
              </td>
              <td>{orderStatusLabel[order.status] ?? order.status}</td>
              <td>{order.paymentStatus ? paymentStatusLabel[order.paymentStatus] : '—'}</td>
              <td>{money(order.total)}</td>
              <td className="text-[#667085]">{when(order.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
