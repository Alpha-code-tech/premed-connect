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
  | 'installed'      // already running in standalone mode
  | 'promptable'     // native beforeinstallprompt captured — can trigger directly
  | 'android'        // Android browser but no prompt yet — show menu instructions
  | 'ios'            // iOS Safari — Share → Add to Home Screen
  | 'unavailable'    // desktop Firefox etc.

export interface PWAInstallInfo {
  state: InstallState
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  /** Diagnostic info — displayed in debug panel so issues can be reported */
  debug: {
    earlyPromptCaptured: boolean
    isStandalone: boolean
    ua: string
  }
}

export function usePWAInstall(): PWAInstallInfo {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [state, setState] = useState<InstallState>('unavailable')
  const [debug, setDebug] = useState({ earlyPromptCaptured: false, isStandalone: false, ua: '' })

  useEffect(() => {
    const ua = navigator.userAgent
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true
    const earlyPromptCaptured = !!window.__pwaInstallPrompt

    // Emit diagnostics to console — check via chrome://inspect on desktop
    console.log('[PWA] hook init', {
      isStandalone,
      earlyPromptCaptured,
      hasHandler: typeof window.__pwaInstallPrompt !== 'undefined',
      ua: ua.slice(0, 120),
    })

    setDebug({ earlyPromptCaptured, isStandalone, ua: ua.slice(0, 120) })

    if (isStandalone) {
      console.log('[PWA] already installed (standalone)')
      setState('installed')
      return
    }

    // iOS Safari — no beforeinstallprompt; Share sheet is the only path
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream
    if (isIOS) {
      console.log('[PWA] iOS detected')
      setState('ios')
      return
    }

    // Android — check for early-captured prompt first
    const isAndroid = /android/i.test(ua)

    if (window.__pwaInstallPrompt) {
      console.log('[PWA] using early-captured beforeinstallprompt')
      setDeferredPrompt(window.__pwaInstallPrompt)
      setState('promptable')
      delete window.__pwaInstallPrompt
    } else if (isAndroid) {
      // Prompt hasn't fired yet — set android state so user gets
      // menu instructions (always reliable), and upgrade to 'promptable'
      // if the event fires later in the session
      console.log('[PWA] Android detected, no prompt yet — showing menu instructions')
      setState('android')
    }

    // Listen for any future fires (prompt can arrive later in the session)
    const handler = (e: Event) => {
      console.log('[PWA] beforeinstallprompt fired during session')
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setState('promptable')
    }
    window.addEventListener('beforeinstallprompt', handler)

    const onInstalled = () => {
      console.log('[PWA] appinstalled event')
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
    console.log('[PWA] install outcome:', outcome)
    setDeferredPrompt(null)
    if (outcome === 'accepted') setState('installed')
    return outcome
  }

  return { state, promptInstall, debug }
}
