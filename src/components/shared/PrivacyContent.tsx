"use client";

import { CozyPageBackground } from "@/components/shared/CozyPageBackground";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import Link from "next/link";

export function PrivacyContent({ signedIn = false }: { signedIn?: boolean }) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].legal;
  const nav = I18N[messageLocale(language)].nav;

  const blocks: { title: string; body: string }[] = [
    { title: t.privacyDataTitle, body: t.privacyDataBody },
    { title: t.privacyPurposeTitle, body: t.privacyPurposeBody },
    { title: t.privacyBasisTitle, body: t.privacyBasisBody },
    { title: t.privacyProcessorsTitle, body: t.privacyProcessorsBody },
    { title: t.privacyRetentionTitle, body: t.privacyRetentionBody },
    { title: t.privacyRightsTitle, body: t.privacyRightsBody },
    { title: t.privacyMinorsTitle, body: t.privacyMinorsBody },
    { title: t.privacyCookiesTitle, body: t.privacyCookiesBody },
    { title: t.privacyChangesTitle, body: t.privacyChangesBody },
  ];

  return (
    <CozyPageBackground>
      <div className="min-h-screen px-4 py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <Link
            href={signedIn ? "/dashboard" : "/landing"}
            className="text-sm font-semibold text-rose-600 underline-offset-2 transition-colors hover:text-rose-700 hover:underline"
          >
            ← {signedIn ? nav.dashboard : t.privacyBackToSite}
          </Link>
          <article className="mt-6 rounded-3xl border border-warm-100 bg-white p-6 shadow-cozy md:p-10">
            <h1 className="font-heading text-2xl font-bold text-warm-800 md:text-3xl">
              {t.privacyHeading}
            </h1>
            <p className="mt-2 text-xs font-medium text-warm-400">
              {t.privacyUpdated}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-warm-600 md:text-[15px]">
              {t.privacyLead}
            </p>
            <div className="mt-10 space-y-10">
              {blocks.map((b) => (
                <section key={b.title}>
                  <h2 className="font-heading text-lg font-bold text-warm-800">
                    {b.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-warm-600 md:text-[15px]">
                    {b.body}
                  </p>
                </section>
              ))}
              <section>
                <h2 className="font-heading text-lg font-bold text-warm-800">
                  {t.privacyContactTitle}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-warm-600 md:text-[15px]">
                  {t.privacyContactBody}
                </p>
                {signedIn ? (
                  <p className="mt-3">
                    <Link
                      href="/feedback"
                      className="inline-flex items-center gap-1 font-semibold text-rose-600 underline-offset-2 hover:text-rose-700 hover:underline"
                    >
                      {I18N[messageLocale(language)].feedback.pageTitle}
                      <span aria-hidden>→</span>
                    </Link>
                  </p>
                ) : null}
              </section>
            </div>
          </article>
        </div>
      </div>
    </CozyPageBackground>
  );
}
