import { z } from "zod";

export const mobileAuthGoogleRequestSchema = z.object({
  idToken: z.string().min(1),
});

export const mobileTokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessExpiresAt: z.string().datetime(),
  refreshExpiresAt: z.string().datetime(),
});

export const mobileAuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  familyId: z.string().nullable(),
  onboardingCompletedAt: z.string().datetime().nullable(),
});

export const mobileAuthGoogleResponseSchema = mobileTokenPairSchema.extend({
  user: mobileAuthUserSchema.nullable(),
});

export const mobileAuthRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type MobileAuthGoogleRequest = z.infer<typeof mobileAuthGoogleRequestSchema>;
export type MobileAuthGoogleResponse = z.infer<typeof mobileAuthGoogleResponseSchema>;
export type MobileAuthRefreshRequest = z.infer<typeof mobileAuthRefreshRequestSchema>;
export type MobileTokenPair = z.infer<typeof mobileTokenPairSchema>;
