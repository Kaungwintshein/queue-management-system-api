import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { join } from "path";

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    "postgresql://test:test@localhost:5432/queue_management_test";
  process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
  process.env.JWT_EXPIRES_IN = "1h";

  // Initialize test database
  await setupTestDatabase();
});

afterAll(async () => {
  // Cleanup test database
  await cleanupTestDatabase();
});

// Setup test database
async function setupTestDatabase() {
  try {
    // Reset the test database
    execSync("npx prisma migrate reset --force", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    // Generate Prisma client
    execSync("npx prisma generate", {
      stdio: "inherit",
    });

    // Seed test data
    execSync("npx prisma db seed", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
  } catch (error) {
    console.error("Failed to setup test database:", error);
    throw error;
  }
}

// Cleanup test database
async function cleanupTestDatabase() {
  try {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Clean up all test data (skip models not in schema)
    await prisma.token.deleteMany();
    await prisma.serviceSession.deleteMany();
    await prisma.counter.deleteMany();
    await prisma.queueSetting.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    await prisma.$disconnect();
  } catch (error) {
    console.error("Failed to cleanup test database:", error);
  }
}

// Global test utilities
global.testUtils = {
  // Create test user
  async createTestUser(overrides = {}) {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    const defaultUser = {
      username: "testuser",
      email: "test@example.com",
      password: "hashedpassword",
      role: "staff",
      organizationId: "test-org-id",
      isActive: true,
      ...overrides,
    };

    const user = await prisma.user.create({
      data: defaultUser,
    });

    await prisma.$disconnect();
    return user;
  },

  // Create test organization
  async createTestOrganization(overrides = {}) {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    const defaultOrg = {
      name: "Test Organization",
      settings: {},
      ...overrides,
    };

    const org = await prisma.organization.create({
      data: defaultOrg,
    });

    await prisma.$disconnect();
    return org;
  },

  // Create test counter
  async createTestCounter(overrides = {}) {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    const defaultCounter = {
      name: "Test Counter",
      isActive: true,
      organizationId: "test-org-id",
      ...overrides,
    };

    const counter = await prisma.counter.create({
      data: defaultCounter,
    });

    await prisma.$disconnect();
    return counter;
  },

  // Generate JWT token for testing
  generateTestToken(payload = {}) {
    const jwt = require("jsonwebtoken");
    const defaultPayload = {
      id: "test-user-id",
      username: "testuser",
      role: "admin",
      organizationId: "test-org-id",
      ...payload,
    };

    return jwt.sign(defaultPayload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  },
};

// Extend global types
declare global {
  var testUtils: {
    createTestUser: (overrides?: any) => Promise<any>;
    createTestOrganization: (overrides?: any) => Promise<any>;
    createTestCounter: (overrides?: any) => Promise<any>;
    generateTestToken: (payload?: any) => string;
  };
}
