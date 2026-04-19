import MedicationsPageClient from "@/components/medications/MedicationsPageClient";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { redirect } from "next/navigation";

export default async function MedicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) redirect("/login");
  return <MedicationsPageClient />;
}
