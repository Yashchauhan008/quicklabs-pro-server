import type { UserRole } from './role.type';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface UserWithPassword extends User {
    password_hash: string;
  }