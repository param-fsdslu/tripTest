import { Suspense } from 'react'
import { PaymentsContent } from '@/components/admin/PaymentsContent'
import { Loader2 } from 'lucide-react'

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payment Transactions</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all payment transactions
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <PaymentsContent />
      </Suspense>
    </div>
  )
}
