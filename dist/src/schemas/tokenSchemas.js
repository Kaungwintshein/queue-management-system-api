"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenAnalyticsResponseSchema = exports.tokenAnalyticsQuerySchema = exports.bulkDeleteTokensSchema = exports.bulkUpdateTokensSchema = exports.queueStatusSchema = exports.getTokensQuerySchema = exports.cancelTokenRequestSchema = exports.recallTokenRequestSchema = exports.markNoShowRequestSchema = exports.completeServiceRequestSchema = exports.callNextRequestSchema = exports.updateTokenRequestSchema = exports.createTokenRequestSchema = exports.tokenSchema = exports.tokenStatusSchema = exports.customerTypeSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
// Enums validation
exports.customerTypeSchema = zod_1.z.nativeEnum(client_1.CustomerType);
exports.tokenStatusSchema = zod_1.z.nativeEnum(client_1.TokenStatus);
// Base token schema
exports.tokenSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    organizationId: zod_1.z.string().uuid(),
    counterId: zod_1.z.string().uuid().optional().nullable(),
    number: zod_1.z.string().min(1).max(10),
    customerType: exports.customerTypeSchema,
    status: exports.tokenStatusSchema,
    priority: zod_1.z.number().int().min(0).max(10),
    createdAt: zod_1.z.date(),
    calledAt: zod_1.z.date().optional().nullable(),
    servedAt: zod_1.z.date().optional().nullable(),
    completedAt: zod_1.z.date().optional().nullable(),
    cancelledAt: zod_1.z.date().optional().nullable(),
    servedBy: zod_1.z.string().uuid().optional().nullable(),
    estimatedWaitTime: zod_1.z.number().int().min(0).optional().nullable(),
    actualWaitTime: zod_1.z.number().int().min(0).optional().nullable(),
    serviceDuration: zod_1.z.number().int().min(0).optional().nullable(),
    notes: zod_1.z.string().max(1000).optional().nullable(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// Create token request schema
exports.createTokenRequestSchema = zod_1.z.object({
    customerType: exports.customerTypeSchema,
    priority: zod_1.z.number().int().min(0).max(10).optional().default(0),
    counterId: zod_1.z.string().uuid().optional(),
    notes: zod_1.z.string().max(1000).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional().default({}),
});
// Update token request schema
exports.updateTokenRequestSchema = zod_1.z.object({
    status: exports.tokenStatusSchema.optional(),
    priority: zod_1.z.number().int().min(0).max(10).optional(),
    counterId: zod_1.z.string().uuid().optional().nullable(),
    notes: zod_1.z.string().max(1000).optional().nullable(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// Call next token request schema
exports.callNextRequestSchema = zod_1.z.object({
    customerType: exports.customerTypeSchema.optional(),
    counterId: zod_1.z.string().uuid(),
    staffId: zod_1.z.string().uuid(),
});
// Complete service request schema
exports.completeServiceRequestSchema = zod_1.z.object({
    tokenId: zod_1.z.string().uuid(),
    staffId: zod_1.z.string().uuid(),
    notes: zod_1.z.string().max(1000).optional(),
    rating: zod_1.z.number().int().min(1).max(5).optional(),
    serviceDuration: zod_1.z.number().int().min(0).optional(),
});
// Mark no-show request schema
exports.markNoShowRequestSchema = zod_1.z.object({
    tokenId: zod_1.z.string().uuid(),
    staffId: zod_1.z.string().uuid(),
    notes: zod_1.z.string().max(1000).optional(),
});
// Recall token request schema
exports.recallTokenRequestSchema = zod_1.z.object({
    tokenId: zod_1.z.string().uuid(),
    counterId: zod_1.z.string().uuid(),
    staffId: zod_1.z.string().uuid(),
});
// Cancel token request schema
exports.cancelTokenRequestSchema = zod_1.z.object({
    tokenId: zod_1.z.string().uuid(),
    reason: zod_1.z.string().max(500).optional(),
    staffId: zod_1.z.string().uuid().optional(),
});
// Get tokens query schema
exports.getTokensQuerySchema = zod_1.z.object({
    status: zod_1.z.array(exports.tokenStatusSchema).optional(),
    customerType: zod_1.z.array(exports.customerTypeSchema).optional(),
    counterId: zod_1.z.string().uuid().optional(),
    staffId: zod_1.z.string().uuid().optional(),
    fromDate: zod_1.z.string().datetime().optional(),
    toDate: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(20),
    offset: zod_1.z.number().int().min(0).optional().default(0),
    sortBy: zod_1.z
        .enum(["createdAt", "calledAt", "completedAt", "priority"])
        .optional()
        .default("createdAt"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).optional().default("desc"),
});
// Queue status response schema
exports.queueStatusSchema = zod_1.z.object({
    currentServing: zod_1.z.array(exports.tokenSchema),
    nextInQueue: zod_1.z.array(exports.tokenSchema),
    recentlyServed: zod_1.z.array(exports.tokenSchema),
    noShowQueue: zod_1.z.array(exports.tokenSchema),
    stats: zod_1.z.object({
        totalWaiting: zod_1.z.number().int().min(0),
        totalServing: zod_1.z.number().int().min(0),
        totalCompleted: zod_1.z.number().int().min(0),
        totalNoShow: zod_1.z.number().int().min(0),
        averageWaitTime: zod_1.z.number().min(0),
        averageServiceTime: zod_1.z.number().min(0),
        peakHour: zod_1.z.string().optional(),
        estimatedWaitTime: zod_1.z.number().min(0).optional(),
    }),
    counterStats: zod_1.z.array(zod_1.z.object({
        counterId: zod_1.z.string().uuid(),
        counterName: zod_1.z.string(),
        currentServing: exports.tokenSchema.optional().nullable(),
        queueLength: zod_1.z.number().int().min(0),
        averageServiceTime: zod_1.z.number().min(0),
        isActive: zod_1.z.boolean(),
        staffName: zod_1.z.string().optional(),
    })),
});
// Bulk operations schemas
exports.bulkUpdateTokensSchema = zod_1.z.object({
    tokenIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(50),
    updates: exports.updateTokenRequestSchema,
    staffId: zod_1.z.string().uuid(),
});
exports.bulkDeleteTokensSchema = zod_1.z.object({
    tokenIds: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(50),
    reason: zod_1.z.string().max(500).optional(),
    staffId: zod_1.z.string().uuid(),
});
// Analytics schemas
exports.tokenAnalyticsQuerySchema = zod_1.z.object({
    fromDate: zod_1.z.string().datetime(),
    toDate: zod_1.z.string().datetime(),
    customerType: zod_1.z.array(exports.customerTypeSchema).optional(),
    counterId: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    groupBy: zod_1.z.enum(["hour", "day", "week", "month"]).optional().default("day"),
});
exports.tokenAnalyticsResponseSchema = zod_1.z.object({
    period: zod_1.z.string(),
    totalTokens: zod_1.z.number().int().min(0),
    completedTokens: zod_1.z.number().int().min(0),
    cancelledTokens: zod_1.z.number().int().min(0),
    noShowTokens: zod_1.z.number().int().min(0),
    averageWaitTime: zod_1.z.number().min(0),
    averageServiceTime: zod_1.z.number().min(0),
    peakHour: zod_1.z.string().optional(),
    customerTypeBreakdown: zod_1.z.record(exports.customerTypeSchema, zod_1.z.number().int().min(0)),
    counterBreakdown: zod_1.z.record(zod_1.z.string(), zod_1.z.number().int().min(0)),
});
//# sourceMappingURL=tokenSchemas.js.map