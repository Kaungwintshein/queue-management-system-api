import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { ZodError } from "zod";
import { AppError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import {
  sendErrorResponse,
  sendValidationErrorResponse,
} from "@/utils/response";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error("Error occurred:", {
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
  let details: any = undefined;

  // Handle different types of errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = "Validation error";
    details = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
      code: err.code,
    }));
  } else if (error instanceof PrismaClientKnownRequestError) {
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
  } else if (error instanceof PrismaClientUnknownRequestError) {
    statusCode = 500;
    message = "Database connection error";
  } else if (error instanceof PrismaClientRustPanicError) {
    statusCode = 500;
    message = "Database engine error";
  } else if (error instanceof PrismaClientInitializationError) {
    statusCode = 500;
    message = "Database initialization error";
  } else if (error instanceof PrismaClientValidationError) {
    statusCode = 400;
    message = "Invalid query parameters";
  } else if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = error.message;
  } else if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid data format";
  } else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  } else if (error.name === "MulterError") {
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
  if (error instanceof ZodError) {
    sendValidationErrorResponse(res, message, details);
    return;
  }

  // Use standardized error response for all other errors
  sendErrorResponse(res, error, statusCode, details);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendErrorResponse(res, "Route not found", 404, {
    path: req.originalUrl,
    method: req.method,
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
