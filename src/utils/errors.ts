export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
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

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(message, 401, true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, true, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429, true);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed", details?: any) {
    super(message, 500, true, details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, details?: any) {
    super(`External service error: ${service}`, 502, true, details);
  }
}

// Error response interface for consistent API responses
export interface ErrorResponse {
  error: true;
  message: string;
  statusCode: number;
  timestamp: string;
  details?: any;
  requestId?: string;
  stack?: string; // Only in development
}

// Helper function to create standardized error responses
export const createErrorResponse = (
  error: AppError | Error,
  requestId?: string,
  includeStack: boolean = false
): ErrorResponse => {
  const response: ErrorResponse = {
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

// Helper function to check if error should be logged
export const shouldLogError = (error: AppError | Error): boolean => {
  if (error instanceof AppError) {
    // Don't log client errors (4xx) unless they're 429 (rate limit)
    return error.statusCode >= 500 || error.statusCode === 429;
  }

  // Always log non-AppError instances
  return true;
};

// Helper function to determine log level based on error
export const getErrorLogLevel = (
  error: AppError | Error
): "error" | "warn" | "info" => {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) return "error";
    if (error.statusCode === 429) return "warn";
    return "info";
  }

  return "error";
};
