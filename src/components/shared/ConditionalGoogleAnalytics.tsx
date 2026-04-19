"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import {
  NIBBO_COOKIE_CONSENT_EVENT,
  NIBBO_COOKIE_CONSENT_KEY,
  NIBBO_COOKIE_CONSENT_VALUE,
} from "@/lib/nibbo-cookie-consent";
import { useEffect, useState } from "react";

export function ConditionalGoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const [consented, setConsented] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const read = () => {
      try {
        if (localStorage.getItem(NIBBO_COOKIE_CONSENT_KEY) === NIBBO_COOKIE_CONSENT_VALUE) {
          setConsented(true);
        }
      } catch {}
    };
    read();
    const onAccept = () => setConsented(true);
    window.addEventListener(NIBBO_COOKIE_CONSENT_EVENT, onAccept);
    return () => window.removeEventListener(NIBBO_COOKIE_CONSENT_EVENT, onAccept);
  }, []);

  if (!gaId || !consented || !hydrated) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
