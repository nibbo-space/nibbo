import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { sendNibboMagicLinkEmail } from "@/lib/magic-link-email";

export function isMagicLinkConfigured() {
  return smtpOrNull() !== null;
}

export function getSmtpMailConfig(): {
  server: { host: string; port: number; auth?: { user: string; pass: string }; secure: boolean };
  from: string;
} | null {
  return smtpOrNull();
}

function smtpOrNull(): { server: { host: string; port: number; auth?: { user: string; pass: string }; secure: boolean }; from: string } | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim() || "";
  if (!host || !from) return null;
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const secureFlag = process.env.SMTP_SECURE?.trim().toLowerCase() === "true";
  const secure = secureFlag || port === 465;
  return {
    server: {
      host,
      port,
      secure,
      ...(user ? { auth: { user, pass } } : {}),
    },
    from,
  };
}

export function buildProviders(): NextAuthConfig["providers"] {
  const mail = smtpOrNull();
  const nodemailer =
    mail &&
    Nodemailer({
      server: mail.server,
      from: mail.from,
      maxAge: Number.parseInt(process.env.MAGIC_LINK_MAX_AGE_SECONDS || "3600", 10),
      sendVerificationRequest: sendNibboMagicLinkEmail,
    });
  const credentials = Credentials({
    id: "credentials",
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email || "").trim().toLowerCase();
      const password = String(credentials?.password || "");
      if (!email || !password) return null;
      const row = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, image: true, passwordHash: true },
      });
      if (!row?.passwordHash) return null;
      const ok = await bcrypt.compare(password, row.passwordHash);
      if (!ok) return null;
      return { id: row.id, name: row.name, email: row.email, image: row.image };
    },
  });
  const google = GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  });
  return nodemailer ? [google, nodemailer, credentials] : [google, credentials];
}
