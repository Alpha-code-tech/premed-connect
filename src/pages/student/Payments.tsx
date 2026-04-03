import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Clock, CheckCircle, AlertCircle, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useEffectiveDepartmentId } from '@/context/ViewModeContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, getDaysRemaining, formatDateShort } from '@/lib/utils'

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string
        email: string
        amount: number
        currency: string
        ref: string
        callback: (response: { reference: string }) => void
        onClose: () => void
      }) => { openIframe: () => void }
    }
  }
}

async function sendReceiptNotifications(
  itemId: string,
  itemTitle: string,
  itemAmount: number,
  studentName: string
) {
  const { data: billItem } = await supabase
    .from('payment_items')
    .select('department_id')
    .eq('id', itemId)
    .single()

  const message = `${studentName} paid for "${itemTitle}" — ${formatCurrency(itemAmount)}`

  if (billItem?.department_id) {
    const { data: reps } = await supabase
      .from('profiles')
      .select('id')
      .eq('department_id', billItem.department_id)
      .in('role', ['course_rep', 'assistant_course_rep'])
    if (reps?.length) {
      await supabase.from('notifications').insert(
        reps.map(r => ({ student_id: r.id, title: 'Payment Receipt', message, urgency: 'normal' as const, is_read: false }))
      )
    }
  } else {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['governor', 'financial_secretary'])
    if (admins?.length) {
      await supabase.from('notifications').insert(
        admins.map(a => ({ student_id: a.id, title: 'Payment Receipt', message, urgency: 'normal' as const, is_read: false }))
      )
    }
  }
}

interface ReceiptData {
  itemTitle: string
  amount: number
  reference: string
  date: string
  studentName: string
  studentEmail: string
}

