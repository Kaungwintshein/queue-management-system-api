import { Server as SocketIOServer } from "socket.io";
import { Token, QueueSetting } from "@prisma/client";
export type WebSocketEventData = Token | QueueSetting | {
    message: string;
} | {
    status: string;
} | Record<string, unknown> | unknown;
export declare const setupWebSocket: (io: SocketIOServer) => void;
export declare const websocketUtils: {
    broadcastToOrganization: (organizationId: string, event: string, data: WebSocketEventData) => void;
    broadcastToRole: (role: string, event: string, data: WebSocketEventData) => void;
    broadcastToCounter: (counterId: string, event: string, data: WebSocketEventData) => void;
    broadcastToUser: (userId: string, event: string, data: WebSocketEventData) => void;
    broadcastToAll: (event: string, data: WebSocketEventData) => void;
};
//# sourceMappingURL=websocketService.d.ts.map