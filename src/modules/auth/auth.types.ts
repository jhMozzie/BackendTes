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
    };
  }