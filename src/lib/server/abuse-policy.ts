// Explicit, persistent ad-hoc quotas approved for release hardening.
// Backend infrastructure has no standard distributed rate-limit primitive.
export const MAX_SERVER_REQUEST_BYTES = 750_000;

export const ABUSE_QUOTAS = {
  api: { limit: 180, windowSeconds: 60, blockSeconds: 300 },
  register: { limit: 10, windowSeconds: 86_400, blockSeconds: 3_600 },
  admin_failures: { limit: 8, windowSeconds: 900, blockSeconds: 1_800 },
  admin_requests: { limit: 120, windowSeconds: 60, blockSeconds: 300 },
  lobby_creates: { limit: 10, windowSeconds: 3_600, blockSeconds: 3_600 },
  invites: { limit: 30, windowSeconds: 3_600, blockSeconds: 3_600 },
  quick_matches: { limit: 30, windowSeconds: 600, blockSeconds: 600 },
  friend_requests: { limit: 20, windowSeconds: 3_600, blockSeconds: 3_600 },
  photo_uploads: { limit: 20, windowSeconds: 3_600, blockSeconds: 3_600 },
} as const;

export type AbuseAction = keyof typeof ABUSE_QUOTAS;
