"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffRouter = void 0;
const express_1 = require("express");
const auth_1 = require("@/middleware/auth");
const errorHandler_1 = require("@/middleware/errorHandler");
const client_1 = require("@prisma/client");
const app_1 = require("@/app");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
exports.staffRouter = router;
/**
 * @swagger
 * /api/staff/sessions:
 *   get:
 *     tags: [Staff Management]
 *     summary: Get staff service sessions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by staff ID (admin only)
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter active sessions only
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 */
router.get("/sessions", auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { staffId, fromDate, toDate, active } = req.query;
    let targetStaffId = req.user.id;
    // Admin can view any staff's sessions
    if (staffId &&
        (req.user.role === client_1.UserRole.admin ||
            req.user.role === client_1.UserRole.super_admin)) {
        targetStaffId = staffId;
    }
    const whereClause = {
        staffId: targetStaffId,
        organizationId: req.user.organizationId,
    };
    if (fromDate) {
        whereClause.startedAt = { gte: new Date(fromDate) };
    }
    if (toDate) {
        if (whereClause.startedAt) {
            whereClause.startedAt.lte = new Date(toDate);
        }
        else {
            whereClause.startedAt = { lte: new Date(toDate) };
        }
    }
    if (active === "true") {
        whereClause.endedAt = null;
    }
    const sessions = await app_1.prisma.serviceSession.findMany({
        where: whereClause,
        include: {
            staff: {
                select: {
                    id: true,
                    username: true,
                    role: true,
                },
            },
        },
        orderBy: { startedAt: "desc" },
    });
    // Calculate summary statistics
    const stats = {
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => !s.endedAt).length,
        totalTokensServed: sessions.reduce((sum, s) => sum + s.tokensServed, 0),
        totalDuration: sessions
            .filter((s) => s.endedAt)
            .reduce((sum, s) => {
            const duration = s.endedAt.getTime() - s.startedAt.getTime();
            return sum + Math.floor(duration / (1000 * 60)); // in minutes
        }, 0),
        averageServiceTime: sessions.length > 0
            ? sessions.reduce((sum, s) => sum + (s.averageServiceTime?.toNumber() || 0), 0) / sessions.length
            : 0,
    };
    res.json({
        success: true,
        message: "Sessions retrieved successfully",
        data: {
            sessions,
            stats,
        },
    });
}));
/**
 * @swagger
 * /api/staff/sessions/start:
 *   post:
 *     tags: [Staff Management]
 *     summary: Start a new service session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Session started successfully
 *       409:
 *         description: Active session already exists
 */
router.post("/sessions/start", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Check if there's already an active session
    const activeSession = await app_1.prisma.serviceSession.findFirst({
        where: {
            staffId: req.user.id,
            endedAt: null,
        },
    });
    if (activeSession) {
        return res.status(409).json({
            success: false,
            message: "Active session already exists",
            data: activeSession,
        });
    }
    const session = await app_1.prisma.serviceSession.create({
        data: {
            staffId: req.user.id,
            organizationId: req.user.organizationId,
        },
        include: {
            staff: {
                select: {
                    id: true,
                    username: true,
                    role: true,
                },
            },
        },
    });
    // Log session start
    await app_1.prisma.systemLog.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
            action: "session_started",
            entityType: "service_session",
            entityId: session.id,
            details: {
                staffId: req.user.id,
                startTime: session.startedAt,
            },
        },
    });
    res.status(201).json({
        success: true,
        message: "Session started successfully",
        data: session,
    });
}));
/**
 * @swagger
 * /api/staff/sessions/end:
 *   post:
 *     tags: [Staff Management]
 *     summary: End current service session
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Optional session notes
 *     responses:
 *       200:
 *         description: Session ended successfully
 *       404:
 *         description: No active session found
 */
