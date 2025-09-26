import { LoginRequest, RegisterRequest, ChangePasswordRequest, CreateUserRequest, UpdateUserRequest, UserResponse, LoginResponse } from "@/schemas/authSchemas";
export declare class AuthService {
    login(request: LoginRequest, ip?: string, userAgent?: string): Promise<LoginResponse>;
    register(request: RegisterRequest, createdBy?: string): Promise<UserResponse>;
    changePassword(userId: string, request: ChangePasswordRequest, ip?: string): Promise<void>;
    getUserById(userId: string): Promise<UserResponse>;
    createUser(request: CreateUserRequest, createdBy: string): Promise<UserResponse>;
    updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<UserResponse>;
    deactivateUser(userId: string, deactivatedBy: string): Promise<void>;
    listUsers(organizationId: string, requestedBy: string): Promise<UserResponse[]>;
    reactivateUser(userId: string, reactivatedBy: string): Promise<void>;
    resetUserPassword(userId: string, resetBy: string): Promise<void>;
    deleteUser(userId: string, deletedBy: string): Promise<void>;
}
export declare const authService: AuthService;
//# sourceMappingURL=authService.d.ts.map