import { useState } from 'react'
import { Download, Share, X } from 'lucide-react'
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
  const { state, promptInstall } = usePWAInstall()
  const [open, setOpen] = useState(false)
  const [installing, setInstalling] = useState(false)

  // Nothing to show if already installed or no path to install
  if (state === 'installed') return null

  const handleClick = async () => {
    if (state === 'promptable') {
      setInstalling(true)
      await promptInstall()
      setInstalling(false)
    } else {
      // iOS or unsupported — show manual instructions
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

      {/* Manual install instructions — iOS Safari or unsupported browser */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-brand-primary" />
              Install PreMed Connect
            </DialogTitle>
            <DialogDescription>
              Add the app to your home screen for the best experience — works offline and loads instantly.
            </DialogDescription>
          </DialogHeader>

          {state === 'ios' ? (
            <div className="space-y-4 text-sm">
              <p className="font-medium text-brand-text">Follow these steps in Safari:</p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold">1</span>
                  <span className="text-brand-grey">
                    Tap the <Share className="inline h-4 w-4 text-blue-500 mx-0.5" /> <strong>Share</strong> button at the bottom of your screen (or top on iPad).
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold">2</span>
                  <span className="text-brand-grey">
                    Scroll down and tap <strong>"Add to Home Screen"</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold">3</span>
                  <span className="text-brand-grey">
                    Tap <strong>"Add"</strong> in the top-right corner to confirm.
                  </span>
                </li>
              </ol>
              <p className="text-xs text-brand-grey border-t border-brand-border pt-3">
                Note: the install option only appears when visiting in <strong>Safari</strong>. Chrome on iOS does not support this.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="font-medium text-brand-text">Your browser doesn't support automatic install.</p>
              <p className="text-brand-grey">Try one of these options:</p>
              <ul className="space-y-2 text-brand-grey list-disc pl-4">
                <li>Open this site in <strong>Chrome</strong> or <strong>Edge</strong> on Android for the best install experience.</li>
                <li>On desktop: look for the install icon <Download className="inline h-3.5 w-3.5 mx-0.5" /> in your browser's address bar.</li>
              </ul>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="w-full mt-1 text-brand-grey"
          >
            <X className="h-4 w-4 mr-1.5" /> Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
