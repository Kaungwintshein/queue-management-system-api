"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const library_1 = require("@prisma/client/runtime/library");
const zod_1 = require("zod");
const errors_1 = require("@/utils/errors");
const logger_1 = require("@/utils/logger");
const response_1 = require("@/utils/response");
const errorHandler = (error, req, res, next) => {
    logger_1.logger.error("Error occurred:", {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
    });
    // Default error response
    let statusCode = 500;
    let message = "Internal server error";
    let details = undefined;
    // Handle different types of errors
    if (error instanceof errors_1.AppError) {
        statusCode = error.statusCode;
        message = error.message;
        details = error.details;
    }
    else if (error instanceof zod_1.ZodError) {
        statusCode = 400;
        message = "Validation error";
        details = error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
            code: err.code,
        }));
    }
    else if (error instanceof library_1.PrismaClientKnownRequestError) {
        switch (error.code) {
            case "P2002":
                statusCode = 409;
                message = "A record with this data already exists";
                details = {
                    fields: error.meta?.target,
                    constraint: "unique_violation",
                };
                break;
            case "P2025":
                statusCode = 404;
                message = "Record not found";
                break;
            case "P2003":
                statusCode = 400;
                message = "Foreign key constraint failed";
                break;
            case "P2016":
                statusCode = 404;
                message = "Query interpretation error";
                break;
            default:
                statusCode = 400;
                message = "Database operation failed";
                details = {
                    code: error.code,
                    meta: error.meta,
                };
        }
    }
    else if (error instanceof library_1.PrismaClientUnknownRequestError) {
        statusCode = 500;
        message = "Database connection error";
    }
    else if (error instanceof library_1.PrismaClientRustPanicError) {
        statusCode = 500;
        message = "Database engine error";
    }
    else if (error instanceof library_1.PrismaClientInitializationError) {
        statusCode = 500;
        message = "Database initialization error";
    }
    else if (error instanceof library_1.PrismaClientValidationError) {
        statusCode = 400;
        message = "Invalid query parameters";
    }
    else if (error.name === "ValidationError") {
        statusCode = 400;
        message = "Validation failed";
        details = error.message;
    }
    else if (error.name === "CastError") {
        statusCode = 400;
        message = "Invalid data format";
    }
    else if (error.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid token";
    }
    else if (error.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Token expired";
    }
    else if (error.name === "MulterError") {
        statusCode = 400;
        message = "File upload error";
        details = error.message;
    }
    // Don't expose sensitive error details in production
    if (process.env.NODE_ENV === "production" && statusCode >= 500) {
        message = "Internal server error";
        details = undefined;
    }
    // Use standardized error response for validation errors
    if (error instanceof zod_1.ZodError) {
        (0, response_1.sendValidationErrorResponse)(res, message, details);
        return;
    }
    // Use standardized error response for all other errors
    (0, response_1.sendErrorResponse)(res, error, statusCode, details);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    (0, response_1.sendErrorResponse)(res, "Route not found", 404, {
        path: req.originalUrl,
        method: req.method,
    });
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map