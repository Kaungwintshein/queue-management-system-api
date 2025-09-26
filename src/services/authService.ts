import bcrypt from "bcryptjs";
import { prisma } from "@/app";
import { generateToken, generateRefreshToken } from "@/middleware/auth";
import {
  AppError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from "@/utils/errors";
import { logger } from "@/utils/logger";
import {
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
  LoginResponse,
} from "@/schemas/authSchemas";
import { UserRole, Prisma } from "@prisma/client";

export class AuthService {
  async login(
    request: LoginRequest,
    ip?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    try {
      logger.info("Login attempt", { username: request.username, ip });

      // Find user by username
      const user = await prisma.user.findUnique({
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
        logger.warn("Login failed - user not found", {
          username: request.username,
          ip,
        });
        throw new AuthenticationError("Invalid username or password");
      }

      if (!user.isActive) {
        logger.warn("Login failed - user inactive", {
          username: request.username,
          ip,
        });
        throw new AuthenticationError("Account is inactive");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        request.password,
        user.passwordHash
      );
      if (!isPasswordValid) {
        logger.warn("Login failed - invalid password", {
          username: request.username,
          ip,
        });

        // Log failed login attempt
        await prisma.systemLog.create({
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

        throw new AuthenticationError("Invalid username or password");
      }

      // Update last login
      await prisma.user.update({
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

      const token = generateToken(tokenPayload);
      const refreshToken = request.remember
        ? generateRefreshToken(tokenPayload)
        : undefined;

      // Log successful login
      await prisma.systemLog.create({
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

      logger.info("Login successful", {
        userId: user.id,
        username: user.username,
        role: user.role,
        ip,
      });

      const userResponse: UserResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        permissions: user.permissions as Record<string, unknown>,
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
    } catch (error) {
      logger.error("Login error", {
        error: error instanceof Error ? error.message : String(error),
        username: request.username,
        ip,
      });
      throw error;
    }
  }

  async register(
    request: RegisterRequest,
    createdBy?: string
  ): Promise<UserResponse> {
    try {
      logger.info("User registration attempt", {
        username: request.username,
        email: request.email,
        role: request.role,
      });

      // Check if username already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username: request.username }, { email: request.email }],
        },
      });

      if (existingUser) {
        const field =
          existingUser.username === request.username ? "username" : "email";
        throw new ConflictError(`User with this ${field} already exists`);
      }

      // Get or create default organization if not provided
      let organizationId = request.organizationId;
      if (!organizationId) {
        const defaultOrg = await prisma.organization.findFirst({
          where: { name: "Default Organization" },
        });

        if (!defaultOrg) {
          const newOrg = await prisma.organization.create({
            data: {
              name: "Default Organization",
              settings: {},
            },
          });
          organizationId = newOrg.id;
        } else {
          organizationId = defaultOrg.id;
        }
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(request.password, saltRounds);

      // Create user
      const user = await prisma.user.create({
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
      await prisma.systemLog.create({
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

      logger.info("User registered successfully", {
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
        permissions: user.permissions as Record<string, unknown>,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Registration error", {
        error: error instanceof Error ? error.message : String(error),
        username: request.username,
        email: request.email,
      });
      throw error;
    }
  }

  async changePassword(
    userId: string,
    request: ChangePasswordRequest,
    ip?: string
  ): Promise<void> {
    try {
      logger.info("Password change attempt", { userId, ip });

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError("User");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        request.currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        logger.warn("Password change failed - invalid current password", {
          userId,
          ip,
        });
        throw new AuthenticationError("Current password is incorrect");
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(
        request.newPassword,
        saltRounds
      );

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      // Log password change
      await prisma.systemLog.create({
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

      logger.info("Password changed successfully", { userId, ip });
    } catch (error) {
      logger.error("Password change error", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        ip,
      });
      throw error;
    }
  }

  async getUserById(userId: string): Promise<UserResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError("User");
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        permissions: user.permissions as Record<string, unknown>,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Get user error", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  async createUser(
    request: CreateUserRequest,
    createdBy: string
  ): Promise<UserResponse> {
    try {
      logger.info("Creating user", {
        username: request.username,
        email: request.email,
        role: request.role,
        createdBy,
      });

      // Get creator's organization
      const creator = await prisma.user.findUnique({
        where: { id: createdBy },
        select: { organizationId: true, role: true },
      });

      if (!creator) {
        throw new NotFoundError("Creator user");
      }

      // Check permissions - only admins can create users
      if (
        creator.role !== UserRole.admin &&
        creator.role !== UserRole.super_admin
      ) {
        throw new AppError("Insufficient permissions to create users", 403);
      }

      // Check if username/email already exists in organization
      const existingUser = await prisma.user.findFirst({
        where: {
          organizationId: creator.organizationId,
          OR: [{ username: request.username }, { email: request.email }],
        },
      });

      if (existingUser) {
        const field =
          existingUser.username === request.username ? "username" : "email";
        throw new ConflictError(
          `User with this ${field} already exists in organization`
        );
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(request.password, saltRounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          organizationId: creator.organizationId,
          username: request.username,
          email: request.email,
          passwordHash,
          role: request.role,
          permissions: (request.permissions || {}) as Prisma.JsonObject,
          isActive: request.isActive ?? true,
        },
      });

      // Log user creation
      await prisma.systemLog.create({
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

      logger.info("User created successfully", {
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
        permissions: user.permissions as Record<string, unknown>,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error("Create user error", {
        error: error instanceof Error ? error.message : String(error),
        username: request.username,
        createdBy,
      });
      throw error;
    }
  }

  async updateUser(
    userId: string,
    request: UpdateUserRequest,
    updatedBy: string
  ): Promise<UserResponse> {
    try {
      logger.info("Updating user", { userId, updatedBy });

      // Get the user being updated and the updater
      const [user, updater] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.user.findUnique({ where: { id: updatedBy } }),
      ]);

      if (!user) {
        throw new NotFoundError("User");
      }

      if (!updater) {
        throw new NotFoundError("Updater user");
      }

      // Check permissions
      if (
        updater.role !== UserRole.admin &&
        updater.role !== UserRole.super_admin
      ) {
        // Users can only update their own profile (limited fields)
        if (userId !== updatedBy) {
          throw new AppError("Insufficient permissions", 403);
        }

        // Restrict what regular users can update
        if (request.role || request.isActive !== undefined) {
          throw new AppError("Cannot update role or active status", 403);
        }
      }

      // Check for username/email conflicts
      if (request.username || request.email) {
        const existingUser = await prisma.user.findFirst({
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
          const field =
            existingUser.username === request.username ? "username" : "email";
          throw new ConflictError(`User with this ${field} already exists`);
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(request.username && { username: request.username }),
          ...(request.email && { email: request.email }),
          ...(request.role && { role: request.role }),
          ...(request.permissions && {
            permissions: request.permissions as Prisma.JsonObject,
          }),
          ...(request.isActive !== undefined && { isActive: request.isActive }),
        },
      });

      // Log user update
      await prisma.systemLog.create({
        data: {
          organizationId: user.organizationId,
          userId: updatedBy,
          action: "user_updated",
          entityType: "user",
          entityId: userId,
          details: {
            changes: request as Prisma.JsonObject,
            updatedBy,
          } as Prisma.JsonObject,
        },
      });

      logger.info("User updated successfully", { userId, updatedBy });

      return {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
        permissions: updatedUser.permissions as Record<string, any>,
        isActive: updatedUser.isActive,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };
    } catch (error) {
      logger.error("Update user error", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        updatedBy,
      });
      throw error;
    }
  }

  async deactivateUser(userId: string, deactivatedBy: string): Promise<void> {
    try {
      logger.info("Deactivating user", { userId, deactivatedBy });

      const [user, deactivator] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.user.findUnique({ where: { id: deactivatedBy } }),
      ]);

      if (!user) {
        throw new NotFoundError("User");
      }

      if (!deactivator) {
        throw new NotFoundError("Deactivator user");
      }

      // Check permissions
      if (
        deactivator.role !== UserRole.admin &&
        deactivator.role !== UserRole.super_admin
      ) {
        throw new AppError("Insufficient permissions", 403);
      }

      // Prevent deactivating super admin
      if (
        user.role === UserRole.super_admin &&
        deactivator.role !== UserRole.super_admin
      ) {
        throw new AppError("Cannot deactivate super admin", 403);
      }

      // Deactivate user
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // Log user deactivation
      await prisma.systemLog.create({
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

      logger.info("User deactivated successfully", { userId, deactivatedBy });
    } catch (error) {
      logger.error("Deactivate user error", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deactivatedBy,
      });
      throw error;
    }
  }

  async listUsers(
    organizationId: string,
    requestedBy: string
  ): Promise<UserResponse[]> {
    try {
      // Check permissions
      const requester = await prisma.user.findUnique({
        where: { id: requestedBy },
      });

      if (!requester) {
        throw new NotFoundError("Requester user");
      }

      if (
        requester.role !== UserRole.admin &&
        requester.role !== UserRole.super_admin
      ) {
        throw new AppError("Insufficient permissions", 403);
      }

      const users = await prisma.user.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
      });

      return users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        permissions: user.permissions as Record<string, unknown>,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
    } catch (error) {
      logger.error("List users error", {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
        requestedBy,
      });
      throw error;
    }
  }

  async reactivateUser(userId: string, reactivatedBy: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError("User");
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });

      logger.info("User reactivated", {
        userId,
        reactivatedBy,
      });
    } catch (error) {
      logger.error("Reactivate user error", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        reactivatedBy,
      });
      throw error;
    }
  }

  async resetUserPassword(userId: string, resetBy: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError("User");
      }

      // In a real application, you would:
      // 1. Generate a secure reset token
      // 2. Send an email with the reset link
      // 3. Store the reset token with expiration

      // For now, we'll just log the action
      logger.info("Password reset requested", {
        userId,
        resetBy,
        userEmail: user.email,
      });

      // TODO: Implement actual password reset email sending
    } catch (error) {
      logger.error("Reset user password error", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        resetBy,
      });
      throw error;
    }
  }

  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError("User");
      }

      // Check if user is trying to delete themselves
      if (userId === deletedBy) {
        throw new AppError("Cannot delete your own account", 400);
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      logger.info("User deleted", {
        userId,
        deletedBy,
      });
    } catch (error) {
      logger.error("Delete user error", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deletedBy,
      });
      throw error;
    }
  }
}

export const authService = new AuthService();
