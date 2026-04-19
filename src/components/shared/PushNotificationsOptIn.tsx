"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationsOptIn() {
  const { language } = useAppLanguage();
  const t = I18N[language].pushNotifications;
  const [supported, setSupported] = useState(true);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [working, setWorking] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    if ("Notification" in window) {
      setPerm(Notification.permission);
    }
    fetch("/api/push/vapid-public-key")
      .then((r) => r.json())
      .then((d: { configured?: boolean; publicKey?: string }) => {
        if (d.configured && typeof d.publicKey === "string" && d.publicKey.length > 0) {
          setPublicKey(d.publicKey);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!supported || !publicKey) return;
    let cancelled = false;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (!cancelled) setSubscribed(!!sub);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [supported, publicKey]);

  const enable = useCallback(async () => {
    if (!publicKey) return;
    setWorking(true);
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p !== "granted") return;
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await reg.update();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: json, locale: language }),
      });
      if (res.ok) setSubscribed(true);
    } finally {
      setWorking(false);
    }
  }, [language, publicKey]);

  if (!supported) {
    return <p className="border-t border-warm-100 px-3 py-2 text-[10px] text-warm-400">{t.notSupported}</p>;
  }
  if (!publicKey) return null;
  if (perm === "denied") return null;
  if (perm === "granted" && subscribed) {
    return (
      <p className="border-t border-warm-100 px-3 py-2 text-[10px] text-warm-500">{t.optInEnabled}</p>
    );
  }

  return (
    <div className="border-t border-warm-100 px-3 py-2 space-y-1.5">
      <p className="text-[10px] leading-snug text-warm-500">{t.optInHint}</p>
      <button
        type="button"
        onClick={enable}
        disabled={working}
        className="rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
      >
        {working ? t.optInWorking : t.optInButton}
      </button>
    </div>
  );
}
