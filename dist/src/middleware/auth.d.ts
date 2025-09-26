import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        email: string;
        role: UserRole;
        organizationId: string;
    };
}
export interface JWTPayload {
    userId: string;
    username: string;
    email: string;
    role: UserRole;
    organizationId: string;
    iat?: number;
    exp?: number;
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (roles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const generateToken: (payload: Omit<JWTPayload, "iat" | "exp">) => string;
export declare const generateRefreshToken: (payload: Omit<JWTPayload, "iat" | "exp">) => string;
export declare const verifyToken: (token: string) => JWTPayload;
//# sourceMappingURL=auth.d.ts.map