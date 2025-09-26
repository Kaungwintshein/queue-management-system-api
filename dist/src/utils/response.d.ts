import { Response } from "express";
import { AppError } from "./errors";
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    details?: any;
    timestamp: string;
    requestId?: string;
}
export declare function sendSuccessResponse<T = any>(res: Response, data: T, message?: string, statusCode?: number): Response<ApiResponse<T>>;
export declare function sendErrorResponse(res: Response, error: Error | AppError | string, statusCode?: number, details?: any): Response<ApiResponse>;
export declare function sendCreatedResponse<T = any>(res: Response, data: T, message?: string): Response<ApiResponse<T>>;
export declare function sendNoContentResponse(res: Response, message?: string): Response;
export declare function sendBadRequestResponse(res: Response, message?: string, details?: any): Response<ApiResponse>;
export declare function sendUnauthorizedResponse(res: Response, message?: string): Response<ApiResponse>;
export declare function sendForbiddenResponse(res: Response, message?: string): Response<ApiResponse>;
export declare function sendNotFoundResponse(res: Response, message?: string): Response<ApiResponse>;
export declare function sendConflictResponse(res: Response, message?: string, details?: any): Response<ApiResponse>;
export declare function sendValidationErrorResponse(res: Response, message?: string, validationErrors?: any): Response<ApiResponse>;
export declare function sendTooManyRequestsResponse(res: Response, message?: string): Response<ApiResponse>;
export declare function sendInternalServerErrorResponse(res: Response, message?: string, error?: Error): Response<ApiResponse>;
export declare function sendServiceUnavailableResponse(res: Response, message?: string): Response<ApiResponse>;
//# sourceMappingURL=response.d.ts.map