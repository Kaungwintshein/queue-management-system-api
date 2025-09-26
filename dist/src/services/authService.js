"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app_1 = require("@/app");
const auth_1 = require("@/middleware/auth");
const errors_1 = require("@/utils/errors");
const logger_1 = require("@/utils/logger");
const client_1 = require("@prisma/client");
class AuthService {
    async login(request, ip, userAgent) {
        try {
            logger_1.logger.info("Login attempt", { username: request.username, ip });
            // Find user by username
            const user = await app_1.prisma.user.findUnique({
                where: { username: request.username },
                include: {
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            settings: true,
                        },
                    },
                },
            });
            if (!user) {
                logger_1.logger.warn("Login failed - user not found", {
                    username: request.username,
                    ip,
                });
                throw new errors_1.AuthenticationError("Invalid username or password");
            }
            if (!user.isActive) {
                logger_1.logger.warn("Login failed - user inactive", {
                    username: request.username,
                    ip,
                });
                throw new errors_1.AuthenticationError("Account is inactive");
            }
            // Verify password
            const isPasswordValid = await bcryptjs_1.default.compare(request.password, user.passwordHash);
            if (!isPasswordValid) {
                logger_1.logger.warn("Login failed - invalid password", {
                    username: request.username,
                    ip,
                });
                // Log failed login attempt
                await app_1.prisma.systemLog.create({
                    data: {
                        organizationId: user.organizationId,
                        userId: user.id,
                        action: "login_failed",
                        entityType: "user",
                        entityId: user.id,
                        details: {
                            reason: "invalid_password",
                            ip,
                            userAgent,
                        },
                        ipAddress: ip,
                        userAgent,
                    },
                });
                throw new errors_1.AuthenticationError("Invalid username or password");
            }
            // Update last login
            await app_1.prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
            });
            // Generate tokens
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
            };
            const token = (0, auth_1.generateToken)(tokenPayload);
            const refreshToken = request.remember
                ? (0, auth_1.generateRefreshToken)(tokenPayload)
                : undefined;
            // Log successful login
            await app_1.prisma.systemLog.create({
                data: {
                    organizationId: user.organizationId,
                    userId: user.id,
                    action: "login_success",
                    entityType: "user",
                    entityId: user.id,
                    details: {
                        ip,
                        userAgent,
                        remember: request.remember,
                    },
                    ipAddress: ip,
                    userAgent,
                },
            });
            logger_1.logger.info("Login successful", {
                userId: user.id,
                username: user.username,
                role: user.role,
                ip,
            });
            const userResponse = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                permissions: user.permissions,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
            return {
                token,
                refreshToken,
                user: userResponse,
                expiresIn: 24 * 60 * 60, // 24 hours in seconds
            };
        }
        catch (error) {
            logger_1.logger.error("Login error", {
                error: error instanceof Error ? error.message : String(error),
                username: request.username,
                ip,
            });
            throw error;
        }
    }
    async register(request, createdBy) {
        try {
            logger_1.logger.info("User registration attempt", {
                username: request.username,
                email: request.email,
                role: request.role,
            });
            // Check if username already exists
            const existingUser = await app_1.prisma.user.findFirst({
                where: {
                    OR: [{ username: request.username }, { email: request.email }],
                },
            });
            if (existingUser) {
                const field = existingUser.username === request.username ? "username" : "email";
                throw new errors_1.ConflictError(`User with this ${field} already exists`);
            }
            // Get or create default organization if not provided
            let organizationId = request.organizationId;
            if (!organizationId) {
                const defaultOrg = await app_1.prisma.organization.findFirst({
                    where: { name: "Default Organization" },
                });
                if (!defaultOrg) {
                    const newOrg = await app_1.prisma.organization.create({
                        data: {
                            name: "Default Organization",
                            settings: {},
                        },
                    });
                    organizationId = newOrg.id;
                }
                else {
                    organizationId = defaultOrg.id;
                }
            }
            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcryptjs_1.default.hash(request.password, saltRounds);
            // Create user
            const user = await app_1.prisma.user.create({
                data: {
                    organizationId,
                    username: request.username,
                    email: request.email,
                    passwordHash,
                    role: request.role,
                    permissions: {},
                    isActive: true,
                },
            });
            // Log user creation
            await app_1.prisma.systemLog.create({
                data: {
                    organizationId,
                    userId: createdBy || user.id,
                    action: "user_created",
                    entityType: "user",
                    entityId: user.id,
                    details: {
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        createdBy,
                    },
                },
            });
            logger_1.logger.info("User registered successfully", {
                userId: user.id,
                username: user.username,
                role: user.role,
            });
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                permissions: user.permissions,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        }
        catch (error) {
            logger_1.logger.error("Registration error", {
                error: error instanceof Error ? error.message : String(error),
                username: request.username,
                email: request.email,
            });
            throw error;
        }
    }
    async changePassword(userId, request, ip) {
        try {
            logger_1.logger.info("Password change attempt", { userId, ip });
            // Get user
            const user = await app_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new errors_1.NotFoundError("User");
            }
            // Verify current password
            const isCurrentPasswordValid = await bcryptjs_1.default.compare(request.currentPassword, user.passwordHash);
            if (!isCurrentPasswordValid) {
                logger_1.logger.warn("Password change failed - invalid current password", {
                    userId,
                    ip,
                });
                throw new errors_1.AuthenticationError("Current password is incorrect");
            }
            // Hash new password
            const saltRounds = 12;
            const newPasswordHash = await bcryptjs_1.default.hash(request.newPassword, saltRounds);
            // Update password
            await app_1.prisma.user.update({
                where: { id: userId },
                data: { passwordHash: newPasswordHash },
            });
            // Log password change
            await app_1.prisma.systemLog.create({
                data: {
                    organizationId: user.organizationId,
                    userId,
                    action: "password_changed",
                    entityType: "user",
                    entityId: userId,
                    details: { ip },
                    ipAddress: ip,
                },
            });
            logger_1.logger.info("Password changed successfully", { userId, ip });
        }
        catch (error) {
            logger_1.logger.error("Password change error", {
                error: error instanceof Error ? error.message : String(error),
                userId,
                ip,
            });
            throw error;
        }
    }
    async getUserById(userId) {
        try {
            const user = await app_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new errors_1.NotFoundError("User");
            }
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                permissions: user.permissions,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        }
        catch (error) {
            logger_1.logger.error("Get user error", {
                error: error instanceof Error ? error.message : String(error),
                userId,
            });
            throw error;
        }
    }
    async createUser(request, createdBy) {
        try {
            logger_1.logger.info("Creating user", {
                username: request.username,
                email: request.email,
                role: request.role,
                createdBy,
            });
            // Get creator's organization
            const creator = await app_1.prisma.user.findUnique({
                where: { id: createdBy },
                select: { organizationId: true, role: true },
            });
            if (!creator) {
                throw new errors_1.NotFoundError("Creator user");
            }
            // Check permissions - only admins can create users
            if (creator.role !== client_1.UserRole.admin &&
                creator.role !== client_1.UserRole.super_admin) {
                throw new errors_1.AppError("Insufficient permissions to create users", 403);
            }
            // Check if username/email already exists in organization
            const existingUser = await app_1.prisma.user.findFirst({
                where: {
                    organizationId: creator.organizationId,
                    OR: [{ username: request.username }, { email: request.email }],
                },
            });
            if (existingUser) {
                const field = existingUser.username === request.username ? "username" : "email";
                throw new errors_1.ConflictError(`User with this ${field} already exists in organization`);
            }
            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcryptjs_1.default.hash(request.password, saltRounds);
            // Create user
            const user = await app_1.prisma.user.create({
                data: {
                    organizationId: creator.organizationId,
                    username: request.username,
                    email: request.email,
                    passwordHash,
                    role: request.role,
                    permissions: (request.permissions || {}),
                    isActive: request.isActive ?? true,
                },
            });
            // Log user creation
            await app_1.prisma.systemLog.create({
                data: {
                    organizationId: creator.organizationId,
                    userId: createdBy,
                    action: "user_created",
                    entityType: "user",
                    entityId: user.id,
                    details: {
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        createdBy,
                    },
                },
            });
            logger_1.logger.info("User created successfully", {
                userId: user.id,
                username: user.username,
                role: user.role,
                createdBy,
            });
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                permissions: user.permissions,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };
        }
        catch (error) {
            logger_1.logger.error("Create user error", {
                error: error instanceof Error ? error.message : String(error),
                username: request.username,
                createdBy,
            });
            throw error;
        }
    }
    async updateUser(userId, request, updatedBy) {
        try {
            logger_1.logger.info("Updating user", { userId, updatedBy });
            // Get the user being updated and the updater
            const [user, updater] = await Promise.all([
                app_1.prisma.user.findUnique({ where: { id: userId } }),
                app_1.prisma.user.findUnique({ where: { id: updatedBy } }),
            ]);
            if (!user) {
                throw new errors_1.NotFoundError("User");
            }
            if (!updater) {
                throw new errors_1.NotFoundError("Updater user");
            }
            // Check permissions
            if (updater.role !== client_1.UserRole.admin &&
                updater.role !== client_1.UserRole.super_admin) {
                // Users can only update their own profile (limited fields)
                if (userId !== updatedBy) {
                    throw new errors_1.AppError("Insufficient permissions", 403);
                }
                // Restrict what regular users can update
                if (request.role || request.isActive !== undefined) {
                    throw new errors_1.AppError("Cannot update role or active status", 403);
                }
            }
            // Check for username/email conflicts
            if (request.username || request.email) {
                const existingUser = await app_1.prisma.user.findFirst({
                    where: {
                        organizationId: user.organizationId,
                        id: { not: userId },
                        OR: [
                            ...(request.username ? [{ username: request.username }] : []),
                            ...(request.email ? [{ email: request.email }] : []),
                        ],
                    },
                });
                if (existingUser) {
                    const field = existingUser.username === request.username ? "username" : "email";
                    throw new errors_1.ConflictError(`User with this ${field} already exists`);
                }
            }
            // Update user
            const updatedUser = await app_1.prisma.user.update({
                where: { id: userId },
                data: {
                    ...(request.username && { username: request.username }),
                    ...(request.email && { email: request.email }),
                    ...(request.role && { role: request.role }),
                    ...(request.permissions && {
                        permissions: request.permissions,
                    }),
                    ...(request.isActive !== undefined && { isActive: request.isActive }),
                },
            });
            // Log user update
            await app_1.prisma.systemLog.create({
                data: {
                    organizationId: user.organizationId,
                    userId: updatedBy,
                    action: "user_updated",
                    entityType: "user",
                    entityId: userId,
                    details: {
                        changes: request,
                        updatedBy,
                    },
                },
            });
            logger_1.logger.info("User updated successfully", { userId, updatedBy });
            return {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
                organizationId: updatedUser.organizationId,
                permissions: updatedUser.permissions,
                isActive: updatedUser.isActive,
                lastLogin: updatedUser.lastLogin,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
            };
        }
        catch (error) {
            logger_1.logger.error("Update user error", {
                error: error instanceof Error ? error.message : String(error),
                userId,
                updatedBy,
            });
            throw error;
        }
    }
    async deactivateUser(userId, deactivatedBy) {
        try {
            logger_1.logger.info("Deactivating user", { userId, deactivatedBy });
            const [user, deactivator] = await Promise.all([
                app_1.prisma.user.findUnique({ where: { id: userId } }),
                app_1.prisma.user.findUnique({ where: { id: deactivatedBy } }),
            ]);
            if (!user) {
                throw new errors_1.NotFoundError("User");
            }
            if (!deactivator) {
                throw new errors_1.NotFoundError("Deactivator user");
            }
            // Check permissions
            if (deactivator.role !== client_1.UserRole.admin &&
                deactivator.role !== client_1.UserRole.super_admin) {
                throw new errors_1.AppError("Insufficient permissions", 403);
            }
            // Prevent deactivating super admin
            if (user.role === client_1.UserRole.super_admin &&
                deactivator.role !== client_1.UserRole.super_admin) {
                throw new errors_1.AppError("Cannot deactivate super admin", 403);
            }
            // Deactivate user
            await app_1.prisma.user.update({
                where: { id: userId },
                data: { isActive: false },
            });
            // Log user deactivation
            await app_1.prisma.systemLog.create({
                data: {
                    organizationId: user.organizationId,
                    userId: deactivatedBy,
                    action: "user_deactivated",
                    entityType: "user",
                    entityId: userId,
                    details: {
                        username: user.username,
                        deactivatedBy,
                    },
                },
            });
            logger_1.logger.info("User deactivated successfully", { userId, deactivatedBy });
        }
        catch (error) {
            logger_1.logger.error("Deactivate user error", {
                error: error instanceof Error ? error.message : String(error),
                userId,
                deactivatedBy,
            });
            throw error;
        }
    }
    async listUsers(organizationId, requestedBy) {
        try {
            // Check permissions
            const requester = await app_1.prisma.user.findUnique({
                where: { id: requestedBy },
            });
            if (!requester) {
                throw new errors_1.NotFoundError("Requester user");
            }
            if (requester.role !== client_1.UserRole.admin &&
                requester.role !== client_1.UserRole.super_admin) {
                throw new errors_1.AppError("Insufficient permissions", 403);
            }
            const users = await app_1.prisma.user.findMany({
                where: { organizationId },
                orderBy: { createdAt: "desc" },
            });
            return users.map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                permissions: user.permissions,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }));
        }
        catch (error) {
            logger_1.logger.error("List users error", {
                error: error instanceof Error ? error.message : String(error),
                organizationId,
                requestedBy,
            });
            throw error;
        }
    }
    async reactivateUser(userId, reactivatedBy) {
        try {
            const user = await app_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new errors_1.NotFoundError("User");
            }
            await app_1.prisma.user.update({
                where: { id: userId },
                data: { isActive: true },
            });
            logger_1.logger.info("User reactivated", {
                userId,
                reactivatedBy,
            });
        }
        catch (error) {
            logger_1.logger.error("Reactivate user error", {
                error: error instanceof Error ? error.message : String(error),
                userId,
                reactivatedBy,
            });
            throw error;
        }
    }
    async resetUserPassword(userId, resetBy) {
        try {
            const user = await app_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new errors_1.NotFoundError("User");
            }
            // In a real application, you would:
            // 1. Generate a secure reset token
            // 2. Send an email with the reset link
            // 3. Store the reset token with expiration
            // For now, we'll just log the action
            logger_1.logger.info("Password reset requested", {
                userId,
                resetBy,
                userEmail: user.email,
            });
            // TODO: Implement actual password reset email sending
        }
        catch (error) {
            logger_1.logger.error("Reset user password error", {
                error: error instanceof Error ? error.message : String(error),
                userId,
                resetBy,
            });
            throw error;
        }
    }
    async deleteUser(userId, deletedBy) {
        try {
            const user = await app_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new errors_1.NotFoundError("User");
            }
            // Check if user is trying to delete themselves
            if (userId === deletedBy) {
                throw new errors_1.AppError("Cannot delete your own account", 400);
            }
            await app_1.prisma.user.delete({
                where: { id: userId },
            });
            logger_1.logger.info("User deleted", {
                userId,
                deletedBy,
            });
        }
        catch (error) {
            logger_1.logger.error("Delete user error", {
                error: error instanceof Error ? error.message : String(error),
                userId,
                deletedBy,
            });
            throw error;
        }
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=authService.js.map