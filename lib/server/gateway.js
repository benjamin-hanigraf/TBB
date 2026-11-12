// The online payment provider, behind one small interface, so the rest of the app does not depend on which one is used.
// Today this is Razorpay. To switch (for example to Paytm), write the same three functions for the new provider here.
// Note: the database columns are still called razorpay_order_id / razorpay_payment_id; they hold the provider's ids whatever the provider.
import { razorpayReady, refundPayment } from './razorpay.js';

export const GATEWAY_NAME = 'Razorpay';
/** Is the provider set up on this site? */
export const gatewayReady = () => razorpayReady();
/** Was this booking, enrolment or order paid online, so the provider can send the money back by itself? */
export const paidOnline = (row) => !!row?.razorpay_payment_id;
/** Sends the money back to the customer's original payment method. Throws with a readable message when the provider says no. */
export const refundOnline = (row, amountPaise, reason) => refundPayment(row.razorpay_payment_id, amountPaise, reason);
/** The accounts "method" for money that went back through the provider. */
export const GATEWAY_METHOD = 'razorpay';
