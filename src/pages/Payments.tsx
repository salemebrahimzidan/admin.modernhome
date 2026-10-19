import { useEffect, useState } from 'react'
import { PageTitle } from '../components/ui'
import { errorText } from '../lib/text'
import { fetchOrders, type AdminOrder } from '../services/orders'
import { OrderTable } from './Dashboard'

export default function Payments() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchOrders()
      .then((all) =>
        setOrders(
          all.filter(
            (order) =>
              order.paymentStatus === 'awaiting_verification' || order.paymentStatus === 'pending',
          ),
        ),
      )
      .catch((cause: unknown) => setError(errorText(cause)))
  }, [])

  return (
    <div>
      <PageTitle
        title="التحقق من المدفوعات"
        detail="فودافون كاش يبقى بانتظار المراجعة حتى تؤكد التحصيل أو ترفضه. الدفع عند الاستلام يظهر هنا وهو معلّق."
      />
      {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
      {orders ? <OrderTable orders={orders} /> : <p className="text-sm text-[#667085]">جارٍ التحميل...</p>}
    </div>
  )
}
