import { Router, Response } from "express";
import { authenticate, authorize, AuthRequest } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/errorHandler";
import { UserRole } from "@prisma/client";
import { prisma } from "@/app";
import { z } from "zod";

const router = Router();

/**
 * @swagger
 * /api/counters:
 *   get:
 *     tags: [Counter Management]
 *     summary: Get all counters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: assigned
 *         schema:
 *           type: boolean
 *         description: Filter by assignment status
 *     responses:
 *       200:
 *         description: Counters retrieved successfully
 */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { active, assigned } = req.query as {
      active?: string;
      assigned?: string;
    };

    const whereClause: any = {
      organizationId: req.user!.organizationId,
    };

    if (active !== undefined) {
      whereClause.isActive = active === "true";
    }

    if (assigned !== undefined) {
      if (assigned === "true") {
        whereClause.assignedStaffId = { not: null };
      } else {
        whereClause.assignedStaffId = null;
      }
    }

    const counters = await prisma.counter.findMany({
      where: whereClause,
      include: {
        assignedStaff: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      message: "Counters retrieved successfully",
      data: counters,
    });
  })
);

/**
 * @swagger
 * /api/counters:
 *   post:
 *     tags: [Counter Management]
 *     summary: Create a new counter
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Counter name
 *               isActive:
 *                 type: boolean
 *                 description: Whether counter is active
 *               assignedStaffId:
 *                 type: string
 *                 format: uuid
 *                 description: Staff member to assign to counter
 *     responses:
 *       201:
 *         description: Counter created successfully
 *       403:
 *         description: Insufficient permissions
 */
const createCounterSchema = z.object({
  name: z.string().min(1).max(50),
  isActive: z.boolean().optional().default(true),
  assignedStaffId: z.string().uuid().optional(),
});

router.post(
  "/",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validatedData = createCounterSchema.parse(req.body);

    // Check if counter name already exists
    const existingCounter = await prisma.counter.findFirst({
      where: {
        organizationId: req.user!.organizationId,
        name: validatedData.name,
      },
    });

    if (existingCounter) {
      return res.status(409).json({
        success: false,
        message: "Counter with this name already exists",
      });
    }

    // If staff is assigned, verify they exist and are available
    if (validatedData.assignedStaffId) {
      const staff = await prisma.user.findFirst({
        where: {
          id: validatedData.assignedStaffId,
          organizationId: req.user!.organizationId,
          isActive: true,
        },
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found or inactive",
        });
      }

      // Check if staff is already assigned to another counter
      const existingAssignment = await prisma.counter.findFirst({
        where: {
          organizationId: req.user!.organizationId,
          assignedStaffId: validatedData.assignedStaffId,
        },
      });

      if (existingAssignment) {
        return res.status(409).json({
          success: false,
          message: "Staff member is already assigned to another counter",
        });
      }
    }

    const counter = await prisma.counter.create({
      data: {
        organizationId: req.user!.organizationId,
        name: validatedData.name,
        isActive: validatedData.isActive,
        assignedStaffId: validatedData.assignedStaffId,
      },
      include: {
        assignedStaff: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Log counter creation
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "counter_created",
        entityType: "counter",
        entityId: counter.id,
        details: {
          counterName: counter.name,
          isActive: counter.isActive,
          assignedStaffId: counter.assignedStaffId,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Counter created successfully",
      data: counter,
    });
  })
);

/**
 * @swagger
 * /api/counters/{counterId}:
 *   get:
 *     tags: [Counter Management]
 *     summary: Get counter by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: counterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Counter retrieved successfully
 *       404:
 *         description: Counter not found
 */
router.get(
  "/:counterId",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.params;

    const counter = await prisma.counter.findFirst({
      where: {
        id: counterId,
        organizationId: req.user!.organizationId,
      },
      include: {
        assignedStaff: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    res.json({
      success: true,
      message: "Counter retrieved successfully",
      data: counter,
    });
  })
);

/**
 * @swagger
 * /api/counters/{counterId}:
 *   patch:
 *     tags: [Counter Management]
 *     summary: Update counter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: counterId
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
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               assignedStaffId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Counter updated successfully
 *       404:
 *         description: Counter not found
 */
const updateCounterSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  assignedStaffId: z.string().uuid().optional().nullable(),
});

