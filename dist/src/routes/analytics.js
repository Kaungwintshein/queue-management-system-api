"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("@/middleware/auth");
const errorHandler_1 = require("@/middleware/errorHandler");
const client_1 = require("@prisma/client");
const app_1 = require("@/app");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
exports.analyticsRouter = router;
/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Get dashboard analytics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year]
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
 */
router.get("/dashboard", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { period = "today" } = req.query;
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
    const whereClause = {
        organizationId: req.user.organizationId,
        createdAt: { gte: startDate },
    };
    const [totalTokens, completedTokens, cancelledTokens, noShowTokens, averageWaitTime, averageServiceTime, tokensByType, tokensByHour, staffPerformance, counterUtilization,] = await Promise.all([
        // Total tokens
        app_1.prisma.token.count({ where: whereClause }),
        // Completed tokens
        app_1.prisma.token.count({
            where: { ...whereClause, status: "completed" },
        }),
        // Cancelled tokens
        app_1.prisma.token.count({
            where: { ...whereClause, status: "cancelled" },
        }),
        // No-show tokens
        app_1.prisma.token.count({
            where: { ...whereClause, status: "no_show" },
        }),
        // Average wait time
        app_1.prisma.token.aggregate({
            where: {
                ...whereClause,
                status: "completed",
                actualWaitTime: { not: null },
            },
            _avg: { actualWaitTime: true },
        }),
        // Average service time
        app_1.prisma.token.aggregate({
            where: {
                ...whereClause,
                status: "completed",
                serviceDuration: { not: null },
            },
            _avg: { serviceDuration: true },
        }),
        // Tokens by customer type
        app_1.prisma.token.groupBy({
            by: ["customerType"],
            where: whereClause,
            _count: { _all: true },
        }),
        // Tokens by hour
        app_1.prisma.$queryRaw `
        SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
        FROM tokens 
        WHERE organization_id = ${req.user.organizationId}
        AND created_at >= ${startDate}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `,
        // Staff performance
        app_1.prisma.token.groupBy({
            by: ["servedBy"],
            where: {
                ...whereClause,
                status: "completed",
                servedBy: { not: null },
            },
            _count: { _all: true },
            _avg: { serviceDuration: true },
        }),
        // Counter utilization
        app_1.prisma.token.groupBy({
            by: ["counterId"],
            where: {
                ...whereClause,
                counterId: { not: null },
            },
            _count: { _all: true },
        }),
    ]);
    // Get staff details for performance data
    const staffIds = staffPerformance.map((sp) => sp.servedBy).filter(Boolean);
    const staffDetails = await app_1.prisma.user.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, username: true },
    });
    // Get counter details
    const counterIds = counterUtilization
        .map((cu) => cu.counterId)
        .filter(Boolean);
    const counterDetails = await app_1.prisma.counter.findMany({
        where: { id: { in: counterIds } },
        select: { id: true, name: true },
    });
    const analytics = {
        period: {
            name: period,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
        },
        overview: {
            totalTokens,
            completedTokens,
            cancelledTokens,
            noShowTokens,
            pendingTokens: totalTokens - completedTokens - cancelledTokens - noShowTokens,
            completionRate: totalTokens > 0
                ? Math.round((completedTokens / totalTokens) * 100)
                : 0,
            cancellationRate: totalTokens > 0
                ? Math.round((cancelledTokens / totalTokens) * 100)
                : 0,
            noShowRate: totalTokens > 0 ? Math.round((noShowTokens / totalTokens) * 100) : 0,
        },
        performance: {
            averageWaitTime: Math.round(averageWaitTime._avg.actualWaitTime || 0),
            averageServiceTime: Math.round(averageServiceTime._avg.serviceDuration || 0),
            throughput: totalTokens,
            efficiency: completedTokens > 0
                ? Math.round((completedTokens / totalTokens) * 100)
                : 0,
        },
        breakdown: {
            byCustomerType: tokensByType.reduce((acc, item) => {
                acc[item.customerType] = item._count._all;
                return acc;
            }, {}),
            byHour: tokensByHour,
            byStaff: staffPerformance.map((sp) => ({
                staffId: sp.servedBy,
                staffName: staffDetails.find((s) => s.id === sp.servedBy)?.username ||
                    "Unknown",
                tokensServed: sp._count._all,
                averageServiceTime: Math.round(sp._avg.serviceDuration || 0),
            })),
            byCounter: counterUtilization.map((cu) => ({
                counterId: cu.counterId,
                counterName: counterDetails.find((c) => c.id === cu.counterId)?.name ||
                    "Unknown",
                tokensProcessed: cu._count._all,
            })),
        },
    };
    res.json({
        success: true,
        message: "Dashboard analytics retrieved successfully",
        data: analytics,
    });
}));
/**
 * @swagger
 * /api/analytics/reports:
 *   get:
 *     tags: [Analytics]
 *     summary: Generate detailed reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reportType
 *         schema:
 *           type: string
 *           enum: [tokens, staff, counters, customer-satisfaction]
 *         description: Type of report to generate
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *         description: Group data by time period
 *     responses:
 *       200:
 *         description: Report generated successfully
 */
