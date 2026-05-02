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

const MIN_PASSWORD_LEN = 8;

export const mobileAuthEmailLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(MIN_PASSWORD_LEN, { message: `Password must be at least ${MIN_PASSWORD_LEN} characters` }),
});

export const mobileAuthEmailRegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(MIN_PASSWORD_LEN, { message: `Password must be at least ${MIN_PASSWORD_LEN} characters` }),
  name: z.string().max(80).optional(),
});

export const mobileAuthEmailResponseSchema = mobileTokenPairSchema.extend({
  user: mobileAuthUserSchema.nullable(),
});

export type MobileAuthGoogleRequest = z.infer<typeof mobileAuthGoogleRequestSchema>;
export type MobileAuthGoogleResponse = z.infer<typeof mobileAuthGoogleResponseSchema>;
export type MobileAuthRefreshRequest = z.infer<typeof mobileAuthRefreshRequestSchema>;
export type MobileTokenPair = z.infer<typeof mobileTokenPairSchema>;
export type MobileAuthEmailLoginRequest = z.infer<typeof mobileAuthEmailLoginRequestSchema>;
export type MobileAuthEmailRegisterRequest = z.infer<typeof mobileAuthEmailRegisterRequestSchema>;
export type MobileAuthEmailResponse = z.infer<typeof mobileAuthEmailResponseSchema>;
