"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  firstAccessibleNavHref,
  firstFocusHref,
  isFocusPathAllowed,
  isFocusRoutingAvailable,
  isPathBlockedByDisabledModules,
} from "@/lib/family-app-modules";
import { useFocusModeActive } from "@/components/shared/FocusModeProvider";
import { useDisabledAppModules } from "@/components/shared/DisabledAppModulesProvider";

const FOCUS_ROUTE_EXEMPT = ["/admin", "/feedback", "/privacy", "/roadmap", "/blog"] as const;

function isFocusRouteExempt(pathname: string): boolean {
  return FOCUS_ROUTE_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function DashboardRouteGates() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const focusActive = useFocusModeActive();
  const disabledAppModules = useDisabledAppModules()?.disabledAppModules ?? [];
  const disabledKey = useMemo(() => JSON.stringify([...disabledAppModules].sort()), [disabledAppModules]);

  useEffect(() => {
    if (isPathBlockedByDisabledModules(pathname, disabledAppModules)) {
      const next = firstAccessibleNavHref(disabledAppModules);
      if (next !== pathname) router.replace(next);
      return;
    }
    if (
      focusActive &&
      isFocusRoutingAvailable(disabledAppModules) &&
      !isFocusRouteExempt(pathname) &&
      !isFocusPathAllowed(pathname, disabledAppModules)
    ) {
      const next = firstFocusHref(disabledAppModules);
      if (next !== pathname) router.replace(next);
    }
  }, [pathname, disabledKey, focusActive, router, disabledAppModules]);

  return null;
}
