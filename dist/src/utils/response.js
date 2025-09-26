"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccessResponse = sendSuccessResponse;
exports.sendErrorResponse = sendErrorResponse;
exports.sendCreatedResponse = sendCreatedResponse;
exports.sendNoContentResponse = sendNoContentResponse;
exports.sendBadRequestResponse = sendBadRequestResponse;
exports.sendUnauthorizedResponse = sendUnauthorizedResponse;
exports.sendForbiddenResponse = sendForbiddenResponse;
exports.sendNotFoundResponse = sendNotFoundResponse;
exports.sendConflictResponse = sendConflictResponse;
exports.sendValidationErrorResponse = sendValidationErrorResponse;
exports.sendTooManyRequestsResponse = sendTooManyRequestsResponse;
exports.sendInternalServerErrorResponse = sendInternalServerErrorResponse;
exports.sendServiceUnavailableResponse = sendServiceUnavailableResponse;
const logger_1 = require("./logger");
const errors_1 = require("./errors");
// Success Response Function
function sendSuccessResponse(res, data, message = "Operation successful", statusCode = 200) {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    };
    // Add request ID if available
    if (res.locals.requestId) {
        response.requestId = res.locals.requestId;
    }
    logger_1.logger.info("API Success Response", {
        statusCode,
        message,
        requestId: response.requestId,
        endpoint: res.req?.originalUrl,
        method: res.req?.method,
    });
    return res.status(statusCode).json(response);
}
// Error Response Function
function sendErrorResponse(res, error, statusCode = 500, details) {
    let errorMessage;
    let errorCode;
    let errorDetails = details;
    // Handle different error types
    if (error instanceof errors_1.AppError) {
        errorMessage = error.message;
        errorCode = error.constructor.name;
        statusCode = error.statusCode || statusCode;
        errorDetails = error.details || details;
    }
    else if (error instanceof Error) {
        errorMessage = error.message;
        errorCode = error.name;
    }
    else if (typeof error === "string") {
        errorMessage = error;
        errorCode = "GENERIC_ERROR";
    }
    else {
        errorMessage = "An unexpected error occurred";
        errorCode = "UNKNOWN_ERROR";
    }
    const response = {
        success: false,
        message: errorMessage,
        error: errorCode,
        details: errorDetails,
        timestamp: new Date().toISOString(),
    };
    // Add request ID if available
    if (res.locals.requestId) {
        response.requestId = res.locals.requestId;
    }
    // Log error with appropriate level
    const logLevel = statusCode >= 500 ? "error" : "warn";
    logger_1.logger[logLevel]("API Error Response", {
        statusCode,
        errorMessage,
        errorCode,
        requestId: response.requestId,
        endpoint: res.req?.originalUrl,
        method: res.req?.method,
        stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(statusCode).json(response);
}
// Created Response (201)
function sendCreatedResponse(res, data, message = "Resource created successfully") {
    return sendSuccessResponse(res, data, message, 201);
}
// No Content Response (204)
function sendNoContentResponse(res, message = "Operation completed successfully") {
    logger_1.logger.info("API No Content Response", {
        statusCode: 204,
        message,
        endpoint: res.req?.originalUrl,
        method: res.req?.method,
    });
    return res.status(204).send();
}
// Bad Request Response (400)
function sendBadRequestResponse(res, message = "Bad request", details) {
    return sendErrorResponse(res, message, 400, details);
}
// Unauthorized Response (401)
function sendUnauthorizedResponse(res, message = "Unauthorized access") {
    return sendErrorResponse(res, message, 401);
}
// Forbidden Response (403)
function sendForbiddenResponse(res, message = "Access forbidden") {
    return sendErrorResponse(res, message, 403);
}
// Not Found Response (404)
function sendNotFoundResponse(res, message = "Resource not found") {
    return sendErrorResponse(res, message, 404);
}
// Conflict Response (409)
function sendConflictResponse(res, message = "Resource conflict", details) {
    return sendErrorResponse(res, message, 409, details);
}
// Validation Error Response (422)
function sendValidationErrorResponse(res, message = "Validation failed", validationErrors) {
    return sendErrorResponse(res, message, 422, validationErrors);
}
// Too Many Requests Response (429)
function sendTooManyRequestsResponse(res, message = "Too many requests") {
    return sendErrorResponse(res, message, 429);
}
// Internal Server Error Response (500)
function sendInternalServerErrorResponse(res, message = "Internal server error", error) {
    return sendErrorResponse(res, error || message, 500);
}
// Service Unavailable Response (503)
function sendServiceUnavailableResponse(res, message = "Service temporarily unavailable") {
    return sendErrorResponse(res, message, 503);
}
//# sourceMappingURL=response.js.map