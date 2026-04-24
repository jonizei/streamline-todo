import { randomUUID } from 'crypto';
import { User, CreateUserInput, LoginInput, UpdateUserInput, UserResponse, toUserResponse } from '../models/user.js';
import { userRepository } from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';

export class UserService {
  /**
   * Register a new user
   * @throws AppError if email already exists
   */
  async register(input: CreateUserInput): Promise<{ user: UserResponse; token: string }> {
    // Check if email already exists
    const emailExists = await userRepository.emailExists(input.email);
    if (emailExists) {
      throw new AppError(409, 'Email already registered');
    }

    // Hash password
    const password_hash = await hashPassword(input.password);

    // Create user object
    const now = new Date().toISOString();
    const user: User = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      password_hash,
      name: input.name,
      created_at: now,
      updated_at: now,
    };

    // Save user
    const savedUser = await userRepository.save(user);

    // Generate JWT token
    const token = generateToken({ userId: savedUser.id, email: savedUser.email });

    return {
      user: toUserResponse(savedUser),
      token,
    };
  }

  /**
   * Login with email and password
   * @throws AppError if credentials are invalid
   */
  async login(input: LoginInput): Promise<{ user: UserResponse; token: string }> {
    // Find user by email
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await comparePassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email });

    return {
      user: toUserResponse(user),
      token,
    };
  }

  /**
   * Get user profile by ID
   * @throws AppError if user not found
   */
  async getUserProfile(userId: string): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return toUserResponse(user);
  }

  /**
   * Update user profile
   * @throws AppError if user not found or email already taken
   */
  async updateProfile(userId: string, input: UpdateUserInput): Promise<UserResponse> {
    // Check if user exists
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      throw new AppError(404, 'User not found');
    }

    // If updating email, check if new email is already taken
    if (input.email && input.email !== existingUser.email) {
      const emailExists = await userRepository.emailExists(input.email);
      if (emailExists) {
        throw new AppError(409, 'Email already in use');
      }
    }

    // Prepare update object
    const updateData: Partial<User> = {
      updated_at: new Date().toISOString(),
    };

    if (input.email) {
      updateData.email = input.email.toLowerCase();
    }

    if (input.name) {
      updateData.name = input.name;
    }

    if (input.password) {
      updateData.password_hash = await hashPassword(input.password);
    }

    // Update user
    const updatedUser = await userRepository.update(userId, updateData);
    if (!updatedUser) {
      throw new AppError(404, 'User not found');
    }

    return toUserResponse(updatedUser);
  }
}

export const userService = new UserService();
