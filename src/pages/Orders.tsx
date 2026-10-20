import { useEffect, useState } from 'react'
import { PageTitle, TableSkeleton } from '../components/ui'
import { errorText } from '../lib/text'
import { fetchOrders, type AdminOrder } from '../services/orders'
import { OrderTable } from './Dashboard'

export default function Orders() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState('')

  function load() {
    return fetchOrders()
      .then(setOrders)
      .catch((cause: unknown) => setError(errorText(cause)))
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div>
      <PageTitle title="الطلبات" detail="تغيير الحالة يتم عبر الدالة المحفوظة في قاعدة البيانات، وليس بتعديل الصف مباشرة." />
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
