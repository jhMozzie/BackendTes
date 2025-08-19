export interface CreateUserPayload {
    email: string;
    username: string;
    password: string;
}

export interface UpdateUserPayload {
    email?: string;
    username?: string;
}