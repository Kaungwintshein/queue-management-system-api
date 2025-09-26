export interface LogLevel {
    ERROR: 0;
    WARN: 1;
    INFO: 2;
    DEBUG: 3;
}
declare class Logger {
    private currentLevel;
    constructor();
    private shouldLog;
    private formatMessage;
    private log;
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    request(method: string, url: string, statusCode?: number, duration?: number): void;
    database(operation: string, table?: string, duration?: number): void;
    websocket(event: string, socketId?: string, data?: any): void;
    security(event: string, ip?: string, userId?: string, details?: any): void;
    performance(operation: string, duration: number, threshold?: number): void;
    structured(level: "error" | "warn" | "info" | "debug", data: Record<string, any>): void;
}
export declare const logger: Logger;
export declare const requestLogger: (req: any, res: any, next: any) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map