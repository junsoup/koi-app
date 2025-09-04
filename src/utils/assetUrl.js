export const assetUrl = (p) => {
  // Remove leading slash if present
  const clean = p.startsWith('/') ? p.slice(1) : p
  return new URL(clean, import.meta.env.BASE_URL).toString()
}

