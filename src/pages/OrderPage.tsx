import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, Notice, PageTitle, TextInput } from '../components/ui'
import { errorText, money, nextOrderStatus, orderStatusLabel, paymentStatusLabel, when } from '../lib/text'
import { fetchOrders, reviewPayment, updateOrderStatus, type AdminOrder } from '../services/orders'

export default function OrderPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<AdminOrder | null | undefined>(undefined)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    const orders = await fetchOrders()
    setOrder(orders.find((item) => item.id === id) ?? null)
  }

  useEffect(() => {
    void load().catch((cause: unknown) => setError(errorText(cause)))
  }, [id])

  async function run(action: () => Promise<void>) {
    setError('')
    setNotice('')
    try {
      await action()
      setNotice('تم الحفظ')
      setMessage('')
      await load()
    } catch (cause) {
      setError(errorText(cause))
    }
  }

  if (order === undefined && !error) return <p className="text-sm text-[#667085]">جارٍ التحميل...</p>
  if (!order) {
    return (
      <div>
        <p className="text-sm text-[#b42318]">{error || 'الطلب غير موجود'}</p>
        <Link to="/orders" className="mt-3 inline-block text-sm text-[#0f766e]">
          العودة للطلبات
        </Link>
      </div>
    )
  }

  const choices = nextOrderStatus[order.status] ?? []
  const canReview = order.paymentStatus === 'pending' || order.paymentStatus === 'awaiting_verification'

  return (
    <div className="space-y-4">
      <PageTitle title={order.reference} detail={`${orderStatusLabel[order.status] ?? order.status} · ${when(order.createdAt)}`} />
      <Card>
        <p className="font-medium">{order.recipientName}</p>
        <p className="text-sm text-[#667085]">{order.recipientPhone}</p>
        <p className="mt-2 text-sm">
          {order.street}، {order.city}، {order.governorate}
        </p>
        {order.note ? <p className="mt-2 text-sm text-[#667085]">{order.note}</p> : null}
        <p className="mt-3 text-lg font-semibold">{money(order.total)}</p>
      </Card>
      <Card>
        <h2 className="font-semibold">المنتجات</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 border-b border-[#e7ebf0] py-2">
              <span>
                {item.nameAr}
                <span className="text-[#667085]">
                  {' '}
                  · {item.color} / {item.size} · {item.quantity}
                </span>
              </span>
              <span>{money(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="font-semibold">الدفع</h2>
        <p className="mt-2 text-sm">
          {order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'فودافون كاش'} ·{' '}
          {order.paymentStatus ? paymentStatusLabel[order.paymentStatus] : '—'}
        </p>
        {order.senderPhone ? <p className="mt-1 text-sm">رقم المحوّل: {order.senderPhone}</p> : null}
        {order.transferReference ? <p className="text-sm">رقم العملية: {order.transferReference}</p> : null}
        {canReview ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void run(() => reviewPayment(order.id, 'paid', message))}>تأكيد الدفع</Button>
            <Button tone="danger" onClick={() => void run(() => reviewPayment(order.id, 'rejected', message))}>
              رفض الدفع
            </Button>
          </div>
        ) : null}
      </Card>
      <Card>
        <h2 className="font-semibold">تحديث الحالة</h2>
        <TextInput
          className="mt-3"
          placeholder="رسالة للعميل (اختياري)"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {choices.map((status) => (
            <Button key={status} tone="ghost" onClick={() => void run(() => updateOrderStatus(order.id, status, message))}>
              {orderStatusLabel[status] ?? status}
            </Button>
          ))}
          {choices.length === 0 ? <p className="text-sm text-[#667085]">لا يوجد انتقال متاح.</p> : null}
        </div>
        <ol className="mt-4 space-y-2 border-s border-[#e7ebf0] ps-4 text-sm">
          {order.events.map((event) => (
            <li key={event.id}>
              <span className="font-medium">{orderStatusLabel[event.toStatus] ?? event.toStatus}</span>
              <span className="text-[#667085]"> · {when(event.createdAt)}</span>
              {event.message ? <p className="text-[#667085]">{event.message}</p> : null}
            </li>
          ))}
        </ol>
        <Notice error={error} message={notice} />
      </Card>
    </div>
  )
}
