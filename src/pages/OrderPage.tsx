import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  ClipboardList,
  Copy,
  CreditCard,
  MapPin,
  Package,
  Phone,
  ShoppingCart,
  Truck,
  UserRound,
  X,
} from 'lucide-react'
import { Notice, TextInput } from '../components/ui'
import { errorText, money, nextOrderStatus, orderStatusLabel, paymentStatusLabel, when } from '../lib/text'
import { fetchProducts } from '../services/catalog'
import { fetchOrders, reviewPayment, updateOrderStatus, type AdminOrder } from '../services/orders'

const flow = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'] as const

const eventDetail: Record<string, string> = {
  pending: 'تم استلام الطلب وجاري مراجعته',
  confirmed: 'تم تأكيد الطلب من قبل الإدارة',
  preparing: 'بدأ تجهيز الطلب',
  out_for_delivery: 'خرج الطلب للتوصيل',
  delivered: 'تم تسليم الطلب',
  cancelled: 'تم إلغاء الطلب',
}

export default function OrderPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<AdminOrder | null | undefined>(undefined)
  const [images, setImages] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [statusChoice, setStatusChoice] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function load() {
    const [orders, products] = await Promise.all([fetchOrders(), fetchProducts()])
    setOrder(orders.find((item) => item.id === id) ?? null)
    const next: Record<string, string> = {}
    for (const product of products) {
      const image = product.images.find((item) => item.primary)?.url || product.images[0]?.url
      if (!image) continue
      next[product.nameAr] = image
      if (product.nameEn) next[product.nameEn] = image
      for (const variant of product.variants) {
        if (variant.sku) next[variant.sku] = image
      }
    }
    setImages(next)
  }

  useEffect(() => {
    let active = true
    void load()
      .catch((cause: unknown) => {
        if (active) setError(errorText(cause))
      })
    return () => {
      active = false
    }
  }, [id])

  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice('تم الحفظ')
      setMessage('')
      await load()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  async function copyReference(reference: string) {
    try {
      await navigator.clipboard.writeText(reference)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  if (order === undefined && !error) return <p className="text-sm text-[#667085]">جارٍ التحميل...</p>
  if (!order) {
    return (
      <div>
        <p className="text-sm text-[#b42318]">{error || 'الطلب غير موجود'}</p>
        <Link to="/orders" className="mt-3 inline-block text-sm text-[#0f766e]">
          العودة إلى الطلبات
        </Link>
      </div>
    )
  }

  const choices = nextOrderStatus[order.status] ?? []
  const selectedStatus = choices.includes(statusChoice) ? statusChoice : (choices[0] ?? '')
  const canReview = order.paymentStatus === 'pending' || order.paymentStatus === 'awaiting_verification'
  const stepIndex = flow.indexOf(order.status as (typeof flow)[number])
  const paymentMethod = order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'فودافون كاش'
  const itemsTotal = order.items.reduce((sum, item) => sum + item.lineTotal, 0)
  const delivery = Math.max(0, order.total - itemsTotal)
  const paid = order.paymentStatus === 'paid'

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#121826]">تفاصيل الطلب</h1>
          <p className="mt-1 text-sm text-[#667085]">
            <span dir="ltr">#{order.reference}</span>
            <span className="mx-2">·</span>
            {when(order.createdAt)}
          </p>
        </div>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1 rounded-full border border-[#e7ebf0] bg-white px-4 py-2 text-sm text-[#344054] shadow-sm hover:bg-[#f6f8fa]"
        >
          العودة إلى الطلبات
          <ChevronLeft size={16} />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary icon={<ClipboardList size={18} />} tone="bg-[#eff6ff] text-[#2563eb]" label="رقم الطلب">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-[#121826]" dir="ltr">
            {order.reference}
            <button
              type="button"
              className="text-[#98a2b3] hover:text-[#2563eb]"
              aria-label="نسخ رقم الطلب"
              onClick={() => void copyReference(order.reference)}
            >
              <Copy size={14} />
            </button>
          </p>
          {copied ? <p className="mt-1 text-[11px] text-[#0f766e]">تم النسخ</p> : null}
        </Summary>
        <Summary icon={<CreditCard size={18} />} tone="bg-[#ecfdf3] text-[#16a34a]" label="إجمالي الطلب">
          <p className="text-lg font-semibold text-[#16a34a]">{money(order.total)}</p>
        </Summary>
        <Summary icon={<Truck size={18} />} tone="bg-[#fff7ed] text-[#ea580c]" label="حالة التوصيل">
          <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${orderTone(order.status)}`}>
            {orderStatusLabel[order.status] ?? order.status}
          </p>
        </Summary>
        <Summary icon={<Check size={18} />} tone={paid ? 'bg-[#ecfdf3] text-[#16a34a]' : 'bg-[#fff7ed] text-[#ea580c]'} label="حالة الدفع">
          <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${paymentTone(order.paymentStatus)}`}>
            {order.paymentStatus ? paymentStatusLabel[order.paymentStatus] : '—'}
          </p>
        </Summary>
      </div>

      <ol className="relative mt-3 grid grid-cols-5 rounded-2xl border border-[#e7ebf0] bg-white px-2 py-4 shadow-sm">
        <span className="absolute start-[10%] end-[10%] top-[1.65rem] h-px bg-[#e7ebf0]" />
        {flow.map((step, index) => {
          const current = stepIndex === index
          const done = stepIndex > index
          return (
            <li key={step} className="relative flex flex-col items-center text-center">
              <span
                className={[
                  'grid size-7 place-items-center rounded-full border text-xs font-semibold',
                  current
                    ? 'border-[#2563eb] bg-[#2563eb] text-white'
                    : done
                      ? 'border-[#93c5fd] bg-[#eff6ff] text-[#2563eb]'
                      : 'border-[#e7ebf0] bg-white text-[#98a2b3]',
                ].join(' ')}
              >
                {index + 1}
              </span>
              <span className={`mt-2 text-[11px] leading-4 ${current ? 'font-semibold text-[#2563eb]' : 'text-[#667085]'}`}>
                {orderStatusLabel[step]}
              </span>
              {current ? <span className="mt-1 text-[10px] text-[#2563eb]">{when(order.createdAt)}</span> : null}
            </li>
          )
        })}
      </ol>

      <div className="mt-3 grid items-start gap-3 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-3">
          <Panel title="معلومات العميل" icon={<UserRound size={16} />}>
            <dl className="space-y-3 text-sm">
              <Row label="الاسم" value={order.recipientName} />
              <Row
                label="رقم الهاتف"
                value={
                  <a href={`tel:${order.recipientPhone}`} className="inline-flex items-center gap-1.5 font-medium text-[#2563eb]" dir="ltr">
                    <Phone size={14} />
                    {order.recipientPhone}
                  </a>
                }
              />
              <Row
                label="العنوان"
                value={
                  <span className="inline-flex items-start gap-1.5">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-[#667085]" />
                    {order.street}، {order.city}، {order.governorate}
                  </span>
                }
              />
              {order.note ? <Row label="ملاحظة" value={order.note} /> : null}
            </dl>
          </Panel>

          <Panel title="معلومات الدفع" icon={<CreditCard size={16} />}>
            <dl className="space-y-3 text-sm">
              <Row label="طريقة الدفع" value={paymentMethod} />
              {order.senderPhone ? <Row label="رقم المحفظة" value={<span dir="ltr">{order.senderPhone}</span>} /> : null}
              {order.transferReference ? <Row label="رقم العملية" value={<span dir="ltr">{order.transferReference}</span>} /> : null}
              <Row
                label="حالة الدفع"
                value={
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${paymentTone(order.paymentStatus)}`}>
                    {paid ? <Check size={12} /> : null}
                    {order.paymentStatus ? paymentStatusLabel[order.paymentStatus] : '—'}
                  </span>
                }
              />
            </dl>
          </Panel>

          <section className="rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-sm">
            {canReview ? (
              <div>
                <h2 className="text-sm font-semibold text-[#121826]">إجراءات الدفع</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e11d48] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#be123c] disabled:opacity-50"
                    onClick={() => void run(() => reviewPayment(order.id, 'rejected', message))}
                  >
                    <X size={16} />
                    رفض الدفع
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16a34a] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#15803d] disabled:opacity-50"
                    onClick={() => void run(() => reviewPayment(order.id, 'paid', message))}
                  >
                    <Check size={16} />
                    تأكيد الدفع
                  </button>
                </div>
              </div>
            ) : null}

            <div className={canReview ? 'mt-4 border-t border-[#eef2f6] pt-4' : ''}>
              <h2 className="text-sm font-semibold text-[#121826]">تحديث حالة الطلب</h2>
              <label className="mt-3 block text-xs text-[#667085]">
                رسالة للعميل
                <TextInput
                  className="mt-1.5"
                  placeholder="اختياري"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>
              {choices.length === 0 ? (
                <p className="mt-3 text-sm text-[#667085]">لا يوجد انتقال متاح.</p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <select
                    className="min-w-0 flex-1 rounded-xl border border-[#e7ebf0] bg-white px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                    value={selectedStatus}
                    onChange={(event) => setStatusChoice(event.target.value)}
                  >
                    {choices.map((status) => (
                      <option key={status} value={status}>
                        {status === 'cancelled' ? 'إلغاء الطلب' : (orderStatusLabel[status] ?? status)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !selectedStatus}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                    onClick={() => void run(() => updateOrderStatus(order.id, selectedStatus, message))}
                  >
                    تحديث الحالة
                  </button>
                </div>
              )}
              <Notice error={error} message={notice} />
            </div>
          </section>
        </div>

        <div className="space-y-3">
          <Panel title="المنتجات المطلوبة" icon={<ShoppingCart size={16} />}>
            {order.items.length === 0 ? (
              <p className="text-sm text-[#667085]">لا توجد منتجات في هذا الطلب.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#eef2f6]">
                <div className="flex justify-between bg-[#f6f8fa] px-3 py-2 text-xs text-[#667085]">
                  <span>المنتج</span>
                  <span>الإجمالي</span>
                </div>
                <ul className="divide-y divide-[#eef2f6]">
                  {order.items.map((item) => {
                    const image = (item.sku && images[item.sku]) || images[item.nameAr] || images[item.nameEn]
                    return (
                      <li key={item.id} className="flex items-center gap-3 px-3 py-3">
                        {image ? (
                          <img src={image} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#f3f5f8] text-[#98a2b3]">
                            <Package size={16} />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[#121826]">{item.nameAr}</p>
                          {item.nameEn && item.nameEn !== item.nameAr ? (
                            <p className="truncate text-xs text-[#667085]">
                              <span dir="ltr">{item.nameEn}</span>
                            </p>
                          ) : null}
                          <p className="mt-0.5 truncate text-[11px] text-[#98a2b3]">
                            {item.color}
                            <span dir="ltr">
                              {' '}
                              / {item.size}
                              {item.sku ? ` · ${item.sku}` : ''}
                            </span>
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="text-sm font-semibold text-[#121826]">{money(item.lineTotal)}</p>
                          <p className="mt-0.5 text-[11px] text-[#667085]">
                            {item.quantity} × {money(item.unitPrice)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            <dl className="mt-4 space-y-2 border-t border-[#eef2f6] pt-3 text-sm">
              <div className="flex items-center justify-between text-[#344054]">
                <dt>إجمالي المنتجات</dt>
                <dd>{money(itemsTotal)}</dd>
              </div>
              <div className="flex items-center justify-between text-[#344054]">
                <dt>تكلفة التوصيل</dt>
                <dd>{money(delivery)}</dd>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-[#16a34a]">
                <dt>الإجمالي الكلي</dt>
                <dd>{money(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="سجل الطلب" icon={<ClipboardList size={16} />}>
            {order.events.length === 0 ? (
              <p className="text-sm text-[#667085]">لا توجد تحديثات بعد.</p>
            ) : (
              <ol className="space-y-4 border-s border-[#e7ebf0] ps-4">
                {order.events.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -start-[1.35rem] top-1 grid size-3 place-items-center rounded-full bg-[#2563eb]" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#121826]">
                          {orderStatusLabel[event.toStatus] ?? event.toStatus}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#667085]">
                          {event.message || eventDetail[event.toStatus] || ''}
                        </p>
                      </div>
                      <p className="shrink-0 text-[11px] text-[#98a2b3]">{when(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Summary({
  icon,
  tone,
  label,
  children,
}: {
  icon: ReactNode
  tone: string
  label: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[#e7ebf0] bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-[#667085]">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}>{icon}</span>
      </div>
    </section>
  )
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e7ebf0] bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[#121826]">
        {icon}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[#667085]">{label}</dt>
      <dd className="text-end font-medium text-[#121826]">{value}</dd>
    </div>
  )
}

function orderTone(status: string): string {
  if (status === 'delivered' || status === 'confirmed') return 'bg-[#ecfdf3] text-[#16a34a]'
  if (status === 'cancelled') return 'bg-[#f3f5f8] text-[#667085]'
  if (status === 'preparing' || status === 'out_for_delivery') return 'bg-[#fff7ed] text-[#c2410c]'
  return 'bg-[#fff7ed] text-[#b45309]'
}

function paymentTone(status: string | null): string {
  if (status === 'paid') return 'bg-[#ecfdf3] text-[#16a34a]'
  if (status === 'pending' || status === 'awaiting_verification') return 'bg-[#fff7ed] text-[#b45309]'
  if (status === 'rejected' || status === 'cancelled') return 'bg-[#f3f5f8] text-[#667085]'
  return 'bg-[#eef2f6] text-[#344054]'
}
