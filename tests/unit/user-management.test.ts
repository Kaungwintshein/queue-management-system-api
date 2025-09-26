import request from "supertest";
import app from "@/app";
import { TestHelpers, TEST_DATA } from "../utils/testHelpers";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

describe("User Management APIs", () => {
  let testOrg: any;
  let adminUser: any;
  let staffUser: any;
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    // Create test organization
    testOrg = await TestHelpers.createTestOrganization();

    // Create admin user
    const adminHashedPassword = await bcrypt.hash("admin123", 10);
    adminUser = await TestHelpers.createTestUser({
      username: "admin",
      email: "admin@test.com",
      password: adminHashedPassword,
      role: UserRole.admin,
      organizationId: testOrg.id,
    });

    // Create staff user
    const staffHashedPassword = await bcrypt.hash("staff123", 10);
    staffUser = await TestHelpers.createTestUser({
      username: "staff",
      email: "staff@test.com",
      password: staffHashedPassword,
      role: UserRole.staff,
      organizationId: testOrg.id,
    });

    // Generate tokens
    adminToken = TestHelpers.generateJWTToken({
      id: adminUser.id,
      username: "admin",
      role: UserRole.admin,
      organizationId: testOrg.id,
    });

    staffToken = TestHelpers.generateJWTToken({
      id: staffUser.id,
      username: "staff",
      role: UserRole.staff,
      organizationId: testOrg.id,
    });
  });

  afterAll(async () => {
    await TestHelpers.cleanupDatabase();
    await TestHelpers.closeDatabase();
  });

  describe("GET /api/auth/users", () => {
    it("should list users successfully for admin", async () => {
      const response = await request(app)
        .get("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Users retrieved successfully");
      expect(response.body.data).toHaveProperty("users");
      expect(response.body.data).toHaveProperty("pagination");
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);

      // Verify user data structure
      const user = response.body.data.users[0];
      TestHelpers.expectValidUserResponse(user);
    });

    it("should filter users by role", async () => {
      const response = await request(app)
        .get("/api/auth/users?role=staff")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.users.every(
          (user: any) => user.role === UserRole.staff
        )
      ).toBe(true);
    });

    it("should filter users by active status", async () => {
      const response = await request(app)
        .get("/api/auth/users?isActive=true")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.users.every((user: any) => user.isActive === true)
      ).toBe(true);
    });

    it("should paginate users correctly", async () => {
      const response = await request(app)
        .get("/api/auth/users?page=1&limit=1")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBeLessThanOrEqual(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it("should fail for staff user (insufficient permissions)", async () => {
      const response = await request(app)
        .get("/api/auth/users")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Insufficient permissions");
    });

    it("should fail without authentication", async () => {
      const response = await request(app).get("/api/auth/users").expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access token required");
    });
  });

  describe("POST /api/auth/users", () => {
    it("should create user successfully", async () => {
      const newUserData = {
        username: "newuser",
        email: "newuser@test.com",
        password: "password123",
        role: UserRole.staff,
      };

      const response = await request(app)
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User created successfully");
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
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(duplicateUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Username already exists");
    });

    it("should fail with invalid role", async () => {
      const invalidRoleData = {
        username: "testuser",
        email: "test@test.com",
        password: "password123",
        role: "invalid_role",
      };

      const response = await request(app)
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidRoleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("validation");
    });
  });

  describe("GET /api/auth/users/:userId", () => {
    it("should get user by ID successfully", async () => {
      const response = await request(app)
        .get(`/api/auth/users/${staffUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User retrieved successfully");
      expect(response.body.data.id).toBe(staffUser.id);
      expect(response.body.data.username).toBe("staff");
      TestHelpers.expectValidUserResponse(response.body.data);
    });

    it("should fail with non-existent user ID", async () => {
      const response = await request(app)
        .get("/api/auth/users/non-existent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not found");
    });
  });

  describe("PATCH /api/auth/users/:userId", () => {
    it("should update user successfully", async () => {
      const updateData = {
        email: "updated@test.com",
        isActive: false,
      };

      const response = await request(app)
        .patch(`/api/auth/users/${staffUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User updated successfully");
      expect(response.body.data.email).toBe("updated@test.com");
      expect(response.body.data.isActive).toBe(false);

      // Reset for other tests
      await request(app)
        .patch(`/api/auth/users/${staffUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "staff@test.com",
          isActive: true,
        })
        .expect(200);
    });

    it("should fail with duplicate email", async () => {
      const updateData = {
        email: "admin@test.com", // Already exists
      };

      const response = await request(app)
        .patch(`/api/auth/users/${staffUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Email already exists");
    });
  });

  describe("POST /api/auth/users/:userId/ban", () => {
    it("should ban user successfully", async () => {
      // Create a user to ban
      const hashedPassword = await bcrypt.hash("password123", 10);
      const userToBan = await TestHelpers.createTestUser({
        username: "usertoban",
        email: "usertoban@test.com",
        password: hashedPassword,
        role: UserRole.staff,
        organizationId: testOrg.id,
      });

      const response = await request(app)
        .post(`/api/auth/users/${userToBan.id}/ban`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Test ban" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User banned successfully");
      expect(response.body.data.isActive).toBe(false);

      // Cleanup
      await TestHelpers.cleanupUser(userToBan.id);
    });

    it("should fail to ban non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/users/non-existent-id/ban")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Test ban" })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not found");
    });
  });

  describe("POST /api/auth/users/:userId/reactivate", () => {
    it("should reactivate user successfully", async () => {
      // Create and ban a user first
      const hashedPassword = await bcrypt.hash("password123", 10);
      const userToReactivate = await TestHelpers.createTestUser({
        username: "usertoreactivate",
        email: "usertoreactivate@test.com",
        password: hashedPassword,
        role: UserRole.staff,
        organizationId: testOrg.id,
        isActive: false,
      });

      const response = await request(app)
        .post(`/api/auth/users/${userToReactivate.id}/reactivate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User reactivated successfully");
      expect(response.body.data.isActive).toBe(true);

      // Cleanup
      await TestHelpers.cleanupUser(userToReactivate.id);
    });
  });

  describe("POST /api/auth/users/:userId/reset-password", () => {
    it("should reset user password successfully", async () => {
      const response = await request(app)
        .post(`/api/auth/users/${staffUser.id}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Password reset successfully");
      expect(response.body.data).toHaveProperty("temporaryPassword");
    });
  });

  describe("DELETE /api/auth/users/:userId", () => {
    it("should delete user successfully", async () => {
      // Create a user to delete
      const hashedPassword = await bcrypt.hash("password123", 10);
      const userToDelete = await TestHelpers.createTestUser({
        username: "usertodelete",
        email: "usertodelete@test.com",
        password: hashedPassword,
        role: UserRole.staff,
        organizationId: testOrg.id,
      });

      const response = await request(app)
        .delete(`/api/auth/users/${userToDelete.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User deleted successfully");

      // Verify user is deleted
      const getResponse = await request(app)
        .get(`/api/auth/users/${userToDelete.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.message).toBe("User not found");
    });

    it("should fail to delete non-existent user", async () => {
      const response = await request(app)
        .delete("/api/auth/users/non-existent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User not found");
    });
  });
});
