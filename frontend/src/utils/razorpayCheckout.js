import { verifyPayment } from '../services/paymentService';

/**
 * Opens Razorpay Standard Checkout for a previously created order and verifies
 * the result server-side. The frontend never decides payment success itself.
 */
export function openRazorpayCheckout({ order, prefill, name, description, onSuccess, onError }) {
  if (!window.Razorpay) {
    onError(new Error('Payment SDK failed to load. Check your connection and try again.'), 'sdk');
    return;
  }

  const rzp = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    order_id: order.orderId,
    name,
    description,
    prefill,
    theme: { color: '#0F766E' },
    handler: async (response) => {
      try {
        const result = await verifyPayment({
          consultationId: order.consultationId,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        onSuccess(result);
      } catch (err) {
        onError(err, 'verify');
      }
    },
    modal: {
      ondismiss: () => onError(new Error('Payment was cancelled'), 'cancelled'),
    },
  });

  rzp.on('payment.failed', () => onError(new Error('Payment failed'), 'failed'));
  rzp.open();
}
