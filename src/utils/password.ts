import bcrypt from 'bcryptjs';

/**
 * Password hashing utilities using bcrypt
 */

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 * @param password - Plain text password to hash
 * @returns Promise that resolves to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns Promise that resolves to true if passwords match, false otherwise
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
