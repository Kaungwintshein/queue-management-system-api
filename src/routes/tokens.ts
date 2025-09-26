import { Router, Response } from "express";
import { tokenService } from "@/services/tokenService";
import {
  authenticate,
  authorize,
  AuthRequest,
  optionalAuth,
} from "@/middleware/auth";
import { tokenCreationLimiter } from "@/middleware/rateLimiter";
import { asyncHandler } from "@/middleware/errorHandler";
import {
  createTokenRequestSchema,
  updateTokenRequestSchema,
  getTokensQuerySchema,
  cancelTokenRequestSchema,
  bulkUpdateTokensSchema,
  bulkDeleteTokensSchema,
} from "@/schemas/tokenSchemas";
import { AppError } from "@/utils/errors";
import { UserRole, TokenStatus } from "@prisma/client";
import { prisma } from "@/app";

const router = Router();

/**
 * @swagger
 * /api/tokens/public:
 *   post:
 *     tags: [Tokens]
 *     summary: Create a new token (public endpoint)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerType
 *             properties:
 *               customerType:
 *                 type: string
 *                 enum: [instant, browser, retail]
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 3
 *               notes:
 *                 type: string
 *                 description: Optional notes for the token
 *     responses:
 *       201:
 *         description: Token created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       $ref: '#/components/schemas/Token'
 *                     position:
 *                       type: integer
 *                       description: Position in queue
 *                     estimatedWaitTime:
 *                       type: integer
 *                       description: Estimated wait time in minutes
 *       400:
 *         description: Invalid request data
 */
router.post(
  "/public",
  tokenCreationLimiter,
  asyncHandler(async (req: any, res: Response) => {
    // Get the default organization
    const defaultOrg = await prisma.organization.findFirst({
      where: { name: "Default Organization" },
    });

    if (!defaultOrg) {
      throw new AppError("Default organization not found", 500);
    }

    const validatedData = createTokenRequestSchema.parse(req.body);

    const token = await tokenService.createToken(
      validatedData,
      defaultOrg.id,
      undefined // No user ID for public tokens
    );

    res.status(201).json({
      success: true,
      message: "Token created successfully",
      data: token,
    });
  })
);

/**
 * @swagger
 * /api/tokens:
 *   post:
 *     tags: [Tokens]
 *     summary: Create a new token (authenticated)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerType
 *             properties:
 *               customerType:
 *                 type: string
 *                 enum: [instant, browser, retail]
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *               counterId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Token created successfully
 *       400:
 *         description: Invalid request data
 */
router.post(
  "/",
  authenticate,
  authorize([UserRole.staff, UserRole.admin, UserRole.super_admin]),
  tokenCreationLimiter,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createTokenRequestSchema.parse(req.body);

    const token = await tokenService.createToken(
      validatedData,
      req.user!.organizationId,
      req.user!.id
    );

    res.status(201).json({
      success: true,
      message: "Token created successfully",
      data: token,
    });
  })
);

/**
 * @swagger
 * /api/tokens:
 *   get:
 *     tags: [Tokens]
 *     summary: Get tokens with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [waiting, called, serving, completed, cancelled, no_show]
 *         description: Filter by token status
 *       - in: query
 *         name: customerType
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [instant, browser, retail]
 *         description: Filter by customer type
 *       - in: query
 *         name: counterId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by counter ID
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by staff ID
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter from date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter to date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of tokens to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of tokens to skip
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, calledAt, completedAt, priority]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Tokens retrieved successfully
 */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const query = getTokensQuerySchema.parse(req.query);

    // Build where clause
    const whereClause: any = {
      organizationId: req.user!.organizationId,
    };

    if (query.status && query.status.length > 0) {
      whereClause.status = { in: query.status };
    }

    if (query.customerType && query.customerType.length > 0) {
      whereClause.customerType = { in: query.customerType };
    }

    if (query.counterId) {
      whereClause.counterId = query.counterId;
    }

    if (query.staffId) {
      whereClause.servedBy = query.staffId;
    }

    if (query.fromDate || query.toDate) {
      whereClause.createdAt = {};
      if (query.fromDate) {
        whereClause.createdAt.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        whereClause.createdAt.lte = new Date(query.toDate);
      }
    }

    // Get tokens with pagination and sorting
    const [tokens, total] = await Promise.all([
      prisma.token.findMany({
        where: whereClause,
        include: {
          counter: {
            select: {
              id: true,
              name: true,
            },
          },
          staff: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.token.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      message: "Tokens retrieved successfully",
      data: {
        tokens,
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < total,
        },
      },
    });
  })
);

/**
 * @swagger
 * /api/tokens/{tokenId}:
 *   get:
 *     tags: [Tokens]
 *     summary: Get token by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Token retrieved successfully
 *       404:
 *         description: Token not found
 */
router.get(
  "/:tokenId",
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tokenId } = req.params;

    const whereClause: any = { id: tokenId };
    if (req.user) {
      whereClause.organizationId = req.user.organizationId;
    }

    const token = await prisma.token.findFirst({
      where: whereClause,
      include: {
        counter: {
          select: {
            id: true,
            name: true,
          },
        },
        staff: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!token) {
      throw new AppError("Token not found", 404);
    }

    res.json({
      success: true,
      message: "Token retrieved successfully",
      data: token,
    });
  })
);

/**
 * @swagger
 * /api/tokens/{tokenId}:
 *   patch:
 *     tags: [Tokens]
 *     summary: Update token
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
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
 *               status:
 *                 type: string
 *                 enum: [waiting, called, serving, completed, cancelled, no_show]
 *               priority:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *               counterId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Token updated successfully
 *       404:
 *         description: Token not found
 */
