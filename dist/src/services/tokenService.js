"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = exports.TokenService = void 0;
const app_1 = require("@/app");
const client_1 = require("@prisma/client");
const errors_1 = require("@/utils/errors");
const logger_1 = require("@/utils/logger");
const app_2 = require("@/app");
class TokenService {
    async getTokenPosition(tokenId, organizationId) {
        const token = await app_1.prisma.token.findUnique({
            where: { id: tokenId },
            select: { customerType: true, priority: true, createdAt: true }
        });
        if (!token) {
            return 0;
        }
        // Count tokens of the same type and priority that were created before this token
        const position = await app_1.prisma.token.count({
            where: {
                organizationId,
                customerType: token.customerType,
                priority: token.priority,
                status: "waiting",
                createdAt: {
                    lt: token.createdAt
                }
            }
        });
        return position + 1; // Position is 1-based
    }
    async createToken(request, organizationId, staffId) {
        try {
            logger_1.logger.info("Creating token", {
                customerType: request.customerType,
                organizationId,
                staffId,
            });
            // Get queue settings for the customer type
            const settings = await app_1.prisma.queueSetting.findFirst({
                where: {
                    organizationId,
                    customerType: request.customerType,
                    isActive: true,
                },
            });
            if (!settings) {
                throw new errors_1.NotFoundError(`Queue not active for customer type: ${request.customerType}`);
            }
            // Generate token number with atomic increment
            const updatedSettings = await app_1.prisma.queueSetting.update({
                where: { id: settings.id },
                data: { currentNumber: { increment: 1 } },
            });
            const tokenNumber = `${settings.prefix}${updatedSettings.currentNumber
                .toString()
                .padStart(3, "0")}`;
            // Create token with transaction
            const token = await app_1.prisma.$transaction(async (tx) => {
                // Create the token
                const newToken = await tx.token.create({
                    data: {
                        organizationId,
                        number: tokenNumber,
                        customerType: request.customerType,
                        priority: request.priority || 0,
                        status: client_1.TokenStatus.waiting,
                        counterId: request.counterId || null,
                        notes: request.notes || null,
                        metadata: request.metadata || {},
                        servedBy: staffId,
                    },
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                });
                // Log the action
                await tx.systemLog.create({
                    data: {
                        organizationId,
                        userId: staffId,
                        action: "token_created",
                        entityType: "token",
                        entityId: newToken.id,
                        details: {
                            tokenNumber: newToken.number,
                            customerType: newToken.customerType,
                            priority: newToken.priority,
                        },
                    },
                });
                return newToken;
            });
            // Calculate estimated wait time
            const estimatedWaitTime = await this.calculateEstimatedWaitTime(organizationId, request.customerType, request.priority || 0, request.counterId);
            // Calculate position in queue
            const position = await this.getTokenPosition(token.id, organizationId);
            const response = {
                token,
                position,
                estimatedWaitTime,
            };
            // Emit real-time update
            app_2.io.to(`org:${organizationId}`).emit("token:created", response);
            app_2.io.to(`org:${organizationId}`).emit("queue:updated", await this.getQueueStatus(organizationId));
            logger_1.logger.info("Token created successfully", {
                tokenId: token.id,
                tokenNumber: token.number,
                position,
                estimatedWaitTime,
            });
            return response;
        }
        catch (error) {
            logger_1.logger.error("Failed to create token", {
                error: error.message,
                request,
                organizationId,
            });
            throw error;
        }
    }
    async callNextToken(request, organizationId) {
        try {
            logger_1.logger.info("Calling next token", { request, organizationId });
            const result = await app_1.prisma.$transaction(async (tx) => {
                // Build where clause for finding next token
                const whereClause = {
                    organizationId,
                    status: client_1.TokenStatus.waiting,
                    ...(request.customerType && { customerType: request.customerType }),
                    ...(request.counterId && {
                        OR: [{ counterId: request.counterId }, { counterId: null }],
                    }),
                };
                // Find the next token with highest priority and earliest creation time
                const nextToken = await tx.token.findFirst({
                    where: whereClause,
                    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                });
                if (!nextToken) {
                    throw new errors_1.NotFoundError("No tokens in queue");
                }
                // Update token status and assignment
                const updatedToken = await tx.token.update({
                    where: { id: nextToken.id },
                    data: {
                        status: client_1.TokenStatus.called,
                        calledAt: new Date(),
                        servedBy: request.staffId,
                        counterId: request.counterId,
                        actualWaitTime: Math.floor((new Date().getTime() - nextToken.createdAt.getTime()) /
                            (1000 * 60)),
                    },
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                });
                // Update or create service session
                const activeSession = await tx.serviceSession.findFirst({
                    where: {
                        staffId: request.staffId,
                        endedAt: null,
                    },
                });
                if (!activeSession) {
                    await tx.serviceSession.create({
                        data: {
                            staffId: request.staffId,
                            organizationId,
                            startedAt: new Date(),
                        },
                    });
                }
                // Log the action
                await tx.systemLog.create({
                    data: {
                        organizationId,
                        userId: request.staffId,
                        action: "token_called",
                        entityType: "token",
                        entityId: updatedToken.id,
                        details: {
                            tokenNumber: updatedToken.number,
                            counterId: request.counterId,
                            actualWaitTime: updatedToken.actualWaitTime,
                        },
                    },
                });
                return updatedToken;
            });
            // Emit real-time updates
            app_2.io.to(`org:${organizationId}`).emit("token:called", result);
            app_2.io.to(`org:${organizationId}`).emit("queue:updated", await this.getQueueStatus(organizationId));
            logger_1.logger.info("Token called successfully", {
                tokenId: result.id,
                tokenNumber: result.number,
                staffId: request.staffId,
                counterId: request.counterId,
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error("Failed to call next token", {
                error: error.message,
                request,
                organizationId,
            });
            throw error;
        }
    }
    async completeService(request, organizationId) {
        try {
            logger_1.logger.info("Completing service", { request, organizationId });
            const result = await app_1.prisma.$transaction(async (tx) => {
                // Find the token
                const token = await tx.token.findFirst({
                    where: {
                        id: request.tokenId,
                        organizationId,
                        status: { in: [client_1.TokenStatus.called, client_1.TokenStatus.serving] },
                    },
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                });
                if (!token) {
                    throw new errors_1.NotFoundError("Token not found or not in serviceable state");
                }
                // Calculate service duration
                const serviceDuration = token.calledAt
                    ? Math.floor((new Date().getTime() - token.calledAt.getTime()) / (1000 * 60))
                    : 0;
                // Update token status
                const updatedToken = await tx.token.update({
                    where: { id: request.tokenId },
                    data: {
                        status: client_1.TokenStatus.completed,
                        completedAt: new Date(),
                        servedBy: request.staffId,
                        serviceDuration: request.serviceDuration || serviceDuration,
                        notes: request.notes || token.notes,
                        metadata: {
                            ...token.metadata,
                            ...(request.rating && { rating: request.rating }),
                        },
                    },
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                });
                // Update service session
                const activeSession = await tx.serviceSession.findFirst({
                    where: {
                        staffId: request.staffId,
                        endedAt: null,
                    },
                });
                if (activeSession) {
                    const newTokensServed = activeSession.tokensServed + 1;
                    const currentAvg = activeSession.averageServiceTime?.toNumber() || 0;
                    const newAvg = currentAvg === 0
                        ? serviceDuration
                        : (currentAvg * (newTokensServed - 1) + serviceDuration) /
                            newTokensServed;
                    await tx.serviceSession.update({
                        where: { id: activeSession.id },
                        data: {
                            tokensServed: newTokensServed,
                            averageServiceTime: newAvg,
                        },
                    });
                }
                // Log the action
                await tx.systemLog.create({
                    data: {
                        organizationId,
                        userId: request.staffId,
                        action: "service_completed",
                        entityType: "token",
                        entityId: updatedToken.id,
                        details: {
                            tokenNumber: updatedToken.number,
                            serviceDuration: updatedToken.serviceDuration,
                            rating: request.rating,
                        },
                    },
                });
                return updatedToken;
            });
            // Emit real-time updates
            app_2.io.to(`org:${organizationId}`).emit("token:completed", result);
            app_2.io.to(`org:${organizationId}`).emit("queue:updated", await this.getQueueStatus(organizationId));
            logger_1.logger.info("Service completed successfully", {
                tokenId: result.id,
                tokenNumber: result.number,
                serviceDuration: result.serviceDuration,
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error("Failed to complete service", {
                error: error.message,
                request,
                organizationId,
            });
            throw error;
        }
    }
    async markNoShow(request, organizationId) {
        try {
            logger_1.logger.info("Marking token as no-show", { request, organizationId });
            const result = await app_1.prisma.$transaction(async (tx) => {
                const updatedToken = await tx.token.update({
                    where: {
                        id: request.tokenId,
                        organizationId,
                        status: { in: [client_1.TokenStatus.called, client_1.TokenStatus.serving] },
                    },
                    data: {
                        status: client_1.TokenStatus.no_show,
                        cancelledAt: new Date(),
                        notes: request.notes,
                    },
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                });
                // Log the action
                await tx.systemLog.create({
                    data: {
                        organizationId,
                        userId: request.staffId,
                        action: "token_no_show",
                        entityType: "token",
                        entityId: updatedToken.id,
                        details: {
                            tokenNumber: updatedToken.number,
                            notes: request.notes,
                        },
                    },
                });
                return updatedToken;
            });
            // Emit real-time updates
            app_2.io.to(`org:${organizationId}`).emit("token:no_show", result);
            app_2.io.to(`org:${organizationId}`).emit("queue:updated", await this.getQueueStatus(organizationId));
            logger_1.logger.info("Token marked as no-show", {
                tokenId: result.id,
                tokenNumber: result.number,
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error("Failed to mark token as no-show", {
                error: error.message,
                request,
                organizationId,
            });
            throw error;
        }
    }
    async recallToken(request, organizationId) {
        try {
            logger_1.logger.info("Recalling token", { request, organizationId });
            const result = await app_1.prisma.$transaction(async (tx) => {
                const updatedToken = await tx.token.update({
                    where: {
                        id: request.tokenId,
                        organizationId,
                        status: client_1.TokenStatus.no_show,
                    },
                    data: {
                        status: client_1.TokenStatus.called,
                        calledAt: new Date(),
                        cancelledAt: null,
                        servedBy: request.staffId,
                        counterId: request.counterId,
                    },
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                });
                // Log the action
                await tx.systemLog.create({
                    data: {
                        organizationId,
                        userId: request.staffId,
                        action: "token_recalled",
                        entityType: "token",
                        entityId: updatedToken.id,
                        details: {
                            tokenNumber: updatedToken.number,
                            counterId: request.counterId,
                        },
                    },
                });
                return updatedToken;
            });
            // Emit real-time updates
            app_2.io.to(`org:${organizationId}`).emit("token:recalled", result);
            app_2.io.to(`org:${organizationId}`).emit("queue:updated", await this.getQueueStatus(organizationId));
            logger_1.logger.info("Token recalled successfully", {
                tokenId: result.id,
                tokenNumber: result.number,
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error("Failed to recall token", {
                error: error.message,
                request,
                organizationId,
            });
            throw error;
        }
    }
    async getQueueStatus(organizationId, counterId) {
        try {
            const whereClause = {
                organizationId,
                ...(counterId && { counterId }),
            };
            const [currentServing, nextInQueue, recentlyServed, noShowQueue, counters,] = await Promise.all([
                // Current serving tokens
                app_1.prisma.token.findMany({
                    where: {
                        ...whereClause,
                        status: { in: [client_1.TokenStatus.called, client_1.TokenStatus.serving] },
                    },
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                    orderBy: { calledAt: "desc" },
                }),
                // Next in queue
                app_1.prisma.token.findMany({
                    where: {
                        ...whereClause,
                        status: client_1.TokenStatus.waiting,
                    },
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
                    take: 10,
                }),
                // Recently served
                app_1.prisma.token.findMany({
                    where: {
                        ...whereClause,
                        status: client_1.TokenStatus.completed,
                        completedAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                        },
                    },
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                    orderBy: { completedAt: "desc" },
                    take: 10,
                }),
                // No-show queue
                app_1.prisma.token.findMany({
                    where: {
                        ...whereClause,
                        status: client_1.TokenStatus.no_show,
                        cancelledAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                        },
                    },
                    include: {
                        counter: true,
                        staff: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                    orderBy: { cancelledAt: "desc" },
                    take: 10,
                }),
                // Counter information
                app_1.prisma.counter.findMany({
                    where: {
                        organizationId,
                        isActive: true,
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
                }),
            ]);
            const stats = await this.getQueueStats(organizationId, counterId);
            // Get queue settings
            const queueSettingsRaw = await app_1.prisma.queueSetting.findMany({
                where: { organizationId, isActive: true },
            });
            // Transform queue settings to ensure proper types
            const queueSettings = queueSettingsRaw.map((setting) => ({
                ...setting,
                priorityMultiplier: setting.priorityMultiplier.toNumber(),
            }));
            // Transform data to match frontend schema
            const transformedCounters = await Promise.all(counters.map(async (counter) => {
                const currentToken = currentServing.find((t) => t.counterId === counter.id) || null;
                const nextTokens = nextInQueue.filter((t) => !t.counterId || t.counterId === counter.id);
                const waitingCount = nextTokens.length;
                const averageServiceTime = await this.getCounterAverageServiceTime(counter.id);
                return {
                    counter: {
                        id: counter.id,
                        organizationId: counter.organizationId,
                        name: counter.name,
                        isActive: counter.isActive,
                        assignedStaffId: counter.assignedStaffId,
                        assignedStaff: counter.assignedStaff
                            ? {
                                id: counter.assignedStaff.id,
                                username: counter.assignedStaff.username,
                                role: counter.assignedStaff.role,
                            }
                            : null,
                    },
                    currentToken,
                    nextTokens,
                    waitingCount,
                    averageServiceTime,
                };
            }));
            return {
                organizationId,
                counters: transformedCounters,
                summary: {
                    totalWaiting: stats.totalWaiting,
                    totalServing: stats.totalServing,
                    totalCompleted: stats.totalCompleted,
                    averageWaitTime: stats.averageWaitTime,
                },
                queueSettings,
            };
        }
        catch (error) {
            logger_1.logger.error("Failed to get queue status", {
                error: error.message,
                organizationId,
            });
            throw error;
        }
    }
    async getQueueStats(organizationId, counterId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const whereClause = {
            organizationId,
            createdAt: { gte: today },
            ...(counterId && { counterId }),
        };
        const [totalWaiting, totalServing, totalCompleted, totalNoShow, completedTokens,] = await Promise.all([
            app_1.prisma.token.count({
                where: { ...whereClause, status: client_1.TokenStatus.waiting },
            }),
            app_1.prisma.token.count({
                where: {
                    ...whereClause,
                    status: { in: [client_1.TokenStatus.called, client_1.TokenStatus.serving] },
                },
            }),
            app_1.prisma.token.count({
                where: { ...whereClause, status: client_1.TokenStatus.completed },
            }),
            app_1.prisma.token.count({
                where: { ...whereClause, status: client_1.TokenStatus.no_show },
            }),
            app_1.prisma.token.findMany({
                where: {
                    ...whereClause,
                    status: client_1.TokenStatus.completed,
                    calledAt: { not: null },
                    completedAt: { not: null },
                    actualWaitTime: { not: null },
                    serviceDuration: { not: null },
                },
                select: {
                    actualWaitTime: true,
                    serviceDuration: true,
                    createdAt: true,
                },
            }),
        ]);
        const averageWaitTime = completedTokens.length > 0
            ? completedTokens.reduce((sum, token) => sum + (token.actualWaitTime || 0), 0) / completedTokens.length
            : 0;
        const averageServiceTime = completedTokens.length > 0
            ? completedTokens.reduce((sum, token) => sum + (token.serviceDuration || 0), 0) / completedTokens.length
            : 0;
        // Calculate peak hour
        const hourCounts = completedTokens.reduce((acc, token) => {
            const hour = token.createdAt.getHours();
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});
        const peakHour = Object.keys(hourCounts).reduce((a, b) => (hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b), "0");
        // Estimate wait time for next customer
        const estimatedWaitTime = totalWaiting > 0 && averageServiceTime > 0
            ? Math.ceil((totalWaiting * averageServiceTime) / Math.max(totalServing, 1))
            : 0;
        return {
            totalWaiting,
            totalServing,
            totalCompleted,
            totalNoShow,
            averageWaitTime: Math.round(averageWaitTime),
            averageServiceTime: Math.round(averageServiceTime),
            peakHour: `${peakHour}:00`,
            estimatedWaitTime,
        };
    }
    async calculateEstimatedWaitTime(organizationId, customerType, priority, counterId) {
        // Get average service time for this customer type
        const avgServiceTime = await this.getAverageServiceTime(organizationId, customerType);
        // Count tokens ahead in queue with higher or equal priority
        const tokensAhead = await app_1.prisma.token.count({
            where: {
                organizationId,
                status: client_1.TokenStatus.waiting,
                OR: [
                    { priority: { gt: priority } },
                    { priority: priority, createdAt: { lt: new Date() } },
                ],
                ...(counterId && {
                    OR: [{ counterId: counterId }, { counterId: null }],
                }),
            },
        });
        // Get number of active counters for this customer type
        const activeCounters = await app_1.prisma.counter.count({
            where: {
                organizationId,
                isActive: true,
                ...(counterId && { id: counterId }),
            },
        });
        const estimatedWait = tokensAhead > 0 && activeCounters > 0
            ? Math.ceil((tokensAhead * avgServiceTime) / activeCounters)
            : 0;
        return estimatedWait;
    }
    async getAverageServiceTime(organizationId, customerType) {
        const recentTokens = await app_1.prisma.token.findMany({
            where: {
                organizationId,
                customerType,
                status: client_1.TokenStatus.completed,
                serviceDuration: { not: null },
                completedAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                },
            },
            select: {
                serviceDuration: true,
            },
            take: 50,
        });
        if (recentTokens.length === 0) {
            // Default estimated service times by customer type
            const defaults = {
                [client_1.CustomerType.instant]: 3,
                [client_1.CustomerType.browser]: 5,
                [client_1.CustomerType.retail]: 8,
            };
            return defaults[customerType] || 5;
        }
        const total = recentTokens.reduce((sum, token) => sum + (token.serviceDuration || 0), 0);
        return Math.ceil(total / recentTokens.length);
    }
    async getCounterAverageServiceTime(counterId) {
        const recentTokens = await app_1.prisma.token.findMany({
            where: {
                counterId,
                status: client_1.TokenStatus.completed,
                serviceDuration: { not: null },
                completedAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
            },
            select: {
                serviceDuration: true,
            },
            take: 20,
        });
        if (recentTokens.length === 0)
            return 0;
        const total = recentTokens.reduce((sum, token) => sum + (token.serviceDuration || 0), 0);
        return Math.ceil(total / recentTokens.length);
    }
}
exports.TokenService = TokenService;
exports.tokenService = new TokenService();
//# sourceMappingURL=tokenService.js.map