import { Token, QueueSetting } from "@prisma/client";
import { CreateTokenRequest, CallNextRequest, CompleteServiceRequest, MarkNoShowRequest, RecallTokenRequest } from "@/schemas/tokenSchemas";
export interface QueueStats {
    totalWaiting: number;
    totalServing: number;
    totalCompleted: number;
    totalNoShow: number;
    averageWaitTime: number | null;
    averageServiceTime: number;
    peakHour: string;
    estimatedWaitTime: number;
}
export interface CounterWithDetails {
    counter: {
        id: string;
        organizationId: string;
        name: string;
        isActive: boolean;
        assignedStaffId: string | null;
        assignedStaff: {
            id: string;
            username: string;
            role: string;
        } | null;
    };
    currentToken: Token | null;
    nextTokens: Token[];
    noShowTokens?: Token[];
    waitingCount: number;
    averageServiceTime: number | null;
}
export interface QueueStatusResponse {
    organizationId: string;
    counters: CounterWithDetails[];
    summary: {
        totalWaiting: number;
        totalServing: number;
        totalCompleted: number;
        averageWaitTime: number | null;
    };
    queueSettings: Array<QueueSetting>;
}
export interface TokenCreationResponse {
    token: Token;
    position: number;
    estimatedWaitTime: number | null;
}
export interface ServiceResult {
    token: Token;
    serviceDuration?: number;
}
export declare class TokenService {
    private getTokenPosition;
    createToken(request: CreateTokenRequest, organizationId: string, staffId?: string): Promise<TokenCreationResponse>;
    callNextToken(request: CallNextRequest, organizationId: string): Promise<Token | null>;
    startServing(request: {
        tokenId: string;
        staffId: string;
    }, organizationId: string): Promise<Token>;
    completeService(request: CompleteServiceRequest, organizationId: string): Promise<ServiceResult>;
    markNoShow(request: MarkNoShowRequest, organizationId: string): Promise<Token>;
    recallToken(request: RecallTokenRequest, organizationId: string): Promise<Token>;
    getQueueStatus(organizationId: string, counterId?: string): Promise<QueueStatusResponse>;
    private getQueueStats;
    private calculateEstimatedWaitTime;
    private getAverageServiceTime;
    private getCounterAverageServiceTime;
    /**
     * Repeat announcement for a token
     */
    repeatAnnounceToken(data: {
        tokenId: string;
        counterId: string;
        staffId: string;
    }, organizationId: string): Promise<Token>;
}
export declare const tokenService: TokenService;
//# sourceMappingURL=tokenService.d.ts.map