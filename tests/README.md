# Test-Driven Development (TDD) Documentation

## Overview

This project implements a comprehensive Test-Driven Development (TDD) approach for the Queue Management System API. The test suite covers unit tests, integration tests, and end-to-end tests for all admin APIs.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and teardown
├── utils/
│   └── testHelpers.ts          # Test utilities and helpers
├── unit/                       # Unit tests for individual components
│   ├── auth.test.ts           # Authentication API tests
│   ├── user-management.test.ts # User management API tests
│   ├── counter-management.test.ts # Counter management API tests
│   └── role-management.test.ts # Role management API tests
├── integration/                # Integration tests for workflows
│   └── admin-workflow.test.ts  # Complete admin workflow tests
├── e2e/                       # End-to-end tests
│   └── admin-portal.test.ts   # Full admin portal simulation
└── README.md                  # This documentation
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

**Purpose**: Test individual API endpoints in isolation

**Coverage**:

- ✅ Authentication APIs (login, register, logout, change password)
- ✅ User Management APIs (CRUD, ban, reactivate, reset password)
- ✅ Counter Management APIs (CRUD, assign/unassign staff)
- ✅ Role Management APIs (list, get details)

**Key Features**:

- Mock database operations
- Test request/response validation
- Test error handling
- Test authentication and authorization
- Test data validation

### 2. Integration Tests (`tests/integration/`)

**Purpose**: Test complete workflows and API interactions

**Coverage**:

- ✅ Complete admin workflow (login → create user → create counter → assign staff → manage roles)
- ✅ Error handling across the entire workflow
- ✅ Permission enforcement throughout workflows
- ✅ Data consistency across operations

**Key Features**:

- Real database operations
- Multi-step workflows
- Cross-API interactions
- Data consistency validation

### 3. End-to-End Tests (`tests/e2e/`)

**Purpose**: Simulate real user interactions with the admin portal

**Coverage**:

- ✅ Admin portal access control
- ✅ Complete admin portal usage simulation
- ✅ Multi-user scenarios
- ✅ Error recovery
- ✅ Performance and load testing

**Key Features**:

- Full system simulation
- Real user scenarios
- Performance testing
- Load testing

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: { "^.+\\.ts$": "ts-jest" },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/app.ts",
    "!src/server.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapping: { "^@/(.*)$": "<rootDir>/src/$1" },
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
};
```

### Test Database Setup

- **Test Database**: `postgresql://test:test@localhost:5432/queue_management_test`
- **Environment**: `NODE_ENV=test`
- **Auto-cleanup**: Database is reset before and after each test suite
- **Isolation**: Each test runs in isolation with clean data

## Running Tests

### Available Test Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode (TDD)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only end-to-end tests
npm run test:e2e

# Run tests in TDD mode (unit tests only, watch mode)
npm run test:tdd

# Run tests for CI/CD
npm run test:ci
```

### TDD Workflow

1. **Write a failing test** (Red)
2. **Write minimal code to pass** (Green)
3. **Refactor while keeping tests green** (Refactor)
4. **Repeat**

```bash
# Start TDD mode
npm run test:tdd

# This will:
# - Watch for file changes
# - Run only unit tests
# - Provide immediate feedback
# - Show coverage information
```

## Test Utilities

### TestHelpers Class

The `TestHelpers` class provides utilities for:

- **Database Operations**: Create, cleanup test data
- **Authentication**: Generate JWT tokens, create auth headers
- **Mock Objects**: Create mock requests/responses
- **Assertions**: Validate API responses
- **Data Factories**: Create test data with defaults

### Example Usage

```typescript
import { TestHelpers } from "../utils/testHelpers";

// Create test data
const testOrg = await TestHelpers.createTestOrganization();
const testUser = await TestHelpers.createTestUser({
  username: "testuser",
  role: UserRole.admin,
});

// Generate auth token
const token = TestHelpers.generateJWTToken({
  id: testUser.id,
  role: UserRole.admin,
});

// Make authenticated request
const response = await request(app)
  .get("/api/auth/users")
  .set("Authorization", `Bearer ${token}`)
  .expect(200);

// Validate response
TestHelpers.expectValidApiResponse(response.body);
TestHelpers.expectValidUserResponse(response.body.data.users[0]);

