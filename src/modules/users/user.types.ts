export interface CreateUserPayload {
    email: string;
    username: string;
    password: string;
    roleId: number; // 👈 nuevo, relación con Role
  }
  
  export interface UpdateUserPayload {
    email?: string;
    username?: string;
    password?: string; // si se envía, se re-hashea
    roleId?: number;
  }