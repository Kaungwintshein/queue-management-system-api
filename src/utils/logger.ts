import util from "util";

export interface LogLevel {
  ERROR: 0;
  WARN: 1;
  INFO: 2;
  DEBUG: 3;
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class Logger {
  private currentLevel: number;

  constructor() {
    const level = process.env.LOG_LEVEL?.toUpperCase() || "INFO";
    this.currentLevel = LOG_LEVELS[level as keyof LogLevel] ?? LOG_LEVELS.INFO;
  }

  private shouldLog(level: number): boolean {
    return level <= this.currentLevel;
  }

  private formatMessage(
    level: string,
    message: string,
    ...args: any[]
  ): string {
    const timestamp = new Date().toISOString();
    const formattedArgs =
      args.length > 0
        ? " " +
          args
            .map((arg) =>
              typeof arg === "object"
                ? util.inspect(arg, { depth: 2, colors: false })
                : String(arg)
            )
            .join(" ")
        : "";

    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  private log(
    level: string,
    levelNum: number,
    message: string,
    ...args: any[]
  ): void {
    if (!this.shouldLog(levelNum)) return;

    const formattedMessage = this.formatMessage(level, message, ...args);

    if (levelNum === LOG_LEVELS.ERROR) {
      console.error(formattedMessage);
    } else if (levelNum === LOG_LEVELS.WARN) {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  error(message: string, ...args: any[]): void {
    this.log("ERROR", LOG_LEVELS.ERROR, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log("WARN", LOG_LEVELS.WARN, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log("INFO", LOG_LEVELS.INFO, message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log("DEBUG", LOG_LEVELS.DEBUG, message, ...args);
  }

  // Convenience methods for common logging scenarios
  request(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number
  ): void {
    const durationStr = duration ? ` (${duration}ms)` : "";
    const statusStr = statusCode ? ` ${statusCode}` : "";
    this.info(`${method} ${url}${statusStr}${durationStr}`);
  }

  database(operation: string, table?: string, duration?: number): void {
    const tableStr = table ? ` on ${table}` : "";
    const durationStr = duration ? ` (${duration}ms)` : "";
    this.debug(`DB ${operation}${tableStr}${durationStr}`);
  }

  websocket(event: string, socketId?: string, data?: any): void {
    const socketStr = socketId ? ` [${socketId}]` : "";
    const dataStr = data ? ` ${util.inspect(data, { depth: 1 })}` : "";
    this.debug(`WS${socketStr} ${event}${dataStr}`);
  }

  security(event: string, ip?: string, userId?: string, details?: any): void {
    const ipStr = ip ? ` IP:${ip}` : "";
    const userStr = userId ? ` User:${userId}` : "";
    const detailsStr = details ? ` ${util.inspect(details, { depth: 1 })}` : "";
    this.warn(`SECURITY ${event}${ipStr}${userStr}${detailsStr}`);
  }

  performance(
    operation: string,
    duration: number,
    threshold: number = 1000
  ): void {
    const level = duration > threshold ? "WARN" : "INFO";
    const message = `PERF ${operation} took ${duration}ms`;

    if (level === "WARN") {
      this.warn(message);
    } else {
      this.info(message);
    }
  }

  // Structured logging for better log analysis
  structured(
    level: "error" | "warn" | "info" | "debug",
    data: Record<string, any>
  ): void {
    const message = data.message || "Structured log entry";
    delete data.message;

    this[level](message, data);
  }
}

export const logger = new Logger();

// Express middleware for request logging
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data: any) {
    const duration = Date.now() - start;
    const contentLength = Buffer.isBuffer(data)
      ? data.length
      : Buffer.byteLength(data, "utf8");

    logger.structured("info", {
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

export default logger;
