'use client';
// Opens Razorpay's secure payment window. Card and UPI details are typed into Razorpay's window, never into our site.
function loadScript() {
  return new Promise((res, rej) => {
    if (window.Razorpay) return res();
    const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = () => rej(new Error('script')); document.head.appendChild(s);
  });
}
export async function payWithRazorpay(o, description) {
  await loadScript();
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({ key: o.key_id, amount: o.amount, currency: 'INR', order_id: o.razorpay_order_id, name: 'Thin Black Brush', description,
      prefill: { name: o.name, email: o.email, contact: o.phone }, theme: { color: '#000000' },
      handler: (r) => resolve(r), modal: { ondismiss: () => reject(new Error('dismissed')) } });
    rz.on('payment.failed', () => reject(new Error('failed'))); rz.open();
  });
}
export async function postJson(url, body, token) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch {} return { ok: r.ok, status: r.status, ...j };
}
export const payError = (code) => ({
  payments_not_configured: 'Online payment is not switched on yet. Please order on WhatsApp.', sold_out: 'Sorry, those seats are sold out.', closed: 'Booking for this workshop is closed.',
  out_of_stock: 'Sorry, one of the items just went out of stock.', unavailable: 'One of the items is no longer available.', slow_down: 'Too many attempts. Please wait a minute and try again.',
  invalid_details: 'Please check your details and try again.', payment_provider: 'The payment service could not be reached. Please try again.',
}[code] || 'Something went wrong. Please try again, or contact us on WhatsApp.');
