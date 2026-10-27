export const SIGNED_URL_SECONDS = 900;

const SIGNED_URL_MS = 15 * 60 * 1000;

export function receiptLinkExpiry(nowMs: number): {
  expiresIn: number;
  expiresAt: string;
} {
  return {
    expiresIn: SIGNED_URL_SECONDS,
    expiresAt: new Date(nowMs + SIGNED_URL_MS).toISOString(),
  };
}