const reportsQuerySchema = zod_1.z.object({
    reportType: zod_1.z
        .enum(["tokens", "staff", "counters", "customer-satisfaction"])
        .default("tokens"),
    fromDate: zod_1.z.string().optional(),
    toDate: zod_1.z.string().optional(),
    groupBy: zod_1.z.enum(["hour", "day", "week", "month"]).default("day"),
});
router.get("/reports", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { reportType, fromDate, toDate, groupBy } = reportsQuerySchema.parse(req.query);
    // Default date range
    const endDate = toDate ? new Date(toDate) : new Date();
    const startDate = fromDate
        ? new Date(fromDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    let reportData = {};
    switch (reportType) {
        case "tokens":
            reportData = await generateTokensReport(req.user.organizationId, startDate, endDate, groupBy);
            break;
        case "staff":
            reportData = await generateStaffReport(req.user.organizationId, startDate, endDate, groupBy);
            break;
        case "counters":
            reportData = await generateCountersReport(req.user.organizationId, startDate, endDate, groupBy);
            break;
        case "customer-satisfaction":
            reportData = await generateSatisfactionReport(req.user.organizationId, startDate, endDate, groupBy);
            break;
    }
    res.json({
        success: true,
        message: "Report generated successfully",
        data: {
            reportType,
            period: {
                fromDate: startDate.toISOString(),
                toDate: endDate.toISOString(),
                groupBy,
            },
            ...reportData,
        },
    });
}));
/**
 * @swagger
 * /api/analytics/real-time:
 *   get:
 *     tags: [Analytics]
 *     summary: Get real-time analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time analytics retrieved successfully
 */
