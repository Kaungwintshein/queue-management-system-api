"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueRouter = void 0;
const express_1 = require("express");
const tokenService_1 = require("@/services/tokenService");
const auth_1 = require("@/middleware/auth");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const errorHandler_1 = require("@/middleware/errorHandler");
const response_1 = require("@/utils/response");
const tokenSchemas_1 = require("@/schemas/tokenSchemas");
const client_1 = require("@prisma/client");
const app_1 = require("@/app");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
exports.queueRouter = router;
/**
 * @swagger
 * /api/queue/status:
 *   get:
 *     tags: [Queue Management]
 *     summary: Get current queue status
 *     parameters:
 *       - in: query
 *         name: counterId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific counter
 *     responses:
 *       200:
 *         description: Queue status retrieved successfully
 */
router.get("/status", auth_1.optionalAuth, rateLimiter_1.queueStatusLimiter, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { counterId } = req.query;
    // For unauthenticated requests (display interface), we need to determine organization
    let organizationId = req.user?.organizationId;
    if (!organizationId) {
        // If no auth and no organization specified, get default or first organization
        const defaultOrg = await app_1.prisma.organization.findFirst({
            orderBy: { createdAt: "asc" },
        });
        if (!defaultOrg) {
            return (0, response_1.sendSuccessResponse)(res, {
                currentServing: [],
                nextInQueue: [],
                recentlyServed: [],
                noShowQueue: [],
                stats: {
                    totalWaiting: 0,
                    totalServing: 0,
                    totalCompleted: 0,
                    totalNoShow: 0,
                    averageWaitTime: 0,
                    averageServiceTime: 0,
                    estimatedWaitTime: 0,
                },
                counterStats: [],
            }, "No queue data available");
        }
        organizationId = defaultOrg.id;
    }
    const queueStatus = await tokenService_1.tokenService.getQueueStatus(organizationId, counterId);
    (0, response_1.sendSuccessResponse)(res, queueStatus, "Queue status retrieved successfully");
}));
/**
 * @swagger
 * /api/queue/call-next:
 *   post:
 *     tags: [Queue Management]
 *     summary: Call next token in queue
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - counterId
 *               - staffId
 *             properties:
 *               customerType:
 *                 type: string
 *                 enum: [instant, browser, retail]
 *                 description: Filter by customer type (optional)
 *               counterId:
 *                 type: string
 *                 format: uuid
 *               staffId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Next token called successfully
 *       404:
 *         description: No tokens in queue
 */
router.post("/call-next", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = tokenSchemas_1.callNextRequestSchema.parse({
        ...req.body,
        staffId: req.user.id,
    });
    const token = await tokenService_1.tokenService.callNextToken(validatedData, req.user.organizationId);
    (0, response_1.sendSuccessResponse)(res, token, "Next token called successfully");
}));
/**
 * @swagger
 * /api/queue/start-serving:
 *   post:
 *     tags: [Queue Management]
 *     summary: Start serving a called token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *             properties:
 *               tokenId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Service started successfully
 *       404:
 *         description: Token not found or not in called status
 */
router.post("/start-serving", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { tokenId } = req.body;
    if (!tokenId) {
        return (0, response_1.sendBadRequestResponse)(res, "Token ID is required");
    }
    const token = await tokenService_1.tokenService.startServing({ tokenId, staffId: req.user.id }, req.user.organizationId);
    (0, response_1.sendSuccessResponse)(res, token, "Service started successfully");
}));
/**
 * @swagger
 * /api/queue/complete-service:
 *   post:
 *     tags: [Queue Management]
 *     summary: Complete service for a token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *               - staffId
 *             properties:
 *               tokenId:
 *                 type: string
 *                 format: uuid
 *               staffId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               serviceDuration:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Service completed successfully
 *       404:
 *         description: Token not found or not in serviceable state
 */
router.post("/complete-service", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = tokenSchemas_1.completeServiceRequestSchema.parse({
        ...req.body,
        staffId: req.user.id,
    });
    const token = await tokenService_1.tokenService.completeService(validatedData, req.user.organizationId);
    (0, response_1.sendSuccessResponse)(res, token, "Service completed successfully");
}));
/**
 * @swagger
 * /api/queue/mark-no-show:
 *   post:
 *     tags: [Queue Management]
 *     summary: Mark token as no-show
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *               - staffId
 *             properties:
 *               tokenId:
 *                 type: string
 *                 format: uuid
 *               staffId:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token marked as no-show successfully
 *       404:
 *         description: Token not found
 */
router.post("/mark-no-show", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = tokenSchemas_1.markNoShowRequestSchema.parse({
        ...req.body,
        staffId: req.user.id,
    });
    const token = await tokenService_1.tokenService.markNoShow(validatedData, req.user.organizationId);
    (0, response_1.sendSuccessResponse)(res, token, "Token marked as no-show successfully");
}));
/**
 * @swagger
 * /api/queue/recall-token:
 *   post:
 *     tags: [Queue Management]
 *     summary: Recall a no-show token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *               - counterId
 *               - staffId
 *             properties:
 *               tokenId:
 *                 type: string
 *                 format: uuid
 *               counterId:
 *                 type: string
 *                 format: uuid
 *               staffId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Token recalled successfully
 *       404:
 *         description: Token not found or not in no-show state
 */
