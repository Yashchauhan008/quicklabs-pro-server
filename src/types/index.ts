export interface User {
    id: string;
    name: string;
    email: string;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface UserWithPassword extends User {
    password_hash: string;
  }
  
  export interface CreateUserDTO {
    name: string;
    email: string;
    password: string;
  }
  
  export interface LoginDTO {
    email: string;
    password: string;
  }
  
  export interface AuthResponse {
    success: boolean;
    message: string;
    data?: {
      user: User;
      token: string;
    };
  }