router.patch(
  "/:counterId",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.params;
    const validatedData = updateCounterSchema.parse(req.body);

    // Check if counter exists
    const existingCounter = await prisma.counter.findFirst({
      where: {
        id: counterId,
        organizationId: req.user!.organizationId,
      },
    });

    if (!existingCounter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    // Check if name is unique (if being updated)
    if (validatedData.name && validatedData.name !== existingCounter.name) {
      const nameExists = await prisma.counter.findFirst({
        where: {
          organizationId: req.user!.organizationId,
          name: validatedData.name,
          id: { not: counterId },
        },
      });

      if (nameExists) {
        return res.status(409).json({
          success: false,
          message: "Counter with this name already exists",
        });
      }
    }

    // If staff is being assigned, verify they exist and are available
    if (
      validatedData.assignedStaffId !== undefined &&
      validatedData.assignedStaffId !== null
    ) {
      const staff = await prisma.user.findFirst({
        where: {
          id: validatedData.assignedStaffId,
          organizationId: req.user!.organizationId,
          isActive: true,
        },
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found or inactive",
        });
      }

      // Check if staff is already assigned to another counter
      const existingAssignment = await prisma.counter.findFirst({
        where: {
          organizationId: req.user!.organizationId,
          assignedStaffId: validatedData.assignedStaffId,
          id: { not: counterId },
        },
      });

      if (existingAssignment) {
        return res.status(409).json({
          success: false,
          message: "Staff member is already assigned to another counter",
        });
      }
    }

    const updatedCounter = await prisma.counter.update({
      where: { id: counterId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.isActive !== undefined && {
          isActive: validatedData.isActive,
        }),
        ...(validatedData.assignedStaffId !== undefined && {
          assignedStaffId: validatedData.assignedStaffId,
        }),
      },
      include: {
        assignedStaff: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Log counter update
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "counter_updated",
        entityType: "counter",
        entityId: counterId,
        details: {
          changes: validatedData,
          counterName: updatedCounter.name,
        },
      },
    });

    res.json({
      success: true,
      message: "Counter updated successfully",
      data: updatedCounter,
    });
  })
);

/**
 * @swagger
 * /api/counters/{counterId}:
 *   delete:
 *     tags: [Counter Management]
 *     summary: Delete counter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: counterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Counter deleted successfully
 *       404:
 *         description: Counter not found
 *       409:
 *         description: Counter has active tokens
 */
router.delete(
  "/:counterId",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.params;

    // Check if counter exists
    const counter = await prisma.counter.findFirst({
      where: {
        id: counterId,
        organizationId: req.user!.organizationId,
      },
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    // Check if counter has active tokens
    const activeTokens = await prisma.token.count({
      where: {
        counterId,
        status: { in: ["waiting", "called", "serving"] },
      },
    });

    if (activeTokens > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete counter with active tokens",
        data: { activeTokens },
      });
    }

    // Delete the counter
    await prisma.counter.delete({
      where: { id: counterId },
    });

    // Log counter deletion
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "counter_deleted",
        entityType: "counter",
        entityId: counterId,
        details: {
          counterName: counter.name,
          wasActive: counter.isActive,
        },
      },
    });

    res.json({
      success: true,
      message: "Counter deleted successfully",
    });
  })
);

/**
 * @swagger
 * /api/counters/{counterId}/status:
 *   get:
 *     tags: [Counter Management]
 *     summary: Get counter status and queue information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: counterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Counter status retrieved successfully
 *       404:
 *         description: Counter not found
 */
