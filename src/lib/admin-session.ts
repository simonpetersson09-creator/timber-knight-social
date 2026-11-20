export const ADMIN_SESSION_SECONDS = 30 * 60;

export type AdminSession = { admin?: boolean };

/** Only the server-issued encrypted session value grants admin access. */
export function isAdminSession(session: AdminSession): boolean {
  return session.admin === true;
}
