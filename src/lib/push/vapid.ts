export function getVapidPublicKey(): string | null {
  const k = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return k || null;
}

export function getVapidPrivateKey(): string | null {
  const k = process.env.VAPID_PRIVATE_KEY?.trim();
  return k || null;
}

export function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT?.trim() || "mailto:hello@nibbo.space";
}

export function isWebPushConfigured(): boolean {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey());
}
