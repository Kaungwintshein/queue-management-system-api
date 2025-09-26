import { z } from "zod";
import { CustomerType, TokenStatus } from "@prisma/client";

// Enums validation
export const customerTypeSchema = z.nativeEnum(CustomerType);
export const tokenStatusSchema = z.nativeEnum(TokenStatus);

// Base token schema
export const tokenSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  counterId: z.string().uuid().optional().nullable(),
  number: z.string().min(1).max(10),
  customerType: customerTypeSchema,
  status: tokenStatusSchema,
  priority: z.number().int().min(0).max(10),
  createdAt: z.date(),
  calledAt: z.date().optional().nullable(),
  servedAt: z.date().optional().nullable(),
  completedAt: z.date().optional().nullable(),
  cancelledAt: z.date().optional().nullable(),
  servedBy: z.string().uuid().optional().nullable(),
  estimatedWaitTime: z.number().int().min(0).optional().nullable(),
  actualWaitTime: z.number().int().min(0).optional().nullable(),
  serviceDuration: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  metadata: z.record(z.any()).optional(),
});

// Create token request schema
export const createTokenRequestSchema = z.object({
  customerType: customerTypeSchema,
  priority: z.number().int().min(0).max(10).optional().default(0),
  counterId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional().default({}),
});

// Update token request schema
export const updateTokenRequestSchema = z.object({
  status: tokenStatusSchema.optional(),
  priority: z.number().int().min(0).max(10).optional(),
  counterId: z.string().uuid().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  metadata: z.record(z.any()).optional(),
});

// Call next token request schema
export const callNextRequestSchema = z.object({
  customerType: customerTypeSchema.optional(),
  counterId: z.string().uuid(),
  staffId: z.string().uuid(),
});

// Complete service request schema
export const completeServiceRequestSchema = z.object({
  tokenId: z.string().uuid(),
  staffId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  serviceDuration: z.number().int().min(0).optional(),
});

// Mark no-show request schema
export const markNoShowRequestSchema = z.object({
  tokenId: z.string().uuid(),
  staffId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
});

// Recall token request schema
export const recallTokenRequestSchema = z.object({
  tokenId: z.string().uuid(),
  counterId: z.string().uuid(),
  staffId: z.string().uuid(),
});

// Cancel token request schema
export const cancelTokenRequestSchema = z.object({
  tokenId: z.string().uuid(),
  reason: z.string().max(500).optional(),
  staffId: z.string().uuid().optional(),
});

// Get tokens query schema
export const getTokensQuerySchema = z.object({
  status: z.array(tokenStatusSchema).optional(),
  customerType: z.array(customerTypeSchema).optional(),
  counterId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  sortBy: z
    .enum(["createdAt", "calledAt", "completedAt", "priority"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Queue status response schema
export const queueStatusSchema = z.object({
  currentServing: z.array(tokenSchema),
  nextInQueue: z.array(tokenSchema),
  recentlyServed: z.array(tokenSchema),
  noShowQueue: z.array(tokenSchema),
  stats: z.object({
    totalWaiting: z.number().int().min(0),
    totalServing: z.number().int().min(0),
    totalCompleted: z.number().int().min(0),
    totalNoShow: z.number().int().min(0),
    averageWaitTime: z.number().min(0),
    averageServiceTime: z.number().min(0),
    peakHour: z.string().optional(),
    estimatedWaitTime: z.number().min(0).optional(),
  }),
  counterStats: z.array(
    z.object({
      counterId: z.string().uuid(),
      counterName: z.string(),
      currentServing: tokenSchema.optional().nullable(),
      queueLength: z.number().int().min(0),
      averageServiceTime: z.number().min(0),
      isActive: z.boolean(),
      staffName: z.string().optional(),
    })
  ),
});

// Bulk operations schemas
export const bulkUpdateTokensSchema = z.object({
  tokenIds: z.array(z.string().uuid()).min(1).max(50),
  updates: updateTokenRequestSchema,
  staffId: z.string().uuid(),
});

export const bulkDeleteTokensSchema = z.object({
  tokenIds: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().max(500).optional(),
  staffId: z.string().uuid(),
});

// Analytics schemas
export const tokenAnalyticsQuerySchema = z.object({
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  customerType: z.array(customerTypeSchema).optional(),
  counterId: z.array(z.string().uuid()).optional(),
  groupBy: z.enum(["hour", "day", "week", "month"]).optional().default("day"),
});

export const tokenAnalyticsResponseSchema = z.object({
  period: z.string(),
  totalTokens: z.number().int().min(0),
  completedTokens: z.number().int().min(0),
  cancelledTokens: z.number().int().min(0),
  noShowTokens: z.number().int().min(0),
  averageWaitTime: z.number().min(0),
  averageServiceTime: z.number().min(0),
  peakHour: z.string().optional(),
  customerTypeBreakdown: z.record(customerTypeSchema, z.number().int().min(0)),
  counterBreakdown: z.record(z.string(), z.number().int().min(0)),
});

// Type exports
export type Token = z.infer<typeof tokenSchema>;
export type CreateTokenRequest = z.infer<typeof createTokenRequestSchema>;
export type UpdateTokenRequest = z.infer<typeof updateTokenRequestSchema>;
export type CallNextRequest = z.infer<typeof callNextRequestSchema>;
export type CompleteServiceRequest = z.infer<
  typeof completeServiceRequestSchema
>;
export type MarkNoShowRequest = z.infer<typeof markNoShowRequestSchema>;
export type RecallTokenRequest = z.infer<typeof recallTokenRequestSchema>;
export type CancelTokenRequest = z.infer<typeof cancelTokenRequestSchema>;
export type GetTokensQuery = z.infer<typeof getTokensQuerySchema>;
export type QueueStatus = z.infer<typeof queueStatusSchema>;
export type BulkUpdateTokens = z.infer<typeof bulkUpdateTokensSchema>;
export type BulkDeleteTokens = z.infer<typeof bulkDeleteTokensSchema>;
export type TokenAnalyticsQuery = z.infer<typeof tokenAnalyticsQuerySchema>;
export type TokenAnalyticsResponse = z.infer<
  typeof tokenAnalyticsResponseSchema
>;
