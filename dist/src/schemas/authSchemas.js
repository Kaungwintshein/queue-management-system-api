"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strongPasswordValidationSchema = exports.passwordValidationSchema = exports.bulkUserOperationSchema = exports.updateUserRequestSchema = exports.createUserRequestSchema = exports.permissionResponseSchema = exports.permissionCheckRequestSchema = exports.sessionDataSchema = exports.jwtPayloadSchema = exports.tokenVerificationResponseSchema = exports.refreshTokenRequestSchema = exports.loginResponseSchema = exports.userResponseSchema = exports.updateProfileRequestSchema = exports.resetPasswordConfirmSchema = exports.resetPasswordRequestSchema = exports.changePasswordRequestSchema = exports.registerRequestSchema = exports.loginRequestSchema = exports.userRoleSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
// User role validation
exports.userRoleSchema = zod_1.z.nativeEnum(client_1.UserRole);
// Login request schema
exports.loginRequestSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50).trim(),
    password: zod_1.z.string().min(6).max(100),
    remember: zod_1.z.boolean().optional().default(false),
});
// Register request schema
exports.registerRequestSchema = zod_1.z
    .object({
    username: zod_1.z.string().min(3).max(50).trim(),
    email: zod_1.z.string().email().max(100).trim().toLowerCase(),
    password: zod_1.z.string().min(6).max(100),
    confirmPassword: zod_1.z.string().min(6).max(100),
    role: exports.userRoleSchema.optional().default(client_1.UserRole.staff),
    organizationId: zod_1.z.string().uuid().optional(),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
// Change password request schema
exports.changePasswordRequestSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(6).max(100),
    newPassword: zod_1.z.string().min(6).max(100),
    confirmNewPassword: zod_1.z.string().min(6).max(100),
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
exports.resetPasswordRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(100).trim().toLowerCase(),
});
// Reset password confirm schema
exports.resetPasswordConfirmSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(6).max(100),
    confirmNewPassword: zod_1.z.string().min(6).max(100),
})
    .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
});
// Update profile request schema
exports.updateProfileRequestSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50).trim().optional(),
    email: zod_1.z.string().email().max(100).trim().toLowerCase().optional(),
    permissions: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// User response schema
exports.userResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    username: zod_1.z.string(),
    email: zod_1.z.string().email(),
    role: exports.userRoleSchema,
    organizationId: zod_1.z.string().uuid(),
    permissions: zod_1.z.record(zod_1.z.unknown()),
    isActive: zod_1.z.boolean(),
    lastLogin: zod_1.z.date().optional().nullable(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// Login response schema
exports.loginResponseSchema = zod_1.z.object({
    token: zod_1.z.string(),
    refreshToken: zod_1.z.string().optional(),
    user: exports.userResponseSchema,
    expiresIn: zod_1.z.number(),
});
// Refresh token request schema
exports.refreshTokenRequestSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
// Token verification response schema
exports.tokenVerificationResponseSchema = zod_1.z.object({
    valid: zod_1.z.boolean(),
    user: exports.userResponseSchema.optional(),
    expiresAt: zod_1.z.date().optional(),
});
// JWT payload schema
exports.jwtPayloadSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    username: zod_1.z.string(),
    email: zod_1.z.string().email(),
    role: exports.userRoleSchema,
    organizationId: zod_1.z.string().uuid(),
    iat: zod_1.z.number().optional(),
    exp: zod_1.z.number().optional(),
});
// Session data schema
exports.sessionDataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string().uuid(),
    deviceInfo: zod_1.z
        .object({
        userAgent: zod_1.z.string().optional(),
        ip: zod_1.z.string().optional(),
        device: zod_1.z.string().optional(),
        browser: zod_1.z.string().optional(),
        os: zod_1.z.string().optional(),
    })
        .optional(),
    lastActivity: zod_1.z.date(),
    expiresAt: zod_1.z.date(),
    isActive: zod_1.z.boolean(),
});
// Permission check request schema
exports.permissionCheckRequestSchema = zod_1.z.object({
    action: zod_1.z.string().min(1),
    resource: zod_1.z.string().min(1),
    resourceId: zod_1.z.string().uuid().optional(),
});
// Permission response schema
exports.permissionResponseSchema = zod_1.z.object({
    allowed: zod_1.z.boolean(),
    reason: zod_1.z.string().optional(),
});
// User creation by admin schema
exports.createUserRequestSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50).trim(),
    email: zod_1.z.string().email().max(100).trim().toLowerCase(),
    password: zod_1.z.string().min(6).max(100),
    role: exports.userRoleSchema,
    permissions: zod_1.z.record(zod_1.z.unknown()).optional().default({}),
    isActive: zod_1.z.boolean().optional().default(true),
});
// User update by admin schema
exports.updateUserRequestSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(50).trim().optional(),
    email: zod_1.z.string().email().max(100).trim().toLowerCase().optional(),
    role: exports.userRoleSchema.optional(),
    permissions: zod_1.z.record(zod_1.z.unknown()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
// Bulk user operations schema
exports.bulkUserOperationSchema = zod_1.z.object({
    userIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(50),
    operation: zod_1.z.enum(["activate", "deactivate", "delete"]),
    reason: zod_1.z.string().max(500).optional(),
});
// Password validation helper
exports.passwordValidationSchema = zod_1.z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(100, "Password must be less than 100 characters")
    .regex(/(?=.*[a-z])/, "Password must contain at least one lowercase letter")
    .regex(/(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
    .regex(/(?=.*\d)/, "Password must contain at least one number")
    .regex(/(?=.*[@$!%*?&])/, "Password must contain at least one special character");
// Strong password schema for admin accounts
exports.strongPasswordValidationSchema = exports.passwordValidationSchema
    .min(8, "Admin password must be at least 8 characters long")
    .regex(/(?=.*[a-z]){2,}/, "Password must contain at least two lowercase letters")
    .regex(/(?=.*[A-Z]){2,}/, "Password must contain at least two uppercase letters")
    .regex(/(?=.*\d){2,}/, "Password must contain at least two numbers")
    .regex(/(?=.*[@$!%*?&]){2,}/, "Password must contain at least two special characters");
//# sourceMappingURL=authSchemas.js.map