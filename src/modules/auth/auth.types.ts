export interface LoginPayload {
    email: string;
    password: string;
  }
  
  export interface LoginResponse {
    token: string;
    user: {
      id: number;
      email: string;
      username: string;
      role: string;
      academyId?: number | null;  // 🆕 ID de la primera academia (null si no tiene)
      // Alternativa: academies?: Array<{ id: number; name: string }>;  // Si necesitas todas
    };
  }