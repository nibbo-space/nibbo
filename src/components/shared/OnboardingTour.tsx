"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Joyride, STATUS, type EventData } from "react-joyride";
import { I18N } from "@/lib/i18n";
import { useAppLanguage } from "@/hooks/useAppLanguage";

type OnboardingTourProps = {
  shouldRun: boolean;
  userId: string;
};

export default function OnboardingTour({ shouldRun, userId }: OnboardingTourProps) {
  const pathname = usePathname();
  const { language } = useAppLanguage();
  const t = I18N[language];
  const [run, setRun] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedLocally, setCompletedLocally] = useState(false);
  const storageKey = useMemo(() => `nibbo:onboarding:${userId}`, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey) === "1") {
      setCompletedLocally(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!shouldRun || completedLocally || pathname !== "/dashboard") return;
    const id = window.setTimeout(() => setRun(true), 50);
    return () => window.clearTimeout(id);
  }, [shouldRun, completedLocally, pathname]);

  const steps = useMemo(
    () => [
      {
        target: "body",
        title: t.tour.welcomeTitle,
        content: t.tour.welcomeContent,
        disableBeacon: true,
        placement: "center" as const,
      },
      {
        target: "[data-tour='dashboard-home']",
        title: t.tour.homeTitle,
        content: t.tour.homeContent,
        disableBeacon: true,
        placement: "bottom" as const,
      },
      {
        target: "[data-tour='nav-family']",
        title: t.tour.familyTitle,
        content: t.tour.familyContent,
        placement: "right" as const,
      },
      {
        target: "[data-tour='xp-badge']",
        title: t.tour.xpTitle,
        content: t.tour.xpContent,
        placement: "bottom" as const,
      },
      {
        target: "[data-tour='tamagotchi-3d']",
        title: t.tour.nibboTitle,
        content: t.tour.nibboContent,
        placement: "top" as const,
      },
      {
        target: "[data-tour='nav-menu']",
        title: t.tour.recipesTitle,
        content: t.tour.recipesContent,
        placement: "right" as const,
      },
      {
        target: "[data-tour='nav-calendar']",
        title: t.tour.calendarTitle,
        content: t.tour.calendarContent,
        placement: "right" as const,
      },
      {
        target: "[data-tour='nav-notes']",
        title: t.tour.notesTitle,
        content: t.tour.notesContent,
        placement: "right" as const,
      },
      {
        target: "[data-tour='nav-budget']",
        title: t.tour.budgetTitle,
        content: t.tour.budgetContent,
        placement: "right" as const,
      },
    ],
    [t]
  );

  const markComplete = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users/onboarding", { method: "POST" });
      if (!res.ok) {
        return;
      }
      setCompletedLocally(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, "1");
      }
    } catch {}
    setSaving(false);
  };

  const onEvent = async (data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false);
      await markComplete();
    }
  };

  if (pathname !== "/dashboard" || !shouldRun || completedLocally) return null;

  return (
    <Joyride
      run={run}
      steps={steps}
      onEvent={onEvent}
      continuous
      scrollToFirstStep
      options={{
        skipBeacon: true,
        buttons: ["back", "close", "primary", "skip"],
        zIndex: 120,
        primaryColor: "#f43f5e",
        textColor: "#6b3f2d",
        backgroundColor: "#ffffff",
      }}
      styles={{
        tooltip: {
          borderRadius: 18,
          padding: 16,
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 700,
          color: "#6b3f2d",
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: 1.45,
          color: "#7b5a46",
        },
        buttonBack: {
          color: "#8b5e4a",
          fontSize: 13,
        },
        buttonSkip: {
          color: "#8b5e4a",
          fontSize: 13,
        },
        buttonPrimary: {
          backgroundColor: "#f43f5e",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          padding: "8px 12px",
        },
      }}
      locale={{
        back: t.tour.back,
        close: t.tour.close,
        last: t.tour.done,
        next: t.tour.next,
        skip: t.tour.skip,
      }}
    />
  );
}
