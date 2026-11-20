/** Provider responses that prove the attempted registration token is stale. */
export function shouldInvalidatePushToken(status: number): boolean {
  return status === 400 || status === 404;
}

/** Only transient provider failures are retried; other 4xx responses are terminal. */
export function shouldRetryPush(status: number | null): boolean {
  return status === null || status === 429 || status >= 500;
}

/** Bounded exponential backoff, starting at 30 seconds and capped at one hour. */
export function pushRetrySeconds(attempt: number): number {
  return Math.min(3600, 30 * 2 ** Math.max(0, attempt - 1));
}

/** A stale response may clear only the exact token that was attempted. */
export function canClearPushToken(currentToken: string | null, attemptedToken: string): boolean {
  return currentToken === attemptedToken;
}