router.post("/recall-token", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = tokenSchemas_1.recallTokenRequestSchema.parse({
        ...req.body,
        staffId: req.user.id,
    });
    const token = await tokenService_1.tokenService.recallToken(validatedData, req.user.organizationId);
    (0, response_1.sendSuccessResponse)(res, token, "Token recalled successfully");
}));
/**
 * @swagger
 * /api/queue/repeat-announce-token:
 *   post:
 *     tags: [Queue Management]
 *     summary: Repeat announcement for a token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *               - counterId
 *               - staffId
 *             properties:
 *               tokenId:
 *                 type: string
 *                 format: uuid
 *               counterId:
 *                 type: string
 *                 format: uuid
 *               staffId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Token announcement repeated successfully
 *       404:
 *         description: Token not found
 */
router.post("/repeat-announce-token", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { tokenId, counterId } = req.body;
    if (!tokenId || !counterId) {
        return (0, response_1.sendBadRequestResponse)(res, "Token ID and Counter ID are required");
    }
    const token = await tokenService_1.tokenService.repeatAnnounceToken({ tokenId, counterId, staffId: req.user.id }, req.user.organizationId);
    (0, response_1.sendSuccessResponse)(res, token, "Token announcement repeated successfully");
}));
/**
 * @swagger
 * /api/queue/settings:
 *   get:
 *     tags: [Queue Management]
 *     summary: Get queue settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue settings retrieved successfully
 */
router.get("/settings", auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const settings = await app_1.prisma.queueSetting.findMany({
        where: {
            organizationId: req.user.organizationId,
        },
        orderBy: { customerType: "asc" },
    });
    // Group by customer type for easier frontend consumption
    const settingsByType = settings.reduce((acc, setting) => {
        acc[setting.customerType] = {
            id: setting.id,
            prefix: setting.prefix,
            currentNumber: setting.currentNumber,
            maxNumber: setting.maxNumber,
            resetDaily: setting.resetDaily,
            resetTime: setting.resetTime,
            isActive: setting.isActive,
            priorityMultiplier: setting.priorityMultiplier.toNumber(),
        };
        return acc;
    }, {});
    (0, response_1.sendSuccessResponse)(res, settingsByType, "Queue settings retrieved successfully");
}));
/**
 * @swagger
 * /api/queue/settings:
 *   patch:
 *     tags: [Queue Management]
 *     summary: Update queue settings
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
 *               prefix:
 *                 type: string
 *                 maxLength: 5
 *               maxNumber:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 9999
 *               resetDaily:
 *                 type: boolean
 *               resetTime:
 *                 type: string
 *                 pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"
 *               isActive:
 *                 type: boolean
 *               priorityMultiplier:
 *                 type: number
 *                 minimum: 0.1
 *                 maximum: 10.0
 *     responses:
 *       200:
 *         description: Queue settings updated successfully
 *       403:
 *         description: Insufficient permissions
 */
const updateQueueSettingsSchema = zod_1.z.object({
    customerType: zod_1.z.enum(["instant", "browser", "retail"]),
    prefix: zod_1.z.string().max(5).optional(),
    maxNumber: zod_1.z.number().int().min(1).max(9999).optional(),
    resetDaily: zod_1.z.boolean().optional(),
    resetTime: zod_1.z
        .string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
        .optional(),
    isActive: zod_1.z.boolean().optional(),
    priorityMultiplier: zod_1.z.number().min(0.1).max(10.0).optional(),
});
router.patch("/settings", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = updateQueueSettingsSchema.parse(req.body);
    // Find existing setting or create new one
    const existingSetting = await app_1.prisma.queueSetting.findFirst({
        where: {
            organizationId: req.user.organizationId,
            customerType: validatedData.customerType,
        },
    });
    let updatedSetting;
    if (existingSetting) {
        updatedSetting = await app_1.prisma.queueSetting.update({
            where: { id: existingSetting.id },
            data: {
                ...(validatedData.prefix && { prefix: validatedData.prefix }),
                ...(validatedData.maxNumber && {
                    maxNumber: validatedData.maxNumber,
                }),
                ...(validatedData.resetDaily !== undefined && {
                    resetDaily: validatedData.resetDaily,
                }),
                ...(validatedData.resetTime && {
                    resetTime: validatedData.resetTime,
                }),
                ...(validatedData.isActive !== undefined && {
                    isActive: validatedData.isActive,
                }),
                ...(validatedData.priorityMultiplier && {
                    priorityMultiplier: validatedData.priorityMultiplier,
                }),
            },
        });
    }
    else {
        // Create new setting with defaults
        updatedSetting = await app_1.prisma.queueSetting.create({
            data: {
                organizationId: req.user.organizationId,
                customerType: validatedData.customerType,
                prefix: validatedData.prefix ||
                    validatedData.customerType.charAt(0).toUpperCase(),
                maxNumber: validatedData.maxNumber || 999,
                resetDaily: validatedData.resetDaily ?? true,
                resetTime: validatedData.resetTime || "00:00:00",
                isActive: validatedData.isActive ?? true,
                priorityMultiplier: validatedData.priorityMultiplier || 1.0,
                currentNumber: 0,
            },
        });
    }
    // Log the settings update
    await app_1.prisma.systemLog.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
            action: "queue_settings_updated",
            entityType: "queue_setting",
            entityId: updatedSetting.id,
            details: {
                customerType: validatedData.customerType,
                changes: validatedData,
            },
        },
    });
    (0, response_1.sendSuccessResponse)(res, {
        id: updatedSetting.id,
        customerType: updatedSetting.customerType,
        prefix: updatedSetting.prefix,
        currentNumber: updatedSetting.currentNumber,
        maxNumber: updatedSetting.maxNumber,
        resetDaily: updatedSetting.resetDaily,
        resetTime: updatedSetting.resetTime,
        isActive: updatedSetting.isActive,
        priorityMultiplier: updatedSetting.priorityMultiplier.toNumber(),
    }, "Queue settings updated successfully");
}));
/**
 * @swagger
 * /api/queue/reset:
 *   post:
 *     tags: [Queue Management]
 *     summary: Reset queue numbers for a customer type
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
 *     responses:
 *       200:
 *         description: Queue reset successfully
 *       403:
 *         description: Insufficient permissions
 */
