"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateRefreshToken = exports.generateToken = exports.optionalAuth = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = require("@/app");
const errors_1 = require("@/utils/errors");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader) {
            throw new errors_1.AppError("No token provided", 401);
        }
        const token = authHeader.replace("Bearer ", "");
        if (!token) {
            throw new errors_1.AppError("Invalid token format", 401);
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new errors_1.AppError("JWT secret not configured", 500);
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Verify user still exists and is active
        const user = await app_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                organizationId: true,
                isActive: true,
            },
        });
        if (!user || !user.isActive) {
            throw new errors_1.AppError("User not found or inactive", 401);
        }
        // Update last login
        await app_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_1.AppError("Invalid token", 401));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errors_1.AppError("Token expired", 401));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            next(new errors_1.AppError("Authentication required", 401));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new errors_1.AppError("Insufficient permissions", 403));
            return;
        }
        next();
    };
};
exports.authorize = authorize;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader) {
            next();
            return;
        }
        const token = authHeader.replace("Bearer ", "");
        if (!token) {
            next();
            return;
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            next();
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const user = await app_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                organizationId: true,
                isActive: true,
            },
        });
        if (user && user.isActive) {
            req.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
            };
        }
        next();
    }
    catch (error) {
        // Ignore auth errors for optional auth
        next();
    }
};
exports.optionalAuth = optionalAuth;
// JWT utility functions
const generateToken = (payload) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new errors_1.AppError("JWT secret not configured", 500);
    }
    return jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    });
};
exports.generateToken = generateToken;
const generateRefreshToken = (payload) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new errors_1.AppError("JWT secret not configured", 500);
    }
    return jsonwebtoken_1.default.sign(payload, jwtSecret, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyToken = (token) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new errors_1.AppError("JWT secret not configured", 500);
    }
    return jsonwebtoken_1.default.verify(token, jwtSecret);
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=auth.js.map