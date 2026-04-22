import "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      familyId?: string | null;
      isAdmin?: boolean;
      displayCurrency?: string;
      timeZone?: string;
      mustSetPassword?: boolean;
      credentialExpired?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    familyId?: string | null;
    isAdmin?: boolean;
    displayCurrency?: string;
    timeZone?: string;
    mustSetPassword?: boolean;
    credentialExpired?: boolean;
  }
}
