import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  MapPin,
  Package,
  Printer,
  Send,
  Settings,
  ShoppingCart,
  Trash2,
  Truck,
  UserRound,
  X,
} from 'lucide-react'
import { ConfirmPopup, Notice, Popup, TextInput } from '../components/ui'
import { errorText, money, nextOrderStatus, orderStatusLabel, paymentStatusLabel, whenEnglish } from '../lib/text'
import { fetchProducts } from '../services/catalog'
import { deleteOrder, fetchOrders, reviewPayment, updateOrderStatus, type AdminOrder } from '../services/orders'

const flow = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'] as const

const stepIcons = {
  pending: ClipboardList,
  confirmed: Check,
  preparing: Settings,
  out_for_delivery: Truck,
  delivered: Package,
} as const

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
  const navigate = useNavigate()
  const [order, setOrder] = useState<AdminOrder | null | undefined>(undefined)
  const [images, setImages] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [statusChoice, setStatusChoice] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [printPreview, setPrintPreview] = useState<'order' | 'invoice' | null>(null)
  const [preview, setPreview] = useState<{ src: string; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  useEffect(() => {
    document.body.classList.toggle('print-preview', printPreview !== null)
    document.body.classList.toggle('print-invoice', printPreview === 'invoice')
    return () => {
      document.body.classList.remove('print-preview')
      if (printPreview !== null) document.body.classList.remove('print-invoice')
    }
  }, [printPreview])

  useEffect(() => {
    function clearPrintMode() {
      if (!document.body.classList.contains('print-preview')) {
        document.body.classList.remove('print-invoice')
      }
    }
    window.addEventListener('afterprint', clearPrintMode)
    return () => window.removeEventListener('afterprint', clearPrintMode)
  }, [])

  function printSheet(invoice: boolean) {
    document.body.classList.toggle('print-invoice', invoice)
    window.print()
  }

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

  async function removeOrder() {
    if (!order || busy) return
    setBusy(true)
    setError('')
    try {
      await deleteOrder(order.id)
      navigate('/orders')
    } catch (cause) {
      setError(errorText(cause))
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
  const isCod = order.paymentMethod === 'cod'
  const itemsTotal = order.items.reduce((sum, item) => sum + item.lineTotal, 0)
  const delivery = Math.max(0, order.total - itemsTotal)
  const paid = order.paymentStatus === 'paid'
  const history = [...order.events].reverse()
  return (
    <div className="order-sheet w-full">
      {printPreview ? (
        <div className="print-preview-bar no-print">
          <p className="min-w-0 truncate text-sm font-semibold">
            {printPreview === 'invoice' ? 'معاينة فاتورة العميل' : 'معاينة الطلب'}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-white/25 px-4 py-2 text-sm text-white hover:bg-white/10"
              onClick={() => setPrintPreview(null)}
            >
              رجوع
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-4 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8]"
              onClick={() => printSheet(printPreview === 'invoice')}
            >
              <Printer size={16} />
              طباعة
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="order-title text-2xl font-semibold tracking-tight text-[#121826]">تفاصيل الطلب</h1>
          <h1 className="invoice-only hidden text-2xl font-semibold tracking-tight text-[#121826]">فاتورة</h1>
          <p className="mt-1 inline-flex items-center gap-2 text-sm">
            <span className="text-[#667085]">رقم الطلب</span>
            <span dir="ltr" className="rounded-lg bg-[#dbeafe] px-2 py-0.5 font-mono font-semibold text-[#1d4ed8]">
              #{order.reference}
            </span>
            <button
              type="button"
              className="no-print grid size-7 place-items-center rounded-lg text-[#1d4ed8] hover:bg-[#dbeafe]"
              aria-label={copied ? 'تم النسخ' : 'نسخ رقم الطلب'}
              title={copied ? 'تم النسخ' : 'نسخ رقم الطلب'}
              onClick={() => void copyReference(order.reference)}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#e7ebf0] bg-white px-4 py-2 text-sm text-[#344054] shadow-sm hover:bg-[#f6f8fa]"
            onClick={() => setPrintPreview('order')}
          >
            <Printer size={16} />
            طباعة الطلب
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#dbeafe] bg-[#f8fbff] px-4 py-2 text-sm text-[#1d4ed8] shadow-sm hover:bg-[#dbeafe]"
            onClick={() => setPrintPreview('invoice')}
          >
            <Printer size={16} />
            فاتورة للعميل
          </button>
          <button
            type="button"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-[#fecdd3] bg-[#fff1f2] px-4 py-2 text-sm text-[#b42318] shadow-sm hover:bg-[#ffe4e6] disabled:opacity-50"
            onClick={() => {
              setError('')
              setConfirmDelete(true)
            }}
          >
            <Trash2 size={16} />
            حذف الطلب
          </button>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1 rounded-full border border-[#e7ebf0] bg-white px-4 py-2 text-sm text-[#344054] shadow-sm hover:bg-[#f6f8fa]"
          >
            العودة إلى الطلبات
            <ChevronLeft size={16} />
          </Link>
        </div>
      </div>

      <section className="order-print mt-4 overflow-hidden rounded-2xl border border-[#e7ebf0] bg-white shadow-sm">
      <div className="order-print-grid grid items-start lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 p-4 lg:border-e lg:border-[#eef2f6]">
      <div className="grid gap-4 border-b border-[#eef2f6] pb-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#c2410c]">
            <UserRound size={16} />
            معلومات العميل
          </div>
          <dl className="mt-3 space-y-3 text-sm">
            <Row label="الاسم" value={order.recipientName} />
            <Row
              label="الهاتف"
              value={
                <a href={`tel:${order.recipientPhone}`} className="text-[#c2410c]" dir="ltr">
                  {order.recipientPhone}
                </a>
              }
            />
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="inline-flex shrink-0 items-center gap-2 text-[#667085]">
                <MapPin size={15} className="text-[#ea580c]" />
                العنوان
              </span>
              <dd className="text-end font-medium text-[#121826]" dir="auto">
                {order.street}، {order.city}، {order.governorate}
              </dd>
            </div>
            {order.note ? <Row label="ملاحظة" value={order.note} /> : null}
          </dl>
        </div>
        <div className="sm:border-s sm:border-[#eef2f6] sm:ps-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#c2410c]">
            <CreditCard size={16} />
            معلومات الدفع
          </p>
          <dl className="mt-3 space-y-3 text-sm">
            <Row
              label="طريقة الدفع"
              value={
                isCod ? (
                  <span className="inline-flex rounded-full bg-[#fff7ed] px-2.5 py-1 text-xs font-medium text-[#c2410c]">
                    الدفع عند الاستلام
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-[#ffe4e6] px-2.5 py-1 text-xs font-medium text-[#e11d48]">
                    فودافون كاش
                  </span>
                )
              }
            />
            {isCod ? (
              <Row
                label="حالة الدفع"
                value={
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      paid ? 'bg-[#ecfdf3] text-[#16a34a]' : 'bg-[#fff7ed] text-[#b45309]'
                    }`}
                  >
                    {paid ? <Check size={12} /> : null}
                    {paid ? 'تم التحصيل عند التسليم' : 'يُحصّل عند التسليم'}
                  </span>
                }
              />
            ) : (
              <>
                <Row label="رقم المحفظة" value={<span dir="ltr">{order.senderPhone || '—'}</span>} />
                <Row label="رقم العملية" value={<span dir="ltr">{order.transferReference || '—'}</span>} />
                <Row
                  label="حالة الدفع"
                  value={
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${paymentTone(order.paymentStatus)}`}>
                      {paid ? <Check size={12} /> : null}
                      {order.paymentStatus ? paymentStatusLabel[order.paymentStatus] : '—'}
                    </span>
                  }
                />
              </>
            )}
          </dl>
          {canReview ? (
            <div className="no-print mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#e11d48] px-2 py-2 text-xs font-medium text-white hover:bg-[#be123c] disabled:opacity-50"
                onClick={() => void run(() => reviewPayment(order.id, 'rejected', message))}
              >
                <X size={14} />
                رفض الدفع
              </button>
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#16a34a] px-2 py-2 text-xs font-medium text-white hover:bg-[#15803d] disabled:opacity-50"
                onClick={() => void run(() => reviewPayment(order.id, 'paid', message))}
              >
                <Check size={14} />
                تأكيد الدفع
              </button>
            </div>
          ) : null}
          {canReview ? <div className="no-print mt-3"><Notice error={error} message={notice} /></div> : null}
        </div>
      </div>
      <div className="mt-4">
        <div className="space-y-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#121826]">
              <ShoppingCart size={16} />
              المنتجات المطلوبة
            </h2>
            <div className="mt-4">
            {order.items.length === 0 ? (
              <p className="text-sm text-[#667085]">لا توجد منتجات في هذا الطلب.</p>
            ) : (
              <>
              <div className="order-items overflow-x-auto rounded-xl border border-[#e7ebf0]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#f3f5f8] text-xs text-[#667085]">
                      <th className="px-4 py-3 text-start font-medium">المنتج</th>
                      <th className="px-4 py-3 text-start font-medium">المقاس</th>
                      <th className="px-4 py-3 text-start font-medium">اللون</th>
                      <th className="px-4 py-3 text-start font-medium">الكود</th>
                      <th className="px-4 py-3 text-start font-medium">سعر القطعة</th>
                      <th className="px-4 py-3 text-start font-medium">الكمية</th>
                      <th className="px-4 py-3 text-start font-medium">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => {
                      const image = (item.sku && images[item.sku]) || images[item.nameAr] || images[item.nameEn]
                      return (
                        <tr key={item.id} className={index % 2 === 1 ? 'bg-[#f6f8fa]' : 'bg-white'}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {image ? (
                                <button
                                  type="button"
                                  className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                                  aria-label={`عرض صورة ${item.nameAr}`}
                                  onClick={() => setPreview({ src: image, name: item.nameAr })}
                                >
                                  <img src={image} alt="" className="size-11 rounded-lg object-cover" />
                                </button>
                              ) : (
                                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#f3f5f8] text-[#98a2b3]">
                                  <Package size={16} />
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-medium text-[#121826]">{item.nameAr}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#344054]">{item.size || '—'}</td>
                          <td className="px-4 py-3 text-[#344054]">{item.color || '—'}</td>
                          <td className="px-4 py-3 text-[#344054]" dir="ltr">{item.sku || '—'}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-[#344054]">{money(item.unitPrice)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-[#344054]">{item.quantity} قطعة</td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-[#121826]">{money(item.lineTotal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <dl className="ms-auto mt-3 w-full max-w-xs space-y-2 text-sm">
                <div className="flex items-center justify-between gap-6 text-[#344054]">
                  <dt>إجمالي المنتجات</dt>
                  <dd className="font-medium text-[#121826]">{money(itemsTotal)}</dd>
                </div>
                <div className="flex items-center justify-between gap-6 text-[#344054]">
                  <dt>تكلفة التوصيل</dt>
                  <dd>{money(delivery)}</dd>
                </div>
                <div className="flex items-center justify-between gap-6 rounded-xl bg-[#f0fdf4] px-3 py-2 text-base font-semibold text-[#15803d]">
                  <dt>الإجمالي الكلي</dt>
                  <dd>{money(order.total)}</dd>
                </div>
              </dl>
              </>
            )}
            </div>
          </div>
        </div>
      </div>
      </div>

      <aside className="order-print-aside lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
        <div>
          <p className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#c2410c]">
            <Clock size={16} />
            سجل الطلب
          </p>
          {choices.length > 0 ? (
            <div className="no-print space-y-3 border-b border-[#eef2f6] px-4 pb-4">
              <p className="text-xs text-[#667085]">الحالة التالية</p>
              <div className="flex flex-wrap gap-2">
                {choices.map((status) => {
                  const selected = selectedStatus === status
                  const Icon = stepIcons[status as (typeof flow)[number]] ?? X
                  const label = status === 'cancelled' ? 'إلغاء الطلب' : (orderStatusLabel[status] ?? status)
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={selected}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusChoiceTone(status, selected)}`}
                      onClick={() => setStatusChoice(status)}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  )
                })}
              </div>
              <label className="block text-xs text-[#667085]">
                رسالة للعميل <span className="text-[#98a2b3]">(اختياري)</span>
                <TextInput
                  className="mt-1.5"
                  placeholder="اكتب رسالة للعميل..."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busy || !selectedStatus}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-medium text-white hover:bg-[#1d4ed8] disabled:opacity-50"
                onClick={() => void run(() => updateOrderStatus(order.id, selectedStatus, message))}
              >
                <Send size={15} />
                إرسال التحديث
              </button>
              {canReview ? null : <Notice error={error} message={notice} />}
            </div>
          ) : null}
          {history.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[#667085]">لا توجد تحديثات بعد.</p>
          ) : (
            <ol className="space-y-4 px-4 py-3">
              {history.map((event, index) => {
                const stamp = whenEnglish(event.createdAt)
                const tone = eventTone(event.toStatus)
                return (
                  <li key={event.id} className="flex items-start gap-3">
                    <span className="relative shrink-0">
                      <span className={`grid size-7 place-items-center rounded-full ${tone}`}>
                        <EventIcon status={event.toStatus} />
                      </span>
                      {index < history.length - 1 ? (
                        <span className="absolute start-1/2 top-7 h-[calc(100%+1rem)] w-px -translate-x-1/2 bg-[#ffedd5]" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#121826]">
                        {orderStatusLabel[event.toStatus] ?? event.toStatus}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#667085]">
                        {event.message || eventDetail[event.toStatus] || ''}
                      </p>
                    </div>
                    <p className="shrink-0 text-end text-[11px] leading-4 text-[#667085]" dir="ltr">
                      <span className="block">{stamp.date}</span>
                      <span className="block">{stamp.time}</span>
                    </p>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </aside>
      </div>
      </section>
      {preview ? (
        <Popup title={preview.name} busy={false} wide onCancel={() => setPreview(null)}>
          <img src={preview.src} alt="" className="mt-3 max-h-[70vh] w-full rounded-xl object-contain" />
        </Popup>
      ) : null}
      {confirmDelete ? (
        <ConfirmPopup
          title="حذف الطلب"
          message={`هل تريد حذف الطلب «${order.reference}»؟ لا يمكن التراجع عن الحذف.`}
          confirmLabel="تأكيد الحذف"
          tone="danger"
          busy={busy}
          error={error}
          onConfirm={() => void removeOrder()}
          onCancel={() => {
            if (busy) return
            setConfirmDelete(false)
            setError('')
          }}
        />
      ) : null}
    </div>
  )
}

function EventIcon({ status }: { status: string }) {
  const Icon = stepIcons[status as (typeof flow)[number]] ?? (status === 'cancelled' ? X : ClipboardList)
  return <Icon size={14} />
}

function statusChoiceTone(status: string, selected: boolean): string {
  const selectedTone: Record<string, string> = {
    confirmed: 'border-[#93c5fd] bg-[#dbeafe] text-[#1d4ed8]',
    preparing: 'border-[#fdba74] bg-[#ffedd5] text-[#ea580c]',
    out_for_delivery: 'border-[#c4b5fd] bg-[#ede9fe] text-[#7c3aed]',
    delivered: 'border-[#86efac] bg-[#dcfce7] text-[#16a34a]',
    cancelled: 'border-[#fda4af] bg-[#ffe4e6] text-[#e11d48]',
  }
  if (selected) return selectedTone[status] ?? 'border-[#cbd5e1] bg-[#eef2f6] text-[#344054]'
  return 'border-[#e7ebf0] bg-white text-[#344054] hover:bg-[#f8fafc]'
}

function eventTone(status: string): string {
  if (status === 'delivered') return 'bg-[#dcfce7] text-[#16a34a]'
  if (status === 'out_for_delivery') return 'bg-[#ede9fe] text-[#7c3aed]'
  if (status === 'preparing') return 'bg-[#ffedd5] text-[#ea580c]'
  if (status === 'confirmed') return 'bg-[#dbeafe] text-[#2563eb]'
  if (status === 'cancelled') return 'bg-[#ffe4e6] text-[#e11d48]'
  return 'bg-[#eef2f6] text-[#667085]'
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-[#667085]">{label}</dt>
      <dd className="text-end font-medium text-[#121826]">{value}</dd>
    </div>
  )
}

function paymentTone(status: string | null): string {
  if (status === 'paid') return 'bg-[#ecfdf3] text-[#16a34a]'
  if (status === 'pending' || status === 'awaiting_verification') return 'bg-[#fff7ed] text-[#b45309]'
  if (status === 'rejected' || status === 'cancelled') return 'bg-[#f3f5f8] text-[#667085]'
  return 'bg-[#eef2f6] text-[#344054]'
}
