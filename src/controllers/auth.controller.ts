import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../config/logger';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;

      const { user, token } = await AuthService.register({ name, email, password });

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: { user, token },
      });
    } catch (error: any) {
      logger.error('Registration error', { error: error.message });

      if (error.message === 'Email already registered') {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed',
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const { user, token } = await AuthService.login({ email, password });

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user, token },
      });
    } catch (error: any) {
      logger.error('Login error', { error: error.message });

      if (error.message === 'Invalid credentials') {
        res.status(401).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Login failed',
      });
    }
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const user = await AuthService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error('Get user error', { error: error.message });

      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  }
}