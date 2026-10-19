import { supabase } from '../lib/supabase'
import { isStoragePath, PRODUCT_IMAGE_BUCKET, signPaths, type GalleryImage } from './images'

export interface AdminCategory {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  visible: boolean
  sortOrder: number
}

export interface AdminVariant {
  id: string
  productId: string
  productName: string
  color: string
  size: string
  sku: string | null
  price: number | null
  stock: number
  active: boolean
}

export interface AdminProduct {
  id: string
  categoryId: string
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  price: number
  compareAt: number | null
  visible: boolean
  featured: boolean
  isNew: boolean
  bestSeller: boolean
  images: GalleryImage[]
  variants: AdminVariant[]
}

interface ImageRow {
  id: string
  image_url: string
  is_primary: boolean
  sort_order: number
}

interface VariantRow {
  id: string
  product_id: string
  color: string
  size: string
  sku: string | null
  price_egp: number | string | null
  stock_quantity: number
  is_active: boolean
}

interface ProductRow {
  id: string
  category_id: string
  slug: string
  name_ar: string
  name_en: string
  description_ar: string
  description_en: string
  price_egp: number | string
  compare_at_price_egp: number | string | null
  is_visible: boolean
  is_featured: boolean
  is_new: boolean
  is_best_seller: boolean
  product_images: ImageRow[] | null
  product_variants: VariantRow[] | null
}

function mapVariant(row: VariantRow, productName = ''): AdminVariant {
  return {
    id: row.id,
    productId: row.product_id,
    productName,
    color: row.color,
    size: row.size,
    sku: row.sku,
    price: row.price_egp === null ? null : Number(row.price_egp),
    stock: row.stock_quantity,
    active: row.is_active,
  }
}

function mapProduct(row: ProductRow): AdminProduct {
  const images = [...(row.product_images ?? [])]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    .map((image) => ({
      id: image.id,
      path: image.image_url,
      url: image.image_url.startsWith('http') ? image.image_url : '',
      primary: image.is_primary,
      sortOrder: image.sort_order,
    }))
  return {
    id: row.id,
    categoryId: row.category_id,
    slug: row.slug,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    descriptionAr: row.description_ar,
    descriptionEn: row.description_en,
    price: Number(row.price_egp),
    compareAt: row.compare_at_price_egp === null ? null : Number(row.compare_at_price_egp),
    visible: row.is_visible,
    featured: row.is_featured,
    isNew: row.is_new,
    bestSeller: row.is_best_seller,
    images,
    variants: (row.product_variants ?? []).map((variant) => mapVariant(variant, row.name_ar)),
  }
}

async function withSignedImages(products: AdminProduct[]): Promise<AdminProduct[]> {
  const signed = await signPaths(
    products.flatMap((product) => product.images.map((image) => image.path).filter(isStoragePath)),
  )
  return products.map((product) => ({
    ...product,
    images: product.images.map((image) => ({
      ...image,
      url: isStoragePath(image.path) ? (signed.get(image.path) ?? '') : image.path,
    })),
  }))
}

const productSelect = `
  id, category_id, slug, name_ar, name_en, description_ar, description_en,
  price_egp, compare_at_price_egp, is_visible, is_featured, is_new, is_best_seller,
  product_images ( id, image_url, is_primary, sort_order ),
  product_variants ( id, product_id, color, size, sku, price_egp, stock_quantity, is_active )
`

export async function fetchCategories(): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name_ar, name_en, is_visible, sort_order')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    nameAr: row.name_ar as string,
    nameEn: row.name_en as string,
    visible: row.is_visible as boolean,
    sortOrder: row.sort_order as number,
  }))
}

export async function fetchProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(productSelect)
    .order('created_at', { ascending: false })
  if (error) throw error
  return withSignedImages(((data ?? []) as ProductRow[]).map(mapProduct))
}

export async function createCategory(input: {
  nameAr: string
  nameEn: string
  slug: string
  visible: boolean
}): Promise<void> {
  const { error } = await supabase.from('categories').insert({
    name_ar: input.nameAr.trim(),
    name_en: input.nameEn.trim(),
    slug: input.slug,
    is_visible: input.visible,
  })
  if (error) throw error
}

