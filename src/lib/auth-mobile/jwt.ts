import { randomUUID } from "crypto";
import { SignJWT, jwtVerify } from "jose";

const ACCESS_TTL_SEC = 60 * 15;
const REFRESH_TTL_SEC = 60 * 60 * 24 * 30;

const ISSUER = "nibbo.space/mobile";
const AUDIENCE = "nibbo-mobile";
const ALGORITHM = "HS256";

export type MobileTokenType = "access" | "refresh";

export type MobileAccessPayload = {
  sub: string;
  type: "access";
  iat: number;
  exp: number;
  iss: string;
  aud: string;
};

export type MobileRefreshPayload = {
  sub: string;
  type: "refresh";
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
};

function getSecret(): string {
  const s = process.env.MOBILE_JWT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("MOBILE_JWT_SECRET or AUTH_SECRET must be set");
  return s;
}

function getSecretBytes() {
  return new TextEncoder().encode(getSecret());
}

export async function issueMobileTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}> {
  const secret = getSecretBytes();
  const now = Math.floor(Date.now() / 1000);
  const jti = randomUUID();

  const accessToken = await new SignJWT({ type: "access" })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TTL_SEC)
    .sign(secret);

  const refreshToken = await new SignJWT({ type: "refresh", jti })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + REFRESH_TTL_SEC)
    .sign(secret);

  return {
    accessToken,
    refreshToken,
    accessExpiresAt: new Date((now + ACCESS_TTL_SEC) * 1000).toISOString(),
    refreshExpiresAt: new Date((now + REFRESH_TTL_SEC) * 1000).toISOString(),
  };
}

export async function verifyMobileAccessToken(token: string): Promise<MobileAccessPayload> {
  const secret = getSecretBytes();
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: [ALGORITHM],
  });
  if (payload.type !== "access" || typeof payload.sub !== "string") {
    throw new Error("Invalid access token");
  }
  return payload as MobileAccessPayload;
}

export async function verifyMobileRefreshToken(token: string): Promise<MobileRefreshPayload> {
  const secret = getSecretBytes();
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: [ALGORITHM],
  });
  if (
    payload.type !== "refresh" ||
    typeof payload.sub !== "string" ||
    typeof payload.jti !== "string"
  ) {
    throw new Error("Invalid refresh token");
  }
  return payload as MobileRefreshPayload;
}
