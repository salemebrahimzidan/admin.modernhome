import { supabase } from '../lib/supabase'

export const PRODUCT_IMAGE_BUCKET = 'product-images'
const MAX_EDGE = 1600
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
const MAX_SOURCE_BYTES = 15 * 1024 * 1024
const SIGNED_URL_SECONDS = 60 * 60 * 6
const STORAGE_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i
const INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface GalleryImage {
  id: string
  path: string
  url: string
  primary: boolean
  sortOrder: number
  /** Empty means the photo is shared by every color. Stored in alt_ar. */
  color: string
}

export function isStoragePath(value: string): boolean {
  return STORAGE_PATH.test(value)
}

function mimeFromName(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  return ''
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('IMAGE_ENCODE_FAILED'))),
      'image/webp',
      quality,
    )
  })
}

async function drawScaled(file: File, edge: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('IMAGE_ENCODE_FAILED')
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvasBlob(canvas, quality)
}

export async function compressProductImage(file: File): Promise<Blob> {
  const type = file.type || mimeFromName(file.name)
  if (!INPUT_TYPES.has(type)) throw new Error('IMAGE_TYPE')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('IMAGE_TOO_LARGE')

  let edge = MAX_EDGE
  let quality = 0.82
  let blob = await drawScaled(file, edge, quality)
  while (blob.size > MAX_UPLOAD_BYTES && (quality > 0.55 || edge > 960)) {
    if (quality > 0.55) quality = Math.round((quality - 0.08) * 100) / 100
    else edge = Math.round(edge * 0.8)
    blob = await drawScaled(file, edge, quality)
  }
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('IMAGE_TOO_LARGE')
  return blob
}

export async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const signed = new Map<string, string>()
  const unique = [...new Set(paths.filter(isStoragePath))]
  for (let index = 0; index < unique.length; index += 80) {
    const chunk = unique.slice(index, index + 80)
    const { data, error } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .createSignedUrls(chunk, SIGNED_URL_SECONDS)
    if (error || !data) continue
    for (const item of data) {
      if (item.path && item.signedUrl && !item.error) signed.set(item.path, item.signedUrl)
    }
  }
  return signed
}

export async function uploadProductImages(
  productId: string,
  files: File[],
  startOrder: number,
  firstIsPrimary: boolean,
  colors: string[] = [],
): Promise<void> {
  for (const [index, file] of files.entries()) {
    const blob = await compressProductImage(file)
    const id = crypto.randomUUID()
    const path = `${productId}/${id}.webp`
    const uploaded = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, blob, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    })
    if (uploaded.error) throw uploaded.error
    const inserted = await supabase.from('product_images').insert({
      id,
      product_id: productId,
      image_url: path,
      alt_ar: colors[index]?.trim() ?? '',
      sort_order: startOrder + index,
      is_primary: firstIsPrimary && index === 0,
    })
    if (inserted.error) {
      await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([path])
      throw inserted.error
    }
  }
}

export async function saveImageOrder(productId: string, images: GalleryImage[]): Promise<void> {
  const cleared = await supabase
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId)
  if (cleared.error) throw cleared.error
  for (const [index, image] of images.entries()) {
    const updated = await supabase
      .from('product_images')
      .update({ sort_order: index, is_primary: index === 0, alt_ar: image.color.trim() })
      .eq('id', image.id)
      .eq('product_id', productId)
    if (updated.error) throw updated.error
  }
}

export async function saveImageColor(id: string, color: string): Promise<void> {
  const { error } = await supabase.from('product_images').update({ alt_ar: color.trim() }).eq('id', id)
  if (error) throw error
}

export async function renameImageColor(productId: string, from: string, to: string): Promise<void> {
  const next = to.trim()
  if (!from || from === next) return
  const { error } = await supabase.from('product_images').update({ alt_ar: next }).eq('product_id', productId).eq('alt_ar', from)
  if (error) throw error
}

export async function deleteProductImage(image: GalleryImage): Promise<void> {
  if (isStoragePath(image.path)) {
    const removed = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([image.path])
    if (removed.error) throw removed.error
  }
  const deleted = await supabase.from('product_images').delete().eq('id', image.id)
  if (deleted.error) throw deleted.error
}
