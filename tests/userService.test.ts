import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../src/services/userService';
import { userRepository } from '../src/repositories/userRepository';
import { hashPassword, comparePassword } from '../src/utils/password';
import { generateToken } from '../src/utils/jwt';
import { User, CreateUserInput, LoginInput, UpdateUserInput } from '../src/models/user';
import { AppError } from '../src/middleware/errorHandler';

// Mock dependencies
vi.mock('../src/repositories/userRepository', () => ({
  userRepository: {
    save: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    emailExists: vi.fn(),
  },
}));

vi.mock('../src/utils/password', () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
}));

vi.mock('../src/utils/jwt', () => ({
  generateToken: vi.fn(),
}));

describe('UserService', () => {
  let userService: UserService;
  const userId = '550e8400-e29b-41d4-a716-446655440001';
  const mockToken = 'mock.jwt.token';

  beforeEach(() => {
    vi.clearAllMocks();
    userService = new UserService();
  });

  describe('register', () => {
    const registerInput: CreateUserInput = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should successfully register a new user', async () => {
      const mockHashedPassword = 'hashed_password_123';
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        password_hash: mockHashedPassword,
        name: 'Test User',
        created_at: '2026-04-06T00:00:00.000Z',
        updated_at: '2026-04-06T00:00:00.000Z',
      };

      vi.mocked(userRepository.emailExists).mockResolvedValue(false);
      vi.mocked(hashPassword).mockResolvedValue(mockHashedPassword);
      vi.mocked(userRepository.save).mockResolvedValue(mockUser);
      vi.mocked(generateToken).mockReturnValue(mockToken);

      const result = await userService.register(registerInput);

      expect(result).toEqual({
        user: {
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          created_at: '2026-04-06T00:00:00.000Z',
          updated_at: '2026-04-06T00:00:00.000Z',
        },
        token: mockToken,
      });
      expect(userRepository.emailExists).toHaveBeenCalledWith('test@example.com');
      expect(hashPassword).toHaveBeenCalledWith('password123');
      expect(generateToken).toHaveBeenCalledWith({
        userId: userId,
        email: 'test@example.com',
      });
    });

    it('should throw 409 error if email already exists', async () => {
      vi.mocked(userRepository.emailExists).mockResolvedValue(true);

      await expect(userService.register(registerInput)).rejects.toThrow(
        new AppError(409, 'Email already registered')
      );
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      const inputWithUppercase: CreateUserInput = {
        ...registerInput,
        email: 'TEST@EXAMPLE.COM',
      };

      const mockHashedPassword = 'hashed_password_123';
      const mockUser: User = {
        id: userId,
        email: 'test@example.com',
        password_hash: mockHashedPassword,
        name: 'Test User',
        created_at: '2026-04-06T00:00:00.000Z',
        updated_at: '2026-04-06T00:00:00.000Z',
      };

      vi.mocked(userRepository.emailExists).mockResolvedValue(false);
      vi.mocked(hashPassword).mockResolvedValue(mockHashedPassword);
      vi.mocked(userRepository.save).mockResolvedValue(mockUser);
      vi.mocked(generateToken).mockReturnValue(mockToken);

      const result = await userService.register(inputWithUppercase);

      expect(result.user.email).toBe('test@example.com');
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
    });
  });

  describe('login', () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser: User = {
      id: userId,
      email: 'test@example.com',
      password_hash: 'hashed_password_123',
      name: 'Test User',
      created_at: '2026-04-06T00:00:00.000Z',
      updated_at: '2026-04-06T00:00:00.000Z',
    };

    it('should successfully login with valid credentials', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(comparePassword).mockResolvedValue(true);
      vi.mocked(generateToken).mockReturnValue(mockToken);

      const result = await userService.login(loginInput);

      expect(result).toEqual({
        user: {
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          created_at: '2026-04-06T00:00:00.000Z',
          updated_at: '2026-04-06T00:00:00.000Z',
        },
        token: mockToken,
      });
      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(comparePassword).toHaveBeenCalledWith('password123', 'hashed_password_123');
      expect(generateToken).toHaveBeenCalledWith({
        userId: userId,
        email: 'test@example.com',
      });
    });

    it('should throw 401 error if user not found', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      await expect(userService.login(loginInput)).rejects.toThrow(
        new AppError(401, 'Invalid credentials')
      );
      expect(comparePassword).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    });

    it('should throw 401 error if password is invalid', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(comparePassword).mockResolvedValue(false);

      await expect(userService.login(loginInput)).rejects.toThrow(
        new AppError(401, 'Invalid credentials')
      );
      expect(generateToken).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    const mockUser: User = {
      id: userId,
      email: 'test@example.com',
      password_hash: 'hashed_password_123',
      name: 'Test User',
      created_at: '2026-04-06T00:00:00.000Z',
      updated_at: '2026-04-06T00:00:00.000Z',
    };

    it('should successfully return user profile without password_hash', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);

      const result = await userService.getUserProfile(userId);

      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2026-04-06T00:00:00.000Z',
        updated_at: '2026-04-06T00:00:00.000Z',
      });
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should throw 404 error if user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(userService.getUserProfile(userId)).rejects.toThrow(
        new AppError(404, 'User not found')
      );
    });
  });

  describe('updateProfile', () => {
    const mockUser: User = {
      id: userId,
      email: 'test@example.com',
      password_hash: 'hashed_password_123',
      name: 'Test User',
      created_at: '2026-04-06T00:00:00.000Z',
      updated_at: '2026-04-06T00:00:00.000Z',
    };

    it('should successfully update user name', async () => {
      const updateInput: UpdateUserInput = { name: 'Updated Name' };
      const updatedUser: User = { ...mockUser, name: 'Updated Name' };

      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.update).mockResolvedValue(updatedUser);

      const result = await userService.updateProfile(userId, updateInput);

      expect(result.name).toBe('Updated Name');
      expect(userRepository.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          name: 'Updated Name',
          updated_at: expect.any(String),
        })
      );
    });

    it('should successfully update user email', async () => {
      const updateInput: UpdateUserInput = { email: 'newemail@example.com' };
      const updatedUser: User = { ...mockUser, email: 'newemail@example.com' };

      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.emailExists).mockResolvedValue(false);
      vi.mocked(userRepository.update).mockResolvedValue(updatedUser);

      const result = await userService.updateProfile(userId, updateInput);

      expect(result.email).toBe('newemail@example.com');
      expect(userRepository.emailExists).toHaveBeenCalledWith('newemail@example.com');
    });

    it('should successfully update user password', async () => {
      const updateInput: UpdateUserInput = { password: 'newpassword123' };
      const newHashedPassword = 'new_hashed_password';
      const updatedUser: User = { ...mockUser, password_hash: newHashedPassword };

      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(hashPassword).mockResolvedValue(newHashedPassword);
      vi.mocked(userRepository.update).mockResolvedValue(updatedUser);

      const result = await userService.updateProfile(userId, updateInput);

      expect(hashPassword).toHaveBeenCalledWith('newpassword123');
      expect(userRepository.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          password_hash: newHashedPassword,
          updated_at: expect.any(String),
        })
      );
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should throw 404 error if user not found', async () => {
      const updateInput: UpdateUserInput = { name: 'New Name' };

      vi.mocked(userRepository.findById).mockResolvedValue(null);

      await expect(userService.updateProfile(userId, updateInput)).rejects.toThrow(
        new AppError(404, 'User not found')
      );
    });

    it('should throw 409 error if new email is already taken', async () => {
      const updateInput: UpdateUserInput = { email: 'taken@example.com' };

      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.emailExists).mockResolvedValue(true);

      await expect(userService.updateProfile(userId, updateInput)).rejects.toThrow(
        new AppError(409, 'Email already in use')
      );
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should not check email existence if email is unchanged', async () => {
      const updateInput: UpdateUserInput = { email: 'test@example.com', name: 'New Name' };
      const updatedUser: User = { ...mockUser, name: 'New Name' };

      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(userRepository.update).mockResolvedValue(updatedUser);

      await userService.updateProfile(userId, updateInput);

      expect(userRepository.emailExists).not.toHaveBeenCalled();
    });
  });
});
