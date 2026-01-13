import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { UserService } from './user.service';
import { CreateUserDTO, LoginDTO, User } from '../types';
import { comparePassword } from '../utils/password';

export class AuthService {
  static generateToken(userId: string): string {
    return jwt.sign({ userId }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    } as jwt.SignOptions);
  }

  static verifyToken(token: string): { userId: string } {
    return jwt.verify(token, jwtConfig.secret) as { userId: string };
  }

  static async register(userData: CreateUserDTO): Promise<{ user: User; token: string }> {
    // Check if email exists
    const emailExists = await UserService.emailExists(userData.email);
    if (emailExists) {
      throw new Error('Email already registered');
    }

    // Create user
    const user = await UserService.createUser(userData);

    // Generate token
    const token = this.generateToken(user.id);

    return { user, token };
  }

  static async login(loginData: LoginDTO): Promise<{ user: User; token: string }> {
    // Find user
    const userWithPassword = await UserService.findByEmail(loginData.email);
    if (!userWithPassword) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await comparePassword(
      loginData.password,
      userWithPassword.password_hash
    );

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Remove password from user object
    const { password_hash, ...user } = userWithPassword;

    // Generate token
    const token = this.generateToken(user.id);

    return { user, token };
  }

  static async getCurrentUser(userId: string): Promise<User> {
    const user = await UserService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}