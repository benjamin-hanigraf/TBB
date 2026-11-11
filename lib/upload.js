'use client';
import { adminClient as supabase } from './supabase-admin';
// Shrinks a photo on the phone (max 1600px, WebP) before uploading, so uploads are quick and the site stays fast.
export async function shrink(file, max = 1600, quality = 0.84) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo.');
  if (file.size > 25 * 1024 * 1024) throw new Error('That photo is too large (25 MB limit).');
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height)); const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Could not process the photo.'))), 'image/webp', quality));
}
export async function uploadPhoto(file, folder) {
  const sb = supabase(); const blob = await shrink(file);
  const path = `${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await sb.storage.from('media').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
  if (error) throw error;
  try { const small = await shrink(file, 640, 0.8); await sb.storage.from('media').upload(path.replace(/\.webp$/, '-640.webp'), small, { contentType: 'image/webp', cacheControl: '31536000', upsert: false }); } catch {}
  return path;
}
export async function removePhoto(path) { if (path && !/^(\/|https?:)/.test(path)) await supabase().storage.from('media').remove([path, path.replace(/\.webp$/, '-640.webp')]).catch(() => {}); }
