import request from "supertest";
import app from "@/app";
import { TestHelpers, TEST_DATA, TEST_SCENARIOS } from "../utils/testHelpers";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

describe("Authentication APIs", () => {
  let testOrg: any;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Create test organization
    testOrg = await TestHelpers.createTestOrganization();

    // Create test user with hashed password
    const hashedPassword = await bcrypt.hash("admin123", 10);
    testUser = await TestHelpers.createTestUser({
      username: "admin",
      email: "admin@test.com",
      password: hashedPassword,
      role: UserRole.admin,
      organizationId: testOrg.id,
    });
  });

  afterAll(async () => {
    await TestHelpers.cleanupDatabase();
    await TestHelpers.closeDatabase();
  });

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send(TEST_SCENARIOS.VALID_LOGIN)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data.user.username).toBe("admin");
      expect(response.body.data.user.role).toBe(UserRole.admin);
      expect(response.body.data.user).not.toHaveProperty("password");

      // Store token for other tests
      authToken = response.body.data.token;
    });

    it("should fail with invalid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send(TEST_SCENARIOS.INVALID_LOGIN)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid credentials");
    });

    it("should fail with missing credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send(TEST_SCENARIOS.MISSING_CREDENTIALS)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("validation");
    });

    it("should fail with non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "nonexistent",
          password: "password123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid credentials");
    });

    it("should fail with inactive user", async () => {
      // Create inactive user
      const hashedPassword = await bcrypt.hash("password123", 10);
      const inactiveUser = await TestHelpers.createTestUser({
        username: "inactive",
        email: "inactive@test.com",
        password: hashedPassword,
        role: UserRole.staff,
        organizationId: testOrg.id,
        isActive: false,
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({
          username: "inactive",
          password: "password123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Account is deactivated");

      // Cleanup
      await TestHelpers.cleanupUser(inactiveUser.id);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user with valid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe("admin");
      expect(response.body.data.role).toBe(UserRole.admin);
      expect(response.body.data).not.toHaveProperty("password");
    });

    it("should fail without token", async () => {
      const response = await request(app).get("/api/auth/me").expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access token required");
    });

    it("should fail with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid or expired token");
    });

    it("should fail with malformed token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "InvalidFormat")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid token format");
    });
  });

  describe("POST /api/auth/register", () => {
    it("should register new user successfully", async () => {
      const newUserData = {
        username: "newuser",
        email: "newuser@test.com",
        password: "password123",
        role: UserRole.staff,
      };

      const response = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${authToken}`)
        .send(newUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.data.username).toBe("newuser");
      expect(response.body.data.email).toBe("newuser@test.com");
      expect(response.body.data.role).toBe(UserRole.staff);
      expect(response.body.data).not.toHaveProperty("password");

      // Cleanup
      await TestHelpers.cleanupUser(response.body.data.id);
    });

    it("should fail with duplicate username", async () => {
      const duplicateUserData = {
        username: "admin", // Already exists
        email: "duplicate@test.com",
        password: "password123",
        role: UserRole.staff,
      };

      const response = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${authToken}`)
        .send(duplicateUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Username already exists");
    });

    it("should fail with duplicate email", async () => {
      const duplicateEmailData = {
        username: "uniqueuser",
        email: "admin@test.com", // Already exists
        password: "password123",
        role: UserRole.staff,
      };

      const response = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${authToken}`)
        .send(duplicateEmailData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Email already exists");
    });

    it("should fail with invalid email format", async () => {
      const invalidEmailData = {
        username: "testuser",
        email: "invalid-email",
        password: "password123",
        role: UserRole.staff,
      };

      const response = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("validation");
    });

    it("should fail with weak password", async () => {
      const weakPasswordData = {
        username: "testuser",
        email: "test@test.com",
        password: "123", // Too short
        role: UserRole.staff,
      };

      const response = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${authToken}`)
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("validation");
    });

    it("should fail without admin permissions", async () => {
      // Create staff user
      const hashedPassword = await bcrypt.hash("staff123", 10);
      const staffUser = await TestHelpers.createTestUser({
        username: "staff",
        email: "staff@test.com",
        password: hashedPassword,
        role: UserRole.staff,
        organizationId: testOrg.id,
      });

      // Generate token for staff user
      const staffToken = TestHelpers.generateJWTToken({
        id: staffUser.id,
        username: "staff",
        role: UserRole.staff,
        organizationId: testOrg.id,
      });

      const newUserData = {
        username: "unauthorized",
        email: "unauthorized@test.com",
        password: "password123",
        role: UserRole.staff,
      };

      const response = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${staffToken}`)
        .send(newUserData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Insufficient permissions");

      // Cleanup
      await TestHelpers.cleanupUser(staffUser.id);
    });
  });

  describe("POST /api/auth/change-password", () => {
    it("should change password successfully", async () => {
      const changePasswordData = {
        currentPassword: "admin123",
        newPassword: "newpassword123",
      };

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send(changePasswordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Password changed successfully");

      // Verify new password works
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          username: "admin",
          password: "newpassword123",
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      // Change password back for other tests
      await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${loginResponse.body.data.token}`)
        .send({
          currentPassword: "newpassword123",
          newPassword: "admin123",
        })
        .expect(200);
    });

    it("should fail with incorrect current password", async () => {
      const changePasswordData = {
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
      };

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send(changePasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Current password is incorrect");
    });

    it("should fail with weak new password", async () => {
      const changePasswordData = {
        currentPassword: "admin123",
        newPassword: "123", // Too short
      };

      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send(changePasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("validation");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged out successfully");
    });

    it("should handle logout without token gracefully", async () => {
      const response = await request(app).post("/api/auth/logout").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged out successfully");
    });
  });
});
