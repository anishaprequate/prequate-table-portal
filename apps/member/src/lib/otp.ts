// PRODUCTION NOTE: no SMS provider is wired up in this prototype. The
// generated code is returned directly to the caller and shown in the UI
// instead of being sent by SMS. Replace with a real SMS/OTP provider
// before production.

const OTP_TTL_MINUTES = 10;

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function otpExpiry(): Date {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
}
