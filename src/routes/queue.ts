import { Router, Response } from "express";
import { tokenService } from "@/services/tokenService";
import {
  authenticate,
  authorize,
  AuthRequest,
  optionalAuth,
} from "@/middleware/auth";
import { queueStatusLimiter } from "@/middleware/rateLimiter";
import { asyncHandler } from "@/middleware/errorHandler";
import {
  callNextRequestSchema,
  completeServiceRequestSchema,
  markNoShowRequestSchema,
  recallTokenRequestSchema,
} from "@/schemas/tokenSchemas";
import { UserRole } from "@prisma/client";
import { prisma } from "@/app";
import { z } from "zod";

const router = Router();

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
router.get(
  "/status",
  optionalAuth,
  queueStatusLimiter,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.query as { counterId?: string };

    // For unauthenticated requests (display interface), we need to determine organization
    let organizationId = req.user?.organizationId;

    if (!organizationId) {
      // If no auth and no organization specified, get default or first organization
      const defaultOrg = await prisma.organization.findFirst({
        orderBy: { createdAt: "asc" },
      });

      if (!defaultOrg) {
        return res.json({
          success: true,
          message: "No queue data available",
          data: {
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
          },
        });
      }

      organizationId = defaultOrg.id;
    }

    const queueStatus = await tokenService.getQueueStatus(
      organizationId,
      counterId
    );

    res.json({
      success: true,
      message: "Queue status retrieved successfully",
      data: queueStatus,
    });
  })
);

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
router.post(
  "/call-next",
  authenticate,
  authorize([UserRole.staff, UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = callNextRequestSchema.parse({
      ...req.body,
      staffId: req.user!.id,
    });

    const token = await tokenService.callNextToken(
      validatedData,
      req.user!.organizationId
    );

    res.json({
      success: true,
      message: "Next token called successfully",
      data: token,
    });
  })
);

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
router.post(
  "/complete-service",
  authenticate,
  authorize([UserRole.staff, UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = completeServiceRequestSchema.parse({
      ...req.body,
      staffId: req.user!.id,
    });

    const token = await tokenService.completeService(
      validatedData,
      req.user!.organizationId
    );

    res.json({
      success: true,
      message: "Service completed successfully",
      data: token,
    });
  })
);

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
router.post(
  "/mark-no-show",
  authenticate,
  authorize([UserRole.staff, UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = markNoShowRequestSchema.parse({
      ...req.body,
      staffId: req.user!.id,
    });

    const token = await tokenService.markNoShow(
      validatedData,
      req.user!.organizationId
    );

    res.json({
      success: true,
      message: "Token marked as no-show successfully",
      data: token,
    });
  })
);

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
router.post(
  "/recall-token",
  authenticate,
  authorize([UserRole.staff, UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = recallTokenRequestSchema.parse({
      ...req.body,
      staffId: req.user!.id,
    });

    const token = await tokenService.recallToken(
      validatedData,
      req.user!.organizationId
    );

    res.json({
      success: true,
      message: "Token recalled successfully",
      data: token,
    });
  })
);

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
router.get(
  "/settings",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const settings = await prisma.queueSetting.findMany({
      where: {
        organizationId: req.user!.organizationId,
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
    }, {} as Record<string, any>);

    res.json({
      success: true,
      message: "Queue settings retrieved successfully",
      data: settingsByType,
    });
  })
);

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
const updateQueueSettingsSchema = z.object({
  customerType: z.enum(["instant", "browser", "retail"]),
  prefix: z.string().max(5).optional(),
  maxNumber: z.number().int().min(1).max(9999).optional(),
  resetDaily: z.boolean().optional(),
  resetTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .optional(),
  isActive: z.boolean().optional(),
  priorityMultiplier: z.number().min(0.1).max(10.0).optional(),
});

