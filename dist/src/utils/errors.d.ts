export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly details?: any;
    constructor(message: string, statusCode?: number, isOperational?: boolean, details?: any);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string, details?: any);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare class DatabaseError extends AppError {
    constructor(message?: string, details?: any);
}
export declare class ExternalServiceError extends AppError {
    constructor(service: string, details?: any);
}
export interface ErrorResponse {
    error: true;
    message: string;
    statusCode: number;
    timestamp: string;
    details?: any;
    requestId?: string;
    stack?: string;
}
export declare const createErrorResponse: (error: AppError | Error, requestId?: string, includeStack?: boolean) => ErrorResponse;
export declare const shouldLogError: (error: AppError | Error) => boolean;
export declare const getErrorLogLevel: (error: AppError | Error) => "error" | "warn" | "info";
//# sourceMappingURL=errors.d.ts.map