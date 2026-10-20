import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActionIcon, Button, ConfirmPopup, Notice, Select, TextInput } from '../components/ui'
import { errorText, slugify } from '../lib/text'
import {
  createProduct,
  createVariant,
  deleteVariant,
  fetchCategories,
  fetchProducts,
  updateProduct,
  updateVariant,
  type AdminCategory,
  type AdminProduct,
  type AdminVariant,
} from '../services/catalog'
import {
  deleteProductImage,
  renameImageColor,
  saveImageColor,
  saveImageOrder,
  uploadProductImages,
  type GalleryImage,
} from '../services/images'

const fieldClass =
  'w-full resize-y rounded-xl border border-[#e7ebf0] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15'
const MAX_IMAGES = 8

function imageError(cause: unknown): string {
  const message = errorText(cause)
  if (message === 'IMAGE_TYPE') return 'يُقبل JPG وPNG وWebP فقط'
  if (message === 'IMAGE_TOO_LARGE') return 'الصورة أكبر من الحد المسموح'
  return message
}

export default function ProductEditor() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const initial = (location.state ?? {}) as { message?: string; error?: string }
  const [product, setProduct] = useState<AdminProduct | null | undefined>(isNew ? null : undefined)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [suggestedSku, setSuggestedSku] = useState('')
  const [error, setError] = useState(initial.error ?? '')
  const [message, setMessage] = useState(initial.message ?? '')
  const [formKey, setFormKey] = useState(0)

  async function load() {
    const [products, nextCategories] = await Promise.all([fetchProducts(), fetchCategories()])
    setCategories(nextCategories)
    setSuggestedSku(nextSku(products))
    if (!isNew) setProduct(products.find((item) => item.id === id) ?? null)
    return products.find((item) => item.id === id) ?? null
  }

  useEffect(() => {
    let active = true
    if (!isNew) setProduct(undefined)
    const notice = (location.state ?? {}) as { message?: string; error?: string }
    setMessage(notice.message ?? '')
    setError(notice.error ?? '')
    void (async () => {
      try {
        const [products, nextCategories] = await Promise.all([fetchProducts(), fetchCategories()])
        if (!active) return
        setCategories(nextCategories)
        setSuggestedSku(nextSku(products))
        if (!isNew) setProduct(products.find((item) => item.id === id) ?? null)
      } catch (cause) {
        if (active) setError(errorText(cause))
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  if (!isNew && product === undefined && !error) {
    return <p className="text-sm text-[#667085]">جارٍ التحميل...</p>
  }
  if (!isNew && !product) {
    return (
      <div>
        <p className="text-sm text-[#b42318]">{error || 'المنتج غير موجود'}</p>
        <Link to="/products" className="mt-3 inline-block text-sm text-[#0f766e]">
          العودة للمنتجات
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full pb-24">
      <header className="mb-6">
        <Link to="/products" className="text-sm font-medium text-[#0f766e]">
          المنتجات
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#121826]">
          {isNew ? 'إضافة منتج' : 'تعديل المنتج'}
        </h1>
        <p className="mt-1 text-sm leading-6 text-[#667085]">
          {isNew ? 'أدخل البيانات والصور والمخزون، ثم احفظ مرة واحدة.' : product?.nameAr}
        </p>
      </header>
      <Notice error={error} message={message} />

      <ProductForm
        key={isNew ? 'new' : `${product?.id ?? ''}:${formKey}`}
        product={isNew ? null : product ?? null}
        categories={categories}
        suggestedSku={suggestedSku}
        onCancel={() => navigate('/products')}
        onSaved={async (notice) => {
          if (isNew && notice.id) {
            navigate(`/products/${notice.id}`, { replace: true, state: notice })
            return
          }
          setMessage(notice.message ?? '')
          setError(notice.error ?? '')
          await load()
          setFormKey((current) => current + 1)
        }}
      />
    </div>
  )
}

function ProductForm({
  product,
  categories,
  suggestedSku,
  onCancel,
  onSaved,
}: {
  product: AdminProduct | null
  categories: AdminCategory[]
  suggestedSku: string
  onCancel: () => void
  onSaved: (notice: { id?: string; message?: string; error?: string }) => Promise<void>
}) {
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '')
  const [nameAr, setNameAr] = useState(product?.nameAr ?? '')
  const [nameEn] = useState(product?.nameEn ?? '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(false)
  const [descriptionAr, setDescriptionAr] = useState(product?.descriptionAr ?? '')
  const [descriptionEn] = useState(product?.descriptionEn ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [compareAt, setCompareAt] = useState(product?.compareAt === null || !product ? '' : String(product.compareAt))
  const [visible, setVisible] = useState(product?.visible ?? false)
  const [featured, setFeatured] = useState(product?.featured ?? false)
  const [isNewFlag, setIsNewFlag] = useState(product?.isNew ?? false)
  const [bestSeller, setBestSeller] = useState(product?.bestSeller ?? false)
  const [keptImages, setKeptImages] = useState<GalleryImage[]>(product?.images ?? [])
  const [files, setFiles] = useState<File[]>([])
  const [fileColors, setFileColors] = useState<string[]>([])
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [sku, setSku] = useState(suggestedSku)
  const [variantPrice, setVariantPrice] = useState('')
  const [stock, setStock] = useState('0')
  const [variantActive, setVariantActive] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (suggestedSku) setSku(suggestedSku)
  }, [suggestedSku])

  useEffect(() => {
    if (categoryId || categories.length === 0 || product) return
    setCategoryId(categories[0]?.id ?? '')
  }, [categories, categoryId, product])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const details = readDetails({ categoryId, nameAr, slug, price, compareAt })
    if (typeof details === 'string') {
      setError(details)
      return
    }
    const variant = readVariant({ color, size, sku, price: variantPrice, stock, autoSku: suggestedSku })
    if (typeof variant === 'string') {
      setError(variant)
      return
    }
    if (variant && product?.variants.some((item) => item.sku?.trim().toUpperCase() === variant.sku.trim().toUpperCase())) {
      setError('كود المنتج مستخدم من قبل')
      return
    }
    if (keptImages.length + files.length > MAX_IMAGES) {
      setError('الحد الأقصى 8 صور.')
      return
    }
    setBusy(true)
    setError('')
    const payload = {
      ...details,
      nameAr,
      nameEn: nameEn.trim() || nameAr.trim(),
      descriptionAr,
      descriptionEn: descriptionEn.trim() || descriptionAr.trim(),
      visible,
      featured,
      isNew: isNewFlag,
      bestSeller,
    }
    try {
      if (!product) {
        const id = await createProduct(payload)
        let warning = ''
        if (files.length > 0) {
          try {
            await uploadProductImages(id, files, 0, true, fileColors)
          } catch (cause) {
            warning = `تم إنشاء المنتج، وتعذر رفع الصور: ${imageError(cause)}`
          }
        }
        if (variant) {
          try {
            await createVariant({ productId: id, ...variant, active: variantActive })
          } catch (cause) {
            warning = warning || `تم إنشاء المنتج، وتعذر حفظ المخزون: ${errorText(cause)}`
          }
        }
        await onSaved(warning ? { id, error: warning } : { id, message: 'تم إنشاء المنتج' })
        return
      }

      await updateProduct(product.id, payload)
      let warning = ''
      try {
        await syncImages(product.id, product.images, keptImages, files, fileColors)
      } catch (cause) {
        warning = `تم حفظ البيانات، وتعذر حفظ الصور: ${imageError(cause)}`
      }
      if (variant) {
        try {
          await createVariant({ productId: product.id, ...variant, active: variantActive })
        } catch (cause) {
          warning = warning || `تم حفظ البيانات، وتعذر إضافة المخزون: ${errorText(cause)}`
        }
      }
      await onSaved(warning ? { error: warning } : { message: 'تم حفظ المنتج' })
    } catch (cause) {
      setError(errorText(cause))
      setBusy(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={(event) => void onSubmit(event)}>
      <DetailsFields
        categories={categories}
        categoryId={categoryId}
        onCategoryId={setCategoryId}
        nameAr={nameAr}
        onNameAr={(value) => {
          setNameAr(value)
          if (!slugEdited) setSlug(slugify(value))
        }}
        slug={slug}
        onSlug={(value) => {
          setSlugEdited(true)
          setSlug(value)
        }}
        descriptionAr={descriptionAr}
        onDescriptionAr={setDescriptionAr}
        price={price}
        onPrice={setPrice}
        compareAt={compareAt}
        onCompareAt={setCompareAt}
        visible={visible}
        onVisible={setVisible}
        featured={featured}
        onFeatured={setFeatured}
        isNew={isNewFlag}
        onIsNew={setIsNewFlag}
        bestSeller={bestSeller}
        onBestSeller={setBestSeller}
      />
      <Section title="صور المنتج" detail="أول صورة هي الرئيسية. اختر لون الصورة ثم احفظه ليظهر هذا اللون فقط." clip={false}>
        <Photos
          saved={keptImages}
          onSavedChange={setKeptImages}
          files={files}
          onFiles={(next) => {
            setFileColors((current) => next.map((file) => current[files.indexOf(file)] ?? ''))
            setFiles(next)
          }}
          fileColors={fileColors}
          onFileColor={(index, value) => setFileColors((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))}
          colors={[...new Set([color.trim(), ...(product?.variants.map((variant) => variant.color) ?? []), ...keptImages.map((image) => image.color)].filter(Boolean))]}
          disabled={busy}
        />
      </Section>
      <Section title="المخزون والكود" flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f3f5f8] text-right text-xs text-[#667085]">
                <th className="px-4 py-3 font-medium">اللون</th>
                <th className="px-4 py-3 font-medium">المقاس</th>
                <th className="px-4 py-3 font-medium">كود المنتج</th>
                <th className="px-4 py-3 font-medium">الكمية</th>
                <th className="px-4 py-3 font-medium">سعر خاص</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-[#eef2f6] bg-white">
                <td className="px-3 py-2">
                  <TextInput className="py-1.5" value={color} onChange={(event) => setColor(event.target.value)} placeholder="شفاف" aria-label="اللون" />
                </td>
                <td className="px-3 py-2">
                  <TextInput className="py-1.5" value={size} onChange={(event) => setSize(event.target.value)} placeholder="5 قطع" aria-label="المقاس" />
                </td>
                <td className="px-3 py-2">
                  <TextInput
                    className="cursor-not-allowed bg-[#f3f5f8] py-1.5 text-[#344054] disabled:opacity-100"
                    dir="ltr"
                    disabled
                    value={sku}
                    aria-label="كود المنتج"
                  />
                </td>
                <td className="px-3 py-2">
                  <TextInput className="py-1.5" inputMode="numeric" value={stock} onChange={(event) => setStock(event.target.value)} aria-label="الكمية" />
                </td>
                <td className="px-3 py-2">
                  <TextInput className="py-1.5" inputMode="decimal" value={variantPrice} onChange={(event) => setVariantPrice(event.target.value)} placeholder="اختياري" aria-label="سعر خاص" />
                </td>
                <td className="px-4 py-2">
                  <StatusToggle active={variantActive} disabled={busy} onChange={() => setVariantActive((current) => !current)} />
                </td>
                <td className="px-4 py-2 text-xs text-[#98a2b3]">مع الحفظ</td>
              </tr>
              {product?.variants.map((variant, index) => (
                <VariantRow
                  key={`${variant.id}:${variant.stock}:${variant.price ?? ''}:${variant.active}`}
                  variant={variant}
                  striped={index % 2 === 0}
                  onChanged={onSaved}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e7ebf0] bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgb(18_24_38/6%)] backdrop-blur md:right-60 md:px-6">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex shrink-0 gap-2">
            <Button type="submit" disabled={busy || categories.length === 0}>
              {busy ? 'جارٍ الحفظ...' : 'حفظ المنتج'}
            </Button>
            <Button tone="ghost" disabled={busy} onClick={onCancel}>
              إلغاء
            </Button>
          </div>
          <p className={`min-w-0 text-end text-sm ${error ? 'text-[#b42318]' : 'text-[#667085]'}`}>
            {error || 'الحفظ يشمل البيانات والصور والمخزون.'}
          </p>
        </div>
      </div>
    </form>
  )
}

async function syncImages(productId: string, original: GalleryImage[], kept: GalleryImage[], files: File[], fileColors: string[]) {
  const removed = original.filter((image) => !kept.some((item) => item.id === image.id))
  for (const image of removed) await deleteProductImage(image)
  const remainingIds = original.filter((image) => kept.some((item) => item.id === image.id)).map((image) => image.id)
  const reordered = remainingIds.some((imageId, index) => imageId !== kept[index]?.id)
  const colorChanged = kept.some((image) => (original.find((item) => item.id === image.id)?.color ?? '') !== image.color)
  if (kept.length > 0 && (removed.length > 0 || reordered || colorChanged)) await saveImageOrder(productId, kept)
  if (files.length > 0) await uploadProductImages(productId, files, kept.length, kept.length === 0, fileColors)
}

function ImageColor({
  value,
  colors,
  disabled,
  onSave,
}: {
  value: string
  colors: string[]
  disabled: boolean
  onSave: (color: string) => Promise<void>
}) {
  const [color, setColor] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const named = value && !colors.includes(value) ? [value, ...colors] : colors
  const options = [{ value: '', label: 'كل الألوان' }, ...named.map((item) => ({ value: item, label: item }))]

  async function save() {
    if (busy) return
    setBusy(true)
    setError('')
    setDone(false)
    try {
      await onSave(color)
      setDone(true)
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-1.5">
        <Select
          className="min-w-0 flex-1"
          value={color}
          placeholder="كل الألوان"
          options={options}
          onChange={(next) => {
            setColor(next)
            setDone(false)
          }}
        />
        <Button className="shrink-0 px-2.5" disabled={disabled || busy} onClick={() => void save()}>
          {busy ? '...' : done ? 'تم' : 'حفظ'}
        </Button>
      </div>
      {error ? <p className="mt-1 text-[11px] leading-4 text-[#b42318]">{error}</p> : null}
    </div>
  )
}

function Photos({
  saved,
  onSavedChange,
  files,
  onFiles,
  fileColors,
  onFileColor,
  colors,
  disabled,
}: {
  saved: GalleryImage[]
  onSavedChange: (images: GalleryImage[]) => void
  files: File[]
  onFiles: (files: File[]) => void
  fileColors: string[]
  onFileColor: (index: number, color: string) => void
  colors: string[]
  disabled: boolean
}) {
  const [previews, setPreviews] = useState<string[]>([])
  const room = MAX_IMAGES - saved.length - files.length

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [files])

  function moveSaved(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= saved.length) return
    const next = saved.slice()
    const [item] = next.splice(index, 1)
    if (!item) return
    next.splice(target, 0, item)
    onSavedChange(next)
  }

  const picker = (
    <label
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-3 text-center ${
        saved.length + files.length === 0 ? 'min-h-40 w-full' : 'h-full w-full'
      } ${
        disabled || room <= 0
          ? 'cursor-not-allowed border-[#e7ebf0] bg-[#f8fafb] opacity-50'
          : 'cursor-pointer border-[#c5d5d3] bg-[#f4fbfa] hover:border-[#0f766e] hover:bg-[#f0fdfa]'
      }`}
    >
      <ImagePlus size={22} className="text-[#0f766e]" />
      <span className="text-sm font-medium text-[#121826]">إضافة صورة</span>
      <span className="text-[11px] leading-4 text-[#667085]">
        {room > 0 ? `JPG أو PNG أو WebP · متبقي ${room}` : 'اكتمل الحد'}
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        className="sr-only"
        disabled={disabled || room <= 0}
        onChange={(event) => {
          const next = Array.from(event.target.files ?? []).slice(0, Math.max(room, 0))
          onFiles([...files, ...next].slice(0, MAX_IMAGES - saved.length))
          event.target.value = ''
        }}
      />
    </label>
  )

  if (saved.length + files.length === 0) return picker

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <li className="flex">{picker}</li>
      {saved.map((image, index) => (
        <li key={image.id} className="overflow-visible rounded-2xl border border-[#e7ebf0] bg-white">
          <div className="overflow-hidden rounded-t-2xl">
            {image.url ? (
              <img src={image.url} alt="" className="aspect-square w-full object-cover" />
            ) : (
              <div className="grid aspect-square place-items-center bg-[#f3f5f8] text-xs text-[#667085]">بلا رابط</div>
            )}
          </div>
          <div className="border-t border-[#eef2f6]">
            <ImageColor
              value={image.color}
              colors={colors}
              disabled={disabled}
              onSave={async (color) => {
                await saveImageColor(image.id, color)
                onSavedChange(saved.map((item) => (item.id === image.id ? { ...item, color } : item)))
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-1 border-t border-[#eef2f6] px-2 py-1.5">
            <span className="text-[11px] font-medium text-[#0f766e]">{index === 0 ? 'رئيسية' : index + 1}</span>
            <span className="flex gap-1">
              <IconButton label="تقديم" disabled={disabled || index === 0} onClick={() => moveSaved(index, -1)}>
                <ChevronRight size={14} />
              </IconButton>
              <IconButton label="تأخير" disabled={disabled || index === saved.length - 1} onClick={() => moveSaved(index, 1)}>
                <ChevronLeft size={14} />
              </IconButton>
              <IconButton label="حذف" danger disabled={disabled} onClick={() => onSavedChange(saved.filter((item) => item.id !== image.id))}>
                <Trash2 size={14} />
              </IconButton>
            </span>
          </div>
        </li>
      ))}
      {files.map((file, index) => (
        <li key={`${file.name}-${file.size}-${index}`} className="overflow-visible rounded-2xl border border-[#0f766e]/30 bg-white">
          <div className="overflow-hidden rounded-t-2xl">
            {previews[index] ? <img src={previews[index]} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-[#f3f5f8]" />}
          </div>
          <div className="border-t border-[#eef2f6]">
            <ImageColor
              value={fileColors[index] ?? ''}
              colors={colors}
              disabled={disabled}
              onSave={async (color) => {
                onFileColor(index, color)
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[#eef2f6] px-2 py-1.5">
            <span className="text-[11px] font-medium text-[#0f766e]">{saved.length === 0 && index === 0 ? 'رئيسية' : 'جديدة'}</span>
            <button
              type="button"
              className="text-xs text-[#b42318]"
              disabled={disabled}
              onClick={() => onFiles(files.filter((_, item) => item !== index))}
            >
              إزالة
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function DetailsFields(props: {
  categories: AdminCategory[]
  categoryId: string
  onCategoryId: (value: string) => void
  nameAr: string
  onNameAr: (value: string) => void
  slug: string
  onSlug: (value: string) => void
  descriptionAr: string
  onDescriptionAr: (value: string) => void
  price: string
  onPrice: (value: string) => void
  compareAt: string
  onCompareAt: (value: string) => void
  visible: boolean
  onVisible: (value: boolean) => void
  featured: boolean
  onFeatured: (value: boolean) => void
  isNew: boolean
  onIsNew: (value: boolean) => void
  bestSeller: boolean
  onBestSeller: (value: boolean) => void
}) {
  return (
    <Section title="بيانات المنتج">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_40%]">
        <div className="grid gap-4">
          <Field label="القسم">
            <Select
              value={props.categoryId}
              placeholder="اختر القسم"
              onChange={props.onCategoryId}
              options={props.categories.map((category) => ({
                value: category.id,
                label: category.nameAr,
                hint: category.nameEn,
              }))}
            />
          </Field>
          <Field label="الاسم بالعربية">
            <TextInput value={props.nameAr} onChange={(event) => props.onNameAr(event.target.value)} />
          </Field>
          <Field label="الوصف بالعربية" align="start">
            <textarea rows={4} className={fieldClass} value={props.descriptionAr} onChange={(event) => props.onDescriptionAr(event.target.value)} />
          </Field>
          <Field label="رابط المنتج">
            <TextInput dir="ltr" value={props.slug} onChange={(event) => props.onSlug(event.target.value)} />
          </Field>
        </div>
        <div className="grid content-start gap-4 lg:border-s lg:border-[#eef2f6] lg:ps-6">
          <p className="text-sm font-semibold text-[#121826]">السعر والظهور</p>
          <Field label="سعر البيع" hint="بالجنيه المصري.">
            <TextInput inputMode="decimal" value={props.price} onChange={(event) => props.onPrice(event.target.value)} />
          </Field>
          <Field label="السعر قبل الخصم" hint="اختياري. يظهر مشطوباً إذا كان أكبر من سعر البيع.">
            <TextInput
              inputMode="decimal"
              value={props.compareAt}
              onChange={(event) => props.onCompareAt(event.target.value)}
              placeholder="اختياري"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Toggle label="ظاهر في المتجر" checked={props.visible} onChange={props.onVisible} />
            <Toggle label="مميز" checked={props.featured} onChange={props.onFeatured} />
            <Toggle label="جديد" checked={props.isNew} onChange={props.onIsNew} />
            <Toggle label="الأكثر مبيعاً" checked={props.bestSeller} onChange={props.onBestSeller} />
          </div>
        </div>
      </div>
    </Section>
  )
}

function readDetails(input: {
  categoryId: string
  nameAr: string
  slug: string
  price: string
  compareAt: string
}): { categoryId: string; slug: string; price: number; compareAt: number | null } | string {
  const amount = Number(input.price)
  const compare = input.compareAt.trim() === '' ? null : Number(input.compareAt)
  if (!input.categoryId) return 'اختر القسم.'
  if (!input.nameAr.trim()) return 'الاسم بالعربية مطلوب.'
  const slug = slugify(input.slug)
  if (!slug) return 'رابط المنتج يجب أن يكون بحروف لاتينية.'
  if (!Number.isFinite(amount) || amount < 0) return 'أدخل سعر بيع صحيحاً.'
  if (compare !== null && (!Number.isFinite(compare) || compare <= amount)) {
    return 'السعر قبل الخصم يجب أن يكون أكبر من سعر البيع.'
  }
  return { categoryId: input.categoryId, slug, price: amount, compareAt: compare }
}

function nextSku(products: AdminProduct[]): string {
  const used = new Set<string>()
  for (const product of products) {
    for (const variant of product.variants) {
      const code = variant.sku?.trim().toUpperCase()
      if (code) used.add(code)
    }
  }
  let number = 1
  let code = ''
  do {
    code = `HOME-${String(number).padStart(3, '0')}`
    number += 1
  } while (used.has(code))
  return code
}

function readVariant(input: { color: string; size: string; sku: string; price: string; stock: string; autoSku?: string }):
  | { color: string; size: string; sku: string; price: number | null; stock: number }
  | null
  | string {
  const skuValue = input.sku.trim()
  const touched =
    input.color.trim() !== '' ||
    input.size.trim() !== '' ||
    (skuValue !== '' && skuValue !== (input.autoSku ?? '').trim()) ||
    input.price.trim() !== '' ||
    (input.stock.trim() !== '' && input.stock.trim() !== '0')
  if (!touched) return null
  const amount = input.price.trim() === '' ? null : Number(input.price)
  const quantity = Number(input.stock)
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
    return 'سعر المتغير يجب أن يكون أكبر من صفر، أو اتركه فارغاً.'
  }
  if (!Number.isInteger(quantity) || quantity < 0) return 'كمية المخزون رقم صحيح غير سالب.'
  return {
    color: input.color.trim() || 'قياسي',
    size: input.size.trim() || 'موحّد',
    sku: input.sku,
    price: amount,
    stock: quantity,
  }
}

function VariantRow({
  variant,
  striped,
  onChanged,
}: {
  variant: AdminVariant
  striped: boolean
  onChanged: (notice: { message?: string; error?: string }) => Promise<void>
}) {
  const [color, setColor] = useState(variant.color)
  const [size, setSize] = useState(variant.size)
  const [price, setPrice] = useState(variant.price === null ? '' : String(variant.price))
  const [stock, setStock] = useState(String(variant.stock))
  const [active, setActive] = useState(variant.active)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function toggleActive() {
    if (busy) return
    const next = !active
    setActive(next)
    setBusy(true)
    setError('')
    try {
      await updateVariant(variant.id, { price: variant.price, stock: variant.stock, active: next })
    } catch (cause) {
      setActive(!next)
      setError(errorText(cause))
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (busy) return
    const amount = price.trim() === '' ? null : Number(price)
    const quantity = Number(stock)
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
      setError('سعر غير صالح')
      return
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('مخزون غير صالح')
      return
    }
    setBusy(true)
    setError('')
    try {
      const nextColor = color.trim() || 'قياسي'
      await updateVariant(variant.id, {
        color: nextColor,
        size,
        sku: variant.sku ?? '',
        price: amount,
        stock: quantity,
        active,
      })
      await renameImageColor(variant.productId, variant.color, nextColor)
      await onChanged({ message: 'تم حفظ المتغير' })
    } catch (cause) {
      setError(errorText(cause))
      setBusy(false)
    }
  }

  async function remove() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await deleteVariant(variant.id)
      setConfirmDelete(false)
      await onChanged({ message: 'تم حذف المتغير' })
    } catch (cause) {
      const message = errorText(cause)
      setError(
        message.includes('variant_id_fkey')
          ? 'لا يمكن حذف هذا المتغير لأنه مستخدم في طلب أو سلة. أوقف البيع بدل الحذف.'
          : message,
      )
      setBusy(false)
    }
  }

  return (
    <tr className={`border-t border-[#eef2f6] ${striped ? 'bg-[#f6f8fa]' : 'bg-white'} hover:bg-[#eef3f8]`}>
      <td className="px-3 py-2">
        <TextInput className="py-1.5" value={color} onChange={(event) => setColor(event.target.value)} aria-label="اللون" />
      </td>
      <td className="px-3 py-2">
        <TextInput className="py-1.5" value={size} onChange={(event) => setSize(event.target.value)} aria-label="المقاس" />
      </td>
      <td className="px-3 py-2">
        <TextInput
          className="cursor-not-allowed bg-[#f3f5f8] py-1.5 text-[#344054] disabled:opacity-100"
          dir="ltr"
          disabled
          value={variant.sku ?? ''}
          aria-label="كود المنتج"
        />
        {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
      </td>
      <td className="px-3 py-2">
        <TextInput className="py-1.5" value={stock} onChange={(event) => setStock(event.target.value)} aria-label="الكمية" />
      </td>
      <td className="px-3 py-2">
        <TextInput className="py-1.5" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="سعر المنتج" aria-label="سعر خاص" />
      </td>
      <td className="px-4 py-3">
        <StatusToggle active={active} disabled={busy} onChange={() => void toggleActive()} />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Button tone="ghost" disabled={busy} onClick={() => void save()}>
            {busy ? '...' : 'حفظ'}
          </Button>
          <ActionIcon
            label="حذف"
            tone="danger"
            disabled={busy}
            onClick={() => {
              setError('')
              setConfirmDelete(true)
            }}
          >
            <Trash2 size={15} />
          </ActionIcon>
        </div>
        {confirmDelete ? (
          <ConfirmPopup
            title="حذف المتغير"
            message={`هل تريد حذف «${variant.color} / ${variant.size}»؟`}
            confirmLabel="تأكيد الحذف"
            tone="danger"
            busy={busy}
            error={error}
            onConfirm={() => void remove()}
            onCancel={() => {
              if (!busy) setConfirmDelete(false)
            }}
          />
        ) : null}
      </td>
    </tr>
  )
}

function StatusToggle({
  active,
  disabled,
  onChange,
}: {
  active: boolean
  disabled?: boolean
  onChange: () => void
}) {
  const label = active ? 'متاح' : 'متوقف'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs font-medium disabled:opacity-50"
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${active ? 'bg-[#0f766e]' : 'bg-[#d0d5dd]'}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${active ? 'end-0.5' : 'start-0.5'}`}
        />
      </span>
      <span className={active ? 'text-[#067647]' : 'text-[#667085]'}>{label}</span>
    </button>
  )
}

function Section({
  title,
  detail,
  flush = false,
  clip = true,
  children,
}: {
  title: string
  detail?: string
  flush?: boolean
  clip?: boolean
  children: ReactNode
}) {
  return (
    <section className={`${clip ? 'overflow-hidden' : 'relative z-20 overflow-visible'} rounded-2xl border border-[#e7ebf0] bg-white shadow-sm`}>
      <div className="border-b border-[#eef2f6] bg-[#f8fafb] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-[#121826]">{title}</h2>
        {detail ? <p className="mt-0.5 text-xs leading-5 text-[#667085]">{detail}</p> : null}
      </div>
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  align = 'center',
  children,
  className = '',
}: {
  label: string
  hint?: string
  align?: 'center' | 'start'
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`grid gap-1.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-3 sm:gap-y-1 ${align === 'start' ? 'sm:items-start' : 'sm:items-center'} ${className}`}>
      <span className={`text-[13px] font-medium text-[#344054] ${align === 'start' ? 'sm:pt-2.5' : ''}`}>{label}</span>
      <span className="min-w-0">{children}</span>
      {hint ? <span className="text-xs leading-5 text-[#98a2b3] sm:col-span-2">{hint}</span> : null}
    </label>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 ${
        checked ? 'border-[#0f766e] bg-[#f0fdfa]' : 'border-[#e7ebf0] bg-[#fbfcfd] hover:bg-white'
      }`}
    >
      <input type="checkbox" className="accent-[#0f766e]" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-[#121826]">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-5 text-[#667085]">{hint}</span> : null}
      </span>
    </label>
  )
}

function IconButton({
  label,
  danger = false,
  disabled,
  onClick,
  children,
}: {
  label: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-1 disabled:opacity-40 ${danger ? 'bg-[#b42318]/10 text-[#b42318]' : 'border border-[#e7ebf0]'}`}
    >
      {children}
    </button>
  )
}
