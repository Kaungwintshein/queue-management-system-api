import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import { PrismaClient } from "@prisma/client";
import { errorHandler } from "@/middleware/errorHandler";
import { rateLimiter } from "@/middleware/rateLimiter";
import { authRouter } from "@/routes/auth";
import { countersRouter } from "@/routes/counters";
import { rolesRouter } from "@/routes/roles";
// Commented out non-auth routes to focus on authentication
// import { tokensRouter } from "@/routes/tokens";
// import { queueRouter } from "@/routes/queue";
// import { staffRouter } from "@/routes/staff";
// import { analyticsRouter } from "@/routes/analytics";
// import { setupWebSocket } from "@/services/websocketService";
import { logger } from "@/utils/logger";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

export { io };

// Middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  })
);

app.use(express.json({ limit: process.env.UPLOAD_MAX_SIZE || "10mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.UPLOAD_MAX_SIZE || "10mb",
  })
);

// Rate limiting
app.use(rateLimiter);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Queue Management System API",
      version: "1.0.0",
      description:
        "Complete API documentation for the Queue Management System including Authentication, User Management, Counter Management, and Role Management",
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

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Queue Management System API Documentation",
  })
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes - Authentication and Admin Management enabled
app.use("/api/auth", authRouter);
app.use("/api/counters", countersRouter);
app.use("/api/roles", rolesRouter);

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
app.use(errorHandler);

// Setup WebSocket handlers - Commented out to focus on authentication
// setupWebSocket(io);

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");

  server.close(() => {
    logger.info("HTTP server closed");
  });

  await prisma.$disconnect();
  logger.info("Database connection closed");

  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");

  server.close(() => {
    logger.info("HTTP server closed");
  });

  await prisma.$disconnect();
  logger.info("Database connection closed");

  process.exit(0);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  logger.info(`WebSocket server ready for connections`);
});

export default app;
