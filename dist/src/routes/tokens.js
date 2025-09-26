"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokensRouter = void 0;
const express_1 = require("express");
const tokenService_1 = require("@/services/tokenService");
const auth_1 = require("@/middleware/auth");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const errorHandler_1 = require("@/middleware/errorHandler");
const tokenSchemas_1 = require("@/schemas/tokenSchemas");
const errors_1 = require("@/utils/errors");
const client_1 = require("@prisma/client");
const app_1 = require("@/app");
const router = (0, express_1.Router)();
exports.tokensRouter = router;
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
router.post("/public", rateLimiter_1.tokenCreationLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Get the default organization
    const defaultOrg = await app_1.prisma.organization.findFirst({
        where: { name: "Default Organization" },
    });
    if (!defaultOrg) {
        throw new errors_1.AppError("Default organization not found", 500);
    }
    const validatedData = tokenSchemas_1.createTokenRequestSchema.parse(req.body);
    const token = await tokenService_1.tokenService.createToken(validatedData, defaultOrg.id, undefined // No user ID for public tokens
    );
    res.status(201).json({
        success: true,
        message: "Token created successfully",
        data: token,
    });
}));
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
router.post("/", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), rateLimiter_1.tokenCreationLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = tokenSchemas_1.createTokenRequestSchema.parse(req.body);
    const token = await tokenService_1.tokenService.createToken(validatedData, req.user.organizationId, req.user.id);
    res.status(201).json({
        success: true,
        message: "Token created successfully",
        data: token,
    });
}));
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
router.get("/", auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const query = tokenSchemas_1.getTokensQuerySchema.parse(req.query);
    // Build where clause
    const whereClause = {
        organizationId: req.user.organizationId,
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
        app_1.prisma.token.findMany({
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
        app_1.prisma.token.count({ where: whereClause }),
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
}));
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
router.get("/:tokenId", auth_1.optionalAuth, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { tokenId } = req.params;
    const whereClause = { id: tokenId };
    if (req.user) {
        whereClause.organizationId = req.user.organizationId;
    }
    const token = await app_1.prisma.token.findFirst({
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
        throw new errors_1.AppError("Token not found", 404);
    }
    res.json({
        success: true,
        message: "Token retrieved successfully",
        data: token,
    });
}));
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
router.patch("/:tokenId", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { tokenId } = req.params;
    const validatedData = tokenSchemas_1.updateTokenRequestSchema.parse(req.body);
    // Check if token exists and belongs to organization
    const existingToken = await app_1.prisma.token.findFirst({
        where: {
            id: tokenId,
            organizationId: req.user.organizationId,
        },
    });
    if (!existingToken) {
        throw new errors_1.AppError("Token not found", 404);
    }
    // Update token
    const updatedToken = await app_1.prisma.token.update({
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
    await app_1.prisma.systemLog.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
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
}));
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
router.post("/:tokenId/cancel", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { tokenId } = req.params;
    const validatedData = tokenSchemas_1.cancelTokenRequestSchema.parse({
        ...req.body,
        tokenId,
        staffId: req.user.id,
    });
    // Check if token exists and can be cancelled
    const token = await app_1.prisma.token.findFirst({
        where: {
            id: tokenId,
            organizationId: req.user.organizationId,
            status: { in: [client_1.TokenStatus.waiting, client_1.TokenStatus.called] },
        },
    });
    if (!token) {
        throw new errors_1.AppError("Token not found or cannot be cancelled", 404);
    }
    // Cancel the token
    const cancelledToken = await app_1.prisma.token.update({
        where: { id: tokenId },
        data: {
            status: client_1.TokenStatus.cancelled,
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
    await app_1.prisma.systemLog.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
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
}));
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
router.post("/bulk/update", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = tokenSchemas_1.bulkUpdateTokensSchema.parse({
        ...req.body,
        staffId: req.user.id,
    });
    // Verify all tokens belong to the organization
    const tokens = await app_1.prisma.token.findMany({
        where: {
            id: { in: validatedData.tokenIds },
            organizationId: req.user.organizationId,
        },
    });
    if (tokens.length !== validatedData.tokenIds.length) {
        throw new errors_1.AppError("Some tokens not found or do not belong to organization", 400);
    }
    // Perform bulk update
    const updatedTokens = await app_1.prisma.token.updateMany({
        where: {
            id: { in: validatedData.tokenIds },
            organizationId: req.user.organizationId,
        },
        data: validatedData.updates,
    });
    // Log the bulk update
    await app_1.prisma.systemLog.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
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
}));
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
router.post("/bulk/delete", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = tokenSchemas_1.bulkDeleteTokensSchema.parse({
        ...req.body,
        staffId: req.user.id,
    });
    // Verify all tokens belong to the organization
    const tokens = await app_1.prisma.token.findMany({
        where: {
            id: { in: validatedData.tokenIds },
            organizationId: req.user.organizationId,
        },
        select: { id: true, number: true },
    });
    if (tokens.length !== validatedData.tokenIds.length) {
        throw new errors_1.AppError("Some tokens not found or do not belong to organization", 400);
    }
    // Perform soft delete (mark as cancelled)
    const deletedTokens = await app_1.prisma.token.updateMany({
        where: {
            id: { in: validatedData.tokenIds },
            organizationId: req.user.organizationId,
        },
        data: {
            status: client_1.TokenStatus.cancelled,
            cancelledAt: new Date(),
            notes: validatedData.reason,
        },
    });
    // Log the bulk deletion
    await app_1.prisma.systemLog.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
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
}));
//# sourceMappingURL=tokens.js.map