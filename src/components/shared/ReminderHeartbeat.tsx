"use client";

import { useCallback, useEffect, useRef } from "react";

const HEARTBEAT_MS = 60_000;

export default function ReminderHeartbeat() {
  const inFlight = useRef(false);

  const tick = useCallback(async () => {
    if (inFlight.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    inFlight.current = true;
    try {
      await fetch("/api/reminders/tick", { method: "POST" });
    } catch {
      return;
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    const onOnline = () => void tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [tick]);

  return null;
}
