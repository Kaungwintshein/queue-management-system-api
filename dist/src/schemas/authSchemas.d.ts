import { z } from "zod";
export declare const userRoleSchema: z.ZodNativeEnum<{
    staff: "staff";
    admin: "admin";
    super_admin: "super_admin";
}>;
export declare const loginRequestSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    remember: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    remember: boolean;
}, {
    username: string;
    password: string;
    remember?: boolean | undefined;
}>;
export declare const registerRequestSchema: z.ZodEffects<z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    role: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<{
        staff: "staff";
        admin: "admin";
        super_admin: "super_admin";
    }>>>;
    organizationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username: string;
    email: string;
    role: "staff" | "admin" | "super_admin";
    password: string;
    confirmPassword: string;
    organizationId?: string | undefined;
}, {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    role?: "staff" | "admin" | "super_admin" | undefined;
    organizationId?: string | undefined;
}>, {
    username: string;
    email: string;
    role: "staff" | "admin" | "super_admin";
    password: string;
    confirmPassword: string;
    organizationId?: string | undefined;
}, {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    role?: "staff" | "admin" | "super_admin" | undefined;
    organizationId?: string | undefined;
}>;
export declare const changePasswordRequestSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmNewPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}>, {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}>, {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}>;
export declare const resetPasswordRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordConfirmSchema: z.ZodEffects<z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
    confirmNewPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
    confirmNewPassword: string;
    token: string;
}, {
    newPassword: string;
    confirmNewPassword: string;
    token: string;
}>, {
    newPassword: string;
    confirmNewPassword: string;
    token: string;
}, {
    newPassword: string;
    confirmNewPassword: string;
    token: string;
}>;
export declare const updateProfileRequestSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    email?: string | undefined;
    permissions?: Record<string, unknown> | undefined;
}, {
    username?: string | undefined;
    email?: string | undefined;
    permissions?: Record<string, unknown> | undefined;
}>;
export declare const userResponseSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    role: z.ZodNativeEnum<{
        staff: "staff";
        admin: "admin";
        super_admin: "super_admin";
    }>;
    organizationId: z.ZodString;
    permissions: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    isActive: z.ZodBoolean;
    lastLogin: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    username: string;
    email: string;
    role: "staff" | "admin" | "super_admin";
    organizationId: string;
    id: string;
    permissions: Record<string, unknown>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date | null | undefined;
}, {
    username: string;
    email: string;
    role: "staff" | "admin" | "super_admin";
    organizationId: string;
    id: string;
    permissions: Record<string, unknown>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date | null | undefined;
}>;
export declare const loginResponseSchema: z.ZodObject<{
    token: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        role: z.ZodNativeEnum<{
            staff: "staff";
            admin: "admin";
            super_admin: "super_admin";
        }>;
        organizationId: z.ZodString;
        permissions: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        isActive: z.ZodBoolean;
        lastLogin: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        username: string;
        email: string;
        role: "staff" | "admin" | "super_admin";
        organizationId: string;
        id: string;
        permissions: Record<string, unknown>;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLogin?: Date | null | undefined;
    }, {
        username: string;
        email: string;
        role: "staff" | "admin" | "super_admin";
        organizationId: string;
        id: string;
        permissions: Record<string, unknown>;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLogin?: Date | null | undefined;
    }>;
    expiresIn: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    user: {
        username: string;
        email: string;
        role: "staff" | "admin" | "super_admin";
        organizationId: string;
        id: string;
        permissions: Record<string, unknown>;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLogin?: Date | null | undefined;
    };
    token: string;
    expiresIn: number;
    refreshToken?: string | undefined;
}, {
    user: {
        username: string;
        email: string;
        role: "staff" | "admin" | "super_admin";
        organizationId: string;
        id: string;
        permissions: Record<string, unknown>;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLogin?: Date | null | undefined;
    };
    token: string;
    expiresIn: number;
    refreshToken?: string | undefined;
}>;
export declare const refreshTokenRequestSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const tokenVerificationResponseSchema: z.ZodObject<{
    valid: z.ZodBoolean;
    user: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        role: z.ZodNativeEnum<{
            staff: "staff";
            admin: "admin";
            super_admin: "super_admin";
        }>;
        organizationId: z.ZodString;
        permissions: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        isActive: z.ZodBoolean;
        lastLogin: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        username: string;
        email: string;
        role: "staff" | "admin" | "super_admin";
        organizationId: string;
        id: string;
        permissions: Record<string, unknown>;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLogin?: Date | null | undefined;
    }, {
        username: string;
        email: string;
        role: "staff" | "admin" | "super_admin";
        organizationId: string;
        id: string;
        permissions: Record<string, unknown>;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLogin?: Date | null | undefined;
    }>>;
    expiresAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    valid: boolean;
    user?: {
        username: string;
        email: string;
        role: "staff" | "admin" | "super_admin";
        organizationId: string;
        id: string;
        permissions: Record<string, unknown>;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLogin?: Date | null | undefined;
    } | undefined;
    expiresAt?: Date | undefined;
}, {
    valid: boolean;
    user?: {
        username: string;
        email: string;
        role: "staff" | "admin" | "super_admin";
        organizationId: string;
        id: string;
        permissions: Record<string, unknown>;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastLogin?: Date | null | undefined;
    } | undefined;
    expiresAt?: Date | undefined;
}>;
export declare const jwtPayloadSchema: z.ZodObject<{
    userId: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    role: z.ZodNativeEnum<{
        staff: "staff";
        admin: "admin";
        super_admin: "super_admin";
    }>;
    organizationId: z.ZodString;
    iat: z.ZodOptional<z.ZodNumber>;
    exp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    username: string;
    email: string;
    role: "staff" | "admin" | "super_admin";
    organizationId: string;
    iat?: number | undefined;
    exp?: number | undefined;
}, {
    userId: string;
    username: string;
    email: string;
    role: "staff" | "admin" | "super_admin";
    organizationId: string;
    iat?: number | undefined;
    exp?: number | undefined;
}>;
export declare const sessionDataSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    deviceInfo: z.ZodOptional<z.ZodObject<{
        userAgent: z.ZodOptional<z.ZodString>;
        ip: z.ZodOptional<z.ZodString>;
        device: z.ZodOptional<z.ZodString>;
        browser: z.ZodOptional<z.ZodString>;
        os: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        userAgent?: string | undefined;
        ip?: string | undefined;
        device?: string | undefined;
        browser?: string | undefined;
        os?: string | undefined;
    }, {
        userAgent?: string | undefined;
        ip?: string | undefined;
        device?: string | undefined;
        browser?: string | undefined;
        os?: string | undefined;
    }>>;
    lastActivity: z.ZodDate;
    expiresAt: z.ZodDate;
    isActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    userId: string;
    id: string;
    isActive: boolean;
    expiresAt: Date;
    lastActivity: Date;
    deviceInfo?: {
        userAgent?: string | undefined;
        ip?: string | undefined;
        device?: string | undefined;
        browser?: string | undefined;
        os?: string | undefined;
    } | undefined;
}, {
    userId: string;
    id: string;
    isActive: boolean;
    expiresAt: Date;
    lastActivity: Date;
    deviceInfo?: {
        userAgent?: string | undefined;
        ip?: string | undefined;
        device?: string | undefined;
        browser?: string | undefined;
        os?: string | undefined;
    } | undefined;
}>;
export declare const permissionCheckRequestSchema: z.ZodObject<{
    action: z.ZodString;
    resource: z.ZodString;
    resourceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: string;
    resource: string;
    resourceId?: string | undefined;
}, {
    action: string;
    resource: string;
    resourceId?: string | undefined;
}>;
export declare const permissionResponseSchema: z.ZodObject<{
    allowed: z.ZodBoolean;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    allowed: boolean;
    reason?: string | undefined;
}, {
    allowed: boolean;
    reason?: string | undefined;
}>;
export declare const createUserRequestSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodNativeEnum<{
        staff: "staff";
        admin: "admin";
        super_admin: "super_admin";
    }>;
    permissions: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    isActive: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    username: string;
    email: string;
    role: "staff" | "admin" | "super_admin";
    permissions: Record<string, unknown>;
    isActive: boolean;
    password: string;
}, {
    username: string;
    email: string;
    role: "staff" | "admin" | "super_admin";
    password: string;
    permissions?: Record<string, unknown> | undefined;
    isActive?: boolean | undefined;
}>;
export declare const updateUserRequestSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodNativeEnum<{
        staff: "staff";
        admin: "admin";
        super_admin: "super_admin";
    }>>;
    permissions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    email?: string | undefined;
    role?: "staff" | "admin" | "super_admin" | undefined;
    permissions?: Record<string, unknown> | undefined;
    isActive?: boolean | undefined;
}, {
    username?: string | undefined;
    email?: string | undefined;
    role?: "staff" | "admin" | "super_admin" | undefined;
    permissions?: Record<string, unknown> | undefined;
    isActive?: boolean | undefined;
}>;
export declare const bulkUserOperationSchema: z.ZodObject<{
    userIds: z.ZodArray<z.ZodString, "many">;
    operation: z.ZodEnum<["activate", "deactivate", "delete"]>;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userIds: string[];
    operation: "activate" | "deactivate" | "delete";
    reason?: string | undefined;
}, {
    userIds: string[];
    operation: "activate" | "deactivate" | "delete";
    reason?: string | undefined;
}>;
export declare const passwordValidationSchema: z.ZodString;
export declare const strongPasswordValidationSchema: z.ZodString;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordConfirm = z.infer<typeof resetPasswordConfirmSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type TokenVerificationResponse = z.infer<typeof tokenVerificationResponseSchema>;
export type JWTPayload = z.infer<typeof jwtPayloadSchema>;
export type SessionData = z.infer<typeof sessionDataSchema>;
export type PermissionCheckRequest = z.infer<typeof permissionCheckRequestSchema>;
export type PermissionResponse = z.infer<typeof permissionResponseSchema>;
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
export type BulkUserOperation = z.infer<typeof bulkUserOperationSchema>;
//# sourceMappingURL=authSchemas.d.ts.map