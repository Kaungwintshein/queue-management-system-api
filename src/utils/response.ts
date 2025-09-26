import { Response } from "express";
import { logger } from "./logger";
import { AppError } from "./errors";

// Standard API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// Success Response Function
export function sendSuccessResponse<T = any>(
  res: Response,
  data: T,
  message: string = "Operation successful",
  statusCode: number = 200
): Response<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  // Add request ID if available
  if (res.locals.requestId) {
    response.requestId = res.locals.requestId;
  }

  logger.info("API Success Response", {
    statusCode,
    message,
    requestId: response.requestId,
    endpoint: res.req?.originalUrl,
    method: res.req?.method,
  });

  return res.status(statusCode).json(response);
}

// Error Response Function
export function sendErrorResponse(
  res: Response,
  error: Error | AppError | string,
  statusCode: number = 500,
  details?: any
): Response<ApiResponse> {
  let errorMessage: string;
  let errorCode: string | undefined;
  let errorDetails: any = details;

  // Handle different error types
  if (error instanceof AppError) {
    errorMessage = error.message;
    errorCode = error.constructor.name;
    statusCode = error.statusCode || statusCode;
    errorDetails = error.details || details;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorCode = error.name;
  } else if (typeof error === "string") {
    errorMessage = error;
    errorCode = "GENERIC_ERROR";
  } else {
    errorMessage = "An unexpected error occurred";
    errorCode = "UNKNOWN_ERROR";
  }

  const response: ApiResponse = {
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
  logger[logLevel]("API Error Response", {
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
export function sendCreatedResponse<T = any>(
  res: Response,
  data: T,
  message: string = "Resource created successfully"
): Response<ApiResponse<T>> {
  return sendSuccessResponse(res, data, message, 201);
}

// No Content Response (204)
export function sendNoContentResponse(
  res: Response,
  message: string = "Operation completed successfully"
): Response {
  logger.info("API No Content Response", {
    statusCode: 204,
    message,
    endpoint: res.req?.originalUrl,
    method: res.req?.method,
  });

  return res.status(204).send();
}

// Bad Request Response (400)
export function sendBadRequestResponse(
  res: Response,
  message: string = "Bad request",
  details?: any
): Response<ApiResponse> {
  return sendErrorResponse(res, message, 400, details);
}

// Unauthorized Response (401)
export function sendUnauthorizedResponse(
  res: Response,
  message: string = "Unauthorized access"
): Response<ApiResponse> {
  return sendErrorResponse(res, message, 401);
}

// Forbidden Response (403)
export function sendForbiddenResponse(
  res: Response,
  message: string = "Access forbidden"
): Response<ApiResponse> {
  return sendErrorResponse(res, message, 403);
}

// Not Found Response (404)
export function sendNotFoundResponse(
  res: Response,
  message: string = "Resource not found"
): Response<ApiResponse> {
  return sendErrorResponse(res, message, 404);
}

// Conflict Response (409)
export function sendConflictResponse(
  res: Response,
  message: string = "Resource conflict",
  details?: any
): Response<ApiResponse> {
  return sendErrorResponse(res, message, 409, details);
}

// Validation Error Response (422)
export function sendValidationErrorResponse(
  res: Response,
  message: string = "Validation failed",
  validationErrors?: any
): Response<ApiResponse> {
  return sendErrorResponse(res, message, 422, validationErrors);
}

// Too Many Requests Response (429)
export function sendTooManyRequestsResponse(
  res: Response,
  message: string = "Too many requests"
): Response<ApiResponse> {
  return sendErrorResponse(res, message, 429);
}

// Internal Server Error Response (500)
export function sendInternalServerErrorResponse(
  res: Response,
  message: string = "Internal server error",
  error?: Error
): Response<ApiResponse> {
  return sendErrorResponse(res, error || message, 500);
}

// Service Unavailable Response (503)
export function sendServiceUnavailableResponse(
  res: Response,
  message: string = "Service temporarily unavailable"
): Response<ApiResponse> {
  return sendErrorResponse(res, message, 503);
}
