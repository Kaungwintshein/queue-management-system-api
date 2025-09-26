import request from "supertest";
import { app } from "@/app";
import { TestHelpers } from "../utils/testHelpers";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

describe("Admin Portal End-to-End Tests", () => {
  let testOrg: any;
  let superAdminUser: any;
  let adminUser: any;
  let staffUser: any;
  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    // Create test organization
    testOrg = await TestHelpers.createTestOrganization();

    // Create super admin user
    const superAdminHashedPassword = await bcrypt.hash("superadmin123", 10);
    superAdminUser = await TestHelpers.createTestUser({
      username: "superadmin",
      email: "superadmin@test.com",
      password: superAdminHashedPassword,
      role: UserRole.super_admin,
      organizationId: testOrg.id,
    });

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
    superAdminToken = TestHelpers.generateJWTToken({
      id: superAdminUser.id,
      username: "superadmin",
      role: UserRole.super_admin,
      organizationId: testOrg.id,
    });

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

  describe("Admin Portal Access Control", () => {
    it("should allow super admin to access all admin features", async () => {
      // Test user management access
      const usersResponse = await request(app)
        .get("/api/auth/users")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);

      expect(usersResponse.body.success).toBe(true);

      // Test counter management access
      const countersResponse = await request(app)
        .get("/api/counters")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);

      expect(countersResponse.body.success).toBe(true);

      // Test role management access
      const rolesResponse = await request(app)
        .get("/api/roles")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);

      expect(rolesResponse.body.success).toBe(true);
    });

    it("should allow admin to access admin features", async () => {
      // Test user management access
      const usersResponse = await request(app)
        .get("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(usersResponse.body.success).toBe(true);

      // Test counter management access
      const countersResponse = await request(app)
        .get("/api/counters")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(countersResponse.body.success).toBe(true);

      // Test role management access
      const rolesResponse = await request(app)
        .get("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(rolesResponse.body.success).toBe(true);
    });

    it("should restrict staff access to admin features", async () => {
      // Staff should NOT access user management
      const usersResponse = await request(app)
        .get("/api/auth/users")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(403);

      expect(usersResponse.body.success).toBe(false);
      expect(usersResponse.body.message).toBe("Insufficient permissions");

      // Staff should access counter list (read-only)
      const countersResponse = await request(app)
        .get("/api/counters")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expect(countersResponse.body.success).toBe(true);

      // Staff should NOT create counters
      const createCounterResponse = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          name: "Unauthorized Counter",
          isActive: true,
        })
        .expect(403);

      expect(createCounterResponse.body.success).toBe(false);

      // Staff should access role list (read-only)
      const rolesResponse = await request(app)
        .get("/api/roles")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expect(rolesResponse.body.success).toBe(true);
    });
  });

  describe("Complete Admin Portal Workflow", () => {
    it("should simulate complete admin portal usage", async () => {
      // Step 1: Admin logs in
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          username: "admin",
          password: "admin123",
        })
        .expect(200);

      const authToken = loginResponse.body.data.token;

      // Step 2: Admin views dashboard data
      const dashboardData = await Promise.all([
        request(app)
          .get("/api/auth/users")
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200),
        request(app)
          .get("/api/counters")
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200),
        request(app)
          .get("/api/roles")
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200),
      ]);

      // Verify dashboard data
      expect(dashboardData[0].body.data.users.length).toBeGreaterThan(0);
      expect(dashboardData[1].body.data.length).toBeGreaterThan(0);
      expect(dashboardData[2].body.data.length).toBe(3);

      // Step 3: Admin creates new staff user
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

      const newUserId = createUserResponse.body.data.id;

      // Step 4: Admin creates new counter
      const createCounterResponse = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "New Counter",
          isActive: true,
        })
        .expect(201);

      const newCounterId = createCounterResponse.body.data.id;

      // Step 5: Admin assigns staff to counter
      await request(app)
        .post(`/api/counters/${newCounterId}/assign`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ staffId: newUserId })
        .expect(200);

      // Step 6: Admin views updated data
      const updatedCountersResponse = await request(app)
        .get("/api/counters")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const assignedCounter = updatedCountersResponse.body.data.find(
        (counter: any) => counter.id === newCounterId
      );
      expect(assignedCounter.assignedStaffId).toBe(newUserId);

      // Step 7: Admin updates user information
      await request(app)
        .patch(`/api/auth/users/${newUserId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          email: "updated@test.com",
        })
        .expect(200);

      // Step 8: Admin updates counter information
      await request(app)
        .put(`/api/counters/${newCounterId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Updated Counter Name",
        })
        .expect(200);

      // Step 9: Admin manages user status
      await request(app)
        .post(`/api/auth/users/${newUserId}/ban`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ reason: "Test ban" })
        .expect(200);

      await request(app)
        .post(`/api/auth/users/${newUserId}/reactivate`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Step 10: Admin resets user password
      await request(app)
        .post(`/api/auth/users/${newUserId}/reset-password`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Step 11: Admin unassigns staff from counter
      await request(app)
        .post(`/api/counters/${newCounterId}/unassign`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Step 12: Admin deletes counter
      await request(app)
        .delete(`/api/counters/${newCounterId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Step 13: Admin deletes user
      await request(app)
        .delete(`/api/auth/users/${newUserId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Step 14: Admin logs out
      await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe("Multi-User Admin Portal Scenario", () => {
    it("should handle multiple admins working simultaneously", async () => {
      // Admin 1 creates a user
      const admin1UserResponse = await request(app)
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          username: "admin1user",
          email: "admin1user@test.com",
          password: "password123",
          role: UserRole.staff,
        })
        .expect(201);

      const admin1UserId = admin1UserResponse.body.data.id;

      // Admin 2 creates a counter
      const admin2CounterResponse = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Admin2 Counter",
          isActive: true,
        })
        .expect(201);

      const admin2CounterId = admin2CounterResponse.body.data.id;

      // Admin 1 assigns their user to Admin 2's counter
      await request(app)
        .post(`/api/counters/${admin2CounterId}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ staffId: admin1UserId })
        .expect(200);

      // Verify the assignment
      const counterResponse = await request(app)
        .get(`/api/counters/${admin2CounterId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(counterResponse.body.data.assignedStaffId).toBe(admin1UserId);

      // Cleanup
      await TestHelpers.cleanupUser(admin1UserId);
      await TestHelpers.cleanupCounter(admin2CounterId);
    });
  });

  describe("Error Recovery in Admin Portal", () => {
    it("should handle errors gracefully and maintain system state", async () => {
      // Try to create user with invalid data
      const invalidUserResponse = await request(app)
        .post("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          username: "", // Invalid
          email: "invalid-email", // Invalid
          password: "123", // Too short
          role: "invalid_role", // Invalid
        })
        .expect(400);

      expect(invalidUserResponse.body.success).toBe(false);

      // Try to create counter with invalid data
      const invalidCounterResponse = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "", // Invalid
          isActive: "invalid", // Invalid
        })
        .expect(400);

      expect(invalidCounterResponse.body.success).toBe(false);

      // Try to assign non-existent user to counter
      const invalidAssignmentResponse = await request(app)
        .post("/api/counters/non-existent-counter/assign")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ staffId: "non-existent-user" })
        .expect(404);

      expect(invalidAssignmentResponse.body.success).toBe(false);

      // System should still be functional after errors
      const usersResponse = await request(app)
        .get("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(usersResponse.body.success).toBe(true);
    });
  });

  describe("Performance and Load Testing", () => {
    it("should handle multiple concurrent requests", async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .get("/api/auth/users")
          .set("Authorization", `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it("should handle rapid sequential operations", async () => {
      const operations = [];

      // Create multiple users rapidly
      for (let i = 0; i < 5; i++) {
        operations.push(
          request(app)
            .post("/api/auth/users")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
              username: `rapiduser${i}`,
              email: `rapiduser${i}@test.com`,
              password: "password123",
              role: UserRole.staff,
            })
        );
      }

      const responses = await Promise.all(operations);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Cleanup
      const userIds = responses.map((r) => r.body.data.id);
      for (const userId of userIds) {
        await TestHelpers.cleanupUser(userId);
      }
    });
  });
});
