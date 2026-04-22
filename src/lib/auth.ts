import { PrismaAdapter } from "@auth/prisma-adapter";
import { randomUUID } from "crypto";
import NextAuth from "next-auth";
import { deriveCredentialGate, hasEmailMagicProvider } from "@/lib/auth-gate";
import { buildProviders } from "@/lib/auth-providers";
import { ensureUserFamily } from "./family";
import { prisma } from "./prisma";

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: buildProviders(),
  callbacks: {
    async signIn({ user, account }) {
      if (user?.id && account?.provider && hasEmailMagicProvider([account.provider])) {
        const row = await prisma.user.findUnique({
          where: { id: user.id },
          select: { passwordHash: true, credentialSetupDeadline: true },
        });
        if (row && !row.passwordHash && !row.credentialSetupDeadline) {
          const hours = Number.parseInt(process.env.CREDENTIAL_SETUP_DEADLINE_HOURS || "24", 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { credentialSetupDeadline: new Date(Date.now() + hours * 60 * 60 * 1000) },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      const isEdgeRuntime =
        typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime === "string" ||
        process.env.NEXT_RUNTIME === "edge";
      if (isEdgeRuntime) {
        return token;
      }
      const userId = String(token.id ?? token.sub ?? "");
      if (!userId) return token;
      token.id = userId;
      const normalizedEmail =
        typeof token.email === "string" ? token.email.trim().toLowerCase() : "";
      if (normalizedEmail && adminEmails.includes(normalizedEmail)) {
        const existingAdmin = await prisma.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "Admin" WHERE "userId" = ${userId} LIMIT 1
        `;
        if (existingAdmin.length === 0) {
          await prisma.$executeRaw`
            INSERT INTO "Admin" ("id", "userId", "createdAt")
            VALUES (${randomUUID()}, ${userId}, NOW())
          `;
        }
      }
      const adminRows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Admin" WHERE "userId" = ${userId} LIMIT 1
      `;
      token.isAdmin = adminRows.length > 0;
      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          displayCurrency: true,
          timeZone: true,
          passwordHash: true,
          credentialSetupDeadline: true,
          familyId: true,
          accounts: { select: { provider: true } },
        },
      });
      if (row?.name != null && String(row.name).trim() !== "") {
        token.name = row.name;
      }
      token.displayCurrency = row?.displayCurrency ?? "USD";
      token.timeZone = row?.timeZone ?? "Europe/Kyiv";
      const gate = deriveCredentialGate({
        passwordHash: row?.passwordHash ?? null,
        credentialSetupDeadline: row?.credentialSetupDeadline ?? null,
        accounts: row?.accounts ?? [],
      });
      token.mustSetPassword = gate.mustSetPassword;
      token.credentialExpired = gate.credentialExpired;
      if (!gate.mustSetPassword) {
        const familyId = await ensureUserFamily(userId);
        token.familyId = familyId ?? null;
      } else {
        token.familyId = row?.familyId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      const prev = session.user;
      session.user = {
        ...(prev ?? {}),
        id: String(token.id ?? token.sub ?? ""),
        name: (token.name as string | null | undefined) ?? prev?.name ?? null,
        email: (typeof token.email === "string" ? token.email : prev?.email) ?? "",
        image: (token.picture as string | null | undefined) ?? prev?.image ?? null,
        emailVerified: prev?.emailVerified ?? null,
        familyId: (token.familyId as string | null | undefined) ?? null,
        isAdmin: Boolean(token.isAdmin),
        displayCurrency: (token.displayCurrency as string | undefined) ?? "USD",
        timeZone: (token.timeZone as string | undefined) ?? "Europe/Kyiv",
        mustSetPassword: Boolean(token.mustSetPassword),
        credentialExpired: Boolean(token.credentialExpired),
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/auth/verify-request",
  },
});
