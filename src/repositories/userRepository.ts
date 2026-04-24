import { promises as fs } from 'fs';
import path from 'path';
import { User, UserSchema } from '../models/user.js';

const USERS_DIR = process.env.USERS_DIR || 'data/users';

class UserRepository {
  private cache: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await fs.mkdir(USERS_DIR, { recursive: true });
      const files = await fs.readdir(USERS_DIR);

      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue;
        }

        const filePath = path.join(USERS_DIR, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const user = UserSchema.parse(JSON.parse(content));
          this.cache.set(user.id, user);
          this.emailIndex.set(user.email.toLowerCase(), user.id);
        } catch (error) {
          // Skip if file doesn't exist or is invalid
          continue;
        }
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize user repository: ${error}`);
    }
  }

  async save(user: User): Promise<User> {
    const filePath = path.join(USERS_DIR, `${user.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(user, null, 2), 'utf-8');
    this.cache.set(user.id, user);
    this.emailIndex.set(user.email.toLowerCase(), user.id);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.cache.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) {
      return null;
    }
    return this.cache.get(userId) || null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.cache.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const existingUser = this.cache.get(id);
    if (!existingUser) {
      return null;
    }

    // If email is being updated, update the email index
    if (updates.email && updates.email !== existingUser.email) {
      this.emailIndex.delete(existingUser.email.toLowerCase());
      this.emailIndex.set(updates.email.toLowerCase(), id);
    }

    const updatedUser: User = {
      ...existingUser,
      ...updates,
      id: existingUser.id,
      created_at: existingUser.created_at,
      updated_at: new Date().toISOString(),
    };

    const filePath = path.join(USERS_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updatedUser, null, 2), 'utf-8');
    this.cache.set(id, updatedUser);
    return updatedUser;
  }

  async remove(id: string): Promise<boolean> {
    const user = this.cache.get(id);
    if (!user) {
      return false;
    }

    const filePath = path.join(USERS_DIR, `${id}.json`);
    try {
      await fs.unlink(filePath);
      this.cache.delete(id);
      this.emailIndex.delete(user.email.toLowerCase());
      return true;
    } catch (error) {
      return false;
    }
  }

  async emailExists(email: string): Promise<boolean> {
    return this.emailIndex.has(email.toLowerCase());
  }
}

export const userRepository = new UserRepository();
