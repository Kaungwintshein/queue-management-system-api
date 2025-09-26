import request from "supertest";
import app from "@/app";
import { TestHelpers, TEST_DATA } from "../utils/testHelpers";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

describe("Counter Management APIs", () => {
  let testOrg: any;
  let adminUser: any;
  let staffUser: any;
  let adminToken: string;
  let staffToken: string;
  let testCounter: any;

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

    // Create test counter
    testCounter = await TestHelpers.createTestCounter({
      name: "Test Counter",
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

  describe("GET /api/counters", () => {
    it("should list counters successfully", async () => {
      const response = await request(app)
        .get("/api/counters")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Counters retrieved successfully");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify counter data structure
      const counter = response.body.data[0];
      TestHelpers.expectValidCounterResponse(counter);
    });

    it("should filter counters by active status", async () => {
      const response = await request(app)
        .get("/api/counters?active=true")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.every((counter: any) => counter.isActive === true)
      ).toBe(true);
    });

    it("should filter counters by assigned status", async () => {
      const response = await request(app)
        .get("/api/counters?assigned=true")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(
        response.body.data.every(
          (counter: any) => counter.assignedStaff !== null
        )
      ).toBe(true);
    });

    it("should work for staff users", async () => {
      const response = await request(app)
        .get("/api/counters")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should fail without authentication", async () => {
      const response = await request(app).get("/api/counters").expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access token required");
    });
  });

  describe("POST /api/counters", () => {
    it("should create counter successfully", async () => {
      const newCounterData = {
        name: "New Counter",
        isActive: true,
      };

      const response = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newCounterData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Counter created successfully");
      expect(response.body.data.name).toBe("New Counter");
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.organizationId).toBe(testOrg.id);
      TestHelpers.expectValidCounterResponse(response.body.data);

      // Cleanup
      await TestHelpers.cleanupCounter(response.body.data.id);
    });

    it("should create counter with staff assignment", async () => {
      const counterWithStaffData = {
        name: "Counter with Staff",
        isActive: true,
        assignedStaffId: staffUser.id,
      };

      const response = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(counterWithStaffData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedStaffId).toBe(staffUser.id);
      expect(response.body.data.assignedStaff).toBeDefined();
      expect(response.body.data.assignedStaff.username).toBe("staff");

      // Cleanup
      await TestHelpers.cleanupCounter(response.body.data.id);
    });

    it("should fail with duplicate counter name", async () => {
      const duplicateCounterData = {
        name: "Test Counter", // Already exists
        isActive: true,
      };

      const response = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(duplicateCounterData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Counter with this name already exists"
      );
    });

    it("should fail with non-existent staff assignment", async () => {
      const invalidStaffData = {
        name: "Counter with Invalid Staff",
        isActive: true,
        assignedStaffId: "non-existent-staff-id",
      };

      const response = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidStaffData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Staff member not found or inactive");
    });

    it("should fail for staff users (insufficient permissions)", async () => {
      const newCounterData = {
        name: "Unauthorized Counter",
        isActive: true,
      };

      const response = await request(app)
        .post("/api/counters")
        .set("Authorization", `Bearer ${staffToken}`)
        .send(newCounterData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Insufficient permissions");
    });
  });

  describe("GET /api/counters/:counterId", () => {
    it("should get counter by ID successfully", async () => {
      const response = await request(app)
        .get(`/api/counters/${testCounter.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Counter retrieved successfully");
      expect(response.body.data.id).toBe(testCounter.id);
      expect(response.body.data.name).toBe("Test Counter");
      TestHelpers.expectValidCounterResponse(response.body.data);
    });

    it("should fail with non-existent counter ID", async () => {
      const response = await request(app)
        .get("/api/counters/non-existent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Counter not found");
    });
  });

  describe("PUT /api/counters/:counterId", () => {
    it("should update counter successfully", async () => {
      const updateData = {
        name: "Updated Counter Name",
        isActive: false,
      };

      const response = await request(app)
        .put(`/api/counters/${testCounter.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Counter updated successfully");
      expect(response.body.data.name).toBe("Updated Counter Name");
      expect(response.body.data.isActive).toBe(false);

      // Reset for other tests
      await request(app)
        .put(`/api/counters/${testCounter.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Counter",
          isActive: true,
        })
        .expect(200);
    });

    it("should update counter with staff assignment", async () => {
      const updateData = {
        assignedStaffId: staffUser.id,
      };

      const response = await request(app)
        .put(`/api/counters/${testCounter.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedStaffId).toBe(staffUser.id);
      expect(response.body.data.assignedStaff).toBeDefined();
      expect(response.body.data.assignedStaff.username).toBe("staff");

      // Unassign for other tests
      await request(app)
        .put(`/api/counters/${testCounter.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          assignedStaffId: null,
        })
        .expect(200);
    });

    it("should fail with duplicate counter name", async () => {
      // Create another counter first
      const anotherCounter = await TestHelpers.createTestCounter({
        name: "Another Counter",
        organizationId: testOrg.id,
      });

      const updateData = {
        name: "Another Counter", // Duplicate name
      };

      const response = await request(app)
        .put(`/api/counters/${testCounter.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Counter with this name already exists"
      );

      // Cleanup
      await TestHelpers.cleanupCounter(anotherCounter.id);
    });
  });

  describe("DELETE /api/counters/:counterId", () => {
    it("should delete counter successfully", async () => {
      // Create a counter to delete
      const counterToDelete = await TestHelpers.createTestCounter({
        name: "Counter to Delete",
        organizationId: testOrg.id,
      });

      const response = await request(app)
        .delete(`/api/counters/${counterToDelete.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Counter deleted successfully");

      // Verify counter is deleted
      const getResponse = await request(app)
        .get(`/api/counters/${counterToDelete.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);

      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.message).toBe("Counter not found");
    });

    it("should fail to delete counter with active tokens", async () => {
      // Create a counter with active tokens
      const counterWithTokens = await TestHelpers.createTestCounter({
        name: "Counter with Tokens",
        organizationId: testOrg.id,
      });

      // Create a token for this counter
      await TestHelpers.createTestToken({
        counterId: counterWithTokens.id,
        organizationId: testOrg.id,
        status: "waiting",
      });

      const response = await request(app)
        .delete(`/api/counters/${counterWithTokens.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Cannot delete counter with active tokens"
      );

      // Cleanup
      await TestHelpers.cleanupCounter(counterWithTokens.id);
    });
  });

  describe("POST /api/counters/:counterId/assign", () => {
    it("should assign staff to counter successfully", async () => {
      const response = await request(app)
        .post(`/api/counters/${testCounter.id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ staffId: staffUser.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Staff assigned successfully");
      expect(response.body.data.assignedStaffId).toBe(staffUser.id);
      expect(response.body.data.assignedStaff).toBeDefined();
      expect(response.body.data.assignedStaff.username).toBe("staff");
    });

    it("should fail to assign non-existent staff", async () => {
      const response = await request(app)
        .post(`/api/counters/${testCounter.id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ staffId: "non-existent-staff-id" })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Staff member not found or inactive");
    });

    it("should fail to assign staff already assigned to another counter", async () => {
      // Create another counter
      const anotherCounter = await TestHelpers.createTestCounter({
        name: "Another Counter",
        organizationId: testOrg.id,
      });

      // Assign staff to another counter first
      await request(app)
        .post(`/api/counters/${anotherCounter.id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ staffId: staffUser.id })
        .expect(200);

      // Try to assign same staff to test counter
      const response = await request(app)
        .post(`/api/counters/${testCounter.id}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ staffId: staffUser.id })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Staff member is already assigned to another counter"
      );

      // Cleanup
      await TestHelpers.cleanupCounter(anotherCounter.id);
    });
  });

  describe("POST /api/counters/:counterId/unassign", () => {
    it("should unassign staff from counter successfully", async () => {
      const response = await request(app)
        .post(`/api/counters/${testCounter.id}/unassign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Staff unassigned successfully");
      expect(response.body.data.assignedStaffId).toBe(null);
      expect(response.body.data.assignedStaff).toBe(null);
    });

    it("should handle unassigning from counter with no assigned staff", async () => {
      const response = await request(app)
        .post(`/api/counters/${testCounter.id}/unassign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Staff unassigned successfully");
    });
  });
});
