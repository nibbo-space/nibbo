"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clearFamilyInviteCookieAction } from "@/actions/consume-family-invite";

export default function ConsumeFamilyInviteClient() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      await clearFamilyInviteCookieAction();
      router.refresh();
    })();
  }, [router]);

  return null;
}