const endSessionSchema = zod_1.z.object({
    notes: zod_1.z.string().max(1000).optional(),
});
router.post("/sessions/end", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { notes } = endSessionSchema.parse(req.body);
    const activeSession = await app_1.prisma.serviceSession.findFirst({
        where: {
            staffId: req.user.id,
            endedAt: null,
        },
    });
    if (!activeSession) {
        return res.status(404).json({
            success: false,
            message: "No active session found",
        });
    }
    const endedSession = await app_1.prisma.serviceSession.update({
        where: { id: activeSession.id },
        data: {
            endedAt: new Date(),
            notes,
        },
        include: {
            staff: {
                select: {
                    id: true,
                    username: true,
                    role: true,
                },
            },
        },
    });
    // Log session end
    await app_1.prisma.systemLog.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
            action: "session_ended",
            entityType: "service_session",
            entityId: endedSession.id,
            details: {
                staffId: req.user.id,
                duration: Math.floor((endedSession.endedAt.getTime() -
                    endedSession.startedAt.getTime()) /
                    (1000 * 60)),
                tokensServed: endedSession.tokensServed,
                notes,
            },
        },
    });
    res.json({
        success: true,
        message: "Session ended successfully",
        data: endedSession,
    });
}));
/**
 * @swagger
 * /api/staff/performance:
 *   get:
 *     tags: [Staff Management]
 *     summary: Get staff performance metrics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by staff ID (admin only)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 */
router.get("/performance", auth_1.authenticate, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { staffId, period = "today" } = req.query;
    let targetStaffId = req.user.id;
    // Admin can view any staff's performance
    if (staffId &&
        (req.user.role === client_1.UserRole.admin ||
            req.user.role === client_1.UserRole.super_admin)) {
        targetStaffId = staffId;
    }
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
        case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case "month":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case "year":
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        default: // today
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
    }
    const [sessions, tokensServed, staff] = await Promise.all([
        app_1.prisma.serviceSession.findMany({
            where: {
                staffId: targetStaffId,
                organizationId: req.user.organizationId,
                startedAt: { gte: startDate },
            },
        }),
        app_1.prisma.token.findMany({
            where: {
                servedBy: targetStaffId,
                organizationId: req.user.organizationId,
                completedAt: { gte: startDate },
            },
            select: {
                id: true,
                customerType: true,
                serviceDuration: true,
                actualWaitTime: true,
                completedAt: true,
            },
        }),
        app_1.prisma.user.findUnique({
            where: { id: targetStaffId },
            select: {
                id: true,
                username: true,
                role: true,
            },
        }),
    ]);
    const totalTokensServed = tokensServed.length;
    const totalWorkingTime = sessions
        .filter((s) => s.endedAt)
        .reduce((sum, s) => {
        const duration = s.endedAt.getTime() - s.startedAt.getTime();
        return sum + Math.floor(duration / (1000 * 60)); // in minutes
    }, 0);
    const averageServiceTime = tokensServed.length > 0
        ? tokensServed.reduce((sum, token) => sum + (token.serviceDuration || 0), 0) / tokensServed.length
        : 0;
    const tokensPerHour = totalWorkingTime > 0 ? (totalTokensServed / totalWorkingTime) * 60 : 0;
    // Group tokens by customer type
    const tokensByType = tokensServed.reduce((acc, token) => {
        acc[token.customerType] = (acc[token.customerType] || 0) + 1;
        return acc;
    }, {});
    // Group tokens by hour for trend analysis
    const tokensByHour = tokensServed.reduce((acc, token) => {
        if (token.completedAt) {
            const hour = token.completedAt.getHours();
            acc[hour] = (acc[hour] || 0) + 1;
        }
        return acc;
    }, {});
    const performance = {
        staff,
        period: {
            name: period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
        },
        metrics: {
            totalTokensServed,
            totalWorkingTime, // in minutes
            totalSessions: sessions.length,
            activeSessions: sessions.filter((s) => !s.endedAt).length,
            averageServiceTime: Math.round(averageServiceTime),
            tokensPerHour: Math.round(tokensPerHour * 100) / 100,
            efficiency: totalWorkingTime > 0
                ? Math.round((totalTokensServed / totalWorkingTime) * 60 * 100) /
                    100
                : 0,
        },
        breakdown: {
            byType: tokensByType,
            byHour: tokensByHour,
        },
    };
    res.json({
        success: true,
        message: "Performance metrics retrieved successfully",
        data: performance,
    });
}));
/**
 * @swagger
 * /api/staff/counters:
 *   get:
 *     tags: [Staff Management]
 *     summary: Get available counters for assignment
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Counters retrieved successfully
 */
