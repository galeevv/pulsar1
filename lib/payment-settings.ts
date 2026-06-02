export function isPlategaPaymentEnabled() {
  return process.env.PAYMENT_ENABLED?.trim().toLowerCase() !== "false";
}