router.get(
  "/:counterId/status",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.params;

    // Check if counter exists
    const counter = await prisma.counter.findFirst({
      where: {
        id: counterId,
        organizationId: req.user!.organizationId,
      },
      include: {
        assignedStaff: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    const [currentServing, nextInQueue, todayStats] = await Promise.all([
      // Current serving token
      prisma.token.findFirst({
        where: {
          counterId,
          status: { in: ["called", "serving"] },
        },
        orderBy: { calledAt: "desc" },
      }),

      // Next tokens in queue
      prisma.token.findMany({
        where: {
          OR: [
            { counterId },
            { counterId: null, organizationId: req.user!.organizationId },
          ],
          status: "waiting",
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: 5,
      }),

      // Today's statistics for this counter
      prisma.token.groupBy({
        by: ["status"],
        where: {
          counterId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _count: { _all: true },
      }),
    ]);

    const todayTotals = todayStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count._all;
      return acc;
    }, {} as Record<string, number>);

    const status = {
      counter,
      currentServing,
      nextInQueue,
      stats: {
        today: {
          total: Object.values(todayTotals).reduce(
            (sum, count) => sum + count,
            0
          ),
          completed: todayTotals.completed || 0,
          serving: todayTotals.serving || 0,
          waiting: todayTotals.waiting || 0,
          cancelled: todayTotals.cancelled || 0,
          noShow: todayTotals.no_show || 0,
        },
        queue: {
          currentlyServing: currentServing ? 1 : 0,
          waitingCount: nextInQueue.length,
        },
      },
    };

    res.json({
      success: true,
      message: "Counter status retrieved successfully",
      data: status,
    });
  })
);

/**
 * @swagger
 * /api/counters/{counterId}/activate:
 *   post:
 *     tags: [Counter Management]
 *     summary: Activate counter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: counterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Counter activated successfully
 *       404:
 *         description: Counter not found
 */
router.post(
  "/:counterId/activate",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.params;

    const counter = await prisma.counter.findFirst({
      where: {
        id: counterId,
        organizationId: req.user!.organizationId,
      },
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    const updatedCounter = await prisma.counter.update({
      where: { id: counterId },
      data: { isActive: true },
      include: {
        assignedStaff: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Log counter activation
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "counter_activated",
        entityType: "counter",
        entityId: counterId,
        details: {
          counterName: counter.name,
        },
      },
    });

    res.json({
      success: true,
      message: "Counter activated successfully",
      data: updatedCounter,
    });
  })
);

/**
 * @swagger
 * /api/counters/{counterId}/deactivate:
 *   post:
 *     tags: [Counter Management]
 *     summary: Deactivate counter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: counterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Counter deactivated successfully
 *       404:
 *         description: Counter not found
 */
router.post(
  "/:counterId/deactivate",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.params;

    const counter = await prisma.counter.findFirst({
      where: {
        id: counterId,
        organizationId: req.user!.organizationId,
      },
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    const updatedCounter = await prisma.counter.update({
      where: { id: counterId },
      data: { isActive: false },
      include: {
        assignedStaff: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Log counter deactivation
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "counter_deactivated",
        entityType: "counter",
        entityId: counterId,
        details: {
          counterName: counter.name,
        },
      },
    });

    res.json({
      success: true,
      message: "Counter deactivated successfully",
      data: updatedCounter,
    });
  })
);

/**
 * @swagger
 * /api/counters/{counterId}:
 *   put:
 *     tags: [Counter Management]
 *     summary: Update counter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: counterId
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
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               assignedStaffId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Counter updated successfully
 *       404:
 *         description: Counter not found
 *       403:
 *         description: Insufficient permissions
 */
router.put(
  "/:counterId",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.params;
    const updateData = req.body;

    const counter = await prisma.counter.findFirst({
      where: {
        id: counterId,
        organizationId: req.user!.organizationId,
      },
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    // If updating name, check for duplicates
    if (updateData.name && updateData.name !== counter.name) {
      const existingCounter = await prisma.counter.findFirst({
        where: {
          organizationId: req.user!.organizationId,
          name: updateData.name,
          id: { not: counterId },
        },
      });

      if (existingCounter) {
        return res.status(409).json({
          success: false,
          message: "Counter with this name already exists",
        });
      }
    }

    // If assigning staff, verify they exist and are available
    if (updateData.assignedStaffId) {
      const staff = await prisma.user.findFirst({
        where: {
          id: updateData.assignedStaffId,
          organizationId: req.user!.organizationId,
          isActive: true,
        },
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Staff member not found or inactive",
        });
      }

      // Check if staff is already assigned to another counter
      const existingAssignment = await prisma.counter.findFirst({
        where: {
          organizationId: req.user!.organizationId,
          assignedStaffId: updateData.assignedStaffId,
          id: { not: counterId },
        },
      });

      if (existingAssignment) {
        return res.status(409).json({
          success: false,
          message: "Staff member is already assigned to another counter",
        });
      }
    }

    const updatedCounter = await prisma.counter.update({
      where: { id: counterId },
      data: updateData,
      include: {
        assignedStaff: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Log counter update
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "counter_updated",
        entityType: "counter",
        entityId: counterId,
        details: {
          counterName: updatedCounter.name,
          changes: updateData,
        },
      },
    });

    res.json({
      success: true,
      message: "Counter updated successfully",
      data: updatedCounter,
    });
  })
);

