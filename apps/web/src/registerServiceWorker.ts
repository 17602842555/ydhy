export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return

  window.addEventListener('load', () => {
    const scope = import.meta.env.BASE_URL
    const swUrl = new URL(`${scope}sw.js`, window.location.origin)

    navigator.serviceWorker.register(swUrl, { scope }).catch((error: unknown) => {
      console.warn('HUAGE service worker registration failed', error)
    })
  })
}
