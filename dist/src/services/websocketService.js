"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketUtils = exports.setupWebSocket = void 0;
const auth_1 = require("@/middleware/auth");
const logger_1 = require("@/utils/logger");
const app_1 = require("@/app");
const setupWebSocket = (io) => {
    // Authentication middleware for WebSocket
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace("Bearer ", "");
            if (!token) {
                // Allow unauthenticated connections for display interface
                logger_1.logger.info("Unauthenticated WebSocket connection", {
                    socketId: socket.id,
                });
                return next();
            }
            const decoded = (0, auth_1.verifyToken)(token);
            // Verify user exists and is active
            const user = await app_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    username: true,
                    role: true,
                    organizationId: true,
                    isActive: true,
                },
            });
            if (!user || !user.isActive) {
                logger_1.logger.warn("Invalid or inactive user in WebSocket auth", {
                    socketId: socket.id,
                    userId: decoded.userId,
                });
                return next(new Error("Authentication failed"));
            }
            socket.user = {
                id: user.id,
                username: user.username,
                role: user.role,
                organizationId: user.organizationId,
            };
            logger_1.logger.info("Authenticated WebSocket connection", {
                socketId: socket.id,
                userId: user.id,
                username: user.username,
                role: user.role,
            });
            next();
        }
        catch (error) {
            logger_1.logger.error("WebSocket authentication error", {
                error: error instanceof Error ? error.message : String(error),
                socketId: socket.id,
            });
            next(new Error("Authentication failed"));
        }
    });
    // Handle connections
    io.on("connection", (socket) => {
        logger_1.logger.info("WebSocket client connected", {
            socketId: socket.id,
            userId: socket.user?.id,
            username: socket.user?.username,
        });
        // Join organization room
        if (socket.user?.organizationId) {
            socket.join(`org:${socket.user.organizationId}`);
            logger_1.logger.debug("Socket joined organization room", {
                socketId: socket.id,
                organizationId: socket.user.organizationId,
            });
        }
        // Join role-based rooms
        if (socket.user?.role) {
            socket.join(`role:${socket.user.role}`);
            socket.join(`user:${socket.user.id}`);
            // Join staff-specific rooms
            if (socket.user.role === "staff") {
                socket.join("staff:notifications");
            }
            // Join admin-specific rooms
            if (socket.user.role === "admin" || socket.user.role === "super_admin") {
                socket.join("admin:notifications");
                socket.join("system:monitoring");
            }
        }
        else {
            // For unauthenticated connections (display interface)
            socket.join("display_screens");
            logger_1.logger.debug("Socket joined display_screens room (unauthenticated)", {
                socketId: socket.id,
            });
            // If client provides org via query string, also join org-scoped display room
            const orgId = socket.handshake.query?.organizationId || "";
            if (orgId) {
                socket.join(`display_screens:org:${orgId}`);
                logger_1.logger.debug("Socket joined org-scoped display room", {
                    socketId: socket.id,
                    organizationId: orgId,
                });
            }
        }
        // Handle room joining requests
        socket.on("join_room", (room) => {
            if (!isValidRoom(room, socket.user)) {
                logger_1.logger.warn("Invalid room join attempt", {
                    socketId: socket.id,
                    room,
                    userId: socket.user?.id,
                });
                socket.emit("error", { message: "Invalid room" });
                return;
            }
            socket.join(room);
            logger_1.logger.debug("Socket joined room", { socketId: socket.id, room });
            socket.emit("room_joined", { room });
        });
        // Handle room leaving requests
        socket.on("leave_room", (room) => {
            socket.leave(room);
            logger_1.logger.debug("Socket left room", { socketId: socket.id, room });
            socket.emit("room_left", { room });
        });
        // Handle counter assignment for staff
        socket.on("assign_counter", (data) => {
            if (!socket.user || socket.user.role !== "staff") {
                socket.emit("error", { message: "Unauthorized" });
                return;
            }
            socket.join(`counter:${data.counterId}`);
            logger_1.logger.info("Staff assigned to counter", {
                socketId: socket.id,
                staffId: socket.user.id,
                counterId: data.counterId,
            });
            socket.emit("counter_assigned", { counterId: data.counterId });
        });
        // Handle staff status updates
        socket.on("staff_status", (data) => {
            if (!socket.user || socket.user.role !== "staff") {
                socket.emit("error", { message: "Unauthorized" });
                return;
            }
            // Broadcast staff status to organization
            socket
                .to(`org:${socket.user.organizationId}`)
                .emit("staff_status_updated", {
                staffId: socket.user.id,
                staffName: socket.user.username,
                status: data.status,
                timestamp: new Date(),
            });
            logger_1.logger.info("Staff status updated", {
                staffId: socket.user.id,
                status: data.status,
            });
        });
        // Handle display interface requests
        socket.on("request_queue_status", (data) => {
            if (socket.user?.organizationId) {
                // Send current queue status
                socket.emit("queue_status_requested", {
                    organizationId: socket.user.organizationId,
                    counterId: data?.counterId,
                });
            }
        });
        // Handle heartbeat for connection monitoring
        socket.on("ping", () => {
            socket.emit("pong", { timestamp: new Date() });
        });
        // Handle custom events for real-time features
        socket.on("subscribe_notifications", (data) => {
            if (!socket.user) {
                socket.emit("error", { message: "Authentication required" });
                return;
            }
            // Subscribe to specific notification types based on user role
            data.types.forEach((type) => {
                if (isValidNotificationType(type, socket.user.role)) {
                    socket.join(`notifications:${type}`);
                }
            });
            socket.emit("notifications_subscribed", { types: data.types });
        });
        // Handle admin broadcasts
        socket.on("admin_broadcast", (data) => {
            if (!socket.user ||
                (socket.user.role !== "admin" && socket.user.role !== "super_admin")) {
                socket.emit("error", { message: "Unauthorized" });
                return;
            }
            const targetRoom = data.target || `org:${socket.user.organizationId}`;
            socket.to(targetRoom).emit("admin_announcement", {
                message: data.message,
                type: data.type,
                from: socket.user.username,
                timestamp: new Date(),
            });
            logger_1.logger.info("Admin broadcast sent", {
                adminId: socket.user.id,
                message: data.message,
                target: targetRoom,
            });
        });
        // Handle system maintenance notifications
        socket.on("system_maintenance", (data) => {
            if (!socket.user || socket.user.role !== "super_admin") {
                socket.emit("error", { message: "Unauthorized" });
                return;
            }
            io.emit("system:maintenance", {
                message: data.message,
                startTime: data.startTime,
                duration: data.duration,
                timestamp: new Date(),
            });
            logger_1.logger.warn("System maintenance notification sent", {
                adminId: socket.user.id,
                message: data.message,
            });
        });
        // Handle disconnection
        socket.on("disconnect", (reason) => {
            logger_1.logger.info("WebSocket client disconnected", {
                socketId: socket.id,
                userId: socket.user?.id,
                username: socket.user?.username,
                reason,
            });
            // Notify organization about staff disconnection
            if (socket.user && socket.user.role === "staff") {
                socket
                    .to(`org:${socket.user.organizationId}`)
                    .emit("staff_disconnected", {
                    staffId: socket.user.id,
                    staffName: socket.user.username,
                    timestamp: new Date(),
                });
            }
        });
        // Handle connection errors
        socket.on("error", (error) => {
            logger_1.logger.error("WebSocket error", {
                socketId: socket.id,
                userId: socket.user?.id,
                error: error.message,
            });
        });
    });
    // Utility functions for broadcasting
    setupBroadcastUtils(io);
};
exports.setupWebSocket = setupWebSocket;
// Utility functions for broadcasting from services
const setupBroadcastUtils = (io) => {
    // Global broadcast functions
    global.broadcastToOrganization = (organizationId, event, data) => {
        io.to(`org:${organizationId}`).emit(event, data);
        logger_1.logger.debug("Broadcast to organization", { organizationId, event });
    };
    global.broadcastToRole = (role, event, data) => {
        io.to(`role:${role}`).emit(event, data);
        logger_1.logger.debug("Broadcast to role", { role, event });
    };
    global.broadcastToCounter = (counterId, event, data) => {
        io.to(`counter:${counterId}`).emit(event, data);
        logger_1.logger.debug("Broadcast to counter", { counterId, event });
    };
    global.broadcastToUser = (userId, event, data) => {
        io.to(`user:${userId}`).emit(event, data);
        logger_1.logger.debug("Broadcast to user", { userId, event });
    };
    global.broadcastToAll = (event, data) => {
        io.emit(event, data);
        logger_1.logger.debug("Broadcast to all", { event });
    };
};
// Validation functions
const isValidRoom = (room, user) => {
    // Public rooms (no auth required)
    const publicRooms = ["public:display", "queue:updates", "display_screens"];
    if (publicRooms.includes(room))
        return true;
    // Allow org-scoped display rooms without auth
    if (room.startsWith("display_screens:org:"))
        return true;
    if (!user)
        return false;
    // User-specific rooms
    if (room.startsWith("user:") && room === `user:${user.id}`)
        return true;
    if (room.startsWith("org:") && room === `org:${user.organizationId}`)
        return true;
    if (room.startsWith("role:") && room === `role:${user.role}`)
        return true;
    // Staff rooms
    if (user.role === "staff") {
        if (room === "staff:notifications")
            return true;
        if (room.startsWith("counter:"))
            return true;
    }
    // Admin rooms
    if (user.role === "admin" || user.role === "super_admin") {
        if (room === "admin:notifications")
            return true;
        if (room === "system:monitoring")
            return true;
        if (room.startsWith("analytics:"))
            return true;
    }
    return false;
};
const isValidNotificationType = (type, role) => {
    const baseTypes = ["queue_updates", "token_updates"];
    const staffTypes = [...baseTypes, "service_alerts", "counter_assignments"];
    const adminTypes = [
        ...staffTypes,
        "system_alerts",
        "performance_alerts",
        "user_activities",
    ];
    switch (role) {
        case "staff":
            return staffTypes.includes(type);
        case "admin":
        case "super_admin":
            return adminTypes.includes(type);
        default:
            return baseTypes.includes(type);
    }
};
// Export utility functions for use in services
exports.websocketUtils = {
    broadcastToOrganization: (organizationId, event, data) => {
        if (typeof global.broadcastToOrganization === "function") {
            global.broadcastToOrganization(organizationId, event, data);
        }
    },
    broadcastToRole: (role, event, data) => {
        if (typeof global.broadcastToRole === "function") {
            global.broadcastToRole(role, event, data);
        }
    },
    broadcastToCounter: (counterId, event, data) => {
        if (typeof global.broadcastToCounter === "function") {
            global.broadcastToCounter(counterId, event, data);
        }
    },
    broadcastToUser: (userId, event, data) => {
        if (typeof global.broadcastToUser === "function") {
            global.broadcastToUser(userId, event, data);
        }
    },
    broadcastToAll: (event, data) => {
        if (typeof global.broadcastToAll === "function") {
            global.broadcastToAll(event, data);
        }
    },
};
//# sourceMappingURL=websocketService.js.map