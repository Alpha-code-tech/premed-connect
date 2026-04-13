import { useState } from 'react'
import { Download, Share, X, MoreVertical } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface InstallPWAProps {
  /** 'icon' — just the download icon (navbar use). 'button' — icon + label (landing page use). */
  variant?: 'icon' | 'button'
  className?: string
}

export function InstallPWA({ variant = 'icon', className = '' }: InstallPWAProps) {
  const { state, promptInstall, debug } = usePWAInstall()
  const [open, setOpen] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (state === 'installed') return null

  const handleClick = async () => {
    if (state === 'promptable') {
      setInstalling(true)
      const outcome = await promptInstall()
      setInstalling(false)
      // If user dismissed the native prompt, fall back to showing instructions
      if (outcome !== 'accepted') setOpen(true)
    } else {
      setOpen(true)
    }
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={handleClick}
          title="Install App"
          disabled={installing}
          className={`w-9 h-9 flex items-center justify-center rounded-lg text-brand-grey hover:text-brand-primary hover:bg-brand-pale transition-colors disabled:opacity-50 ${className}`}
        >
          <Download className="h-[18px] w-[18px]" />
        </button>
      ) : (
        <Button
          onClick={handleClick}
          disabled={installing}
          variant="outline"
          size="sm"
          className={`rounded-full flex items-center gap-1.5 ${className}`}
        >
          <Download className="h-4 w-4" />
          {installing ? 'Installing…' : 'Install App'}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-brand-primary" />
              Install PreMed Connect
            </DialogTitle>
            <DialogDescription>
              Add the app to your home screen for the best experience.
            </DialogDescription>
          </DialogHeader>

          {/* iOS Safari */}
          {state === 'ios' && (
            <div className="space-y-4 text-sm">
              <p className="font-medium text-brand-text">In Safari, follow these steps:</p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold">1</span>
                  <span className="text-brand-grey">
                    Tap the <Share className="inline h-4 w-4 text-blue-500 mx-0.5" /> <strong>Share</strong> button at the bottom of your screen.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold">2</span>
                  <span className="text-brand-grey">Scroll down and tap <strong>"Add to Home Screen"</strong>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold">3</span>
                  <span className="text-brand-grey">Tap <strong>"Add"</strong> in the top-right to confirm.</span>
                </li>
              </ol>
              <p className="text-xs text-brand-grey border-t border-brand-border pt-3">
                Only works in <strong>Safari</strong> — not Chrome on iOS.
              </p>
            </div>
          )}

          {/* Android — no native prompt yet, show the always-available menu path */}
          {state === 'android' && (
            <div className="space-y-4 text-sm">
              <p className="font-medium text-brand-text">In Chrome, follow these steps:</p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold">1</span>
                  <span className="text-brand-grey">
                    Tap the <MoreVertical className="inline h-4 w-4 mx-0.5" /> <strong>three-dot menu</strong> at the top-right of Chrome.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold">2</span>
                  <span className="text-brand-grey">Tap <strong>"Add to Home screen"</strong> from the menu.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold">3</span>
                  <span className="text-brand-grey">Tap <strong>"Add"</strong> to confirm.</span>
                </li>
              </ol>
              <p className="text-xs text-brand-grey border-t border-brand-border pt-3">
                Alternatively, look for a small <Download className="inline h-3 w-3 mx-0.5" /> install icon in Chrome's address bar.
              </p>
            </div>
          )}

          {/* Generic unsupported (desktop Firefox etc.) */}
          {state === 'unavailable' && (
            <div className="space-y-3 text-sm">
              <p className="text-brand-grey">Use <strong>Chrome</strong> or <strong>Edge</strong> on Android, or look for the <Download className="inline h-3.5 w-3.5 mx-0.5" /> icon in your desktop browser's address bar.</p>
            </div>
          )}

          {/* Debug panel — shows detected state so issues can be reported */}
          <details className="mt-2">
            <summary className="text-[10px] text-brand-grey/60 cursor-pointer select-none">Debug info</summary>
            <pre className="mt-1 text-[9px] text-brand-grey/60 whitespace-pre-wrap break-all leading-relaxed">
{`state: ${state}
standalone: ${debug.isStandalone}
earlyCapture: ${debug.earlyPromptCaptured}
ua: ${debug.ua}`}
            </pre>
          </details>

          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="w-full mt-1 text-brand-grey">
            <X className="h-4 w-4 mr-1.5" /> Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
