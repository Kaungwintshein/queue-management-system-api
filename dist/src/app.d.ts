import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
declare const app: import("express-serve-static-core").Express;
export declare const prisma: PrismaClient<{
    log: ("error" | "warn" | "info" | "query")[];
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export { io };
export default app;
//# sourceMappingURL=app.d.ts.map