import { Router, Request, Response } from "express";
import { authService } from "@/services/authService";
import { authenticate, authorize, AuthRequest } from "@/middleware/auth";
import { authRateLimiter } from "@/middleware/rateLimiter";
import { asyncHandler } from "@/middleware/errorHandler";
import {
  loginRequestSchema,
  registerRequestSchema,
  changePasswordRequestSchema,
  createUserRequestSchema,
  updateUserRequestSchema,
} from "@/schemas/authSchemas";
import { AppError } from "@/utils/errors";
import { UserRole } from "@prisma/client";
import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendNoContentResponse,
  sendErrorResponse,
} from "@/utils/response";

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               remember:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *                     expiresIn:
 *                       type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  authRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const validatedData = loginRequestSchema.parse(req.body);

    const result = await authService.login(
      validatedData,
      req.ip,
      req.get("User-Agent")
    );

    return sendSuccessResponse(res, result, "Login successful");
  })
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: User registration (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - confirmPassword
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [staff, admin, super_admin]
 *     responses:
 *       201:
 *         description: User created successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/register",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = registerRequestSchema.parse(req.body);

    const user = await authService.register(validatedData, req.user!.id);

    return sendCreatedResponse(res, user, "User registered successfully");
  })
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.getUserById(req.user!.id);

    return sendSuccessResponse(res, user, "User profile retrieved");
  })
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change user password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmNewPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Invalid current password
 */
router.post(
  "/change-password",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = changePasswordRequestSchema.parse(req.body);

    await authService.changePassword(req.user!.id, validatedData, req.ip);

    return sendSuccessResponse(res, null, "Password changed successfully");
  })
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: User logout
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // In a full implementation, you might want to blacklist the token
    // For now, we'll just return success as the client will discard the token

    return sendSuccessResponse(res, null, "Logout successful");
  })
);

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     tags: [User Management]
 *     summary: List all users in organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [staff, admin, super_admin]
 *         description: Filter by user role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of users to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of users to skip
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  "/users",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const users = await authService.listUsers(
      req.user!.organizationId,
      req.user!.id
    );

    // Apply query filters
    let filteredUsers = users;

    if (req.query.role) {
      filteredUsers = filteredUsers.filter(
        (user) => user.role === req.query.role
      );
    }

    if (req.query.isActive !== undefined) {
      const isActive = req.query.isActive === "true";
      filteredUsers = filteredUsers.filter(
        (user) => user.isActive === isActive
      );
    }

    // Apply pagination
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const paginatedUsers = filteredUsers.slice(offset, offset + limit);

    return sendSuccessResponse(
      res,
      {
        users: paginatedUsers,
        total: filteredUsers.length,
        limit,
        offset,
      },
      "Users retrieved successfully"
    );
  })
);

/**
 * @swagger
 * /api/auth/users:
 *   post:
 *     tags: [User Management]
 *     summary: Create a new user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [staff, admin, super_admin]
 *               permissions:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: User created successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/users",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createUserRequestSchema.parse(req.body);

    const user = await authService.createUser(validatedData, req.user!.id);

    return sendCreatedResponse(res, user, "User created successfully");
  })
);

/**
 * @swagger
 * /api/auth/users/{userId}:
 *   get:
 *     tags: [User Management]
 *     summary: Get user by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get(
  "/users/:userId",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    // Users can only view their own profile unless they're admin
    if (
      userId !== req.user!.id &&
      req.user!.role !== UserRole.admin &&
      req.user!.role !== UserRole.super_admin
    ) {
      throw new AppError("Insufficient permissions", 403);
    }

    const user = await authService.getUserById(userId);

    return sendSuccessResponse(res, user, "User retrieved successfully");
  })
);

/**
 * @swagger
 * /api/auth/users/{userId}:
 *   patch:
 *     tags: [User Management]
 *     summary: Update user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [staff, admin, super_admin]
 *               permissions:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Insufficient permissions
 */
router.patch(
  "/users/:userId",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const validatedData = updateUserRequestSchema.parse(req.body);

    const user = await authService.updateUser(
      userId,
      validatedData,
      req.user!.id
    );

    return sendSuccessResponse(res, user, "User updated successfully");
  })
);

/**
 * @swagger
 * /api/auth/users/{userId}/deactivate:
 *   post:
 *     tags: [User Management]
 *     summary: Deactivate user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/users/:userId/deactivate",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    await authService.deactivateUser(userId, req.user!.id);

    return sendSuccessResponse(res, null, "User deactivated successfully");
  })
);

/**
 * @swagger
 * /api/auth/users/{userId}/ban:
 *   post:
 *     tags: [User Management]
 *     summary: Ban user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User banned successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/users/:userId/ban",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    await authService.deactivateUser(userId, req.user!.id);

    return sendSuccessResponse(res, null, "User banned successfully");
  })
);

/**
 * @swagger
 * /api/auth/users/{userId}/reactivate:
 *   post:
 *     tags: [User Management]
 *     summary: Reactivate user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User reactivated successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/users/:userId/reactivate",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    await authService.reactivateUser(userId, req.user!.id);

    return sendSuccessResponse(res, null, "User reactivated successfully");
  })
);

/**
 * @swagger
 * /api/auth/users/{userId}/reset-password:
 *   post:
 *     tags: [User Management]
 *     summary: Reset user password
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/users/:userId/reset-password",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    await authService.resetUserPassword(userId, req.user!.id);

    return sendSuccessResponse(res, null, "Password reset email sent successfully");
  })
);

/**
 * @swagger
 * /api/auth/users/{userId}:
 *   delete:
 *     tags: [User Management]
 *     summary: Delete user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Insufficient permissions
 */
router.delete(
  "/users/:userId",
  authenticate,
  authorize([UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    await authService.deleteUser(userId, req.user!.id);

    return sendSuccessResponse(res, null, "User deleted successfully");
  })
);

export { router as authRouter };
