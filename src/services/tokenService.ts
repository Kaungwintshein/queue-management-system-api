import { prisma } from "@/app";
import {
  CustomerType,
  TokenStatus,
  Prisma,
  Token,
  Counter,
  User,
  QueueSetting,
} from "@prisma/client";
import {
  AppError,
  NotFoundError,
  ValidationError,
  DatabaseError,
} from "@/utils/errors";
import { logger } from "@/utils/logger";
import { io } from "@/app";
import {
  CreateTokenRequest,
  UpdateTokenRequest,
  GetTokensQuery,
  CallNextRequest,
  CompleteServiceRequest,
  MarkNoShowRequest,
  RecallTokenRequest,
  CancelTokenRequest,
} from "@/schemas/tokenSchemas";

// Type definitions for service responses
export interface QueueStats {
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  totalNoShow: number;
  averageWaitTime: number | null;
  averageServiceTime: number;
  peakHour: string;
  estimatedWaitTime: number;
}

export interface CounterWithDetails {
  counter: {
    id: string;
    organizationId: string;
    name: string;
    isActive: boolean;
    assignedStaffId: string | null;
    assignedStaff: {
      id: string;
      username: string;
      role: string;
    } | null;
  };
  currentToken: Token | null;
  nextTokens: Token[];
  waitingCount: number;
  averageServiceTime: number | null;
}

export interface QueueStatusResponse {
  organizationId: string;
  counters: CounterWithDetails[];
  summary: {
    totalWaiting: number;
    totalServing: number;
    totalCompleted: number;
    averageWaitTime: number | null;
  };
  queueSettings: Array<QueueSetting>;
}

export interface TokenCreationResponse {
  token: Token;
  position: number;
  estimatedWaitTime: number | null;
}

export interface ServiceResult {
  token: Token;
  serviceDuration?: number;
}

