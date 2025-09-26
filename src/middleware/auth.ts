import jwt, { SignOptions } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { prisma } from "@/app";
import { AppError } from "@/utils/errors";
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

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      throw new AppError("No token provided", 401);
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      throw new AppError("Invalid token format", 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError("JWT secret not configured", 500);
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
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
      throw new AppError("User not found or inactive", 401);
    }

    // Update last login
    await prisma.user.update({
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
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError("Invalid token", 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("Token expired", 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError("Insufficient permissions", 403));
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    const user = await prisma.user.findUnique({
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
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

// JWT utility functions
export const generateToken = (
  payload: Omit<JWTPayload, "iat" | "exp">
): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError("JWT secret not configured", 500);
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  } as SignOptions);
};

export const generateRefreshToken = (
  payload: Omit<JWTPayload, "iat" | "exp">
): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError("JWT secret not configured", 500);
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  } as SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError("JWT secret not configured", 500);
  }

  return jwt.verify(token, jwtSecret) as JWTPayload;
};
