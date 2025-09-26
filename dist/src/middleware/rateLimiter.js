"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomRateLimiter = exports.adminActionLimiter = exports.queueStatusLimiter = exports.tokenCreationLimiter = exports.authRateLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// General rate limiter
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // limit each IP to 100 requests per windowMs
    message: {
        error: true,
        message: "Too many requests from this IP, please try again later.",
        statusCode: 429,
        retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || "9") / 1000),
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
        // Use IP address and user ID (if authenticated) for rate limiting
        const authHeader = req.header("Authorization");
        const ip = req.ip || req.connection.remoteAddress || "unknown";
        if (authHeader) {
            // If authenticated, use a combination of IP and user token
            return `${ip}-${authHeader.slice(-10)}`;
        }
        return ip;
    },
});
// Strict rate limiter for auth endpoints
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login requests per windowMs
    message: {
        error: true,
        message: "Too many authentication attempts, please try again later.",
        statusCode: 429,
        retryAfter: 15 * 0, // 15 minutes
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});
// Medium rate limiter for token creation
exports.tokenCreationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // limit each IP to 20 token creation requests per windowMs
    message: {
        error: true,
        message: "Too many token creation requests, please slow down.",
        statusCode: 429,
        retryAfter: 5 * 60, // 5 minutes
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Lighter rate limiter for queue status checks
exports.queueStatusLimiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per minute
    message: {
        error: true,
        message: "Too many queue status requests, please slow down.",
        statusCode: 429,
        retryAfter: 60, // 1 minute
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Very strict rate limiter for admin actions
exports.adminActionLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 50, // limit each IP to 50 admin actions per windowMs
    message: {
        error: true,
        message: "Too many admin actions, please try again later.",
        statusCode: 429,
        retryAfter: 10 * 60, // 10 minutes
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Create custom rate limiter factory
const createCustomRateLimiter = (options) => {
    return (0, express_rate_limit_1.default)({
        windowMs: options.windowMs,
        max: options.max,
        message: {
            error: true,
            message: options.message || "Too many requests, please try again later.",
            statusCode: 429,
            retryAfter: Math.ceil(options.windowMs / 1000),
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    });
};
exports.createCustomRateLimiter = createCustomRateLimiter;
//# sourceMappingURL=rateLimiter.js.map