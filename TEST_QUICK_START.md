# Test Quick Start Guide

## 🚀 **Get Started with TDD in 5 Minutes**

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Set Up Test Database

```bash
# Create test database
createdb queue_management_test

# Run migrations
npm run db:migrate

# Seed test data
npm run db:test-seed
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (TDD)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# TDD mode (unit tests only, watch mode)
npm run test:tdd
```

### 4. View Results

```bash
# View HTML coverage report
open coverage/lcov-report/index.html
```

## 🧪 **Test Categories**

### Unit Tests

```bash
npm run test:unit
```

- Individual API endpoint testing
- Request/response validation
- Error handling
- Authentication/authorization

### Integration Tests

```bash
npm run test:integration
```

- Complete workflow testing
- Cross-API interactions
- Data consistency
- Multi-step operations

### End-to-End Tests

```bash
npm run test:e2e
```

- Full admin portal simulation
- Real user scenarios
- Performance testing
- Load testing

## 🎯 **TDD Workflow**

1. **Start TDD Mode**

   ```bash
   npm run test:tdd
   ```

2. **Write Failing Test** (Red)

   ```typescript
   it("should create user successfully", async () => {
     const response = await request(app)
       .post("/api/users")
       .send({ username: "newuser" })
       .expect(201);

     expect(response.body.data.username).toBe("newuser");
   });
   ```

3. **Write Code to Pass** (Green)

   ```typescript
   router.post("/api/users", async (req, res) => {
     const user = await prisma.user.create({
       data: { username: req.body.username },
     });
     res.json({ success: true, data: user });
   });
   ```

4. **Refactor** (Refactor)

   ```typescript
   router.post(
     "/api/users",
     authenticate,
     authorize([UserRole.admin]),
     validateUserCreation,
     async (req, res) => {
       const user = await userService.createUser(req.body);
       res.json({ success: true, data: user });
     }
   );
   ```

5. **Repeat**

## 📊 **Test Coverage**

- **Target**: 80% minimum coverage
- **Current**: 80%+ coverage
- **Reports**: HTML, LCOV, Text
- **Exclusions**: App entry points, type definitions

## 🔧 **Test Utilities**

### TestHelpers

```typescript
import { TestHelpers } from "./tests/utils/testHelpers";

// Create test data
const user = await TestHelpers.createTestUser();
const token = TestHelpers.generateJWTToken();

// Make requests
const response = await request(app)
  .get("/api/users")
  .set("Authorization", `Bearer ${token}`)
  .expect(200);

// Validate responses
TestHelpers.expectValidApiResponse(response.body);
```

### Test Data

```typescript
import { TEST_DATA } from "./tests/utils/testHelpers";

// Use predefined test data
const userData = TEST_DATA.USERS.ADMIN;
const counterData = TEST_DATA.COUNTERS.DEFAULT;
```

## 🎉 **Ready to Go!**

Your TDD environment is now set up and ready for development. Start with:

```bash
npm run test:tdd
```

Happy testing! 🚀
