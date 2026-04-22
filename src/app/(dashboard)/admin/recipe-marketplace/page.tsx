import RecipeMarketplaceAdminClient from "@/components/admin/RecipeMarketplaceAdminClient";
import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin — recipe marketplace",
};

export default async function AdminRecipeMarketplacePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!(await isUserAdmin(session.user.id))) redirect("/dashboard");
  return <RecipeMarketplaceAdminClient />;
}
