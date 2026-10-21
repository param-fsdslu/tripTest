import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Cancellation & Refund Policy',
  description: 'Triplovia Cancellation and Refund Policy — cancellation terms, refund eligibility, gateway fee, and processing timelines.',
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar transparent={false} />

      {/* Hero header */}
      <div className="pt-16 sm:pt-20 border-b border-border/50 bg-primary">
        <div className="page-container py-14 sm:py-20 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-px w-8 bg-gold" />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gold">
              Legal
            </span>
            <span className="h-px w-8 bg-gold" />
          </div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Cancellation &amp; Refund Policy
          </h1>
          <p className="text-sm sm:text-base text-white/75 max-w-2xl mx-auto leading-relaxed">
            Understand our cancellation terms, refund eligibility, gateway fee deduction, and processing timelines.
          </p>
        </div>
      </div>

      <main className="grow">
        <div className="page-container py-10 sm:py-16">
          <div className="max-w-3xl mx-auto prose prose-sm sm:prose-base prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">

            <p>This Cancellation and Refund Policy governs cancellations and refunds for bookings made through Triplovia. By making a booking, the User agrees to the cancellation and refund terms stated below and as displayed at the time of booking.</p>

            <h2>Free Cancellation Window</h2>
            <p>All bookings made through Triplovia carry a <strong>48-hour free cancellation window</strong> measured from the check-in date or trip start time. Specifically:</p>
            <ul>
              <li>If the User cancels <strong>48 hours or more</strong> before the scheduled check-in or trip start time, the booking is eligible for a refund subject to the gateway fee deduction described below.</li>
              <li>If the User cancels <strong>within 48 hours</strong> of the scheduled check-in or trip start time, no refund is applicable. The full booking amount is forfeited.</li>
              <li>If the check-in date or trip date has already passed, no refund is applicable under any circumstance.</li>
            </ul>
            <p>For boat and activity bookings, the free cancellation window may vary per trip type and shall be displayed at the time of booking. The minimum free cancellation window is 48 hours unless a longer period is specified.</p>

            <h2>Payment Gateway Fee — Non-Refundable Component</h2>
            <p>Triplovia processes all payments through Razorpay, a third-party payment gateway. When a payment is captured, Razorpay levies a transaction processing fee on the merchant. This fee is <strong>not reversed by Razorpay</strong> when a refund is issued, regardless of how early the cancellation is made.</p>
            <p>Accordingly, the following gateway charges are deducted from every eligible refund:</p>
            <ul>
              <li><strong>Razorpay transaction fee:</strong> 2% of the total booking amount</li>
              <li><strong>GST on transaction fee:</strong> 18% on the above 2%</li>
              <li><strong>Effective deduction:</strong> approximately 2.36% of the total booking amount</li>
            </ul>
            <p>This deduction applies even when the cancellation is made well within the free cancellation window. It represents the actual cost incurred by Triplovia from the payment gateway and is not a service charge levied by Triplovia.</p>

            <h3>Example</h3>
            <p>If a User paid ₹5,000 for a hotel booking and cancels 72 hours before check-in (within the free cancellation window):</p>
            <ul>
              <li>Gateway fee deducted: ₹100 (2%) + ₹18 GST = <strong>₹118</strong></li>
              <li>Amount refunded to User: <strong>₹4,882</strong></li>
            </ul>

            <h2>Hotel Booking Cancellation</h2>
            <p>Hotel bookings may be cancelled by the User through their account dashboard or by contacting Triplovia support. The following terms apply:</p>
            <ul>
              <li>Cancellations made <strong>48 hours or more</strong> before check-in: eligible for refund minus the gateway fee deduction.</li>
              <li>Cancellations made <strong>within 48 hours</strong> of check-in: no refund. The full booking amount is forfeited.</li>
              <li>No-show (failure to check in without prior cancellation): treated as a within-window cancellation; no refund applicable.</li>
              <li>Cancellations after check-in date has passed: no refund applicable.</li>
            </ul>

            <h2>Boat &amp; Activity Booking Cancellation</h2>
            <p>Boat and activity bookings are subject to the following terms:</p>
            <ul>
              <li>Cancellations made before the free cancellation deadline specified for the trip type: eligible for refund minus the gateway fee deduction.</li>
              <li>Cancellations made within the restricted window or after the trip date: no refund applicable.</li>
              <li>The free cancellation period per trip type is displayed at the time of booking and on the booking confirmation.</li>
              <li>Weather-based rescheduling, if offered, is at the sole discretion of the boat operator and does not entitle the User to a cash refund.</li>
            </ul>

            <h2>Cancellation Process</h2>
            <p>To cancel a booking, the User must:</p>
            <ul>
              <li>Log in to their Triplovia account and navigate to their booking.</li>
              <li>Initiate the cancellation through the booking management section.</li>
              <li>Alternatively, contact Triplovia support via email or phone with the booking reference number.</li>
            </ul>
            <p>Cancellation is considered effective only after confirmation is received from Triplovia. Verbal or informal requests shall not constitute valid cancellations.</p>

            <h2>Refund Review and Approval Process</h2>
            <p>All customer-initiated refund requests go through an internal review process before being dispatched to the payment gateway:</p>
            <ol>
              <li><strong>Submission:</strong> The User submits a cancellation. The booking is immediately marked as cancelled and a refund request is raised.</li>
              <li><strong>Confirmation email:</strong> The User receives an acknowledgement email confirming that the cancellation has been received and the refund request is under review.</li>
              <li><strong>Admin review:</strong> Triplovia reviews the request to verify eligibility based on cancellation timing and booking conditions. This typically occurs within 1–2 business days.</li>
              <li><strong>Processing:</strong> If approved, the eligible refund amount (after gateway fee deduction) is submitted to Razorpay for processing.</li>
              <li><strong>Credit to User:</strong> The refund is credited to the original payment method within the timelines stated below.</li>
            </ol>
            <p>If a refund request is rejected (e.g., cancellation is outside the eligible window or fraud is suspected), the User shall be notified by email with the reason for rejection.</p>

            <h2>Refund Processing Timeline</h2>
            <p>Once approved and submitted to the payment gateway, refunds are credited within:</p>
            <ul>
              <li><strong>5–7 business days</strong> for UPI payments</li>
              <li><strong>5–7 business days</strong> for net banking payments</li>
              <li><strong>7–10 business days</strong> for debit and credit card payments</li>
            </ul>
            <p>These timelines are governed by Razorpay and the User&apos;s bank. Triplovia is not responsible for delays caused by the payment gateway or the issuing bank after the refund has been submitted.</p>

            <h2>Non-Refundable Components</h2>
            <p>The following are never refundable under any circumstances:</p>
            <ul>
              <li>Razorpay payment gateway transaction fee (2% + 18% GST)</li>
              <li>Any additional flat cancellation charges introduced and disclosed at time of booking</li>
              <li>Bookings cancelled within the restricted window (within 48 hours of check-in or trip)</li>
              <li>No-show bookings</li>
              <li>Bookings where the check-in or trip date has already passed</li>
              <li>Bookings explicitly marked non-refundable at the time of booking</li>
            </ul>

            <h2>Refund Mode</h2>
            <p>Refunds are credited exclusively to the original payment method used at the time of booking. Triplovia does not offer cash refunds or transfers to a different payment method or bank account. The refund amount will reflect in the same UPI ID, bank account, or card used for the original transaction.</p>

            <h2>Partial Refunds</h2>
            <p>Partial refunds may arise in cases where the gateway fee deduction results in a refund amount lower than the full booking amount. In all eligible cancellation cases, the refund amount is: <em>Total Booking Amount minus Gateway Fee Deduction</em>. There are no other partial refund scenarios under the current policy.</p>

            <h2>No Show Policy</h2>
            <p>If the User fails to check in or participate in the booked activity without prior cancellation, the booking shall be treated as a no-show. No refund shall be applicable for no-show bookings. The full booking amount is forfeited.</p>

            <h2>Admin-Initiated Cancellations</h2>
            <p>Triplovia reserves the right to cancel any booking at its discretion in circumstances including but not limited to: pricing errors, payment authorization failures, fraudulent transactions, overbooking by the service provider, or force majeure events. In such cases, a full refund (minus gateway fee if payment was already captured) shall be issued to the User.</p>

            <h2>Force Majeure</h2>
            <p>In the event of force majeure (natural disasters, government restrictions, pandemics, or events beyond reasonable control), Triplovia shall endeavour to facilitate rescheduling or refunds as per the service provider&apos;s applicable policy. Triplovia shall not be liable beyond facilitating such arrangements.</p>

            <h2>Fraudulent Refund Claims</h2>
            <p>Triplovia reserves the right to deny refund requests and permanently restrict account access if fraudulent cancellation or refund claims are detected. Triplovia may share information with law enforcement if required.</p>

            <h2>Dispute Resolution</h2>
            <p>If the User disputes a refund decision, they must contact Triplovia support within 7 days of receiving the refund decision. Triplovia shall attempt to resolve the dispute on a best-effort basis. Final refund decisions are subject to verification of booking details, cancellation timing, and payment gateway records.</p>

            <h2>Policy Updates</h2>
            <p>Triplovia reserves the right to modify this Cancellation and Refund Policy at any time. Changes shall take effect from the date of publication on the Platform. Bookings made before the change shall be governed by the policy in effect at the time of booking.</p>

            <h2>Contact for Cancellations &amp; Refunds</h2>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:triplovia@gmail.com" className="text-primary hover:text-gold">triplovia@gmail.com</a></li>
              <li><strong>Phone:</strong> <a href="tel:+919113887712" className="text-primary hover:text-gold">+91 91138 87712</a></li>
            </ul>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
