"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.logger = void 0;
const util_1 = __importDefault(require("util"));
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};
class Logger {
    constructor() {
        const level = process.env.LOG_LEVEL?.toUpperCase() || "INFO";
        this.currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.INFO;
    }
    shouldLog(level) {
        return level <= this.currentLevel;
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0
            ? " " +
                args
                    .map((arg) => typeof arg === "object"
                    ? util_1.default.inspect(arg, { depth: 2, colors: false })
                    : String(arg))
                    .join(" ")
            : "";
        return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
    }
    log(level, levelNum, message, ...args) {
        if (!this.shouldLog(levelNum))
            return;
        const formattedMessage = this.formatMessage(level, message, ...args);
        if (levelNum === LOG_LEVELS.ERROR) {
            console.error(formattedMessage);
        }
        else if (levelNum === LOG_LEVELS.WARN) {
            console.warn(formattedMessage);
        }
        else {
            console.log(formattedMessage);
        }
    }
    error(message, ...args) {
        this.log("ERROR", LOG_LEVELS.ERROR, message, ...args);
    }
    warn(message, ...args) {
        this.log("WARN", LOG_LEVELS.WARN, message, ...args);
    }
    info(message, ...args) {
        this.log("INFO", LOG_LEVELS.INFO, message, ...args);
    }
    debug(message, ...args) {
        this.log("DEBUG", LOG_LEVELS.DEBUG, message, ...args);
    }
    // Convenience methods for common logging scenarios
    request(method, url, statusCode, duration) {
        const durationStr = duration ? ` (${duration}ms)` : "";
        const statusStr = statusCode ? ` ${statusCode}` : "";
        this.info(`${method} ${url}${statusStr}${durationStr}`);
    }
    database(operation, table, duration) {
        const tableStr = table ? ` on ${table}` : "";
        const durationStr = duration ? ` (${duration}ms)` : "";
        this.debug(`DB ${operation}${tableStr}${durationStr}`);
    }
    websocket(event, socketId, data) {
        const socketStr = socketId ? ` [${socketId}]` : "";
        const dataStr = data ? ` ${util_1.default.inspect(data, { depth: 1 })}` : "";
        this.debug(`WS${socketStr} ${event}${dataStr}`);
    }
    security(event, ip, userId, details) {
        const ipStr = ip ? ` IP:${ip}` : "";
        const userStr = userId ? ` User:${userId}` : "";
        const detailsStr = details ? ` ${util_1.default.inspect(details, { depth: 1 })}` : "";
        this.warn(`SECURITY ${event}${ipStr}${userStr}${detailsStr}`);
    }
    performance(operation, duration, threshold = 1000) {
        const level = duration > threshold ? "WARN" : "INFO";
        const message = `PERF ${operation} took ${duration}ms`;
        if (level === "WARN") {
            this.warn(message);
        }
        else {
            this.info(message);
        }
    }
    // Structured logging for better log analysis
    structured(level, data) {
        const message = data.message || "Structured log entry";
        delete data.message;
        this[level](message, data);
    }
}
exports.logger = new Logger();
// Express middleware for request logging
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - start;
        const contentLength = Buffer.isBuffer(data)
            ? data.length
            : Buffer.byteLength(data, "utf8");
        exports.logger.structured("info", {
            type: "request",
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            contentLength,
            userAgent: req.get("User-Agent"),
            ip: req.ip,
            userId: req.user?.id,
        });
        return originalSend.call(this, data);
    };
    next();
};
exports.requestLogger = requestLogger;
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map