router.get("/counters", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const counters = await app_1.prisma.counter.findMany({
        where: {
            organizationId: req.user.organizationId,
            isActive: true,
        },
        include: {
            assignedStaff: {
                select: {
                    id: true,
                    username: true,
                },
            },
        },
        orderBy: { name: "asc" },
    });
    // For staff, only show counters they can be assigned to
    let availableCounters = counters;
    if (req.user.role === client_1.UserRole.staff) {
        availableCounters = counters.filter((counter) => !counter.assignedStaff || counter.assignedStaff.id === req.user.id);
    }
    res.json({
        success: true,
        message: "Counters retrieved successfully",
        data: availableCounters,
    });
}));
/**
 * @swagger
 * /api/staff/assign-counter:
 *   post:
 *     tags: [Staff Management]
 *     summary: Assign staff to counter
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
 *             properties:
 *               counterId:
 *                 type: string
 *                 format: uuid
 *               staffId:
 *                 type: string
 *                 format: uuid
 *                 description: Required for admin assignment
 *     responses:
 *       200:
 *         description: Counter assigned successfully
 *       409:
 *         description: Counter already assigned
 */
const assignCounterSchema = zod_1.z.object({
    counterId: zod_1.z.string().uuid(),
    staffId: zod_1.z.string().uuid().optional(),
});
router.post("/assign-counter", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const validatedData = assignCounterSchema.parse(req.body);
    let targetStaffId = req.user.id;
    // Admin can assign any staff to counter
    if (validatedData.staffId &&
        (req.user.role === client_1.UserRole.admin ||
            req.user.role === client_1.UserRole.super_admin)) {
        targetStaffId = validatedData.staffId;
    }
    // Check if counter exists and is available
    const counter = await app_1.prisma.counter.findFirst({
        where: {
            id: validatedData.counterId,
            organizationId: req.user.organizationId,
            isActive: true,
        },
        include: {
            assignedStaff: true,
        },
    });
    if (!counter) {
        return res.status(404).json({
            success: false,
            message: "Counter not found or inactive",
        });
    }
    if (counter.assignedStaff && counter.assignedStaff.id !== targetStaffId) {
        return res.status(409).json({
            success: false,
            message: "Counter is already assigned to another staff member",
        });
    }
    // Assign counter to staff
    const updatedCounter = await app_1.prisma.counter.update({
        where: { id: validatedData.counterId },
        data: {
            assignedStaffId: targetStaffId,
        },
        include: {
            assignedStaff: {
                select: {
                    id: true,
                    username: true,
                },
            },
        },
    });
    // Log the assignment
    await app_1.prisma.systemLog.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
            action: "counter_assigned",
            entityType: "counter",
            entityId: updatedCounter.id,
            details: {
                counterId: updatedCounter.id,
                counterName: updatedCounter.name,
                staffId: targetStaffId,
                assignedBy: req.user.id,
            },
        },
    });
    res.json({
        success: true,
        message: "Counter assigned successfully",
        data: updatedCounter,
    });
}));
/**
 * @swagger
 * /api/staff/unassign-counter:
 *   post:
 *     tags: [Staff Management]
 *     summary: Unassign staff from counter
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
 *             properties:
 *               counterId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Counter unassigned successfully
 *       404:
 *         description: Counter not found or not assigned
 */
const unassignCounterSchema = zod_1.z.object({
    counterId: zod_1.z.string().uuid(),
});
router.post("/unassign-counter", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.staff, client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { counterId } = unassignCounterSchema.parse(req.body);
    // Check if counter is assigned to current user or if user is admin
    const counter = await app_1.prisma.counter.findFirst({
        where: {
            id: counterId,
            organizationId: req.user.organizationId,
        },
        include: {
            assignedStaff: true,
        },
    });
    if (!counter) {
        return res.status(404).json({
            success: false,
            message: "Counter not found",
        });
    }
    if (!counter.assignedStaff) {
        return res.status(404).json({
            success: false,
            message: "Counter is not assigned to any staff",
        });
    }
    // Staff can only unassign themselves, admin can unassign anyone
    if (req.user.role === client_1.UserRole.staff &&
        counter.assignedStaff.id !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: "Cannot unassign counter assigned to another staff member",
        });
    }
    // Unassign counter
    const updatedCounter = await app_1.prisma.counter.update({
        where: { id: counterId },
        data: {
            assignedStaffId: null,
        },
    });
    // Log the unassignment
    await app_1.prisma.systemLog.create({
        data: {
            organizationId: req.user.organizationId,
            userId: req.user.id,
            action: "counter_unassigned",
            entityType: "counter",
            entityId: updatedCounter.id,
            details: {
                counterId: updatedCounter.id,
                counterName: updatedCounter.name,
                previousStaffId: counter.assignedStaff.id,
                unassignedBy: req.user.id,
            },
        },
    });
    res.json({
        success: true,
        message: "Counter unassigned successfully",
        data: updatedCounter,
    });
}));
//# sourceMappingURL=staff.js.map