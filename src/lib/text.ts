export function errorText(cause: unknown): string {
  if (cause instanceof Error) return cause.message
  if (cause && typeof cause === 'object' && 'message' in cause) {
    const message = (cause as { message: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  return 'تعذر تنفيذ الطلب'
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function money(value: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function when(value: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export const orderStatusLabel: Record<string, string> = {
  pending: 'قيد المراجعة',
  confirmed: 'مؤكد',
  preparing: 'قيد التجهيز',
  out_for_delivery: 'خرج للتوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}

export const paymentStatusLabel: Record<string, string> = {
  pending: 'بانتظار التحصيل',
  awaiting_verification: 'بانتظار مراجعة التحويل',
  paid: 'مدفوع',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
}

export const nextOrderStatus: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
}
