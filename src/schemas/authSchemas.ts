import { z } from "zod";
import { UserRole } from "@prisma/client";

// User role validation
export const userRoleSchema = z.nativeEnum(UserRole);

// Login request schema
export const loginRequestSchema = z.object({
  username: z.string().min(3).max(50).trim(),
  password: z.string().min(6).max(100),
  remember: z.boolean().optional().default(false),
});

// Register request schema
export const registerRequestSchema = z
  .object({
    username: z.string().min(3).max(50).trim(),
    email: z.string().email().max(100).trim().toLowerCase(),
    password: z.string().min(6).max(100),
    confirmPassword: z.string().min(6).max(100),
    role: userRoleSchema.optional().default(UserRole.staff),
    organizationId: z.string().uuid().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Change password request schema
export const changePasswordRequestSchema = z
  .object({
    currentPassword: z.string().min(6).max(100),
    newPassword: z.string().min(6).max(100),
    confirmNewPassword: z.string().min(6).max(100),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords don't match",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

// Reset password request schema
export const resetPasswordRequestSchema = z.object({
  email: z.string().email().max(100).trim().toLowerCase(),
});

// Reset password confirm schema
export const resetPasswordConfirmSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(6).max(100),
    confirmNewPassword: z.string().min(6).max(100),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });

// Update profile request schema
export const updateProfileRequestSchema = z.object({
  username: z.string().min(3).max(50).trim().optional(),
  email: z.string().email().max(100).trim().toLowerCase().optional(),
  permissions: z.record(z.unknown()).optional(),
});

// User response schema
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  organizationId: z.string().uuid(),
  permissions: z.record(z.unknown()),
  isActive: z.boolean(),
  lastLogin: z.date().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Login response schema
export const loginResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  user: userResponseSchema,
  expiresIn: z.number(),
});

// Refresh token request schema
export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

// Token verification response schema
export const tokenVerificationResponseSchema = z.object({
  valid: z.boolean(),
  user: userResponseSchema.optional(),
  expiresAt: z.date().optional(),
});

// JWT payload schema
export const jwtPayloadSchema = z.object({
  userId: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  organizationId: z.string().uuid(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

// Session data schema
export const sessionDataSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  deviceInfo: z
    .object({
      userAgent: z.string().optional(),
      ip: z.string().optional(),
      device: z.string().optional(),
      browser: z.string().optional(),
      os: z.string().optional(),
    })
    .optional(),
  lastActivity: z.date(),
  expiresAt: z.date(),
  isActive: z.boolean(),
});

// Permission check request schema
export const permissionCheckRequestSchema = z.object({
  action: z.string().min(1),
  resource: z.string().min(1),
  resourceId: z.string().uuid().optional(),
});

// Permission response schema
export const permissionResponseSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
});

// User creation by admin schema
export const createUserRequestSchema = z.object({
  username: z.string().min(3).max(50).trim(),
  email: z.string().email().max(100).trim().toLowerCase(),
  password: z.string().min(6).max(100),
  role: userRoleSchema,
  permissions: z.record(z.unknown()).optional().default({}),
  isActive: z.boolean().optional().default(true),
});

// User update by admin schema
export const updateUserRequestSchema = z.object({
  username: z.string().min(3).max(50).trim().optional(),
  email: z.string().email().max(100).trim().toLowerCase().optional(),
  role: userRoleSchema.optional(),
  permissions: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

// Bulk user operations schema
export const bulkUserOperationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
  operation: z.enum(["activate", "deactivate", "delete"]),
  reason: z.string().max(500).optional(),
});

// Password validation helper
export const passwordValidationSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long")
  .max(100, "Password must be less than 100 characters")
  .regex(/(?=.*[a-z])/, "Password must contain at least one lowercase letter")
  .regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
  .regex(/(?=.*\d)/, "Password must contain at least one number")
  .regex(
    /(?=.*[@$!%*?&])/,
    "Password must contain at least one special character"
  );

// Strong password schema for admin accounts
export const strongPasswordValidationSchema = passwordValidationSchema
  .min(8, "Admin password must be at least 8 characters long")
  .regex(
    /(?=.*[a-z]){2,}/,
    "Password must contain at least two lowercase letters"
  )
  .regex(
    /(?=.*[A-Z]){2,}/,
    "Password must contain at least two uppercase letters"
  )
  .regex(/(?=.*\d){2,}/, "Password must contain at least two numbers")
  .regex(
    /(?=.*[@$!%*?&]){2,}/,
    "Password must contain at least two special characters"
  );

// Type exports
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordConfirm = z.infer<typeof resetPasswordConfirmSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type TokenVerificationResponse = z.infer<
  typeof tokenVerificationResponseSchema
>;
export type JWTPayload = z.infer<typeof jwtPayloadSchema>;
export type SessionData = z.infer<typeof sessionDataSchema>;
export type PermissionCheckRequest = z.infer<
  typeof permissionCheckRequestSchema
>;
export type PermissionResponse = z.infer<typeof permissionResponseSchema>;
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
export type BulkUserOperation = z.infer<typeof bulkUserOperationSchema>;