// Cleanup
await TestHelpers.cleanupUser(testUser.id);
```

## Test Data Management

### Test Data Constants

```typescript
export const TEST_DATA = {
  ORGANIZATIONS: {
    DEFAULT: { name: "Test Organization", settings: {} },
  },
  USERS: {
    ADMIN: { username: "admin", email: "admin@test.com", role: UserRole.admin },
    STAFF: { username: "staff", email: "staff@test.com", role: UserRole.staff },
  },
  COUNTERS: {
    DEFAULT: { name: "Counter 1", isActive: true },
  },
};
```

### Test Scenarios

```typescript
export const TEST_SCENARIOS = {
  VALID_LOGIN: { username: "admin", password: "admin123" },
  INVALID_LOGIN: { username: "admin", password: "wrongpassword" },
  MISSING_CREDENTIALS: { username: "", password: "" },
};
```

## Coverage Reports

### Coverage Configuration

- **Threshold**: 80% minimum coverage
- **Reports**: Text, LCOV, HTML
- **Exclusions**: App entry points, type definitions

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## Best Practices

### 1. Test Structure (AAA Pattern)

```typescript
it("should do something", async () => {
  // Arrange - Set up test data
  const testData = await TestHelpers.createTestUser();

  // Act - Execute the action
  const response = await request(app)
    .get(`/api/users/${testData.id}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  // Assert - Verify the result
  expect(response.body.success).toBe(true);
  expect(response.body.data.id).toBe(testData.id);
});
```

### 2. Test Isolation

- Each test is independent
- Database is cleaned between tests
- No shared state between tests
- Use `beforeAll`/`afterAll` for setup/teardown

### 3. Descriptive Test Names

```typescript
// Good
it("should return 401 when accessing protected route without token");

// Bad
it("should work");
```

### 4. Test Data Management

- Use factories for test data creation
- Clean up test data after tests
- Use meaningful test data
- Avoid hardcoded values

### 5. Error Testing

```typescript
// Test both success and error cases
it("should return 200 with valid data", async () => {
  // Test success case
});

it("should return 400 with invalid data", async () => {
  // Test error case
});
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test:ci
```

## Debugging Tests

### Running Individual Tests

```bash
# Run specific test file
npm test -- auth.test.ts

# Run specific test
npm test -- --testNamePattern="should login successfully"

# Run tests with verbose output
npm test -- --verbose
```

### Debug Mode

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Performance Testing

### Load Testing

```typescript
it("should handle multiple concurrent requests", async () => {
  const concurrentRequests = Array.from({ length: 10 }, () =>
    request(app).get("/api/users").set("Authorization", `Bearer ${token}`)
  );

  const responses = await Promise.all(concurrentRequests);
  responses.forEach((response) => {
    expect(response.status).toBe(200);
  });
});
```

## Maintenance

### Adding New Tests

1. Create test file in appropriate directory (`unit/`, `integration/`, `e2e/`)
2. Follow naming convention: `*.test.ts`
3. Use TestHelpers for common operations
4. Add to appropriate test script in package.json
5. Update this documentation

### Updating Tests

1. Update tests when API changes
2. Maintain test coverage above 80%
3. Update test data when schema changes
4. Review and update test utilities as needed

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure test database is running
2. **Port Conflicts**: Check if test server port is available
3. **Timeout Issues**: Increase test timeout in jest.config.js
4. **Memory Issues**: Use `--max-old-space-size=4096` for large test suites

### Test Database Setup

```bash
# Create test database
createdb queue_management_test

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed
```

## Conclusion

This TDD implementation provides:

- ✅ **Comprehensive Coverage**: Unit, integration, and E2E tests
- ✅ **Fast Feedback**: Watch mode for immediate results
- ✅ **Reliable Tests**: Isolated, repeatable, and maintainable
- ✅ **Good Practices**: AAA pattern, descriptive names, proper cleanup
- ✅ **CI/CD Ready**: Automated testing with coverage reports
- ✅ **Developer Friendly**: Easy to run, debug, and extend

The test suite ensures the admin APIs are robust, reliable, and maintainable while providing confidence for future development and refactoring.
