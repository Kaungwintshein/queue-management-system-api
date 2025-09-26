# API Focus Mode

This document explains how to work with individual API modules in focused development mode.

## Current Status: 🔐 AUTH-ONLY MODE

Currently, only **Authentication APIs** are enabled. All other APIs (tokens, queue, staff, analytics, counters, and WebSocket) are commented out to allow focused development on the authentication system.

## Quick Status Check

```bash
node toggle-apis.js status
```

Output:

```
📊 API Status:
================
🔐 Authentication: ✅ ENABLED
📡 TOKENS: ❌ DISABLED
📡 QUEUE: ❌ DISABLED
📡 STAFF: ❌ DISABLED
📡 ANALYTICS: ❌ DISABLED
📡 COUNTERS: ❌ DISABLED
🔌 WebSocket: ❌ DISABLED
================
```

## Available Commands

### Enable All APIs

```bash
node toggle-apis.js enable
```

This will uncomment all API routes and enable the full system.

### Disable Non-Auth APIs (Focus Mode)

```bash
node toggle-apis.js disable
```

This will comment out all non-authentication APIs for focused development.

### Show Help

```bash
node toggle-apis.js help
```

## What's Currently Available

### ✅ Active Endpoints (Authentication)

- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/change-password` - Change user password
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/users` - List all users in organization
- `POST /api/auth/users` - Create a new user
- `GET /api/auth/users/{userId}` - Get user by ID
- `PATCH /api/auth/users/{userId}` - Update user
- `POST /api/auth/users/{userId}/deactivate` - Deactivate user

### ❌ Disabled Endpoints

- All `/api/tokens/*` endpoints
- All `/api/queue/*` endpoints
- All `/api/staff/*` endpoints
- All `/api/analytics/*` endpoints
- All `/api/counters/*` endpoints
- WebSocket functionality

## Testing Authentication

### Using Postman

1. Import the collection: `/docs/postman-auth-collection.json`
2. Start the API server: `npm run dev`
3. Test the authentication endpoints

### Using cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@example.com", "password": "admin123"}'

# Get profile (use token from login response)
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Development Benefits of Focus Mode

1. **Faster Startup**: Fewer dependencies to load
2. **Cleaner Logs**: Only auth-related logs
3. **Focused Testing**: Test only authentication features
4. **Reduced Complexity**: Easier debugging
5. **Type Safety**: Fewer type conflicts during development

## When to Enable All APIs

- Integration testing
- Full system testing
- Production deployment
- Frontend development requiring queue features

## Manual Alternative

If you prefer manual control, you can edit `/src/app.ts` directly:

```typescript
// To disable an API, comment out its import and route usage:
// import { tokensRouter } from "@/routes/tokens";  // <- Comment this
// app.use("/api/tokens", tokensRouter);            // <- And this
```

## Notes

- The authentication system is fully functional in focus mode
- Database connections and core middleware remain active
- Health check endpoint (`/health`) always remains available
- All authentication features (JWT, RBAC, rate limiting) work normally
