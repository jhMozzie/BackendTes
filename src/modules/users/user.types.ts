export interface CreateUserPayload {
    email: string;
    username: string;
    password: string;
    isAdmin?: boolean; // <-- Payload optional field
}

export interface UpdateUserPayload {
    email?: string;
    username?: string;
    isAdmin?: boolean; // <-- Payload optional field
}

