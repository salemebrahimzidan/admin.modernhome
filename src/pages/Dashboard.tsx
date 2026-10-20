import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Boxes, Check, ClipboardList, Eye, Package, Settings, Trash2, TriangleAlert, Truck, X, type LucideIcon } from 'lucide-react'
import { ActionIcon, ConfirmPopup, Skeleton, TableSkeleton } from '../components/ui'
import { errorText, money, orderStatusLabel, paymentStatusLabel, whenEnglish } from '../lib/text'
import { fetchProducts, type AdminProduct } from '../services/catalog'
import { deleteOrder, fetchOrders, type AdminOrder } from '../services/orders'

const LOW_STOCK = 5

export default function Dashboard() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null)
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState('')

  function load() {
    return Promise.all([fetchProducts(), fetchOrders()])
      .then(([nextProducts, nextOrders]) => {
        setProducts(nextProducts)
        setOrders(nextOrders)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'تعذر تحميل المؤشرات')
      })
  }

  useEffect(() => {
    void load()
  }, [])

  if (error && (!products || !orders)) {
    return (
      <div className="w-full">
        <DashboardHeader />
        <p className="text-sm text-[#b42318]">{error}</p>
      </div>
    )
  }
  if (!products || !orders) {
    return (
      <div className="w-full">
        <DashboardHeader />
        <DashboardSkeleton />
      </div>
    )
  }

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

  const visibleCount = products.filter((product) => product.visible).length

  const low = lowStock.length > 0
  const metrics: {
    label: string
    value: string
    hint?: string
    to: string
    icon: LucideIcon
    iconClass: string
    valueColor: string
  }[] = [
    {
      label: 'محصّل',
      value: money(paidTotal),
      hint: `${awaiting.length} مدفوعات بانتظار الإجراء`,
      to: '/payments',
      icon: Banknote,
      iconClass: 'bg-[#ccfbf1] text-[#0f766e]',
      valueColor: 'text-[#0f766e]',
    },
    {
      label: 'المنتجات',
      value: String(products.length),
      to: '/products',
      icon: Package,
      iconClass: 'bg-[#dbeafe] text-[#1d4ed8]',
      valueColor: 'text-[#1d4ed8]',
    },
    {
      label: 'الظاهرة في المتجر',
      value: String(visibleCount),
      to: '/products',
      icon: Eye,
      iconClass: 'bg-[#d1fae5] text-[#047857]',
      valueColor: 'text-[#047857]',
    },
    {
      label: 'وحدات المخزون النشط',
      value: String(activeStock),
      to: '/inventory',
      icon: Boxes,
      iconClass: 'bg-[#fef3c7] text-[#b45309]',
      valueColor: 'text-[#b45309]',
    },
    {
      label: 'مخزون منخفض',
      value: String(lowStock.length),
      to: '/inventory',
      icon: TriangleAlert,
      iconClass: low ? 'bg-[#ffe4e6] text-[#be123c]' : 'bg-[#dcfce7] text-[#15803d]',
      valueColor: low ? 'text-[#be123c]' : 'text-[#15803d]',
    },
  ]

  return (
    <div className="w-full">
      <DashboardHeader />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Link
              key={metric.label}
              to={metric.to}
              className="flex h-full flex-col rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-sm transition hover:border-[#d0d5dd] hover:shadow-md"
            >
              <span className={`grid size-9 place-items-center rounded-xl ${metric.iconClass}`}>
                <Icon size={18} />
              </span>
              <span className={`mt-4 text-3xl font-semibold leading-none tracking-tight ${metric.valueColor}`}>{metric.value}</span>
              <span className="mt-2 text-sm leading-5 text-[#344054]">{metric.label}</span>
              {metric.hint ? <span className="mt-1 text-xs leading-5 text-[#667085]">{metric.hint}</span> : null}
            </Link>
          )
        })}
      </section>

      <section className="mt-4 rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-[#121826]">حالة الطلبات</h2>
        <StatusCircles counts={statusCounts} total={orders.length} />
      </section>

      <section className="mt-4 rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#121826]">مخزون يحتاج متابعة</h2>
            <Link to="/inventory" className="text-sm text-[#0f766e]">
              المخزون
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-[#f3f5f8] px-4 py-5 text-sm leading-6 text-[#667085]">
              لا توجد متغيرات نشطة بكمية {LOW_STOCK} أو أقل.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[#eef2f6] text-sm">
              {lowStock.slice(0, 8).map((variant) => (
                <li key={variant.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-[#344054]">
                    {variant.productName}
                    <span className="mt-0.5 block text-xs text-[#667085]">
                      {variant.color} / {variant.size}
                    </span>
                  </span>
                  <span className="rounded-full bg-[#fff6e8] px-2.5 py-1 text-xs font-medium text-[#b54708]">
                    {variant.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-[#e7ebf0] bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-semibold text-[#121826]">أحدث الطلبات</h2>
          <Link to="/orders" className="text-sm text-[#0f766e]">
            كل الطلبات
          </Link>
        </div>
        <OrdersTable orders={orders} scroll onDeleted={() => void load()} />
      </section>
    </div>
  )
}

const statusColor: Record<string, string> = {
  pending: '#d97706',
  confirmed: '#0f766e',
  preparing: '#2563eb',
  out_for_delivery: '#ea580c',
  delivered: '#16a34a',
  cancelled: '#e11d48',
}

function DashboardHeader() {
  return (
    <header className="mb-5">
      <h1 className="text-3xl font-semibold tracking-tight text-[#121826]">المؤشرات</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#667085]">
        ملخص الكتالوج والطلبات والمدفوعات من قاعدة البيانات الحالية.
      </p>
    </header>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="جارٍ تحميل المؤشرات">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-sm">
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-3 h-4 w-24" />
          </div>
        ))}
      </section>
      <section className="mt-4 rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-sm">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 flex flex-wrap justify-around gap-y-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="size-[72px] rounded-full" />
          ))}
        </div>
      </section>
      <section className="mt-4 rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-16 w-full" />
      </section>
      <section className="mt-4 overflow-hidden rounded-2xl border border-[#e7ebf0] bg-white shadow-sm">
        <div className="px-4 py-3">
          <Skeleton className="h-5 w-28" />
        </div>
        <TableSkeleton rows={4} />
      </section>
    </div>
  )
}

function StatusCircles({ counts, total }: { counts: Record<string, number>; total: number }) {
  const entries = Object.keys(orderStatusLabel).map((status) => ({
    status,
    label: orderStatusLabel[status],
    count: counts[status] ?? 0,
    color: statusColor[status] ?? '#98a2b3',
  }))
  const size = 72
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <ul className="mt-4 flex flex-wrap justify-around gap-y-4">
      {entries.map((entry) => {
        const length = total > 0 ? (entry.count / total) * circumference : 0
        const full = total > 0 && entry.count === total
        return (
          <li key={entry.status} className="flex w-[4.5rem] shrink-0 flex-col items-center text-center">
            <div className="relative size-[72px]">
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill={entry.color}
                  fillOpacity={entry.count > 0 ? 0.16 : 0.1}
                  stroke={entry.color}
                  strokeOpacity={entry.count > 0 ? 0.28 : 0.7}
                  strokeWidth={stroke}
                />
                {length > 0 ? (
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={entry.color}
                    strokeWidth={stroke}
                    strokeLinecap={full ? 'butt' : 'round'}
                    strokeDasharray={full ? undefined : `${length} ${circumference - length}`}
                  />
                ) : null}
              </svg>
              <span className="absolute inset-0 grid place-items-center text-sm font-semibold" style={{ color: entry.color }}>
                {entry.count}
              </span>
            </div>
            <span className="mt-1.5 text-[11px] leading-4 text-[#344054]">{entry.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

const statusIcons: Record<string, LucideIcon> = {
  pending: ClipboardList,
  confirmed: Check,
  preparing: Settings,
  out_for_delivery: Truck,
  delivered: Package,
  cancelled: X,
}

function StatusIcon({ status }: { status: string }) {
  const Icon = statusIcons[status] ?? ClipboardList
  return <Icon size={14} />
}

function pillTone(kind: 'order' | 'payment', value: string | null): string {
  if (kind === 'order') {
    if (value === 'pending') return 'bg-[#fff7ed] text-[#c2410c]'
    if (value === 'confirmed') return 'bg-[#dbeafe] text-[#1d4ed8]'
    if (value === 'preparing') return 'bg-[#ffedd5] text-[#ea580c]'
    if (value === 'out_for_delivery') return 'bg-[#ede9fe] text-[#7c3aed]'
    if (value === 'delivered') return 'bg-[#dcfce7] text-[#16a34a]'
    if (value === 'cancelled') return 'bg-[#ffe4e6] text-[#e11d48]'
  }
  if (kind === 'payment' && value === 'paid') return 'bg-[#e7f6f3] text-[#0f766e]'
  if (kind === 'payment' && (value === 'pending' || value === 'awaiting_verification')) {
    return 'bg-[#fff6e8] text-[#b54708]'
  }
  if (value === 'rejected' || value === 'cancelled') return 'bg-[#f3f5f8] text-[#667085]'
  return 'bg-[#eef2f6] text-[#344054]'
}

export function OrderTable({ orders, onDeleted }: { orders: AdminOrder[]; onDeleted?: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e7ebf0] bg-white shadow-sm">
      <OrdersTable orders={orders} onDeleted={onDeleted} />
    </div>
  )
}

function OrdersTable({
  orders,
  scroll = false,
  onDeleted,
}: {
  orders: AdminOrder[]
  scroll?: boolean
  onDeleted?: () => void
}) {
  const [pending, setPending] = useState<AdminOrder | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function remove() {
    if (!pending || busy) return
    setBusy(true)
    setDeleteError('')
    try {
      await deleteOrder(pending.id)
      setPending(null)
      onDeleted?.()
    } catch (cause) {
      setDeleteError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  if (orders.length === 0) return <p className="px-4 py-6 text-sm text-[#667085]">لا توجد طلبات.</p>
  return (
    <>
      <div className={scroll ? 'max-h-80 overflow-auto' : 'overflow-x-auto'}>
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className={scroll ? 'sticky top-0 z-10' : undefined}>
            <tr className="bg-[#f3f5f8] text-right text-xs text-[#667085]">
              <th className="bg-[#f3f5f8] px-4 py-3 font-medium">الطلب</th>
              <th className="bg-[#f3f5f8] px-4 py-3 font-medium">الحالة</th>
              <th className="bg-[#f3f5f8] px-4 py-3 font-medium">الدفع</th>
              <th className="bg-[#f3f5f8] px-4 py-3 font-medium">الإجمالي</th>
              <th className="bg-[#f3f5f8] px-4 py-3 font-medium">التاريخ</th>
              <th className="bg-[#f3f5f8] px-4 py-3 font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => {
              const created = whenEnglish(order.createdAt)
              return (
              <tr key={order.id} className={`${index % 2 === 1 ? 'bg-[#f6f8fa]' : 'bg-white'} hover:bg-[#eef3f8]`}>
                <td className="px-4 py-3">
                  <Link to={`/orders/${order.id}`} className="font-medium text-[#121826] hover:text-[#0f766e]">
                    {order.reference}
                  </Link>
                  <p className="mt-0.5 text-xs text-[#667085]">{order.recipientName}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full ${pillTone('order', order.status)}`}>
                      <StatusIcon status={order.status} />
                    </span>
                    <span className="text-sm text-[#344054]">{orderStatusLabel[order.status] ?? order.status}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${pillTone('payment', order.paymentStatus)}`}>
                    {order.paymentStatus ? paymentStatusLabel[order.paymentStatus] : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-[#121826]">{money(order.total)}</td>
                <td className="whitespace-nowrap px-4 py-3" dir="ltr">
                  <p className="text-sm font-medium text-[#344054]">{created.date}</p>
                  <p className="mt-0.5 text-xs text-[#667085]">{created.time}</p>
                </td>
                <td className="px-4 py-3">
                  <ActionIcon
                    label="حذف"
                    tone="danger"
                    disabled={busy}
                    onClick={() => {
                      setDeleteError('')
                      setPending(order)
                    }}
                  >
                    <Trash2 size={15} />
                  </ActionIcon>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pending ? (
        <ConfirmPopup
          title="حذف الطلب"
          message={`هل تريد حذف الطلب «${pending.reference}»؟ لا يمكن التراجع عن الحذف.`}
          confirmLabel="تأكيد الحذف"
          tone="danger"
          busy={busy}
          error={deleteError}
          onConfirm={() => void remove()}
          onCancel={() => {
            if (busy) return
            setPending(null)
            setDeleteError('')
          }}
        />
      ) : null}
    </>
  )
}
