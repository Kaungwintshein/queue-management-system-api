"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Starting database seed...");
    // Create default organization
    let organization = await prisma.organization.findFirst({
        where: { name: "Default Organization" },
    });
    if (!organization) {
        organization = await prisma.organization.create({
            data: {
                name: "Default Organization",
                settings: {
                    maxTokensPerDay: 1000,
                    operatingHours: {
                        start: "09:00",
                        end: "18:00",
                    },
                    holidays: [],
                },
            },
        });
    }
    console.log("Created organization:", organization.name);
    // Create super admin user
    const passwordHash = await bcryptjs_1.default.hash("admin123", 12);
    const superAdmin = await prisma.user.upsert({
        where: { username: "admin" },
        update: {},
        create: {
            organizationId: organization.id,
            username: "admin",
            email: "admin@queuemanagement.com",
            passwordHash,
            role: client_1.UserRole.super_admin,
            permissions: {
                all: true,
            },
            isActive: true,
        },
    });
    console.log("Created super admin user:", superAdmin.username);
    // Create admin user
    const adminPasswordHash = await bcryptjs_1.default.hash("admin456", 12);
    const admin = await prisma.user.upsert({
        where: { username: "manager" },
        update: {},
        create: {
            organizationId: organization.id,
            username: "manager",
            email: "manager@queuemanagement.com",
            passwordHash: adminPasswordHash,
            role: client_1.UserRole.admin,
            permissions: {
                tokens: ["create", "read", "update"],
                users: ["create", "read", "update"],
                settings: ["read"],
                analytics: ["read"],
            },
            isActive: true,
        },
    });
    console.log("Created admin user:", admin.username);
    // Create staff users
    const staffUsers = [
        {
            username: "staff1",
            email: "staff1@queuemanagement.com",
            name: "John Doe",
        },
        {
            username: "staff2",
            email: "staff2@queuemanagement.com",
            name: "Jane Smith",
        },
        {
            username: "staff3",
            email: "staff3@queuemanagement.com",
            name: "Mike Johnson",
        },
        {
            username: "staff4",
            email: "staff4@queuemanagement.com",
            name: "Sarah Wilson",
        },
    ];
    const staffPasswordHash = await bcryptjs_1.default.hash("staff123", 12);
    for (const staffData of staffUsers) {
        await prisma.user.upsert({
            where: { username: staffData.username },
            update: {},
            create: {
                organizationId: organization.id,
                username: staffData.username,
                email: staffData.email,
                passwordHash: staffPasswordHash,
                role: client_1.UserRole.staff,
                permissions: {
                    tokens: ["create", "read", "update"],
                    queue: ["read", "manage"],
                },
                isActive: true,
            },
        });
    }
    console.log("Created staff users:", staffUsers.map((s) => s.username).join(", "));
    // Create queue settings for each customer type
    const queueSettings = [
        {
            customerType: client_1.CustomerType.instant,
            prefix: "I",
            currentNumber: 0,
            maxNumber: 999,
            priorityMultiplier: 1.0,
        },
        {
            customerType: client_1.CustomerType.browser,
            prefix: "B",
            currentNumber: 0,
            maxNumber: 999,
            priorityMultiplier: 1.2,
        },
        {
            customerType: client_1.CustomerType.retail,
            prefix: "R",
            currentNumber: 0,
            maxNumber: 999,
            priorityMultiplier: 1.5,
        },
    ];
    for (const setting of queueSettings) {
        await prisma.queueSetting.upsert({
            where: {
                organizationId_customerType: {
                    organizationId: organization.id,
                    customerType: setting.customerType,
                },
            },
            update: {},
            create: {
                organizationId: organization.id,
                customerType: setting.customerType,
                prefix: setting.prefix,
                currentNumber: setting.currentNumber,
                maxNumber: setting.maxNumber,
                resetDaily: true,
                resetTime: new Date("1970-01-01T00:00:00Z"),
                isActive: true,
                priorityMultiplier: setting.priorityMultiplier,
            },
        });
    }
    console.log("Created queue settings for all customer types");
    // Create counters
    const counters = [
        { name: "Counter 1" },
        { name: "Counter 2" },
        { name: "Counter 3" },
        { name: "Counter 4" },
    ];
    for (const counter of counters) {
        const existingCounter = await prisma.counter.findFirst({
            where: {
                organizationId: organization.id,
                name: counter.name,
            },
        });
        if (!existingCounter) {
            await prisma.counter.create({
                data: {
                    organizationId: organization.id,
                    name: counter.name,
                    isActive: true,
                },
            });
        }
    }
    console.log("Created counters:", counters.map((c) => c.name).join(", "));
    // Create some sample tokens for testing
    const sampleTokens = [
        { customerType: client_1.CustomerType.instant, priority: 0 },
        { customerType: client_1.CustomerType.instant, priority: 0 },
        { customerType: client_1.CustomerType.browser, priority: 0 },
        { customerType: client_1.CustomerType.retail, priority: 1 },
        { customerType: client_1.CustomerType.instant, priority: 0 },
        { customerType: client_1.CustomerType.browser, priority: 0 },
        { customerType: client_1.CustomerType.retail, priority: 0 },
    ];
    // Get the instant queue setting to generate proper token numbers
    const instantSetting = await prisma.queueSetting.findFirst({
        where: {
            organizationId: organization.id,
            customerType: client_1.CustomerType.instant,
        },
    });
    const browserSetting = await prisma.queueSetting.findFirst({
        where: {
            organizationId: organization.id,
            customerType: client_1.CustomerType.browser,
        },
    });
    const retailSetting = await prisma.queueSetting.findFirst({
        where: {
            organizationId: organization.id,
            customerType: client_1.CustomerType.retail,
        },
    });
    const settings = {
        instant: instantSetting,
        browser: browserSetting,
        retail: retailSetting,
    };
    let counters_data = {
        instant: 0,
        browser: 0,
        retail: 0,
    };
    for (const tokenData of sampleTokens) {
        counters_data[tokenData.customerType]++;
        const setting = settings[tokenData.customerType];
        const tokenNumber = `${setting.prefix}${counters_data[tokenData.customerType]
            .toString()
            .padStart(3, "0")}`;
        await prisma.token.create({
            data: {
                organizationId: organization.id,
                number: tokenNumber,
                customerType: tokenData.customerType,
                status: "waiting",
                priority: tokenData.priority,
            },
        });
        // Update the queue setting counter
        await prisma.queueSetting.update({
            where: { id: setting.id },
            data: { currentNumber: counters_data[tokenData.customerType] },
        });
    }
    console.log("Created sample tokens for testing");
    // Create system log entry for the seed
    await prisma.systemLog.create({
        data: {
            organizationId: organization.id,
            userId: superAdmin.id,
            action: "database_seeded",
            entityType: "system",
            details: {
                message: "Database seeded with initial data",
                timestamp: new Date(),
                tokensCreated: sampleTokens.length,
                usersCreated: staffUsers.length + 2, // staff + admin + super admin
                countersCreated: counters.length,
            },
        },
    });
    console.log("Database seed completed successfully!");
    // Print login credentials
    console.log("\n=== LOGIN CREDENTIALS ===");
    console.log("Super Admin:");
    console.log("  Username: admin");
    console.log("  Password: admin123");
    console.log("  Email: admin@queuemanagement.com");
    console.log("\nAdmin:");
    console.log("  Username: manager");
    console.log("  Password: admin456");
    console.log("  Email: manager@queuemanagement.com");
    console.log("\nStaff (all have same password):");
    console.log("  Username: staff1, staff2, staff3, staff4");
    console.log("  Password: staff123");
    console.log("  Emails: staff1@queuemanagement.com, etc.");
    console.log("\n=== QUEUE PREFIXES ===");
    console.log("Instant Buyers: I (I001, I002, ...)");
    console.log("Browser Customers: B (B001, B002, ...)");
    console.log("Retail Customers: R (R001, R002, ...)");
    console.log("\n=== CURRENT SAMPLE TOKENS ===");
    console.log(`Instant: I001, I002, I005 (${counters_data.instant} total)`);
    console.log(`Browser: B001, B003, B006 (${counters_data.browser} total)`);
    console.log(`Retail: R004, R007 (${counters_data.retail} total)`);
}
main()
    .catch((e) => {
    console.error("Error during database seed:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map