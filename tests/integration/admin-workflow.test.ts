import request from "supertest";
import app from "@/app";
import { TestHelpers, TEST_DATA } from "../utils/testHelpers";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

describe("Admin Workflow Integration Tests", () => {
  let testOrg: any;
  let adminUser: any;
  let adminToken: string;
  let createdUser: any;
  let createdCounter: any;

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

    // Generate admin token
    adminToken = TestHelpers.generateJWTToken({
      id: adminUser.id,
      username: "admin",
      role: UserRole.admin,
      organizationId: testOrg.id,
    });
  });

  afterAll(async () => {
    await TestHelpers.cleanupDatabase();
    await TestHelpers.closeDatabase();
  });

  describe("Complete Admin Workflow", () => {
    it("should complete full admin workflow: login -> create user -> create counter -> assign staff -> manage roles", async () => {
      // Step 1: Login as admin
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          username: "admin",
          password: "admin123",
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      const authToken = loginResponse.body.data.token;

      // Step 2: Get current user info
      const meResponse = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(meResponse.body.data.username).toBe("admin");
      expect(meResponse.body.data.role).toBe(UserRole.admin);

      // Step 3: Create a new staff user
      const createUserResponse = await request(app)
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          username: "newstaff",
          email: "newstaff@test.com",
          password: "staff123",
          role: UserRole.staff,
        })
        .expect(201);

      expect(createUserResponse.body.success).toBe(true);
      createdUser = createUserResponse.body.data;

      // Step 4: Create a new counter
      const createCounterResponse = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "New Counter",
          isActive: true,
        })
        .expect(201);

      expect(createCounterResponse.body.success).toBe(true);
      createdCounter = createCounterResponse.body.data;

      // Step 5: Assign staff to counter
      const assignStaffResponse = await request(app)
        .post(`/api/counters/${createdCounter.id}/assign`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ staffId: createdUser.id })
        .expect(200);

      expect(assignStaffResponse.body.success).toBe(true);
      expect(assignStaffResponse.body.data.assignedStaffId).toBe(
        createdUser.id
      );

      // Step 6: Verify counter assignment
      const getCounterResponse = await request(app)
        .get(`/api/counters/${createdCounter.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(getCounterResponse.body.data.assignedStaffId).toBe(createdUser.id);
      expect(getCounterResponse.body.data.assignedStaff.username).toBe(
        "newstaff"
      );

      // Step 7: List all users and verify new user exists
      const listUsersResponse = await request(app)
        .get("/api/auth/users")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const userExists = listUsersResponse.body.data.users.find(
        (user: any) => user.id === createdUser.id
      );
      expect(userExists).toBeDefined();
      expect(userExists.username).toBe("newstaff");

      // Step 8: List all counters and verify new counter exists
      const listCountersResponse = await request(app)
        .get("/api/counters")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const counterExists = listCountersResponse.body.data.find(
        (counter: any) => counter.id === createdCounter.id
      );
      expect(counterExists).toBeDefined();
      expect(counterExists.name).toBe("New Counter");

      // Step 9: Get role information
      const getRolesResponse = await request(app)
        .get("/api/roles")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(getRolesResponse.body.data.length).toBe(3);
      const staffRole = getRolesResponse.body.data.find(
        (role: any) => role.role === UserRole.staff
      );
      expect(staffRole).toBeDefined();
      expect(staffRole.userCount).toBeGreaterThan(0);

      // Step 10: Update user information
      const updateUserResponse = await request(app)
        .patch(`/api/auth/users/${createdUser.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          email: "updated@test.com",
        })
        .expect(200);

      expect(updateUserResponse.body.data.email).toBe("updated@test.com");

      // Step 11: Update counter information
      const updateCounterResponse = await request(app)
        .put(`/api/counters/${createdCounter.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Updated Counter Name",
        })
        .expect(200);

      expect(updateCounterResponse.body.data.name).toBe("Updated Counter Name");

      // Step 12: Unassign staff from counter
      const unassignStaffResponse = await request(app)
        .post(`/api/counters/${createdCounter.id}/unassign`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(unassignStaffResponse.body.data.assignedStaffId).toBe(null);

      // Step 13: Ban user
      const banUserResponse = await request(app)
        .post(`/api/auth/users/${createdUser.id}/ban`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ reason: "Test ban" })
        .expect(200);

      expect(banUserResponse.body.data.isActive).toBe(false);

      // Step 14: Reactivate user
      const reactivateUserResponse = await request(app)
        .post(`/api/auth/users/${createdUser.id}/reactivate`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(reactivateUserResponse.body.data.isActive).toBe(true);

      // Step 15: Reset user password
      const resetPasswordResponse = await request(app)
        .post(`/api/auth/users/${createdUser.id}/reset-password`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(resetPasswordResponse.body.data).toHaveProperty(
        "temporaryPassword"
      );

      // Step 16: Delete counter
      const deleteCounterResponse = await request(app)
        .delete(`/api/counters/${createdCounter.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(deleteCounterResponse.body.success).toBe(true);

      // Step 17: Delete user
      const deleteUserResponse = await request(app)
        .delete(`/api/auth/users/${createdUser.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(deleteUserResponse.body.success).toBe(true);

      // Step 18: Logout
      const logoutResponse = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
    });
  });

  describe("Error Handling Workflow", () => {
    it("should handle errors gracefully throughout the workflow", async () => {
      // Test invalid login
      const invalidLoginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          username: "admin",
          password: "wrongpassword",
        })
        .expect(401);

      expect(invalidLoginResponse.body.success).toBe(false);

      // Test unauthorized access
      const unauthorizedResponse = await request(app)
        .get("/api/auth/users")
        .expect(401);

      expect(unauthorizedResponse.body.success).toBe(false);

      // Test creating user with duplicate username
      const duplicateUserResponse = await request(app)
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          username: "admin", // Already exists
          email: "duplicate@test.com",
          password: "password123",
          role: UserRole.staff,
        })
        .expect(409);

      expect(duplicateUserResponse.body.success).toBe(false);
      expect(duplicateUserResponse.body.message).toBe(
        "Username already exists"
      );

      // Test creating counter with duplicate name
      const duplicateCounterResponse = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Counter", // Already exists
          isActive: true,
        })
        .expect(409);

      expect(duplicateCounterResponse.body.success).toBe(false);
      expect(duplicateCounterResponse.body.message).toBe(
        "Counter with this name already exists"
      );

      // Test accessing non-existent resources
      const nonExistentUserResponse = await request(app)
        .get("/api/auth/users/non-existent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(nonExistentUserResponse.body.success).toBe(false);
      expect(nonExistentUserResponse.body.message).toBe("User not found");

      const nonExistentCounterResponse = await request(app)
        .get("/api/counters/non-existent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(nonExistentCounterResponse.body.success).toBe(false);
      expect(nonExistentCounterResponse.body.message).toBe("Counter not found");
    });
  });

  describe("Permission Workflow", () => {
    it("should enforce proper permissions throughout the workflow", async () => {
      // Create a staff user
      const staffHashedPassword = await bcrypt.hash("staff123", 10);
      const staffUser = await TestHelpers.createTestUser({
        username: "staff",
        email: "staff@test.com",
        password: staffHashedPassword,
        role: UserRole.staff,
        organizationId: testOrg.id,
      });

      // Generate staff token
      const staffToken = TestHelpers.generateJWTToken({
        id: staffUser.id,
        username: "staff",
        role: UserRole.staff,
        organizationId: testOrg.id,
      });

      // Staff should be able to view counters
      const viewCountersResponse = await request(app)
        .get("/api/counters")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expect(viewCountersResponse.body.success).toBe(true);

      // Staff should be able to view roles
      const viewRolesResponse = await request(app)
        .get("/api/roles")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expect(viewRolesResponse.body.success).toBe(true);

      // Staff should NOT be able to create users
      const createUserResponse = await request(app)
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          username: "unauthorized",
          email: "unauthorized@test.com",
          password: "password123",
          role: UserRole.staff,
        })
        .expect(403);

      expect(createUserResponse.body.success).toBe(false);
      expect(createUserResponse.body.message).toBe("Insufficient permissions");

      // Staff should NOT be able to create counters
      const createCounterResponse = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          name: "Unauthorized Counter",
          isActive: true,
        })
        .expect(403);

      expect(createCounterResponse.body.success).toBe(false);
      expect(createCounterResponse.body.message).toBe(
        "Insufficient permissions"
      );

      // Staff should NOT be able to view users list
      const viewUsersResponse = await request(app)
        .get("/api/auth/users")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(403);

      expect(viewUsersResponse.body.success).toBe(false);
      expect(viewUsersResponse.body.message).toBe("Insufficient permissions");

      // Cleanup
      await TestHelpers.cleanupUser(staffUser.id);
    });
  });

  describe("Data Consistency Workflow", () => {
    it("should maintain data consistency across operations", async () => {
      // Create a user and counter
      const userResponse = await request(app)
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          username: "consistencyuser",
          email: "consistency@test.com",
          password: "password123",
          role: UserRole.staff,
        })
        .expect(201);

      const counterResponse = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Consistency Counter",
          isActive: true,
        })
        .expect(201);

      const userId = userResponse.body.data.id;
      const counterId = counterResponse.body.data.id;

      // Assign user to counter
      await request(app)
        .post(`/api/counters/${counterId}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ staffId: userId })
        .expect(200);

      // Verify assignment
      const getCounterResponse = await request(app)
        .get(`/api/counters/${counterId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(getCounterResponse.body.data.assignedStaffId).toBe(userId);

      // Delete user
      await request(app)
        .delete(`/api/auth/users/${userId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      // Verify counter no longer has assigned staff
      const getCounterAfterDeleteResponse = await request(app)
        .get(`/api/counters/${counterId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(getCounterAfterDeleteResponse.body.data.assignedStaffId).toBe(
        null
      );
      expect(getCounterAfterDeleteResponse.body.data.assignedStaff).toBe(null);

      // Cleanup
      await TestHelpers.cleanupCounter(counterId);
    });
  });
});
