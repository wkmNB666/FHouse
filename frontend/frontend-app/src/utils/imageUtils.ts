/**
 * Normalize image path for display. Ensures path works with proxy (dev) and nginx (prod).
 */
export function getImageSrc(path: string | undefined | null): string {
  if (!path || typeof path !== 'string') return ''
  const trimmed = path.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}
