# Standardized API Response System

## Overview

This system provides consistent response formatting across all API endpoints, ensuring uniform success and error handling throughout the application.

## Response Format

All API responses follow this standardized format:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    /* response data */
  },
  "timestamp": "2025-09-23T14:30:00.000Z",
  "requestId": "req_123456" // optional
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": {
    /* additional error info */
  },
  "timestamp": "2025-09-23T14:30:00.000Z",
  "requestId": "req_123456" // optional
}
```

## Available Functions

### Success Responses

#### `sendSuccessResponse(res, data, message, statusCode)`

General success response (default: 200)

```typescript
return sendSuccessResponse(res, user, "User retrieved successfully");
```

#### `sendCreatedResponse(res, data, message)`

Created response (201)

```typescript
return sendCreatedResponse(res, newUser, "User created successfully");
```

#### `sendNoContentResponse(res, message)`

No content response (204)

```typescript
return sendNoContentResponse(res, "Resource deleted successfully");
```

### Error Responses

#### `sendErrorResponse(res, error, statusCode, details)`

General error response

```typescript
return sendErrorResponse(res, new Error("Something went wrong"), 500);
```

#### `sendBadRequestResponse(res, message, details)`

Bad request (400)

```typescript
return sendBadRequestResponse(res, "Invalid input", validationErrors);
```

#### `sendUnauthorizedResponse(res, message)`

Unauthorized (401)

```typescript
return sendUnauthorizedResponse(res, "Invalid credentials");
```

#### `sendForbiddenResponse(res, message)`

Forbidden (403)

```typescript
return sendForbiddenResponse(res, "Insufficient permissions");
```

#### `sendNotFoundResponse(res, message)`

Not found (404)

```typescript
return sendNotFoundResponse(res, "User not found");
```

#### `sendConflictResponse(res, message, details)`

Conflict (409)

```typescript
return sendConflictResponse(res, "Email already exists");
```

#### `sendValidationErrorResponse(res, message, validationErrors)`

Validation error (422)

```typescript
return sendValidationErrorResponse(res, "Validation failed", zodErrors);
```

#### `sendTooManyRequestsResponse(res, message)`

Rate limit exceeded (429)

```typescript
return sendTooManyRequestsResponse(res, "Too many requests");
```

#### `sendInternalServerErrorResponse(res, message, error)`

Internal server error (500)

```typescript
return sendInternalServerErrorResponse(res, "Database error", dbError);
```

#### `sendServiceUnavailableResponse(res, message)`

Service unavailable (503)

```typescript
return sendServiceUnavailableResponse(res, "Maintenance mode");
```

## Usage Examples

### In Route Handlers

**Before (Non-standardized):**

```typescript
router.get("/users", async (req, res) => {
  try {
    const users = await getUsersFromDB();
    res.json({
      success: true,
      message: "Users retrieved",
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: error.message,
    });
  }
});
```

**After (Standardized):**

```typescript
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await getUsersFromDB();
    return sendSuccessResponse(res, users, "Users retrieved successfully");
  })
);
```

### Error Handling

The `asyncHandler` middleware automatically catches errors and passes them to the standardized error handler:

```typescript
router.post(
  "/users",
  asyncHandler(async (req, res) => {
    // If this throws an error, it's automatically handled
    const user = await createUser(req.body);
    return sendCreatedResponse(res, user, "User created successfully");
  })
);
```

## Benefits

1. **Consistency**: All responses follow the same format
2. **Logging**: Automatic logging of all responses with context
3. **Request Tracking**: Automatic request ID inclusion when available
4. **Error Standardization**: Consistent error response format
5. **Type Safety**: TypeScript interfaces ensure correct usage
6. **Maintenance**: Single point of change for response format
7. **Debugging**: Enhanced logging with request context

## Integration with Error Handler

The error handler middleware automatically uses the standardized response functions:

- **Validation Errors**: Use `sendValidationErrorResponse()`
- **App Errors**: Use `sendErrorResponse()` with proper status codes
- **Unexpected Errors**: Use `sendInternalServerErrorResponse()`

## Logging

All responses are automatically logged with:

- Status code
- Message
- Request ID
- Endpoint
- HTTP method
- Error details (for errors)

Success responses log at `info` level, errors at `warn` (4xx) or `error` (5xx) level.

## Migration Guide

To migrate existing endpoints:

1. Import response functions:

   ```typescript
   import { sendSuccessResponse, sendErrorResponse } from "@/utils/response";
   ```

2. Replace manual `res.json()` calls:

   ```typescript
   // Before
   res.json({ success: true, data: result });

   // After
   return sendSuccessResponse(res, result);
   ```

3. Let the error handler catch errors automatically:

   ```typescript
   // Before
   try {
     const result = await operation();
     res.json(result);
   } catch (error) {
     res.status(500).json({ error: error.message });
   }

   // After
   const result = await operation(); // Error automatically handled
   return sendSuccessResponse(res, result);
   ```
