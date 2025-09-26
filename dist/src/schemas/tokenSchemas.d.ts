import { z } from "zod";
export declare const customerTypeSchema: z.ZodNativeEnum<{
    instant: "instant";
    browser: "browser";
    retail: "retail";
}>;
export declare const tokenStatusSchema: z.ZodNativeEnum<{
    waiting: "waiting";
    called: "called";
    serving: "serving";
    completed: "completed";
    cancelled: "cancelled";
    no_show: "no_show";
}>;
export declare const tokenSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    counterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    number: z.ZodString;
    customerType: z.ZodNativeEnum<{
        instant: "instant";
        browser: "browser";
        retail: "retail";
    }>;
    status: z.ZodNativeEnum<{
        waiting: "waiting";
        called: "called";
        serving: "serving";
        completed: "completed";
        cancelled: "cancelled";
        no_show: "no_show";
    }>;
    priority: z.ZodNumber;
    createdAt: z.ZodDate;
    calledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    servedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    completedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    cancelledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
    servedBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    estimatedWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    actualWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    serviceDuration: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    number: string;
    organizationId: string;
    id: string;
    createdAt: Date;
    status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
    customerType: "browser" | "instant" | "retail";
    priority: number;
    counterId?: string | null | undefined;
    calledAt?: Date | null | undefined;
    servedAt?: Date | null | undefined;
    completedAt?: Date | null | undefined;
    cancelledAt?: Date | null | undefined;
    servedBy?: string | null | undefined;
    estimatedWaitTime?: number | null | undefined;
    actualWaitTime?: number | null | undefined;
    serviceDuration?: number | null | undefined;
    notes?: string | null | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    number: string;
    organizationId: string;
    id: string;
    createdAt: Date;
    status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
    customerType: "browser" | "instant" | "retail";
    priority: number;
    counterId?: string | null | undefined;
    calledAt?: Date | null | undefined;
    servedAt?: Date | null | undefined;
    completedAt?: Date | null | undefined;
    cancelledAt?: Date | null | undefined;
    servedBy?: string | null | undefined;
    estimatedWaitTime?: number | null | undefined;
    actualWaitTime?: number | null | undefined;
    serviceDuration?: number | null | undefined;
    notes?: string | null | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const createTokenRequestSchema: z.ZodObject<{
    customerType: z.ZodNativeEnum<{
        instant: "instant";
        browser: "browser";
        retail: "retail";
    }>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    counterId: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
}, "strip", z.ZodTypeAny, {
    customerType: "browser" | "instant" | "retail";
    priority: number;
    metadata: Record<string, any>;
    counterId?: string | undefined;
    notes?: string | undefined;
}, {
    customerType: "browser" | "instant" | "retail";
    counterId?: string | undefined;
    priority?: number | undefined;
    notes?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const updateTokenRequestSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodNativeEnum<{
        waiting: "waiting";
        called: "called";
        serving: "serving";
        completed: "completed";
        cancelled: "cancelled";
        no_show: "no_show";
    }>>;
    priority: z.ZodOptional<z.ZodNumber>;
    counterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    status?: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show" | undefined;
    counterId?: string | null | undefined;
    priority?: number | undefined;
    notes?: string | null | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    status?: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show" | undefined;
    counterId?: string | null | undefined;
    priority?: number | undefined;
    notes?: string | null | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const callNextRequestSchema: z.ZodObject<{
    customerType: z.ZodOptional<z.ZodNativeEnum<{
        instant: "instant";
        browser: "browser";
        retail: "retail";
    }>>;
    counterId: z.ZodString;
    staffId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    counterId: string;
    staffId: string;
    customerType?: "browser" | "instant" | "retail" | undefined;
}, {
    counterId: string;
    staffId: string;
    customerType?: "browser" | "instant" | "retail" | undefined;
}>;
export declare const completeServiceRequestSchema: z.ZodObject<{
    tokenId: z.ZodString;
    staffId: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    rating: z.ZodOptional<z.ZodNumber>;
    serviceDuration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    staffId: string;
    tokenId: string;
    serviceDuration?: number | undefined;
    notes?: string | undefined;
    rating?: number | undefined;
}, {
    staffId: string;
    tokenId: string;
    serviceDuration?: number | undefined;
    notes?: string | undefined;
    rating?: number | undefined;
}>;
export declare const markNoShowRequestSchema: z.ZodObject<{
    tokenId: z.ZodString;
    staffId: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    staffId: string;
    tokenId: string;
    notes?: string | undefined;
}, {
    staffId: string;
    tokenId: string;
    notes?: string | undefined;
}>;
export declare const recallTokenRequestSchema: z.ZodObject<{
    tokenId: z.ZodString;
    counterId: z.ZodString;
    staffId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    counterId: string;
    staffId: string;
    tokenId: string;
}, {
    counterId: string;
    staffId: string;
    tokenId: string;
}>;
export declare const cancelTokenRequestSchema: z.ZodObject<{
    tokenId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
    staffId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tokenId: string;
    reason?: string | undefined;
    staffId?: string | undefined;
}, {
    tokenId: string;
    reason?: string | undefined;
    staffId?: string | undefined;
}>;
export declare const getTokensQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodArray<z.ZodNativeEnum<{
        waiting: "waiting";
        called: "called";
        serving: "serving";
        completed: "completed";
        cancelled: "cancelled";
        no_show: "no_show";
    }>, "many">>;
    customerType: z.ZodOptional<z.ZodArray<z.ZodNativeEnum<{
        instant: "instant";
        browser: "browser";
        retail: "retail";
    }>, "many">>;
    counterId: z.ZodOptional<z.ZodString>;
    staffId: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["createdAt", "calledAt", "completedAt", "priority"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    sortBy: "createdAt" | "priority" | "calledAt" | "completedAt";
    sortOrder: "asc" | "desc";
    status?: ("waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show")[] | undefined;
    counterId?: string | undefined;
    customerType?: ("browser" | "instant" | "retail")[] | undefined;
    staffId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    limit?: number | undefined;
    status?: ("waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show")[] | undefined;
    offset?: number | undefined;
    counterId?: string | undefined;
    customerType?: ("browser" | "instant" | "retail")[] | undefined;
    staffId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
    sortBy?: "createdAt" | "priority" | "calledAt" | "completedAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const queueStatusSchema: z.ZodObject<{
    currentServing: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        organizationId: z.ZodString;
        counterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        number: z.ZodString;
        customerType: z.ZodNativeEnum<{
            instant: "instant";
            browser: "browser";
            retail: "retail";
        }>;
        status: z.ZodNativeEnum<{
            waiting: "waiting";
            called: "called";
            serving: "serving";
            completed: "completed";
            cancelled: "cancelled";
            no_show: "no_show";
        }>;
        priority: z.ZodNumber;
        createdAt: z.ZodDate;
        calledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        servedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        completedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        cancelledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        servedBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        estimatedWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        actualWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        serviceDuration: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }>, "many">;
    nextInQueue: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        organizationId: z.ZodString;
        counterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        number: z.ZodString;
        customerType: z.ZodNativeEnum<{
            instant: "instant";
            browser: "browser";
            retail: "retail";
        }>;
        status: z.ZodNativeEnum<{
            waiting: "waiting";
            called: "called";
            serving: "serving";
            completed: "completed";
            cancelled: "cancelled";
            no_show: "no_show";
        }>;
        priority: z.ZodNumber;
        createdAt: z.ZodDate;
        calledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        servedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        completedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        cancelledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        servedBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        estimatedWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        actualWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        serviceDuration: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }>, "many">;
    recentlyServed: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        organizationId: z.ZodString;
        counterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        number: z.ZodString;
        customerType: z.ZodNativeEnum<{
            instant: "instant";
            browser: "browser";
            retail: "retail";
        }>;
        status: z.ZodNativeEnum<{
            waiting: "waiting";
            called: "called";
            serving: "serving";
            completed: "completed";
            cancelled: "cancelled";
            no_show: "no_show";
        }>;
        priority: z.ZodNumber;
        createdAt: z.ZodDate;
        calledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        servedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        completedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        cancelledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        servedBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        estimatedWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        actualWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        serviceDuration: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }>, "many">;
    noShowQueue: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        organizationId: z.ZodString;
        counterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        number: z.ZodString;
        customerType: z.ZodNativeEnum<{
            instant: "instant";
            browser: "browser";
            retail: "retail";
        }>;
        status: z.ZodNativeEnum<{
            waiting: "waiting";
            called: "called";
            serving: "serving";
            completed: "completed";
            cancelled: "cancelled";
            no_show: "no_show";
        }>;
        priority: z.ZodNumber;
        createdAt: z.ZodDate;
        calledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        servedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        completedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        cancelledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
        servedBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        estimatedWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        actualWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        serviceDuration: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }>, "many">;
    stats: z.ZodObject<{
        totalWaiting: z.ZodNumber;
        totalServing: z.ZodNumber;
        totalCompleted: z.ZodNumber;
        totalNoShow: z.ZodNumber;
        averageWaitTime: z.ZodNumber;
        averageServiceTime: z.ZodNumber;
        peakHour: z.ZodOptional<z.ZodString>;
        estimatedWaitTime: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        averageWaitTime: number;
        averageServiceTime: number;
        totalWaiting: number;
        totalServing: number;
        totalCompleted: number;
        totalNoShow: number;
        estimatedWaitTime?: number | undefined;
        peakHour?: string | undefined;
    }, {
        averageWaitTime: number;
        averageServiceTime: number;
        totalWaiting: number;
        totalServing: number;
        totalCompleted: number;
        totalNoShow: number;
        estimatedWaitTime?: number | undefined;
        peakHour?: string | undefined;
    }>;
    counterStats: z.ZodArray<z.ZodObject<{
        counterId: z.ZodString;
        counterName: z.ZodString;
        currentServing: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            organizationId: z.ZodString;
            counterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            number: z.ZodString;
            customerType: z.ZodNativeEnum<{
                instant: "instant";
                browser: "browser";
                retail: "retail";
            }>;
            status: z.ZodNativeEnum<{
                waiting: "waiting";
                called: "called";
                serving: "serving";
                completed: "completed";
                cancelled: "cancelled";
                no_show: "no_show";
            }>;
            priority: z.ZodNumber;
            createdAt: z.ZodDate;
            calledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
            servedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
            completedAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
            cancelledAt: z.ZodNullable<z.ZodOptional<z.ZodDate>>;
            servedBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            estimatedWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
            actualWaitTime: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
            serviceDuration: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
            notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            organizationId: string;
            id: string;
            createdAt: Date;
            status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
            customerType: "browser" | "instant" | "retail";
            priority: number;
            counterId?: string | null | undefined;
            calledAt?: Date | null | undefined;
            servedAt?: Date | null | undefined;
            completedAt?: Date | null | undefined;
            cancelledAt?: Date | null | undefined;
            servedBy?: string | null | undefined;
            estimatedWaitTime?: number | null | undefined;
            actualWaitTime?: number | null | undefined;
            serviceDuration?: number | null | undefined;
            notes?: string | null | undefined;
            metadata?: Record<string, any> | undefined;
        }, {
            number: string;
            organizationId: string;
            id: string;
            createdAt: Date;
            status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
            customerType: "browser" | "instant" | "retail";
            priority: number;
            counterId?: string | null | undefined;
            calledAt?: Date | null | undefined;
            servedAt?: Date | null | undefined;
            completedAt?: Date | null | undefined;
            cancelledAt?: Date | null | undefined;
            servedBy?: string | null | undefined;
            estimatedWaitTime?: number | null | undefined;
            actualWaitTime?: number | null | undefined;
            serviceDuration?: number | null | undefined;
            notes?: string | null | undefined;
            metadata?: Record<string, any> | undefined;
        }>>>;
        queueLength: z.ZodNumber;
        averageServiceTime: z.ZodNumber;
        isActive: z.ZodBoolean;
        staffName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        isActive: boolean;
        counterId: string;
        counterName: string;
        averageServiceTime: number;
        queueLength: number;
        currentServing?: {
            number: string;
            organizationId: string;
            id: string;
            createdAt: Date;
            status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
            customerType: "browser" | "instant" | "retail";
            priority: number;
            counterId?: string | null | undefined;
            calledAt?: Date | null | undefined;
            servedAt?: Date | null | undefined;
            completedAt?: Date | null | undefined;
            cancelledAt?: Date | null | undefined;
            servedBy?: string | null | undefined;
            estimatedWaitTime?: number | null | undefined;
            actualWaitTime?: number | null | undefined;
            serviceDuration?: number | null | undefined;
            notes?: string | null | undefined;
            metadata?: Record<string, any> | undefined;
        } | null | undefined;
        staffName?: string | undefined;
    }, {
        isActive: boolean;
        counterId: string;
        counterName: string;
        averageServiceTime: number;
        queueLength: number;
        currentServing?: {
            number: string;
            organizationId: string;
            id: string;
            createdAt: Date;
            status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
            customerType: "browser" | "instant" | "retail";
            priority: number;
            counterId?: string | null | undefined;
            calledAt?: Date | null | undefined;
            servedAt?: Date | null | undefined;
            completedAt?: Date | null | undefined;
            cancelledAt?: Date | null | undefined;
            servedBy?: string | null | undefined;
            estimatedWaitTime?: number | null | undefined;
            actualWaitTime?: number | null | undefined;
            serviceDuration?: number | null | undefined;
            notes?: string | null | undefined;
            metadata?: Record<string, any> | undefined;
        } | null | undefined;
        staffName?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    currentServing: {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }[];
    nextInQueue: {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }[];
    recentlyServed: {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }[];
    noShowQueue: {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }[];
    stats: {
        averageWaitTime: number;
        averageServiceTime: number;
        totalWaiting: number;
        totalServing: number;
        totalCompleted: number;
        totalNoShow: number;
        estimatedWaitTime?: number | undefined;
        peakHour?: string | undefined;
    };
    counterStats: {
        isActive: boolean;
        counterId: string;
        counterName: string;
        averageServiceTime: number;
        queueLength: number;
        currentServing?: {
            number: string;
            organizationId: string;
            id: string;
            createdAt: Date;
            status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
            customerType: "browser" | "instant" | "retail";
            priority: number;
            counterId?: string | null | undefined;
            calledAt?: Date | null | undefined;
            servedAt?: Date | null | undefined;
            completedAt?: Date | null | undefined;
            cancelledAt?: Date | null | undefined;
            servedBy?: string | null | undefined;
            estimatedWaitTime?: number | null | undefined;
            actualWaitTime?: number | null | undefined;
            serviceDuration?: number | null | undefined;
            notes?: string | null | undefined;
            metadata?: Record<string, any> | undefined;
        } | null | undefined;
        staffName?: string | undefined;
    }[];
}, {
    currentServing: {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }[];
    nextInQueue: {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }[];
    recentlyServed: {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }[];
    noShowQueue: {
        number: string;
        organizationId: string;
        id: string;
        createdAt: Date;
        status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
        customerType: "browser" | "instant" | "retail";
        priority: number;
        counterId?: string | null | undefined;
        calledAt?: Date | null | undefined;
        servedAt?: Date | null | undefined;
        completedAt?: Date | null | undefined;
        cancelledAt?: Date | null | undefined;
        servedBy?: string | null | undefined;
        estimatedWaitTime?: number | null | undefined;
        actualWaitTime?: number | null | undefined;
        serviceDuration?: number | null | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }[];
    stats: {
        averageWaitTime: number;
        averageServiceTime: number;
        totalWaiting: number;
        totalServing: number;
        totalCompleted: number;
        totalNoShow: number;
        estimatedWaitTime?: number | undefined;
        peakHour?: string | undefined;
    };
    counterStats: {
        isActive: boolean;
        counterId: string;
        counterName: string;
        averageServiceTime: number;
        queueLength: number;
        currentServing?: {
            number: string;
            organizationId: string;
            id: string;
            createdAt: Date;
            status: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show";
            customerType: "browser" | "instant" | "retail";
            priority: number;
            counterId?: string | null | undefined;
            calledAt?: Date | null | undefined;
            servedAt?: Date | null | undefined;
            completedAt?: Date | null | undefined;
            cancelledAt?: Date | null | undefined;
            servedBy?: string | null | undefined;
            estimatedWaitTime?: number | null | undefined;
            actualWaitTime?: number | null | undefined;
            serviceDuration?: number | null | undefined;
            notes?: string | null | undefined;
            metadata?: Record<string, any> | undefined;
        } | null | undefined;
        staffName?: string | undefined;
    }[];
}>;
export declare const bulkUpdateTokensSchema: z.ZodObject<{
    tokenIds: z.ZodArray<z.ZodString, "many">;
    updates: z.ZodObject<{
        status: z.ZodOptional<z.ZodNativeEnum<{
            waiting: "waiting";
            called: "called";
            serving: "serving";
            completed: "completed";
            cancelled: "cancelled";
            no_show: "no_show";
        }>>;
        priority: z.ZodOptional<z.ZodNumber>;
        counterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        status?: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show" | undefined;
        counterId?: string | null | undefined;
        priority?: number | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        status?: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show" | undefined;
        counterId?: string | null | undefined;
        priority?: number | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    staffId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    staffId: string;
    tokenIds: string[];
    updates: {
        status?: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show" | undefined;
        counterId?: string | null | undefined;
        priority?: number | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    };
}, {
    staffId: string;
    tokenIds: string[];
    updates: {
        status?: "waiting" | "called" | "serving" | "completed" | "cancelled" | "no_show" | undefined;
        counterId?: string | null | undefined;
        priority?: number | undefined;
        notes?: string | null | undefined;
        metadata?: Record<string, any> | undefined;
    };
}>;
export declare const bulkDeleteTokensSchema: z.ZodObject<{
    tokenIds: z.ZodArray<z.ZodString, "many">;
    reason: z.ZodOptional<z.ZodString>;
    staffId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    staffId: string;
    tokenIds: string[];
    reason?: string | undefined;
}, {
    staffId: string;
    tokenIds: string[];
    reason?: string | undefined;
}>;
export declare const tokenAnalyticsQuerySchema: z.ZodObject<{
    fromDate: z.ZodString;
    toDate: z.ZodString;
    customerType: z.ZodOptional<z.ZodArray<z.ZodNativeEnum<{
        instant: "instant";
        browser: "browser";
        retail: "retail";
    }>, "many">>;
    counterId: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    groupBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["hour", "day", "week", "month"]>>>;
}, "strip", z.ZodTypeAny, {
    fromDate: string;
    toDate: string;
    groupBy: "week" | "day" | "hour" | "month";
    counterId?: string[] | undefined;
    customerType?: ("browser" | "instant" | "retail")[] | undefined;
}, {
    fromDate: string;
    toDate: string;
    counterId?: string[] | undefined;
    customerType?: ("browser" | "instant" | "retail")[] | undefined;
    groupBy?: "week" | "day" | "hour" | "month" | undefined;
}>;
export declare const tokenAnalyticsResponseSchema: z.ZodObject<{
    period: z.ZodString;
    totalTokens: z.ZodNumber;
    completedTokens: z.ZodNumber;
    cancelledTokens: z.ZodNumber;
    noShowTokens: z.ZodNumber;
    averageWaitTime: z.ZodNumber;
    averageServiceTime: z.ZodNumber;
    peakHour: z.ZodOptional<z.ZodString>;
    customerTypeBreakdown: z.ZodRecord<z.ZodNativeEnum<{
        instant: "instant";
        browser: "browser";
        retail: "retail";
    }>, z.ZodNumber>;
    counterBreakdown: z.ZodRecord<z.ZodString, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    totalTokens: number;
    period: string;
    completedTokens: number;
    cancelledTokens: number;
    noShowTokens: number;
    averageWaitTime: number;
    averageServiceTime: number;
    customerTypeBreakdown: Partial<Record<"browser" | "instant" | "retail", number>>;
    counterBreakdown: Record<string, number>;
    peakHour?: string | undefined;
}, {
    totalTokens: number;
    period: string;
    completedTokens: number;
    cancelledTokens: number;
    noShowTokens: number;
    averageWaitTime: number;
    averageServiceTime: number;
    customerTypeBreakdown: Partial<Record<"browser" | "instant" | "retail", number>>;
    counterBreakdown: Record<string, number>;
    peakHour?: string | undefined;
}>;
export type Token = z.infer<typeof tokenSchema>;
export type CreateTokenRequest = z.infer<typeof createTokenRequestSchema>;
export type UpdateTokenRequest = z.infer<typeof updateTokenRequestSchema>;
export type CallNextRequest = z.infer<typeof callNextRequestSchema>;
export type CompleteServiceRequest = z.infer<typeof completeServiceRequestSchema>;
export type MarkNoShowRequest = z.infer<typeof markNoShowRequestSchema>;
export type RecallTokenRequest = z.infer<typeof recallTokenRequestSchema>;
export type CancelTokenRequest = z.infer<typeof cancelTokenRequestSchema>;
export type GetTokensQuery = z.infer<typeof getTokensQuerySchema>;
export type QueueStatus = z.infer<typeof queueStatusSchema>;
export type BulkUpdateTokens = z.infer<typeof bulkUpdateTokensSchema>;
export type BulkDeleteTokens = z.infer<typeof bulkDeleteTokensSchema>;
export type TokenAnalyticsQuery = z.infer<typeof tokenAnalyticsQuerySchema>;
export type TokenAnalyticsResponse = z.infer<typeof tokenAnalyticsResponseSchema>;
//# sourceMappingURL=tokenSchemas.d.ts.map