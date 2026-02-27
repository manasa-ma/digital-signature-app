import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../utils/jwt.js';
import { createError } from '../middleware/errorHandler.js';

// In-memory user store (replace with database in production)
const users: Map<string, { id: string; email: string; password: string; name: string }> = new Map();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw createError('Email, password, and name are required', 400);
    }

    if (users.has(email)) {
      throw createError('Email already registered', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    const user = { id: userId, email, password: hashedPassword, name };
    users.set(email, user);

    const token = generateToken({ userId, email });

    res.status(201).json({
      message: 'Registration successful',
      user: { id: userId, email, name },
      token,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createError('Email and password are required', 400);
    }

    const user = users.get(email);
    if (!user) {
      throw createError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createError('Invalid credentials', 401);
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const user = users.get(authReq.user.email);
    
    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
