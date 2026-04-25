import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OnboardingRootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <div className="min-h-dvh bg-gradient-to-br from-cream-50 via-rose-50/40 to-lavender-50/30">{children}</div>
  );
}
