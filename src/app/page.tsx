import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DEFAULT_PUBLIC_LOCALE } from "@/lib/public-locales";

export default async function RootPage() {
  const session = await auth();
  redirect(session ? "/dashboard" : `/${DEFAULT_PUBLIC_LOCALE}`);
}
