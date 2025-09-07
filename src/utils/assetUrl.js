
// src/utils/assetUrl.js
export function assetUrl(relPath) {
  return new URL(`../assets/${relPath}`, import.meta.url).href
}
