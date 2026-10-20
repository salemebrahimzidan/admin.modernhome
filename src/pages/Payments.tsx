import { useEffect, useState } from 'react'
import { PageTitle, TableSkeleton } from '../components/ui'
import { errorText } from '../lib/text'
import { fetchOrders, type AdminOrder } from '../services/orders'
import { OrderTable } from './Dashboard'

export default function Payments() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState('')

  function load() {
    return fetchOrders()
      .then((all) =>
        setOrders(
          all.filter(
            (order) =>
              order.paymentStatus === 'awaiting_verification' || order.paymentStatus === 'pending',
          ),
        ),
      )
      .catch((cause: unknown) => setError(errorText(cause)))
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div>
      <PageTitle
        title="التحقق من المدفوعات"
        detail="فودافون كاش يبقى بانتظار المراجعة حتى تؤكد التحصيل أو ترفضه. الدفع عند الاستلام يظهر هنا وهو معلّق."
      />
      {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
      {orders ? (
        <OrderTable orders={orders} onDeleted={() => void load()} />
      ) : error ? null : (
        <section className="overflow-hidden rounded-2xl border border-[#e7ebf0] bg-white shadow-sm">
          <TableSkeleton />
        </section>
      )}
    </div>
  )
}
