import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { UserRole } from "@prisma/client";

export class TestHelpers {
  private static prisma: PrismaClient;

  static getPrisma() {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
    }
    return this.prisma;
  }

  // Create test data factories
  static async createTestOrganization(overrides: any = {}) {
    const prisma = this.getPrisma();
    const defaultOrg = {
      name: "Test Organization",
      settings: {},
      ...overrides,
    };

    return await prisma.organization.create({
      data: defaultOrg,
    });
  }

  static async createTestUser(overrides: any = {}) {
    const prisma = this.getPrisma();
    const defaultUser = {
      username: "testuser",
      email: "test@example.com",
      password: "hashedpassword",
      role: UserRole.staff,
      organizationId: "test-org-id",
      isActive: true,
      ...overrides,
    };

    return await prisma.user.create({
      data: defaultUser,
    });
  }

  static async createTestCounter(overrides: any = {}) {
    const prisma = this.getPrisma();
    const defaultCounter = {
      name: "Test Counter",
      isActive: true,
      organizationId: "test-org-id",
      ...overrides,
    };

    return await prisma.counter.create({
      data: defaultCounter,
    });
  }

  static async createTestToken(overrides: any = {}) {
    const prisma = this.getPrisma();
    const defaultToken = {
      number: "A001",
      customerType: "instant",
      status: "waiting",
      organizationId: "test-org-id",
      ...overrides,
    };

    return await prisma.token.create({
      data: defaultToken,
    });
  }

  // Authentication helpers
  static generateJWTToken(payload: any = {}) {
    const jwt = require("jsonwebtoken");
    const defaultPayload = {
      id: "test-user-id",
      username: "testuser",
      role: UserRole.admin,
      organizationId: "test-org-id",
      ...payload,
    };

    return jwt.sign(defaultPayload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  }

  static getAuthHeaders(token?: string) {
    const authToken = token || this.generateJWTToken();
    return {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    };
  }

  // Mock request/response helpers
  static createMockRequest(overrides: any = {}): Partial<Request> {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: {
        id: "test-user-id",
        username: "testuser",
        role: UserRole.admin,
        organizationId: "test-org-id",
      },
      ...overrides,
    };
  }

  static createMockResponse(): Partial<Response> {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  }

  // Database cleanup helpers
  static async cleanupDatabase() {
    const prisma = this.getPrisma();

    // Delete in correct order to respect foreign key constraints
    await prisma.auditLog.deleteMany();
    await prisma.token.deleteMany();
    await prisma.serviceSession.deleteMany();
    await prisma.counter.deleteMany();
    await prisma.queueSetting.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
  }

  static async cleanupUser(userId: string) {
    const prisma = this.getPrisma();
    await prisma.user.delete({
      where: { id: userId },
    });
  }

  static async cleanupCounter(counterId: string) {
    const prisma = this.getPrisma();
    await prisma.counter.delete({
      where: { id: counterId },
    });
  }

  static async cleanupOrganization(orgId: string) {
    const prisma = this.getPrisma();
    await prisma.organization.delete({
      where: { id: orgId },
    });
  }

  // Test data assertions
  static expectValidUserResponse(user: any) {
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("username");
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("role");
    expect(user).toHaveProperty("isActive");
    expect(user).not.toHaveProperty("password");
  }

  static expectValidCounterResponse(counter: any) {
    expect(counter).toHaveProperty("id");
    expect(counter).toHaveProperty("name");
    expect(counter).toHaveProperty("isActive");
    expect(counter).toHaveProperty("organizationId");
  }

  static expectValidApiResponse(response: any) {
    expect(response).toHaveProperty("success");
    expect(response).toHaveProperty("message");
    expect(response).toHaveProperty("data");
    expect(response.success).toBe(true);
  }

  static expectErrorResponse(response: any, expectedStatus: number) {
    expect(response).toHaveProperty("success");
    expect(response).toHaveProperty("message");
    expect(response.success).toBe(false);
    expect(response.status).toBe(expectedStatus);
  }

  // Wait helpers for async operations
  static async wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Close database connection
  static async closeDatabase() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}

// Test data constants
export const TEST_DATA = {
  ORGANIZATIONS: {
    DEFAULT: {
      name: "Test Organization",
      settings: {},
    },
  },
  USERS: {
    ADMIN: {
      username: "admin",
      email: "admin@test.com",
      password: "admin123",
      role: UserRole.admin,
    },
    STAFF: {
      username: "staff",
      email: "staff@test.com",
      password: "staff123",
      role: UserRole.staff,
    },
    SUPER_ADMIN: {
      username: "superadmin",
      email: "superadmin@test.com",
      password: "superadmin123",
      role: UserRole.super_admin,
    },
  },
  COUNTERS: {
    DEFAULT: {
      name: "Counter 1",
      isActive: true,
    },
  },
  TOKENS: {
    DEFAULT: {
      number: "A001",
      customerType: "instant",
      status: "waiting",
    },
  },
};

// Test scenarios
export const TEST_SCENARIOS = {
  VALID_LOGIN: {
    username: "admin",
    password: "admin123",
  },
  INVALID_LOGIN: {
    username: "admin",
    password: "wrongpassword",
  },
  MISSING_CREDENTIALS: {
    username: "",
    password: "",
  },
  INVALID_EMAIL: {
    username: "admin",
    email: "invalid-email",
    password: "admin123",
  },
  WEAK_PASSWORD: {
    username: "admin",
    email: "admin@test.com",
    password: "123",
  },
};
