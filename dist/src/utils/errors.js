"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorLogLevel = exports.shouldLogError = exports.createErrorResponse = exports.ExternalServiceError = exports.DatabaseError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        // Maintain proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
        this.name = this.constructor.name;
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, true, details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = "Authentication failed") {
        super(message, 401, true);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = "Insufficient permissions") {
        super(message, 403, true);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource = "Resource") {
        super(`${resource} not found`, 404, true);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message, details) {
        super(message, 409, true, details);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = "Too many requests") {
        super(message, 429, true);
    }
}
exports.RateLimitError = RateLimitError;
class DatabaseError extends AppError {
    constructor(message = "Database operation failed", details) {
        super(message, 500, true, details);
    }
}
exports.DatabaseError = DatabaseError;
class ExternalServiceError extends AppError {
    constructor(service, details) {
        super(`External service error: ${service}`, 502, true, details);
    }
}
exports.ExternalServiceError = ExternalServiceError;
// Helper function to create standardized error responses
const createErrorResponse = (error, requestId, includeStack = false) => {
    const response = {
        error: true,
        message: error.message,
        statusCode: error instanceof AppError ? error.statusCode : 500,
        timestamp: new Date().toISOString(),
    };
    if (error instanceof AppError && error.details) {
        response.details = error.details;
    }
    if (requestId) {
        response.requestId = requestId;
    }
    if (includeStack && error.stack) {
        response.stack = error.stack;
    }
    return response;
};
exports.createErrorResponse = createErrorResponse;
// Helper function to check if error should be logged
const shouldLogError = (error) => {
    if (error instanceof AppError) {
        // Don't log client errors (4xx) unless they're 429 (rate limit)
        return error.statusCode >= 500 || error.statusCode === 429;
    }
    // Always log non-AppError instances
    return true;
};
exports.shouldLogError = shouldLogError;
// Helper function to determine log level based on error
const getErrorLogLevel = (error) => {
    if (error instanceof AppError) {
        if (error.statusCode >= 500)
            return "error";
        if (error.statusCode === 429)
            return "warn";
        return "info";
    }
    return "error";
};
exports.getErrorLogLevel = getErrorLogLevel;
//# sourceMappingURL=errors.js.map