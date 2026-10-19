import { useEffect, useState } from 'react'
import { PageTitle } from '../components/ui'
import { errorText } from '../lib/text'
import { fetchOrders, type AdminOrder } from '../services/orders'
import { OrderTable } from './Dashboard'

export default function Orders() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchOrders()
      .then(setOrders)
      .catch((cause: unknown) => setError(errorText(cause)))
  }, [])

  return (
    <div>
      <PageTitle title="الطلبات" detail="تغيير الحالة يتم عبر الدالة المحفوظة في قاعدة البيانات، وليس بتعديل الصف مباشرة." />
      {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
      {orders ? <OrderTable orders={orders} /> : <p className="text-sm text-[#667085]">جارٍ التحميل...</p>}
    </div>
  )
}
