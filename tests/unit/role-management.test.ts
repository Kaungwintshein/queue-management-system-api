import request from "supertest";
import app from "@/app";
import { TestHelpers, TEST_DATA } from "../utils/testHelpers";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

describe("Role Management APIs", () => {
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

  describe("GET /api/roles", () => {
    it("should list roles successfully", async () => {
      const response = await request(app)
        .get("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Roles retrieved successfully");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3); // super_admin, admin, staff

      // Verify role data structure
      const role = response.body.data[0];
      expect(role).toHaveProperty("role");
      expect(role).toHaveProperty("displayName");
      expect(role).toHaveProperty("description");
      expect(role).toHaveProperty("permissions");
      expect(role).toHaveProperty("userCount");
      expect(Array.isArray(role.permissions)).toBe(true);
    });

    it("should include user counts for each role", async () => {
      const response = await request(app)
        .get("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Find admin role and verify user count
      const adminRole = response.body.data.find(
        (role: any) => role.role === UserRole.admin
      );
      expect(adminRole).toBeDefined();
      expect(adminRole.userCount).toBeGreaterThanOrEqual(1); // At least our test admin user

      // Find staff role and verify user count
      const staffRole = response.body.data.find(
        (role: any) => role.role === UserRole.staff
      );
      expect(staffRole).toBeDefined();
      expect(staffRole.userCount).toBeGreaterThanOrEqual(1); // At least our test staff user
    });

    it("should work for staff users", async () => {
      const response = await request(app)
        .get("/api/roles")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await request(app).get("/api/roles").expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access token required");
    });
  });

  describe("GET /api/roles/:roleId", () => {
    it("should get super_admin role details successfully", async () => {
      const response = await request(app)
        .get(`/api/roles/${UserRole.super_admin}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Role retrieved successfully");
      expect(response.body.data.role).toBe(UserRole.super_admin);
      expect(response.body.data.displayName).toBe("Super Administrator");
      expect(response.body.data.description).toContain("full system access");
      expect(Array.isArray(response.body.data.permissions)).toBe(true);
      expect(response.body.data.permissions.length).toBeGreaterThan(0);
    });

    it("should get admin role details successfully", async () => {
      const response = await request(app)
        .get(`/api/roles/${UserRole.admin}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(UserRole.admin);
      expect(response.body.data.displayName).toBe("Administrator");
      expect(response.body.data.description).toContain(
        "organization management"
      );
      expect(Array.isArray(response.body.data.permissions)).toBe(true);
    });

    it("should get staff role details successfully", async () => {
      const response = await request(app)
        .get(`/api/roles/${UserRole.staff}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(UserRole.staff);
      expect(response.body.data.displayName).toBe("Staff Member");
      expect(response.body.data.description).toContain("queue management");
      expect(Array.isArray(response.body.data.permissions)).toBe(true);
    });

    it("should fail with non-existent role", async () => {
      const response = await request(app)
        .get("/api/roles/invalid_role")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Role not found");
    });
  });

  describe("POST /api/roles", () => {
    it("should fail to create custom role (not supported)", async () => {
      const newRoleData = {
        role: "custom_role",
        displayName: "Custom Role",
        description: "A custom role",
        permissions: ["read_users"],
      };

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newRoleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Custom roles are not supported. Only default roles (super_admin, admin, staff) are available."
      );
    });

    it("should fail to create duplicate default role", async () => {
      const duplicateRoleData = {
        role: UserRole.admin,
        displayName: "Duplicate Admin",
        description: "Duplicate admin role",
        permissions: ["read_users", "write_users"],
      };

      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(duplicateRoleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Custom roles are not supported. Only default roles (super_admin, admin, staff) are available."
      );
    });
  });

  describe("PUT /api/roles/:roleId", () => {
    it("should fail to update default role (not supported)", async () => {
      const updateData = {
        displayName: "Updated Admin Role",
        description: "Updated description",
        permissions: ["read_users"],
      };

      const response = await request(app)
        .put(`/api/roles/${UserRole.admin}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Default roles cannot be modified. Only default roles (super_admin, admin, staff) are supported."
      );
    });

    it("should fail to update non-existent role", async () => {
      const updateData = {
        displayName: "Updated Role",
        description: "Updated description",
      };

      const response = await request(app)
        .put("/api/roles/invalid_role")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Role not found");
    });
  });

  describe("DELETE /api/roles/:roleId", () => {
    it("should fail to delete default role (not supported)", async () => {
      const response = await request(app)
        .delete(`/api/roles/${UserRole.admin}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Default roles cannot be deleted. Only default roles (super_admin, admin, staff) are supported."
      );
    });

    it("should fail to delete non-existent role", async () => {
      const response = await request(app)
        .delete("/api/roles/invalid_role")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Role not found");
    });
  });

  describe("Role Permissions", () => {
    it("should have correct permissions for super_admin role", async () => {
      const response = await request(app)
        .get(`/api/roles/${UserRole.super_admin}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const permissions = response.body.data.permissions;
      expect(permissions).toContain("manage_users");
      expect(permissions).toContain("manage_counters");
      expect(permissions).toContain("manage_roles");
      expect(permissions).toContain("view_analytics");
      expect(permissions).toContain("manage_organization");
    });

    it("should have correct permissions for admin role", async () => {
      const response = await request(app)
        .get(`/api/roles/${UserRole.admin}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const permissions = response.body.data.permissions;
      expect(permissions).toContain("manage_users");
      expect(permissions).toContain("manage_counters");
      expect(permissions).toContain("view_analytics");
      expect(permissions).not.toContain("manage_organization"); // Only super_admin
    });

    it("should have correct permissions for staff role", async () => {
      const response = await request(app)
        .get(`/api/roles/${UserRole.staff}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const permissions = response.body.data.permissions;
      expect(permissions).toContain("manage_queue");
      expect(permissions).toContain("view_tokens");
      expect(permissions).not.toContain("manage_users"); // Only admin+
      expect(permissions).not.toContain("manage_counters"); // Only admin+
    });
  });

  describe("Authorization Tests", () => {
    it("should allow staff users to view roles", async () => {
      const response = await request(app)
        .get("/api/roles")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should allow staff users to view role details", async () => {
      const response = await request(app)
        .get(`/api/roles/${UserRole.staff}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should require admin permissions for role creation", async () => {
      const response = await request(app)
        .post("/api/roles")
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          role: "test_role",
          displayName: "Test Role",
          description: "Test description",
          permissions: ["read_users"],
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Insufficient permissions");
    });

    it("should require admin permissions for role updates", async () => {
      const response = await request(app)
        .put(`/api/roles/${UserRole.admin}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          displayName: "Updated Role",
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Insufficient permissions");
    });

    it("should require admin permissions for role deletion", async () => {
      const response = await request(app)
        .delete(`/api/roles/${UserRole.admin}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Insufficient permissions");
    });
  });
});
