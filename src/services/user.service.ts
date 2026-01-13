import { query } from '../config/database';
import { User, UserWithPassword, CreateUserDTO } from '../types';
import { hashPassword } from '../utils/password';

export class UserService {
  static async createUser(userData: CreateUserDTO): Promise<User> {
    const { name, email, password } = userData;
    const passwordHash = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at, updated_at`,
      [name, email.toLowerCase(), passwordHash]
    );

    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<UserWithPassword | null> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const result = await query(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  static async emailExists(email: string): Promise<boolean> {
    const result = await query(
      'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)',
      [email.toLowerCase()]
    );

    return result.rows[0].exists;
  }
}