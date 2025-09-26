import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding test database...");

  // Create test organization
  const testOrg = await prisma.organization.upsert({
    where: { id: "test-org-id" },
    update: {},
    create: {
      id: "test-org-id",
      name: "Test Organization",
      settings: {
        timezone: "UTC",
        workingHours: {
          start: "09:00",
          end: "17:00",
        },
      },
    },
  });

  console.log("✅ Created test organization:", testOrg.name);

  // Create test users with hashed passwords
  const hashedPasswords = {
    admin: await bcrypt.hash("admin123", 10),
    manager: await bcrypt.hash("admin456", 10),
    staff1: await bcrypt.hash("staff123", 10),
    staff2: await bcrypt.hash("staff456", 10),
    superadmin: await bcrypt.hash("superadmin123", 10),
  };

  const users = [
    {
      id: "test-super-admin-id",
      username: "superadmin",
      email: "superadmin@test.com",
      password: hashedPasswords.superadmin,
      role: UserRole.super_admin,
      organizationId: testOrg.id,
      isActive: true,
    },
    {
      id: "test-admin-id",
      username: "admin",
      email: "admin@test.com",
      password: hashedPasswords.admin,
      role: UserRole.admin,
      organizationId: testOrg.id,
      isActive: true,
    },
    {
      id: "test-manager-id",
      username: "manager",
      email: "manager@test.com",
      password: hashedPasswords.manager,
      role: UserRole.admin,
      organizationId: testOrg.id,
      isActive: true,
    },
    {
      id: "test-staff1-id",
      username: "staff1",
      email: "staff1@test.com",
      password: hashedPasswords.staff1,
      role: UserRole.staff,
      organizationId: testOrg.id,
      isActive: true,
    },
    {
      id: "test-staff2-id",
      username: "staff2",
      email: "staff2@test.com",
      password: hashedPasswords.staff2,
      role: UserRole.staff,
      organizationId: testOrg.id,
      isActive: true,
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { id: userData.id },
      update: {},
      create: userData,
    });
    console.log(`✅ Created test user: ${user.username} (${user.role})`);
  }

  // Create test counters
  const counters = [
    {
      id: "test-counter1-id",
      name: "Counter 1",
      isActive: true,
      organizationId: testOrg.id,
      assignedStaffId: "test-staff1-id",
    },
    {
      id: "test-counter2-id",
      name: "Counter 2",
      isActive: true,
      organizationId: testOrg.id,
      assignedStaffId: null,
    },
    {
      id: "test-counter3-id",
      name: "Counter 3",
      isActive: false,
      organizationId: testOrg.id,
      assignedStaffId: null,
    },
  ];

  for (const counterData of counters) {
    const counter = await prisma.counter.upsert({
      where: { id: counterData.id },
      update: {},
      create: counterData,
    });
    console.log(
      `✅ Created test counter: ${counter.name} (${
        counter.isActive ? "Active" : "Inactive"
      })`
    );
  }

  // Create test queue settings
  const queueSettings = [
    {
      id: "test-queue-instant-id",
      customerType: "instant",
      prefix: "I",
      maxNumber: 999,
      resetDaily: true,
      resetTime: "00:00:00",
      isActive: true,
      priorityMultiplier: 1.0,
      organizationId: testOrg.id,
    },
    {
      id: "test-queue-browser-id",
      customerType: "browser",
      prefix: "B",
      maxNumber: 999,
      resetDaily: true,
      resetTime: "00:00:00",
      isActive: true,
      priorityMultiplier: 1.5,
      organizationId: testOrg.id,
    },
    {
      id: "test-queue-retail-id",
      customerType: "retail",
      prefix: "R",
      maxNumber: 999,
      resetDaily: true,
      resetTime: "00:00:00",
      isActive: true,
      priorityMultiplier: 2.0,
      organizationId: testOrg.id,
    },
  ];

  for (const settingData of queueSettings) {
    const setting = await prisma.queueSetting.upsert({
      where: { id: settingData.id },
      update: {},
      create: settingData,
    });
    console.log(
      `✅ Created queue setting: ${setting.customerType} (${setting.prefix})`
    );
  }

  // Create test tokens
  const tokens = [
    {
      id: "test-token1-id",
      number: "I001",
      customerType: "instant",
      status: "waiting",
      organizationId: testOrg.id,
      counterId: null,
      priority: 1,
    },
    {
      id: "test-token2-id",
      number: "B001",
      customerType: "browser",
      status: "called",
      organizationId: testOrg.id,
      counterId: "test-counter1-id",
      priority: 2,
      calledAt: new Date(),
    },
    {
      id: "test-token3-id",
      number: "R001",
      customerType: "retail",
      status: "completed",
      organizationId: testOrg.id,
      counterId: "test-counter1-id",
      priority: 3,
      calledAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      servedAt: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
      completedAt: new Date(Date.now() - 1000 * 60 * 1), // 1 minute ago
      servedBy: "test-staff1-id",
      actualWaitTime: 120, // 2 minutes
      serviceDuration: 120, // 2 minutes
    },
  ];

  for (const tokenData of tokens) {
    const token = await prisma.token.upsert({
      where: { id: tokenData.id },
      update: {},
      create: tokenData,
    });
    console.log(`✅ Created test token: ${token.number} (${token.status})`);
  }

  // Create test service sessions
  const sessions = [
    {
      id: "test-session1-id",
      staffId: "test-staff1-id",
      counterId: "test-counter1-id",
      startedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      endedAt: null,
      tokensServed: 5,
      averageServiceTime: 120,
      organizationId: testOrg.id,
    },
    {
      id: "test-session2-id",
      staffId: "test-staff2-id",
      counterId: "test-counter2-id",
      startedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      endedAt: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      tokensServed: 8,
      averageServiceTime: 90,
      organizationId: testOrg.id,
    },
  ];

  for (const sessionData of sessions) {
    const session = await prisma.serviceSession.upsert({
      where: { id: sessionData.id },
      update: {},
      create: sessionData,
    });
    console.log(
      `✅ Created test session: ${session.id} (${
        session.endedAt ? "Ended" : "Active"
      })`
    );
  }

  console.log("🎉 Test database seeded successfully!");
  console.log("\n📋 Test Data Summary:");
  console.log(`- Organization: ${testOrg.name}`);
  console.log(`- Users: ${users.length} (1 super admin, 2 admins, 2 staff)`);
  console.log(`- Counters: ${counters.length} (2 active, 1 inactive)`);
  console.log(
    `- Queue Settings: ${queueSettings.length} (instant, browser, retail)`
  );
  console.log(`- Tokens: ${tokens.length} (waiting, called, completed)`);
  console.log(`- Service Sessions: ${sessions.length} (1 active, 1 ended)`);

  console.log("\n🔑 Test Credentials:");
  console.log("Super Admin: superadmin / superadmin123");
  console.log("Admin: admin / admin123");
  console.log("Manager: manager / admin456");
  console.log("Staff 1: staff1 / staff123");
  console.log("Staff 2: staff2 / staff456");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding test database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