router.patch(
  "/:tokenId",
  authenticate,
  authorize([UserRole.staff, UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tokenId } = req.params;
    const validatedData = updateTokenRequestSchema.parse(req.body);

    // Check if token exists and belongs to organization
    const existingToken = await prisma.token.findFirst({
      where: {
        id: tokenId,
        organizationId: req.user!.organizationId,
      },
    });

    if (!existingToken) {
      throw new AppError("Token not found", 404);
    }

    // Update token
    const updatedToken = await prisma.token.update({
      where: { id: tokenId },
      data: {
        ...validatedData,
        ...(validatedData.status && {
          [`${validatedData.status}At`]: new Date(),
        }),
      },
      include: {
        counter: {
          select: {
            id: true,
            name: true,
          },
        },
        staff: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Log the update
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "token_updated",
        entityType: "token",
        entityId: tokenId,
        details: {
          changes: validatedData,
          tokenNumber: existingToken.number,
        },
      },
    });

    res.json({
      success: true,
      message: "Token updated successfully",
      data: updatedToken,
    });
  })
);

/**
 * @swagger
 * /api/tokens/{tokenId}/cancel:
 *   post:
 *     tags: [Tokens]
 *     summary: Cancel token
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tokenId
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
 *               reason:
 *                 type: string
 *               staffId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Token cancelled successfully
 *       404:
 *         description: Token not found
 */
router.post(
  "/:tokenId/cancel",
  authenticate,
  authorize([UserRole.staff, UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { tokenId } = req.params;
    const validatedData = cancelTokenRequestSchema.parse({
      ...req.body,
      tokenId,
      staffId: req.user!.id,
    });

    // Check if token exists and can be cancelled
    const token = await prisma.token.findFirst({
      where: {
        id: tokenId,
        organizationId: req.user!.organizationId,
        status: { in: [TokenStatus.waiting, TokenStatus.called] },
      },
    });

    if (!token) {
      throw new AppError("Token not found or cannot be cancelled", 404);
    }

    // Cancel the token
    const cancelledToken = await prisma.token.update({
      where: { id: tokenId },
      data: {
        status: TokenStatus.cancelled,
        cancelledAt: new Date(),
        notes: validatedData.reason || token.notes,
      },
      include: {
        counter: {
          select: {
            id: true,
            name: true,
          },
        },
        staff: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Log the cancellation
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "token_cancelled",
        entityType: "token",
        entityId: tokenId,
        details: {
          reason: validatedData.reason,
          tokenNumber: token.number,
        },
      },
    });

    res.json({
      success: true,
      message: "Token cancelled successfully",
      data: cancelledToken,
    });
  })
);

/**
 * @swagger
 * /api/tokens/bulk/update:
 *   post:
 *     tags: [Tokens]
 *     summary: Bulk update tokens
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenIds
 *               - updates
 *               - staffId
 *             properties:
 *               tokenIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 50
 *               updates:
 *                 type: object
 *               staffId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Tokens updated successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/bulk/update",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = bulkUpdateTokensSchema.parse({
      ...req.body,
      staffId: req.user!.id,
    });

    // Verify all tokens belong to the organization
    const tokens = await prisma.token.findMany({
      where: {
        id: { in: validatedData.tokenIds },
        organizationId: req.user!.organizationId,
      },
    });

    if (tokens.length !== validatedData.tokenIds.length) {
      throw new AppError(
        "Some tokens not found or do not belong to organization",
        400
      );
    }

    // Perform bulk update
    const updatedTokens = await prisma.token.updateMany({
      where: {
        id: { in: validatedData.tokenIds },
        organizationId: req.user!.organizationId,
      },
      data: validatedData.updates,
    });

    // Log the bulk update
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "tokens_bulk_updated",
        entityType: "token",
        details: {
          tokenIds: validatedData.tokenIds,
          updates: validatedData.updates,
          count: updatedTokens.count,
        },
      },
    });

    res.json({
      success: true,
      message: `${updatedTokens.count} tokens updated successfully`,
      data: { updatedCount: updatedTokens.count },
    });
  })
);

/**
 * @swagger
 * /api/tokens/bulk/delete:
 *   post:
 *     tags: [Tokens]
 *     summary: Bulk delete tokens
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenIds
 *               - staffId
 *             properties:
 *               tokenIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 50
 *               reason:
 *                 type: string
 *               staffId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Tokens deleted successfully
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/bulk/delete",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = bulkDeleteTokensSchema.parse({
      ...req.body,
      staffId: req.user!.id,
    });

    // Verify all tokens belong to the organization
    const tokens = await prisma.token.findMany({
      where: {
        id: { in: validatedData.tokenIds },
        organizationId: req.user!.organizationId,
      },
      select: { id: true, number: true },
    });

    if (tokens.length !== validatedData.tokenIds.length) {
      throw new AppError(
        "Some tokens not found or do not belong to organization",
        400
      );
    }

    // Perform soft delete (mark as cancelled)
    const deletedTokens = await prisma.token.updateMany({
      where: {
        id: { in: validatedData.tokenIds },
        organizationId: req.user!.organizationId,
      },
      data: {
        status: TokenStatus.cancelled,
        cancelledAt: new Date(),
        notes: validatedData.reason,
      },
    });

    // Log the bulk deletion
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "tokens_bulk_deleted",
        entityType: "token",
        details: {
          tokenIds: validatedData.tokenIds,
          tokenNumbers: tokens.map((t) => t.number),
          reason: validatedData.reason,
          count: deletedTokens.count,
        },
      },
    });

    res.json({
      success: true,
      message: `${deletedTokens.count} tokens deleted successfully`,
      data: { deletedCount: deletedTokens.count },
    });
  })
);

export { router as tokensRouter };
