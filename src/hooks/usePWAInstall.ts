import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState =
  | 'installed'        // already running standalone
  | 'promptable'       // Android/Chrome — native prompt available
  | 'ios'              // iOS Safari — manual "Add to Home Screen"
  | 'unavailable'      // everything else (Firefox, etc.)

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
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    if (isIOS) {
      setState('ios')
      return
    }

    // Chrome / Edge / Samsung Internet on Android fires beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setState('promptable')
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Mark as installed once the user accepts
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
