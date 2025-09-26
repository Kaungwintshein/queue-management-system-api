"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const client_1 = require("@prisma/client");
const errorHandler_1 = require("@/middleware/errorHandler");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const auth_1 = require("@/routes/auth");
const counters_1 = require("@/routes/counters");
const roles_1 = require("@/routes/roles");
// Commented out non-auth routes to focus on authentication
// import { tokensRouter } from "@/routes/tokens";
// import { queueRouter } from "@/routes/queue";
// import { staffRouter } from "@/routes/staff";
// import { analyticsRouter } from "@/routes/analytics";
// import { setupWebSocket } from "@/services/websocketService";
const logger_1 = require("@/utils/logger");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Initialize Prisma Client
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
});
// Initialize Socket.IO
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
    },
});
exports.io = io;
// Middleware
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
app.use((0, morgan_1.default)("combined", {
    stream: {
        write: (message) => {
            logger_1.logger.info(message.trim());
        },
    },
}));
app.use(express_1.default.json({ limit: process.env.UPLOAD_MAX_SIZE || "10mb" }));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: process.env.UPLOAD_MAX_SIZE || "10mb",
}));
// Rate limiting
app.use(rateLimiter_1.rateLimiter);
// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Queue Management System API",
            version: "1.0.0",
            description: "Complete API documentation for the Queue Management System including Authentication, User Management, Counter Management, and Role Management",
            contact: {
                name: "Queue Management System Team",
                email: "admin@queuemanagement.com",
            },
        },
        servers: [
            {
                url: process.env.API_URL || "http://localhost:3001",
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter JWT token",
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ["./src/routes/*.ts"], // paths to files containing OpenAPI definitions
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
// Swagger UI
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Queue Management System API Documentation",
}));
// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});
// API Routes - Authentication and Admin Management enabled
app.use("/api/auth", auth_1.authRouter);
app.use("/api/counters", counters_1.countersRouter);
app.use("/api/roles", roles_1.rolesRouter);
// Commented out non-auth routes to focus on authentication
// app.use("/api/tokens", tokensRouter);
// app.use("/api/queue", queueRouter);
// app.use("/api/staff", staffRouter);
// app.use("/api/analytics", analyticsRouter);
// 404 handler
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        error: "NOT_FOUND",
        details: { path: req.originalUrl },
        timestamp: new Date().toISOString(),
    });
});
// Error handling middleware (must be last)
app.use(errorHandler_1.errorHandler);
// Setup WebSocket handlers - Commented out to focus on authentication
// setupWebSocket(io);
// Graceful shutdown
process.on("SIGTERM", async () => {
    logger_1.logger.info("SIGTERM received, shutting down gracefully");
    server.close(() => {
        logger_1.logger.info("HTTP server closed");
    });
    await exports.prisma.$disconnect();
    logger_1.logger.info("Database connection closed");
    process.exit(0);
});
process.on("SIGINT", async () => {
    logger_1.logger.info("SIGINT received, shutting down gracefully");
    server.close(() => {
        logger_1.logger.info("HTTP server closed");
    });
    await exports.prisma.$disconnect();
    logger_1.logger.info("Database connection closed");
    process.exit(0);
});
// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
    logger_1.logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
});
// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    logger_1.logger.error("Uncaught Exception:", error);
    process.exit(1);
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    logger_1.logger.info(`WebSocket server ready for connections`);
});
exports.default = app;
//# sourceMappingURL=app.js.map