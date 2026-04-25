import { Suspense } from "react";
import { isMagicLinkConfigured } from "@/lib/auth-providers";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient magicLinkEnabled={isMagicLinkConfigured()} />
    </Suspense>
  );
}
