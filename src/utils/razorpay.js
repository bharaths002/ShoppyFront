// Razorpay Checkout helpers. The backend creates the Razorpay order and verifies the
// signature; this file only loads the checkout window and opens it.

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let scriptPromise = null

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true)

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.onload = () => resolve(true)
      script.onerror = () => {
        scriptPromise = null // allow a retry
        resolve(false)
      }
      document.body.appendChild(script)
    })
  }
  return scriptPromise
}

// `order` is the create-order response for UPI/card.
// Resolves with { razorpay_payment_id, razorpay_order_id, razorpay_signature } on success,
// rejects if the customer closes the window without paying.
export function openCheckout({ order, method, email, phone }) {
  return new Promise((resolve, reject) => {
    let lastFailure = ''

    const rzp = new window.Razorpay({
      key: order.razorpay_key_id,
      amount: order.amount, // paise, as returned by the backend
      currency: order.currency,
      order_id: order.razorpay_order_id,
      name: 'Shoppy',
      description: `Order ${order.order_number}`,
      prefill: { email: email || '', contact: phone || '' },
      // only offer the method the customer picked on our checkout page
      method: {
        upi: method === 'upi',
        card: method === 'card',
        netbanking: false,
        wallet: false,
        emi: false,
        paylater: false,
      },
      theme: { color: '#e76f51' },
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error(lastFailure || 'Payment was cancelled.')),
      },
    })

    // a failed attempt can be retried inside the window, so only remember it (never reject here)
    rzp.on('payment.failed', (response) => {
      lastFailure = response.error?.description || 'Payment failed.'
    })

    rzp.open()
  })
}