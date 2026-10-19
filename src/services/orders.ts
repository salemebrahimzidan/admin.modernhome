import { supabase } from '../lib/supabase'

export interface AdminOrderItem {
  id: string
  nameAr: string
  nameEn: string
  color: string
  size: string
  sku: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface AdminOrderEvent {
  id: string
  toStatus: string
  message: string
  createdAt: string
}

export interface AdminOrder {
  id: string
  reference: string
  status: string
  paymentMethod: 'cod' | 'vodafone_cash'
  total: number
  createdAt: string
  recipientName: string
  recipientPhone: string
  street: string
  city: string
  governorate: string
  note: string
  items: AdminOrderItem[]
  events: AdminOrderEvent[]
  paymentStatus: string | null
  senderPhone: string | null
  transferReference: string | null
}

interface PaymentRow {
  status: string
  sender_phone: string | null
  transfer_reference: string | null
}

interface OrderRow {
  id: string
  reference: string
  status: string
  payment_method: 'cod' | 'vodafone_cash'
  total_egp: number | string
  created_at: string
  recipient_name: string
  recipient_phone: string
  delivery_street: string
  delivery_city: string
  delivery_governorate: string
  customer_note: string
  order_items: Array<{
    id: string
    product_name_ar: string
    product_name_en: string
    color: string
    size: string
    sku: string | null
    unit_price_egp: number | string
    quantity: number
    line_total_egp: number | string
  }> | null
  order_status_events: Array<{
    id: string
    to_status: string
    customer_message: string
    created_at: string
  }> | null
  payments: PaymentRow | PaymentRow[] | null
}

function mapOrder(row: OrderRow): AdminOrder {
  const payment = Array.isArray(row.payments) ? row.payments[0] : row.payments
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    paymentMethod: row.payment_method,
    total: Number(row.total_egp),
    createdAt: row.created_at,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    street: row.delivery_street,
    city: row.delivery_city,
    governorate: row.delivery_governorate,
    note: row.customer_note,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      nameAr: item.product_name_ar,
      nameEn: item.product_name_en,
      color: item.color,
      size: item.size,
      sku: item.sku,
      unitPrice: Number(item.unit_price_egp),
      quantity: item.quantity,
      lineTotal: Number(item.line_total_egp),
    })),
    events: [...(row.order_status_events ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((event) => ({
        id: event.id,
        toStatus: event.to_status,
        message: event.customer_message,
        createdAt: event.created_at,
      })),
    paymentStatus: payment?.status ?? null,
    senderPhone: payment?.sender_phone ?? null,
    transferReference: payment?.transfer_reference ?? null,
  }
}

const orderSelect = `
  id, reference, status, payment_method, total_egp, created_at, customer_note,
  recipient_name, recipient_phone, delivery_street, delivery_city, delivery_governorate,
  order_items ( id, product_name_ar, product_name_en, color, size, sku, unit_price_egp, quantity, line_total_egp ),
  order_status_events ( id, to_status, customer_message, created_at ),
  payments ( status, sender_phone, transfer_reference )
`

export async function fetchOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(orderSelect)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as OrderRow[]).map(mapOrder)
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  customerMessage: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: orderId,
    p_status: status,
    p_customer_message: customerMessage,
    p_internal_note: '',
  })
  if (error) throw error
}

export async function reviewPayment(
  orderId: string,
  status: 'paid' | 'rejected',
  customerMessage: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_review_payment', {
    p_order_id: orderId,
    p_status: status,
    p_customer_message: customerMessage,
    p_internal_note: '',
  })
  if (error) throw error
}
