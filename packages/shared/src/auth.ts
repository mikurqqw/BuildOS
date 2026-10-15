import { z } from 'zod';
export const emailSchema = z
  .email()
  .max(254)
  .transform((value) => value.trim().toLowerCase());
export const passwordSchema = z.string().min(12).max(128);
export const setupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  email: emailSchema,
  password: passwordSchema,
  setupToken: z.string().max(256).optional(),
});
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export const inviteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  position: z.string().trim().max(160).default(''),
});
export const acceptInviteSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().trim().min(2).max(120),
  password: passwordSchema,
});
export const userSchema = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: z.enum(['OWNER', 'EMPLOYEE']),
  position: z.string(),
  company: z.string(),
});
export const authSessionSchema = z.object({
  user: userSchema,
  csrfToken: z.string().regex(/^[a-f0-9]{64}$/),
});
export const authStatusSchema = z.object({
  setupRequired: z.boolean(),
  requiresSetupToken: z.boolean(),
});
export const workspaceResponseSchema = z.object({
  data: z.unknown(),
  version: z.number().int().min(0),
});
export const teamSchema = z.object({
  users: z.array(
    userSchema.omit({ company: true }).extend({ active: z.boolean() }),
  ),
  invitations: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      email: z.email(),
      position: z.string(),
      expiresAt: z.string(),
    }),
  ),
});
export type AuthUser = z.infer<typeof userSchema>;
