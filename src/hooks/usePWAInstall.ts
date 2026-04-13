import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent
  }
}

export type InstallState =
  | 'installed'    // already running standalone
  | 'promptable'   // Android/Chrome — native prompt available
  | 'ios'          // iOS Safari — must use Share → Add to Home Screen
  | 'unavailable'  // everything else (Firefox, etc.)

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [state, setState] = useState<InstallState>('unavailable')

  useEffect(() => {
    // Already running as an installed PWA (standalone / fullscreen)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true

    if (isStandalone) {
      setState('installed')
      return
    }

    // iOS Safari — no beforeinstallprompt; user must use the Share sheet
    const ua = navigator.userAgent
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream
    if (isIOS) {
      setState('ios')
      return
    }

    // The event fires very early — often before React mounts. index.html
    // captures it globally so we can still use it here even if we missed it.
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt)
      setState('promptable')
      delete window.__pwaInstallPrompt
    }

    // Also listen for any future fires (e.g. user dismissed once and Chrome
    // shows it again later in the session).
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setState('promptable')
    }
    window.addEventListener('beforeinstallprompt', handler)

    const onInstalled = () => {
      setState('installed')
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable'
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') setState('installed')
    return outcome
  }

  return { state, promptInstall }
}
