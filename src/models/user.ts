import { z } from 'zod';

/**
 * User model for authentication and authorization
 */

// Zod schema for user validation
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  password_hash: z.string().min(1),
  name: z.string().min(1).max(100),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Schema for user creation (without id and timestamps)
export const CreateUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
});

// Schema for user login
export const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

// Schema for updating user profile (all fields optional)
export const UpdateUserSchema = z.object({
  email: z.string().email().toLowerCase().optional(),
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(8).max(100).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// TypeScript types inferred from schemas
export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// User response type (without password_hash)
export type UserResponse = Omit<User, 'password_hash'>;

// Helper function to convert User to UserResponse (removes password_hash)
export function toUserResponse(user: User): UserResponse {
  const { password_hash, ...userResponse } = user;
  return userResponse;
}
