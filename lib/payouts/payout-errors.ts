export const PAYOUT_ERROR_CODES = [
  "FORBIDDEN",
  "INSUFFICIENT_AVAILABLE_CREDITS",
  "INVALID_AMOUNT",
  "INVALID_PAYOUT_DETAILS",
  "MINIMUM_PAYOUT_NOT_REACHED",
  "PAYOUT_REQUEST_ALREADY_ACTIVE",
  "PAYOUT_REQUEST_NOT_FOUND",
  "PAYOUT_STATUS_TRANSITION_FAILED",
  "REJECTION_REASON_REQUIRED",
  "USER_NOT_ELIGIBLE_FOR_PAYOUT",
  "USER_NOT_FOUND",
] as const;

export type PayoutErrorCode = (typeof PAYOUT_ERROR_CODES)[number];

export class PayoutDomainError extends Error {
  code: PayoutErrorCode;

  constructor(code: PayoutErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "PayoutDomainError";
  }
}
