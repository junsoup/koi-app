
// src/utils/assetUrl.js
export function assetUrl(p) {
  if (!p) return p
  // pass through if already absolute (http/https or data URL)
  if (typeof p === 'string' && /^(https?:)?\/\//i.test(p)) return p
  if (typeof p === 'string' && p.startsWith('data:')) return p

  const clean = typeof p === 'string' ? p.replace(/^\/+/, '') : p
  const base = (import.meta.env.BASE_URL || '/')
  // Vite's BASE_URL always ends with '/', so concat is safe
  return `${base}${clean}`
}

