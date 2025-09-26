export declare const rateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const authRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const tokenCreationLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const queueStatusLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const adminActionLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const createCustomRateLimiter: (options: {
    windowMs: number;
    max: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
}) => import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimiter.d.ts.map