export async function updateCategory(
  id: string,
  patch: { nameAr?: string; nameEn?: string; slug?: string; visible?: boolean; sortOrder?: number },
): Promise<void> {
  const row: {
    name_ar?: string
    name_en?: string
    slug?: string
    is_visible?: boolean
    sort_order?: number
  } = {}
  if (patch.nameAr !== undefined) row.name_ar = patch.nameAr
  if (patch.nameEn !== undefined) row.name_en = patch.nameEn
  if (patch.slug !== undefined) row.slug = patch.slug
  if (patch.visible !== undefined) row.is_visible = patch.visible
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
  const { error } = await supabase.from('categories').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  const { count, error: countError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
  if (countError) throw countError
  if (count && count > 0) {
    throw new Error('لا يمكن حذف القسم لأن به منتجات. انقل المنتجات إلى قسم آخر أولاً.')
  }
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) {
    if (error.message.toLowerCase().includes('permission denied')) {
      throw new Error('حذف الأقسام غير مسموح لهذا الحساب في قاعدة البيانات.')
    }
    throw error
  }
}

export async function createProduct(input: {
  categoryId: string
  slug: string
  nameAr: string
  nameEn: string
  price: number
  visible: boolean
}): Promise<string> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      category_id: input.categoryId,
      slug: input.slug,
      name_ar: input.nameAr.trim(),
      name_en: input.nameEn.trim(),
      price_egp: input.price,
      is_visible: input.visible,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function deleteProduct(product: AdminProduct): Promise<void> {
  if (product.variants.length > 0) {
    const removedVariants = await supabase.from('product_variants').delete().eq('product_id', product.id)
    if (removedVariants.error) throw productDeleteError(removedVariants.error)
  }
  const removed = await supabase.from('products').delete().eq('id', product.id)
  if (removed.error) throw productDeleteError(removed.error)
  const paths = product.images.map((image) => image.path).filter(isStoragePath)
  if (paths.length > 0) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths)
  }
}

function productDeleteError(error: { message: string; code?: string }): Error {
  const message = error.message.toLowerCase()
  if (message.includes('permission denied') || error.code === '42501') {
    return new Error('حذف المنتجات غير مسموح لهذا الحساب في قاعدة البيانات.')
  }
  if (error.code === '23503' || message.includes('foreign key')) {
    return new Error('لا يمكن حذف المنتج لأنه مرتبط بطلب أو سلة.')
  }
  return new Error(error.message || 'تعذر حذف المنتج')
}

export async function updateProduct(
  id: string,
  input: {
    categoryId: string
    slug: string
    nameAr: string
    nameEn: string
    descriptionAr: string
    descriptionEn: string
    price: number
    compareAt: number | null
    visible: boolean
    featured: boolean
    isNew: boolean
    bestSeller: boolean
  },
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      category_id: input.categoryId,
      slug: input.slug,
      name_ar: input.nameAr.trim(),
      name_en: input.nameEn.trim(),
      description_ar: input.descriptionAr.trim(),
      description_en: input.descriptionEn.trim(),
      price_egp: input.price,
      compare_at_price_egp: input.compareAt,
      is_visible: input.visible,
      is_featured: input.featured,
      is_new: input.isNew,
      is_best_seller: input.bestSeller,
    })
    .eq('id', id)
  if (error) throw error
}

export async function createVariant(input: {
  productId: string
  color: string
  size: string
  sku: string
  price: number | null
  stock: number
  active: boolean
}): Promise<void> {
  const { error } = await supabase.from('product_variants').insert({
    product_id: input.productId,
    color: input.color.trim(),
    size: input.size.trim(),
    sku: input.sku.trim() || null,
    price_egp: input.price,
    stock_quantity: input.stock,
    is_active: input.active,
  })
  if (error) throw error
}

export async function updateVariant(
  id: string,
  input: { price: number | null; stock: number; active: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('product_variants')
    .update({
      price_egp: input.price,
      stock_quantity: input.stock,
      is_active: input.active,
    })
    .eq('id', id)
  if (error) throw error
}