export class TokenService {
  private async getTokenPosition(
    tokenId: string,
    organizationId: string
  ): Promise<number> {
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      select: { customerType: true, priority: true, createdAt: true },
    });

    if (!token) {
      return 0;
    }

    // Count tokens of the same type and priority that were created before this token
    const position = await prisma.token.count({
      where: {
        organizationId,
        customerType: token.customerType,
        priority: token.priority,
        status: "waiting",
        createdAt: {
          lt: token.createdAt,
        },
      },
    });

    return position + 1; // Position is 1-based
  }

  async createToken(
    request: CreateTokenRequest,
    organizationId: string,
    staffId?: string
  ): Promise<TokenCreationResponse> {
    try {
      logger.info("Creating token", {
        customerType: request.customerType,
        organizationId,
        staffId,
      });

      // Get queue settings for the customer type
      const settings = await prisma.queueSetting.findFirst({
        where: {
          organizationId,
          customerType: request.customerType,
          isActive: true,
        },
      });

      if (!settings) {
        throw new NotFoundError(
          `Queue not active for customer type: ${request.customerType}`
        );
      }

      // Generate token number with atomic increment
      const updatedSettings = await prisma.queueSetting.update({
        where: { id: settings.id },
        data: { currentNumber: { increment: 1 } },
      });

      const tokenNumber = `${settings.prefix}${updatedSettings.currentNumber
        .toString()
        .padStart(3, "0")}`;

      // Create token with transaction
      const token = await prisma.$transaction(async (tx) => {
        // Create the token
        const newToken = await tx.token.create({
          data: {
            organizationId,
            number: tokenNumber,
            customerType: request.customerType,
            priority: request.priority || 0,
            status: TokenStatus.waiting,
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
      const estimatedWaitTime = await this.calculateEstimatedWaitTime(
        organizationId,
        request.customerType,
        request.priority || 0,
        request.counterId
      );

      // Calculate position in queue
      const position = await this.getTokenPosition(token.id, organizationId);

      const response: TokenCreationResponse = {
        token,
        position,
        estimatedWaitTime,
      };

      // Emit real-time update
      io.to(`org:${organizationId}`).emit("token:created", response);
      io.to(`org:${organizationId}`).emit(
        "queue:updated",
        await this.getQueueStatus(organizationId)
      );

      logger.info("Token created successfully", {
        tokenId: token.id,
        tokenNumber: token.number,
        position,
        estimatedWaitTime,
      });

      return response;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Failed to create token", {
        error: errorMessage,
        request,
        organizationId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError("Failed to create token", {
        originalError: errorMessage,
      });
    }
  }

  async callNextToken(
    request: CallNextRequest,
    organizationId: string
  ): Promise<Token | null> {
    try {
      logger.info("Calling next token", { request, organizationId });

      const result = await prisma.$transaction(async (tx) => {
        // Build where clause for finding next token
        const whereClause: Prisma.TokenWhereInput = {
          organizationId,
          status: TokenStatus.waiting,
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
          throw new NotFoundError("No tokens in queue");
        }

        // Update token status and assignment
        const updatedToken = await tx.token.update({
          where: { id: nextToken.id },
          data: {
            status: TokenStatus.called,
            calledAt: new Date(),
            servedBy: request.staffId,
            counterId: request.counterId,
            actualWaitTime: Math.floor(
              (new Date().getTime() - nextToken.createdAt.getTime()) /
                (1000 * 60)
            ),
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
      logger.info("Emitting token:called event", {
        tokenId: result.id,
        tokenNumber: result.number,
        organizationId,
        counterId: result.counterId,
      });

      io.to(`org:${organizationId}`).emit("token:called", result);

      // Small delay to ensure database transaction is committed
      setTimeout(async () => {
        const queueStatus = await this.getQueueStatus(organizationId);
        logger.info("Emitting queue:updated event", {
          organizationId,
          countersCount: queueStatus.counters?.length || 0,
        });
        io.to(`org:${organizationId}`).emit("queue:updated", queueStatus);
      }, 10); // Reduced from 50ms to 10ms

      logger.info("Token called successfully", {
        tokenId: result.id,
        tokenNumber: result.number,
        staffId: request.staffId,
        counterId: request.counterId,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Failed to call next token", {
        error: errorMessage,
        request,
        organizationId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError("Failed to call next token", {
        originalError: errorMessage,
      });
    }
  }

  async startServing(
    request: { tokenId: string; staffId: string },
    organizationId: string
  ): Promise<Token> {
    try {
      logger.info("Starting service for token", {
        tokenId: request.tokenId,
        staffId: request.staffId,
        organizationId,
      });

      const token = await prisma.token.findFirst({
        where: {
          id: request.tokenId,
          organizationId,
          status: TokenStatus.called,
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
        throw new NotFoundError("Token not in called status");
      }

      const updatedToken = await prisma.token.update({
        where: { id: request.tokenId },
        data: {
          status: TokenStatus.serving,
          servedAt: new Date(),
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

      // Emit real-time update
      logger.info("Emitting token:serving event", {
        tokenId: updatedToken.id,
        tokenNumber: updatedToken.number,
        organizationId,
        counterId: updatedToken.counterId,
      });

      io.to(`org:${organizationId}`).emit("token:serving", updatedToken);

      // Small delay to ensure database transaction is committed
      setTimeout(async () => {
        const queueStatus = await this.getQueueStatus(organizationId);
        logger.info("Emitting queue:updated event", {
          organizationId,
          countersCount: queueStatus.counters?.length || 0,
        });
        io.to(`org:${organizationId}`).emit("queue:updated", queueStatus);
      }, 10); // Reduced from 50ms to 10ms

      logger.info("Service started for token", {
        tokenId: updatedToken.id,
        tokenNumber: updatedToken.number,
        staffId: request.staffId,
      });

      return updatedToken;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Failed to start service", {
        error: errorMessage,
        request,
        organizationId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError("Failed to start service", {
        originalError: errorMessage,
      });
    }
  }

  async completeService(
    request: CompleteServiceRequest,
    organizationId: string
  ): Promise<ServiceResult> {
    try {
      logger.info("Completing service", { request, organizationId });

      const result = await prisma.$transaction(async (tx) => {
        // Find the token
        const token = await tx.token.findFirst({
          where: {
            id: request.tokenId,
            organizationId,
            status: { in: [TokenStatus.called, TokenStatus.serving] },
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

        // Debug logging
        logger.info("Token lookup for complete service", {
          tokenId: request.tokenId,
          organizationId,
          tokenFound: !!token,
          tokenStatus: token?.status,
          foundTokenId: token?.id,
        });

        if (!token) {
          // Check if token exists at all
          const anyToken = await tx.token.findFirst({
            where: {
              id: request.tokenId,
              organizationId,
            },
          });

          logger.warn("Token not found for complete service", {
            tokenId: request.tokenId,
            organizationId,
            tokenExists: !!anyToken,
            actualStatus: anyToken?.status,
          });

          throw new NotFoundError("Token not in serviceable state");
        }

        // Calculate service duration
        const serviceDuration = token.calledAt
          ? Math.floor(
              (new Date().getTime() - token.calledAt.getTime()) / (1000 * 60)
            )
          : 0;

        // Update token status
        const updatedToken = await tx.token.update({
          where: { id: request.tokenId },
          data: {
            status: TokenStatus.completed,
            completedAt: new Date(),
            servedBy: request.staffId,
            serviceDuration: request.serviceDuration || serviceDuration,
            notes: request.notes || token.notes,
            metadata: {
              ...(token.metadata as Record<string, any>),
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
          const newAvg =
            currentAvg === 0
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

        return {
          token: updatedToken,
          serviceDuration: updatedToken.serviceDuration || 0,
        };
      });

      // Emit real-time updates
      io.to(`org:${organizationId}`).emit("token:completed", result.token);

      // Small delay to ensure database transaction is committed
      setTimeout(async () => {
        const queueStatus = await this.getQueueStatus(organizationId);
        io.to(`org:${organizationId}`).emit("queue:updated", queueStatus);
      }, 10); // Reduced from 50ms to 10ms

      logger.info("Service completed successfully", {
        tokenId: result.token.id,
        tokenNumber: result.token.number,
        serviceDuration: result.serviceDuration,
      });

      return {
        token: result.token,
        serviceDuration: result.serviceDuration || 0,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Failed to complete service", {
        error: errorMessage,
        request,
        organizationId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError("Failed to complete service", {
        originalError: errorMessage,
      });
    }
  }

  async markNoShow(
    request: MarkNoShowRequest,
    organizationId: string
  ): Promise<Token> {
    try {
      logger.info("Marking token as no-show", { request, organizationId });

      const result = await prisma.$transaction(async (tx) => {
        const updatedToken = await tx.token.update({
          where: {
            id: request.tokenId,
            organizationId,
            status: { in: [TokenStatus.called, TokenStatus.serving] },
          },
          data: {
            status: TokenStatus.no_show,
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
      io.to(`org:${organizationId}`).emit("token:no_show", result);
      io.to(`org:${organizationId}`).emit(
        "queue:updated",
        await this.getQueueStatus(organizationId)
      );

      logger.info("Token marked as no-show", {
        tokenId: result.id,
        tokenNumber: result.number,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Failed to mark token as no-show", {
        error: errorMessage,
        request,
        organizationId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError("Failed to mark token as no-show", {
        originalError: errorMessage,
      });
    }
  }

  async recallToken(
    request: RecallTokenRequest,
    organizationId: string
  ): Promise<Token> {
    try {
      logger.info("Recalling token", { request, organizationId });

      const result = await prisma.$transaction(async (tx) => {
        const updatedToken = await tx.token.update({
          where: {
            id: request.tokenId,
            organizationId,
            status: TokenStatus.no_show,
          },
          data: {
            status: TokenStatus.called,
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
      io.to(`org:${organizationId}`).emit("token:recalled", result);
      io.to(`org:${organizationId}`).emit(
        "queue:updated",
        await this.getQueueStatus(organizationId)
      );

      logger.info("Token recalled successfully", {
        tokenId: result.id,
        tokenNumber: result.number,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Failed to recall token", {
        error: errorMessage,
        request,
        organizationId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError("Failed to recall token", {
        originalError: errorMessage,
      });
    }
  }

  async getQueueStatus(
    organizationId: string,
    counterId?: string
  ): Promise<QueueStatusResponse> {
    try {
      const whereClause: Prisma.TokenWhereInput = {
        organizationId,
        ...(counterId && { counterId }),
      };

      const [
        currentServing,
        nextInQueue,
        recentlyServed,
        noShowQueue,
        counters,
      ] = await Promise.all([
        // Current serving tokens
        prisma.token.findMany({
          where: {
            ...whereClause,
            status: { in: [TokenStatus.called, TokenStatus.serving] },
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
        prisma.token.findMany({
          where: {
            ...whereClause,
            status: TokenStatus.waiting,
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
        prisma.token.findMany({
          where: {
            ...whereClause,
            status: TokenStatus.completed,
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
        prisma.token.findMany({
          where: {
            ...whereClause,
            status: TokenStatus.no_show,
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
        prisma.counter.findMany({
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
      const queueSettingsRaw = await prisma.queueSetting.findMany({
        where: { organizationId, isActive: true },
      });

      // Use queue settings as-is (keeping Decimal type)
      const queueSettings = queueSettingsRaw;

      // Transform data to match frontend schema
      const transformedCounters = await Promise.all(
        counters.map(async (counter) => {
          const currentToken =
            currentServing.find((t) => t.counterId === counter.id) || null;
          const nextTokens = nextInQueue.filter(
            (t) => !t.counterId || t.counterId === counter.id
          );
          const waitingCount = nextTokens.length;
          const averageServiceTime = await this.getCounterAverageServiceTime(
            counter.id
          );

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
        })
      );

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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Failed to get queue status", {
        error: errorMessage,
        organizationId,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new DatabaseError("Failed to get queue status", {
        originalError: errorMessage,
      });
    }
  }

  private async getQueueStats(
    organizationId: string,
    counterId?: string
  ): Promise<QueueStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause: Prisma.TokenWhereInput = {
      organizationId,
      createdAt: { gte: today },
      ...(counterId && { counterId }),
    };

    const [
      totalWaiting,
      totalServing,
      totalCompleted,
      totalNoShow,
      completedTokens,
    ] = await Promise.all([
      prisma.token.count({
        where: { ...whereClause, status: TokenStatus.waiting },
      }),

      prisma.token.count({
        where: {
          ...whereClause,
          status: { in: [TokenStatus.called, TokenStatus.serving] },
        },
      }),

      prisma.token.count({
        where: { ...whereClause, status: TokenStatus.completed },
      }),

      prisma.token.count({
        where: { ...whereClause, status: TokenStatus.no_show },
      }),

      prisma.token.findMany({
        where: {
          ...whereClause,
          status: TokenStatus.completed,
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

    const averageWaitTime =
      completedTokens.length > 0
        ? completedTokens.reduce(
            (sum, token) => sum + (token.actualWaitTime || 0),
            0
          ) / completedTokens.length
        : 0;

    const averageServiceTime =
      completedTokens.length > 0
        ? completedTokens.reduce(
            (sum, token) => sum + (token.serviceDuration || 0),
            0
          ) / completedTokens.length
        : 0;

    // Calculate peak hour
    const hourCounts = completedTokens.reduce((acc, token) => {
      const hour = token.createdAt.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHour = Object.keys(hourCounts).reduce(
      (a, b) => (hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b),
      "0"
    );

    // Estimate wait time for next customer
    const estimatedWaitTime =
      totalWaiting > 0 && averageServiceTime > 0
        ? Math.ceil(
            (totalWaiting * averageServiceTime) / Math.max(totalServing, 1)
          )
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

  private async calculateEstimatedWaitTime(
    organizationId: string,
    customerType: CustomerType,
    priority: number,
    counterId?: string
  ): Promise<number> {
    // Get average service time for this customer type
    const avgServiceTime = await this.getAverageServiceTime(
      organizationId,
      customerType
    );

    // Count tokens ahead in queue with higher or equal priority
    const tokensAhead = await prisma.token.count({
      where: {
        organizationId,
        status: TokenStatus.waiting,
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
    const activeCounters = await prisma.counter.count({
      where: {
        organizationId,
        isActive: true,
        ...(counterId && { id: counterId }),
      },
    });

    const estimatedWait =
      tokensAhead > 0 && activeCounters > 0
        ? Math.ceil((tokensAhead * avgServiceTime) / activeCounters)
        : 0;

    return estimatedWait;
  }

  private async getAverageServiceTime(
    organizationId: string,
    customerType: CustomerType
  ): Promise<number> {
    const recentTokens = await prisma.token.findMany({
      where: {
        organizationId,
        customerType,
        status: TokenStatus.completed,
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
        [CustomerType.instant]: 3,
        [CustomerType.browser]: 5,
        [CustomerType.retail]: 8,
      };
      return defaults[customerType] || 5;
    }

    const total = recentTokens.reduce(
      (sum, token) => sum + (token.serviceDuration || 0),
      0
    );
    return Math.ceil(total / recentTokens.length);
  }

  private async getCounterAverageServiceTime(
    counterId: string
  ): Promise<number> {
    const recentTokens = await prisma.token.findMany({
      where: {
        counterId,
        status: TokenStatus.completed,
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

    if (recentTokens.length === 0) return 0;

    const total = recentTokens.reduce(
      (sum, token) => sum + (token.serviceDuration || 0),
      0
    );
    return Math.ceil(total / recentTokens.length);
  }
}

export const tokenService = new TokenService();