router.patch(
  "/settings",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = updateQueueSettingsSchema.parse(req.body);

    // Find existing setting or create new one
    const existingSetting = await prisma.queueSetting.findFirst({
      where: {
        organizationId: req.user!.organizationId,
        customerType: validatedData.customerType,
      },
    });

    let updatedSetting;

    if (existingSetting) {
      updatedSetting = await prisma.queueSetting.update({
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
    } else {
      // Create new setting with defaults
      updatedSetting = await prisma.queueSetting.create({
        data: {
          organizationId: req.user!.organizationId,
          customerType: validatedData.customerType,
          prefix:
            validatedData.prefix ||
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
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "queue_settings_updated",
        entityType: "queue_setting",
        entityId: updatedSetting.id,
        details: {
          customerType: validatedData.customerType,
          changes: validatedData,
        },
      },
    });

    res.json({
      success: true,
      message: "Queue settings updated successfully",
      data: {
        id: updatedSetting.id,
        customerType: updatedSetting.customerType,
        prefix: updatedSetting.prefix,
        currentNumber: updatedSetting.currentNumber,
        maxNumber: updatedSetting.maxNumber,
        resetDaily: updatedSetting.resetDaily,
        resetTime: updatedSetting.resetTime,
        isActive: updatedSetting.isActive,
        priorityMultiplier: updatedSetting.priorityMultiplier.toNumber(),
      },
    });
  })
);

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
const resetQueueSchema = z.object({
  customerType: z.enum(["instant", "browser", "retail"]),
});

router.post(
  "/reset",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = resetQueueSchema.parse(req.body);

    const updatedSetting = await prisma.queueSetting.update({
      where: {
        organizationId_customerType: {
          organizationId: req.user!.organizationId,
          customerType: validatedData.customerType,
        },
      },
      data: {
        currentNumber: 0,
      },
    });

    // Log the queue reset
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "queue_reset",
        entityType: "queue_setting",
        entityId: updatedSetting.id,
        details: {
          customerType: validatedData.customerType,
        },
      },
    });

    res.json({
      success: true,
      message: "Queue reset successfully",
      data: {
        customerType: updatedSetting.customerType,
        currentNumber: updatedSetting.currentNumber,
      },
    });
  })
);

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
router.get(
  "/statistics",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fromDate, toDate, counterId } = req.query as {
      fromDate?: string;
      toDate?: string;
      counterId?: string;
    };

    // Default to today if no dates provided
    const startDate = fromDate ? new Date(fromDate) : new Date();
    const endDate = toDate ? new Date(toDate) : new Date();

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const whereClause: any = {
      organizationId: req.user!.organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (counterId) {
      whereClause.counterId = counterId;
    }

    const [
      totalTokens,
      completedTokens,
      averageWaitTime,
      averageServiceTime,
      tokensByType,
      tokensByHour,
    ] = await Promise.all([
      prisma.token.count({ where: whereClause }),
      prisma.token.count({
        where: { ...whereClause, status: "completed" },
      }),
      prisma.token.aggregate({
        where: {
          ...whereClause,
          status: "completed",
          actualWaitTime: { not: null },
        },
        _avg: { actualWaitTime: true },
      }),
      prisma.token.aggregate({
        where: {
          ...whereClause,
          status: "completed",
          serviceDuration: { not: null },
        },
        _avg: { serviceDuration: true },
      }),
      prisma.token.groupBy({
        by: ["customerType"],
        where: whereClause,
        _count: { _all: true },
      }),
      prisma.$queryRaw`
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM tokens 
        WHERE organization_id = ${req.user!.organizationId}
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
        completionRate:
          totalTokens > 0 ? (completedTokens / totalTokens) * 100 : 0,
      },
      averages: {
        waitTime: Math.round(averageWaitTime._avg.actualWaitTime || 0),
        serviceTime: Math.round(averageServiceTime._avg.serviceDuration || 0),
      },
      breakdown: {
        byType: tokensByType.reduce((acc, item) => {
          acc[item.customerType] = item._count._all;
          return acc;
        }, {} as Record<string, number>),
        byHour: tokensByHour,
      },
    };

    res.json({
      success: true,
      message: "Statistics retrieved successfully",
      data: statistics,
    });
  })
);

export { router as queueRouter };