export default function StudentPayments() {
  const { profile } = useAuth()
  const effectiveDeptId = useEffectiveDepartmentId(profile?.department_id)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [paying, setPaying] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)

  const { data: paymentData, isLoading } = useQuery({
    queryKey: ['student-payments', profile?.id, effectiveDeptId],
    enabled: !!profile,
    queryFn: async () => {
      const { data: items } = await supabase
        .from('payment_items')
        .select('*')
        .or(`department_id.is.null${effectiveDeptId ? `,department_id.eq.${effectiveDeptId}` : ''}`)
        .order('deadline')
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', profile!.id)
      const paidMap = new Map(payments?.map(p => [p.payment_item_id, p]) || [])
      return { items: items || [], paidMap }
    },
  })

  const handlePay = (item: { id: string; amount: number; title: string }) => {
    if (!profile) return

    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
    if (!window.PaystackPop || !paystackKey) {
      toast({ title: 'Payment unavailable', description: 'Paystack could not be loaded. Please refresh and try again.', variant: 'destructive' })
      return
    }

    const ref = `PMC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    try {
      setPaying(item.id)
      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: profile.email,
        amount: item.amount * 100,
        currency: 'NGN',
        ref,
        callback: (response: { reference: string }) => {
          setPaying(null)
          const profileSnapshot = profile
          const receiptData: ReceiptData = {
            itemTitle: item.title,
            amount: item.amount,
            reference: response.reference,
            date: new Date().toISOString(),
            studentName: profileSnapshot.full_name,
            studentEmail: profileSnapshot.email,
          }
          // Verify payment server-side before recording
          ;(async () => {
            try {
              const { data: { session: pmtSession } } = await supabase.auth.getSession()
              const { error: fnErr } = await supabase.functions.invoke('verify-payment', {
                body: {
                  reference: response.reference,
                  payment_item_id: item.id,
                  amount: item.amount,
                },
                headers: pmtSession ? { Authorization: `Bearer ${pmtSession.access_token}` } : {},
              })
              if (fnErr) throw new Error(fnErr.message)

              sendReceiptNotifications(item.id, item.title, item.amount, profileSnapshot.full_name)
              queryClient.refetchQueries({ queryKey: ['student-payments'], type: 'active' })
              queryClient.refetchQueries({ queryKey: ['student-pending-payments'], type: 'active' })
              queryClient.invalidateQueries({ queryKey: ['governor-payments'] })
              queryClient.invalidateQueries({ queryKey: ['financial-all-payments'] })
              queryClient.invalidateQueries({ queryKey: ['financial-stats'] })
              queryClient.invalidateQueries({ queryKey: ['financial-recent'] })
              queryClient.invalidateQueries({ queryKey: ['governor-stats'] })
              queryClient.invalidateQueries({ queryKey: ['courserep-payments'] })
              setReceipt(receiptData)
              toast({ title: 'Payment successful', description: 'Your payment has been recorded.' })
            } catch (e) {
              toast({ title: 'Payment verification failed', description: (e as Error).message, variant: 'destructive' })
            }
          })()
        },
        onClose: () => setPaying(null),
      })
      handler.openIframe()
    } catch (err) {
      setPaying(null)
      console.error('Paystack error:', err)
      toast({ title: 'Payment failed', description: (err as Error)?.message || 'Could not open payment window.', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Payments</h1>
        <p className="text-brand-grey mt-1">Manage your payment obligations</p>
      </div>

      <div className="space-y-4">
        {paymentData?.items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
            <CreditCard className="h-8 w-8 text-brand-grey mx-auto mb-3" />
            <p className="text-brand-grey">No payment items available</p>
          </div>
        ) : paymentData?.items.map((item) => {
          const payment = paymentData.paidMap.get(item.id)
          const isPaid = payment?.status === 'successful'
          const isPending = payment?.status === 'pending'
          const daysLeft = getDaysRemaining(item.deadline)
          const isOverdue = daysLeft < 0
          return (
            <div key={item.id} className="bg-white rounded-lg border border-brand-border p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-brand-text">{item.title}</h3>
                    {isPaid && <Badge variant="success">Paid</Badge>}
                    {isPending && <Badge variant="warning">Processing</Badge>}
                    {!payment && isOverdue && <Badge variant="danger">Overdue</Badge>}
                  </div>
                  <p className="text-2xl font-bold text-brand-primary">{formatCurrency(item.amount)}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm text-brand-grey">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Deadline: {formatDateShort(item.deadline)}
                    </span>
                    {!isPaid && (
                      <span className={isOverdue ? 'text-red-600' : daysLeft <= 3 ? 'text-amber-600' : ''}>
                        {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {isPaid ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReceipt({
                        itemTitle: item.title,
                        amount: item.amount,
                        reference: payment.paystack_reference || payment.receipt_url || '—',
                        date: payment.created_at,
                        studentName: profile!.full_name,
                        studentEmail: profile!.email,
                      })}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1 text-green-600" /> View Receipt
                    </Button>
                  ) : isPending ? (
                    <div className="flex items-center gap-1 text-amber-600 text-sm">
                      <AlertCircle className="h-4 w-4" /> Processing
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-brand-primary hover:bg-brand-secondary"
                      disabled={paying === item.id}
                      onClick={() => handlePay(item)}
                    >
                      {paying === item.id ? 'Opening...' : 'Pay Now'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* In-app Receipt Modal */}
      <Dialog open={!!receipt} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" /> Payment Receipt
            </DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                <p className="text-green-700 font-semibold text-lg">{formatCurrency(receipt.amount)}</p>
                <p className="text-green-600 text-sm mt-0.5">Payment Successful</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-grey">Item</span>
                  <span className="font-medium text-brand-text text-right max-w-[60%]">{receipt.itemTitle}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-grey">Amount</span>
                  <span className="font-medium text-brand-text">{formatCurrency(receipt.amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-grey">Date</span>
                  <span className="font-medium text-brand-text">{formatDateShort(receipt.date)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-grey">Name</span>
                  <span className="font-medium text-brand-text">{receipt.studentName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-brand-border">
                  <span className="text-brand-grey">Email</span>
                  <span className="font-medium text-brand-text text-right max-w-[60%] break-all">{receipt.studentEmail}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-brand-grey">Reference</span>
                  <span className="font-mono text-xs text-brand-text text-right break-all max-w-[60%]">{receipt.reference}</span>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => setReceipt(null)}>
                <X className="h-4 w-4 mr-1" /> Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
