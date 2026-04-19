import { getVapidPublicKey, isWebPushConfigured } from "@/lib/push/vapid";
import { NextResponse } from "next/server";

export async function GET() {
  if (!isWebPushConfigured()) {
    return NextResponse.json({ configured: false as const });
  }
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ configured: false as const });
  }
  return NextResponse.json({ configured: true as const, publicKey });
}