const resetQueueSchema = zod_1.z.object({
    customerType: zod_1.z.enum(["instant", "browser", "retail"]),
});
router.post("/reset", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = resetQueueSchema.parse(req.body);
    const updatedSetting = await app_1.prisma.queueSetting.update({
        where: {
            organizationId_customerType: {
                organizationId: req.user.organizationId,
                customerType: validatedData.customerType,
            },
        },
        data: {
            currentNumber: 0,
        },
    });
    // Log the queue reset
    await app_1.prisma.systemLog.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
            action: "queue_reset",
            entityType: "queue_setting",
            entityId: updatedSetting.id,
            details: {
                customerType: validatedData.customerType,
            },
        },
    });
    (0, response_1.sendSuccessResponse)(res, {
        customerType: updatedSetting.customerType,
        currentNumber: updatedSetting.currentNumber,
    }, "Queue reset successfully");
}));
/**
 * @swagger
 * /api/queue/statistics:
 *   get:
 *     tags: [Queue Management]
 *     summary: Get queue statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *       - in: query
 *         name: counterId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by counter
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get("/statistics", auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { fromDate, toDate, counterId } = req.query;
    // Default to today if no dates provided
    const startDate = fromDate ? new Date(fromDate) : new Date();
    const endDate = toDate ? new Date(toDate) : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const whereClause = {
        organizationId: req.user.organizationId,
        createdAt: {
            gte: startDate,
            lte: endDate,
        },
    };
    if (counterId) {
        whereClause.counterId = counterId;
    }
    const [totalTokens, completedTokens, averageWaitTime, averageServiceTime, tokensByType, tokensByHour,] = await Promise.all([
        app_1.prisma.token.count({ where: whereClause }),
        app_1.prisma.token.count({
            where: { ...whereClause, status: "completed" },
        }),
        app_1.prisma.token.aggregate({
            where: {
                ...whereClause,
                status: "completed",
                actualWaitTime: { not: null },
            },
            _avg: { actualWaitTime: true },
        }),
        app_1.prisma.token.aggregate({
            where: {
                ...whereClause,
                status: "completed",
                serviceDuration: { not: null },
            },
            _avg: { serviceDuration: true },
        }),
        app_1.prisma.token.groupBy({
            by: ["customerType"],
            where: whereClause,
            _count: { _all: true },
        }),
        app_1.prisma.$queryRaw `
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM tokens 
        WHERE organization_id = ${req.user.organizationId}
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
        ${counterId ? `AND counter_id = ${counterId}` : ""}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `,
    ]);
    const statistics = {
        period: {
            fromDate: startDate.toISOString(),
            toDate: endDate.toISOString(),
        },
        totals: {
            totalTokens,
            completedTokens,
            pendingTokens: totalTokens - completedTokens,
            completionRate: totalTokens > 0 ? (completedTokens / totalTokens) * 100 : 0,
        },
        averages: {
            waitTime: Math.round(averageWaitTime._avg.actualWaitTime || 0),
            serviceTime: Math.round(averageServiceTime._avg.serviceDuration || 0),
        },
        breakdown: {
            byType: tokensByType.reduce((acc, item) => {
                acc[item.customerType] = item._count._all;
                return acc;
            }, {}),
            byHour: tokensByHour,
        },
    };
    (0, response_1.sendSuccessResponse)(res, statistics, "Statistics retrieved successfully");
}));
//# sourceMappingURL=queue.js.map