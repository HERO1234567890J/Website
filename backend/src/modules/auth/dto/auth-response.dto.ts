import { Role } from '@prisma/client';

/**
 * Wire shape for login / register / refresh responses.
 *
 * §13 / Phase 15A — access tokens are short-lived JWTs verified
 * locally; refresh tokens are opaque random strings stored hashed
 * server-side and delivered to the browser as an httpOnly secure
 * cookie. Clients see only accessToken + expiresIn + user — the
 * refresh token never leaves the cookie.
 */
export interface AuthUserView {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export class AuthResponseDto {
  accessToken!: string;
  /**
   * Internal-only: present on the value the AuthService hands back
   * to AuthController so the controller can set the cookie. The
   * controller strips this before returning to the client — the
   * refresh token never appears in the JSON response body.
   */
  refreshToken!: string;
  expiresIn!: number;
  user!: AuthUserView;
}