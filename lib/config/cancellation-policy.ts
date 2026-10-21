/**
 * Cancellation & refund policy — single source of truth.
 *
 * Both the backend refund calculation (app/api/payment/refund/route.ts) and every
 * customer-facing display of the policy (booking page, confirmation, refund-policy
 * page, cancel dialogs) must read these values from here. Never hardcode the hours
 * or percentages anywhere else — that's exactly how the displayed policy and the
 * actual refund math drifted apart before.
 *
 * Policy: >= FREE_CANCELLATION_HOURS before check-in/trip → full refund minus the
 * gateway fee (never reversed by Razorpay). Within that window → no refund.
 */
export const FREE_CANCELLATION_HOURS = 48

export const CANCELLATION_FEE_CONFIG = {
  GATEWAY_FEE_PERCENTAGE: 2, // % of total transaction amount
  GATEWAY_FEE_GST: 18, // % GST applied on the gateway fee
  EXTRA_FEE: 0, // flat INR amount (configurable for future)
} as const

/** Effective % of the transaction deducted as the gateway fee (fee + GST on fee), excluding EXTRA_FEE. */
export const EFFECTIVE_GATEWAY_FEE_PERCENT =
  CANCELLATION_FEE_CONFIG.GATEWAY_FEE_PERCENTAGE *
  (1 + CANCELLATION_FEE_CONFIG.GATEWAY_FEE_GST / 100)

export function calculateGatewayFee(totalAmount: number): number {
  const gatewayFee = (totalAmount * CANCELLATION_FEE_CONFIG.GATEWAY_FEE_PERCENTAGE) / 100
  const gst = (gatewayFee * CANCELLATION_FEE_CONFIG.GATEWAY_FEE_GST) / 100
  return Math.round((gatewayFee + gst + CANCELLATION_FEE_CONFIG.EXTRA_FEE) * 100) / 100
}
