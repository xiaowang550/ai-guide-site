'use client'
import { SITE_SYNC_CHANNEL } from './site-modules'
export function notifySiteChange() {
  window.dispatchEvent(new Event('ai-map:site-refresh'))
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(SITE_SYNC_CHANNEL)
    channel.postMessage('refresh')
    channel.close()
  } else {
    try {
      localStorage.setItem(SITE_SYNC_CHANNEL, String(Date.now()))
    } catch {}
  }
}
