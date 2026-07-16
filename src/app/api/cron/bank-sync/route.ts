import { syncDueMonobankConnections } from "@/lib/bank-sync/sync-family";
import { NextRequest, NextResponse } from "next/server";

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const urlSecret = req.nextUrl.searchParams.get("secret");
  return urlSecret === secret;
}

async function run() {
  const results = await syncDueMonobankConnections();
  return NextResponse.json({
    ok: true,
    synced: results.length,
    results,
  });
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run();
}

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run();
}