router.get("/real-time", auth_1.authenticate, (0, auth_1.authorize)([client_1.UserRole.admin, client_1.UserRole.super_admin]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [currentlyServing, waitingInQueue, activeStaff, activeCounters, todayStats, currentHourStats,] = await Promise.all([
        // Currently serving tokens
        app_1.prisma.token.count({
            where: {
                organizationId: req.user.organizationId,
                status: { in: ["called", "serving"] },
            },
        }),
        // Tokens waiting in queue
        app_1.prisma.token.count({
            where: {
                organizationId: req.user.organizationId,
                status: "waiting",
            },
        }),
        // Active staff (with ongoing sessions)
        app_1.prisma.serviceSession.count({
            where: {
                organizationId: req.user.organizationId,
                endedAt: null,
            },
        }),
        // Active counters
        app_1.prisma.counter.count({
            where: {
                organizationId: req.user.organizationId,
                isActive: true,
            },
        }),
        // Today's statistics
        app_1.prisma.token.groupBy({
            by: ["status"],
            where: {
                organizationId: req.user.organizationId,
                createdAt: { gte: todayStart },
            },
            _count: { _all: true },
        }),
        // Current hour statistics
        app_1.prisma.token.count({
            where: {
                organizationId: req.user.organizationId,
                createdAt: {
                    gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()),
                    lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1),
                },
            },
        }),
    ]);
    const todayTotals = todayStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count._all;
        return acc;
    }, {});
    const realTimeData = {
        current: {
            serving: currentlyServing,
            waiting: waitingInQueue,
            activeStaff,
            activeCounters,
            timestamp: now.toISOString(),
        },
        today: {
            total: Object.values(todayTotals).reduce((sum, count) => sum + count, 0),
            completed: todayTotals.completed || 0,
            cancelled: todayTotals.cancelled || 0,
            noShow: todayTotals.no_show || 0,
            pending: (todayTotals.waiting || 0) +
                (todayTotals.called || 0) +
                (todayTotals.serving || 0),
        },
        trends: {
            currentHourTokens: currentHourStats,
            efficiency: todayTotals.completed > 0
                ? Math.round((todayTotals.completed /
                    Object.values(todayTotals).reduce((sum, count) => sum + count, 0)) *
                    100)
                : 0,
        },
    };
    res.json({
        success: true,
        message: "Real-time analytics retrieved successfully",
        data: realTimeData,
    });
}));
// Helper functions for generating different types of reports
async function generateTokensReport(organizationId, startDate, endDate, groupBy) {
    const whereClause = {
        organizationId,
        createdAt: { gte: startDate, lte: endDate },
    };
    const [totalTokens, tokensByStatus, tokensByType] = await Promise.all([
        app_1.prisma.token.count({ where: whereClause }),
        app_1.prisma.token.groupBy({
            by: ["status"],
            where: whereClause,
            _count: { _all: true },
        }),
        app_1.prisma.token.groupBy({
            by: ["customerType"],
            where: whereClause,
            _count: { _all: true },
        }),
    ]);
    return {
        summary: {
            totalTokens,
            statusBreakdown: tokensByStatus.reduce((acc, item) => {
                acc[item.status] = item._count._all;
                return acc;
            }, {}),
            typeBreakdown: tokensByType.reduce((acc, item) => {
                acc[item.customerType] = item._count._all;
                return acc;
            }, {}),
        },
    };
}
async function generateStaffReport(organizationId, startDate, endDate, groupBy) {
    const staffPerformance = await app_1.prisma.token.groupBy({
        by: ["servedBy"],
        where: {
            organizationId,
            createdAt: { gte: startDate, lte: endDate },
            status: "completed",
            servedBy: { not: null },
        },
        _count: { _all: true },
        _avg: { serviceDuration: true },
    });
    const staffIds = staffPerformance.map((sp) => sp.servedBy).filter(Boolean);
    const staffDetails = await app_1.prisma.user.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, username: true, role: true },
    });
    return {
        performance: staffPerformance.map((sp) => ({
            staffId: sp.servedBy,
            staffName: staffDetails.find((s) => s.id === sp.servedBy)?.username || "Unknown",
            role: staffDetails.find((s) => s.id === sp.servedBy)?.role || "unknown",
            tokensServed: sp._count._all,
            averageServiceTime: Math.round(sp._avg.serviceDuration || 0),
        })),
    };
}
async function generateCountersReport(organizationId, startDate, endDate, groupBy) {
    const counterUtilization = await app_1.prisma.token.groupBy({
        by: ["counterId"],
        where: {
            organizationId,
            createdAt: { gte: startDate, lte: endDate },
            counterId: { not: null },
        },
        _count: { _all: true },
        _avg: { serviceDuration: true },
    });
    const counterIds = counterUtilization
        .map((cu) => cu.counterId)
        .filter(Boolean);
    const counterDetails = await app_1.prisma.counter.findMany({
        where: { id: { in: counterIds } },
        select: { id: true, name: true, isActive: true },
    });
    return {
        utilization: counterUtilization.map((cu) => ({
            counterId: cu.counterId,
            counterName: counterDetails.find((c) => c.id === cu.counterId)?.name || "Unknown",
            isActive: counterDetails.find((c) => c.id === cu.counterId)?.isActive || false,
            tokensProcessed: cu._count._all,
            averageServiceTime: Math.round(cu._avg.serviceDuration || 0),
        })),
    };
}
async function generateSatisfactionReport(organizationId, startDate, endDate, groupBy) {
    // Get tokens with ratings from metadata
    const tokensWithRatings = await app_1.prisma.token.findMany({
        where: {
            organizationId,
            createdAt: { gte: startDate, lte: endDate },
            status: "completed",
        },
        select: {
            id: true,
            customerType: true,
            metadata: true,
            serviceDuration: true,
            actualWaitTime: true,
        },
    });
    const ratingsData = tokensWithRatings
        .filter((token) => token.metadata &&
        typeof token.metadata === "object" &&
        "rating" in token.metadata)
        .map((token) => ({
        rating: token.metadata.rating,
        customerType: token.customerType,
        serviceDuration: token.serviceDuration,
        waitTime: token.actualWaitTime,
    }));
    if (ratingsData.length === 0) {
        return {
            summary: {
                totalRatings: 0,
                averageRating: 0,
                satisfactionRate: 0,
            },
            breakdown: {},
        };
    }
    const averageRating = ratingsData.reduce((sum, item) => sum + item.rating, 0) /
        ratingsData.length;
    const satisfactionRate = (ratingsData.filter((item) => item.rating >= 4).length /
        ratingsData.length) *
        100;
    return {
        summary: {
            totalRatings: ratingsData.length,
            averageRating: Math.round(averageRating * 100) / 100,
            satisfactionRate: Math.round(satisfactionRate),
        },
        breakdown: {
            byType: ratingsData.reduce((acc, item) => {
                acc[item.customerType] = acc[item.customerType] || [];
                acc[item.customerType].push(item.rating);
                return acc;
            }, {}),
        },
    };
}
//# sourceMappingURL=analytics.js.map