/**
 * @swagger
 * /api/counters/{counterId}:
 *   delete:
 *     tags: [Counter Management]
 *     summary: Delete counter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: counterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Counter deleted successfully
 *       404:
 *         description: Counter not found
 *       403:
 *         description: Insufficient permissions
 */
router.delete(
  "/:counterId",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.params;

    const counter = await prisma.counter.findFirst({
      where: {
        id: counterId,
        organizationId: req.user!.organizationId,
      },
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    // Check if counter has any active tokens
    const activeTokens = await prisma.token.count({
      where: {
        counterId: counterId,
        status: { in: ["waiting", "called", "serving"] },
      },
    });

    if (activeTokens > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete counter with active tokens",
      });
    }

    await prisma.counter.delete({
      where: { id: counterId },
    });

    // Log counter deletion
    await prisma.systemLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: "counter_deleted",
        entityType: "counter",
        entityId: counterId,
        details: {
          counterName: counter.name,
        },
      },
    });

    res.json({
      success: true,
      message: "Counter deleted successfully",
    });
  })
);

/**
 * @swagger
 * /api/counters/{counterId}/assign:
 *   post:
 *     tags: [Counter Management]
 *     summary: Assign staff to counter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: counterId
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
 *             required:
 *               - staffId
 *             properties:
 *               staffId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Staff assigned successfully
 *       404:
 *         description: Counter or staff not found
 *       409:
 *         description: Staff already assigned to another counter
 */
router.post(
  "/:counterId/assign",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.params;
    const { staffId } = req.body;

    const counter = await prisma.counter.findFirst({
      where: {
        id: counterId,
        organizationId: req.user!.organizationId,
      },
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    const staff = await prisma.user.findFirst({
      where: {
        id: staffId,
        organizationId: req.user!.organizationId,
        isActive: true,
      },
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found or inactive",
      });
    }

    // Check if staff is already assigned to another counter
    const existingAssignment = await prisma.counter.findFirst({
      where: {
        organizationId: req.user!.organizationId,
        assignedStaffId: staffId,
        id: { not: counterId },
      },
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: "Staff member is already assigned to another counter",
      });
    }

    const updatedCounter = await prisma.counter.update({
      where: { id: counterId },
      data: { assignedStaffId: staffId },
      include: {
        assignedStaff: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Staff assigned successfully",
      data: updatedCounter,
    });
  })
);

/**
 * @swagger
 * /api/counters/{counterId}/unassign:
 *   post:
 *     tags: [Counter Management]
 *     summary: Unassign staff from counter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: counterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff unassigned successfully
 *       404:
 *         description: Counter not found
 */
router.post(
  "/:counterId/unassign",
  authenticate,
  authorize([UserRole.admin, UserRole.super_admin]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { counterId } = req.params;

    const counter = await prisma.counter.findFirst({
      where: {
        id: counterId,
        organizationId: req.user!.organizationId,
      },
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    const updatedCounter = await prisma.counter.update({
      where: { id: counterId },
      data: { assignedStaffId: null },
      include: {
        assignedStaff: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: "Staff unassigned successfully",
      data: updatedCounter,
    });
  })
);

export { router as countersRouter };
