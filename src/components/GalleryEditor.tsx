import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { errorText } from '../lib/text'
import {
  deleteProductImage,
  saveImageOrder,
  uploadProductImages,
  type GalleryImage,
} from '../services/images'
import { Button } from './ui'

const MAX_IMAGES = 8

function move(images: GalleryImage[], index: number, direction: -1 | 1): GalleryImage[] {
  const target = index + direction
  if (target < 0 || target >= images.length) return images
  const next = images.slice()
  const [item] = next.splice(index, 1)
  if (!item) return images
  next.splice(target, 0, item)
  return next
}

export default function GalleryEditor({
  productId,
  images,
  onChanged,
}: {
  productId: string
  images: GalleryImage[]
  onChanged: () => Promise<void>
}) {
  const [pending, setPending] = useState<Array<{ file: File; preview: string }>>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pendingRef = useRef(pending)

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  useEffect(() => {
    return () => {
      for (const item of pendingRef.current) URL.revokeObjectURL(item.preview)
    }
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      await onChanged()
    } catch (cause) {
      const message = errorText(cause)
      if (message === 'IMAGE_TYPE') setError('يُقبل JPG وPNG وWebP فقط')
      else if (message === 'IMAGE_TOO_LARGE') setError('الصورة أكبر من الحد المسموح')
      else setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">صور المنتج</h2>
          <p className="text-xs text-[#667085]">
            الصورة الأولى هي الرئيسية. تُضغط الملفات إلى WebP قبل الرفع.
          </p>
        </div>
        <label className="cursor-pointer rounded-xl border border-[#e7ebf0] px-3 py-2 text-sm">
          إضافة من الجهاز
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const room = MAX_IMAGES - images.length - pending.length
              const files = Array.from(event.target.files ?? []).slice(0, Math.max(room, 0))
              if (room <= 0) setError('الحد الأقصى 8 صور')
              setPending((current) => [
                ...current,
                ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
              ])
              event.target.value = ''
            }}
          />
        </label>
      </div>
      <ul className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {images.map((image, index) => (
          <li key={image.id} className="w-28 shrink-0">
            {image.url ? (
              <img src={image.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
            ) : (
              <div className="grid aspect-square place-items-center rounded-xl bg-[#f3f5f8] text-xs text-[#667085]">
                بلا رابط
              </div>
            )}
            <p className="mt-1 text-center text-[11px] text-[#0f766e]">
              {index === 0 ? 'رئيسية' : index + 1}
            </p>
            <div className="mt-1 flex justify-center gap-1">
              <button
                type="button"
                aria-label="تقديم"
                disabled={busy || index === 0}
                className="rounded-lg border border-[#e7ebf0] p-1 disabled:opacity-40"
                onClick={() => void run(() => saveImageOrder(productId, move(images, index, -1)))}
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                aria-label="تأخير"
                disabled={busy || index === images.length - 1}
                className="rounded-lg border border-[#e7ebf0] p-1 disabled:opacity-40"
                onClick={() => void run(() => saveImageOrder(productId, move(images, index, 1)))}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                aria-label="حذف"
                disabled={busy}
                className="rounded-lg bg-[#b42318]/10 p-1 text-[#b42318]"
                onClick={() =>
                  void run(async () => {
                    await deleteProductImage(image)
                    const remaining = images.filter((item) => item.id !== image.id)
                    if (remaining.length > 0) await saveImageOrder(productId, remaining)
                  })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
        {pending.map((item) => (
          <li key={item.preview} className="w-28 shrink-0">
            <img src={item.preview} alt="" className="aspect-square w-full rounded-xl object-cover ring-2 ring-[#0f766e]/30" />
            <p className="mt-1 text-center text-[11px] text-[#0f766e]">معاينة</p>
            <button
              type="button"
              className="mx-auto mt-1 block rounded-lg bg-[#b42318]/10 p-1 text-[#b42318]"
              onClick={() => {
                URL.revokeObjectURL(item.preview)
                setPending((current) => current.filter((entry) => entry.preview !== item.preview))
              }}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
      {pending.length > 0 ? (
        <Button
          className="mt-3"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await uploadProductImages(
                productId,
                pending.map((item) => item.file),
                images.length,
                images.length === 0,
              )
              for (const item of pending) URL.revokeObjectURL(item.preview)
              setPending([])
            })
          }
        >
          {busy ? 'جارٍ الضغط والرفع...' : 'حفظ الصور'}
        </Button>
      ) : null}
      {error ? <p className="mt-2 text-sm text-[#b42318]">{error}</p> : null}
    </div>
  )
}
