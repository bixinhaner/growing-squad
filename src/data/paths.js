export const APP_BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`

export const APP_BASENAME = APP_BASE === '/' ? '/' : APP_BASE.slice(0, -1)

export function appPath(path = '') {
  return `${APP_BASE}${String(path).replace(/^\/+/, '')}`
}
