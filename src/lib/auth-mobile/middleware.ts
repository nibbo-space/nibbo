import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAccessToken } from "@/lib/auth-mobile/jwt";

export type MobileAuthContext = {
  userId: string;
};

export type MobileRouteHandler = (
  req: NextRequest,
  ctx: MobileAuthContext
) => Promise<Response> | Response;

export function withMobileAuth(handler: MobileRouteHandler) {
  return async (req: NextRequest): Promise<Response> => {
    const header = req.headers.get("authorization") ?? "";
    const m = header.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1]?.trim();
    if (!token) {
      return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 401 });
    }
    let userId: string;
    try {
      const payload = await verifyMobileAccessToken(token);
      userId = payload.sub;
    } catch {
      return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
    }
    return handler(req, { userId });
  };
}

export type MobileParamRouteHandler<P> = (
  req: NextRequest,
  params: P,
  ctx: MobileAuthContext
) => Promise<Response> | Response;

export function withMobileAuthParams<P>(handler: MobileParamRouteHandler<P>) {
  return async (req: NextRequest, segment: { params: Promise<P> }): Promise<Response> => {
    const header = req.headers.get("authorization") ?? "";
    const m = header.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1]?.trim();
    if (!token) {
      return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 401 });
    }
    let userId: string;
    try {
      const payload = await verifyMobileAccessToken(token);
      userId = payload.sub;
    } catch {
      return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
    }
    const params = await segment.params;
    return handler(req, params, { userId });
  };
}
