export interface CreateUserPayload {
  email: string;
  username: string;
  password: string;
  roleId: number;
  phone?: string;           // 👈 opcional
  birthdate?: Date | string; // 👈 opcional
  status?: string;          // "Activo" | "Inactivo"
}

export interface UpdateUserPayload {
  email?: string;
  username?: string;
  password?: string;
  roleId?: number;
  phone?: string;
  birthdate?: Date | string;
  status?: string;
}