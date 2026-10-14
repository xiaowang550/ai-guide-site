import type { PublicSiteConfig } from './site-modules'

declare global {
  interface Window {
    /** Shared with the early template script; never stores private configuration. */
    __zhiyaSiteFlight?: { promise: Promise<PublicSiteConfig | null>; pending: boolean }
  }
}

/** Reuse the bootstrap response once; subsequent refreshes always check the server. */
export function loadPublicSite(initial = false): Promise<PublicSiteConfig | null> {
  const previous = window.__zhiyaSiteFlight
  if (previous && (initial || previous.pending)) return previous.promise
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  const flight = {
    pending: true,
    promise: fetch('/api/site', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) =>
        response.ok ? ((await response.json()) as PublicSiteConfig) : null,
      )
      .catch(() => null)
      .finally(() => {
        clearTimeout(timeout)
        flight.pending = false
      }),
  }
  window.__zhiyaSiteFlight = flight
  return flight.promise
}
