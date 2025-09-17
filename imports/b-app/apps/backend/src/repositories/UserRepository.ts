/**
 * User Repository with Argon2id Support
 */

import { kysely } from '../config/kysely';
import { UserTable, RefreshTokenTable } from '../types/database';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface ArgonHashParams {
  timeCost: number;
  memoryCost: number;
  parallelism: number;
}

export class UserRepository {
  private static readonly ARGON_DEFAULTS: ArgonHashParams = {
    timeCost: 3,
    memoryCost: 65536, // 64MB
    parallelism: 1
  };

  /**
   * Create a new user with Argon2id password hashing
   */
  async createUser(userData: CreateUserData): Promise<Omit<UserTable, 'password_hash'> | null> {
    const { password, ...userFields } = userData;
    
    // Hash password with Argon2id
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      timeCost: UserRepository.ARGON_DEFAULTS.timeCost,
      memoryCost: UserRepository.ARGON_DEFAULTS.memoryCost,
      parallelism: UserRepository.ARGON_DEFAULTS.parallelism
    });

    const result = await kysely
      .insertInto('users')
      .values({
        id: uuidv4(),
        email: userData.email,
        password_hash: passwordHash,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        hash_alg: 'argon2id',
        hash_params_json: UserRepository.ARGON_DEFAULTS,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning([
        'id', 'email', 'first_name', 'last_name', 'phone', 
        'hash_alg', 'hash_params_json', 'created_at', 'updated_at'
      ])
      .executeTakeFirst();

    return result || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserTable | null> {
    const result = await kysely
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();

    return result || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<Omit<UserTable, 'password_hash'> | null> {
    const result = await kysely
      .selectFrom('users')
      .select([
        'id', 'email', 'first_name', 'last_name', 'phone',
        'hash_alg', 'hash_params_json', 'created_at', 'updated_at'
      ])
      .where('id', '=', id)
      .executeTakeFirst();

    return result || null;
  }

  /**
   * Update password hash version if parameters have changed
   */
  async updatePasswordHashVersion(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      timeCost: UserRepository.ARGON_DEFAULTS.timeCost,
      memoryCost: UserRepository.ARGON_DEFAULTS.memoryCost,
      parallelism: UserRepository.ARGON_DEFAULTS.parallelism
    });

    await kysely
      .updateTable('users')
      .set({
        password_hash: passwordHash,
        hash_alg: 'argon2id',
        hash_params_json: UserRepository.ARGON_DEFAULTS,
        updated_at: new Date()
      })
      .where('id', '=', userId)
      .execute();
  }

  /**
   * Verify password and rehash if needed
   */
  async verifyPasswordAndRehash(email: string, password: string): Promise<{ user: Omit<UserTable, 'password_hash'>, needsRehash: boolean } | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    // Verify current password
    const isValid = await argon2.verify(user.password_hash, password);
    if (!isValid) {
      return null;
    }

    // Check if rehash is needed (if parameters have changed)
    const currentParams = user.hash_params_json as ArgonHashParams || {};
    const needsRehash = 
      user.hash_alg !== 'argon2id' ||
      currentParams.timeCost !== UserRepository.ARGON_DEFAULTS.timeCost ||
      currentParams.memoryCost !== UserRepository.ARGON_DEFAULTS.memoryCost ||
      currentParams.parallelism !== UserRepository.ARGON_DEFAULTS.parallelism;

    if (needsRehash) {
      await this.updatePasswordHashVersion(user.id, password);
    }

    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, needsRehash };
  }

  /**
   * Create refresh token
   */
  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshTokenTable> {
    const result = await kysely
      .insertInto('refresh_tokens')
      .values({
        id: uuidv4(),
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Find valid refresh token
   */
  async findValidToken(tokenHash: string): Promise<RefreshTokenTable | null> {
    const result = await kysely
      .selectFrom('refresh_tokens')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .where('revoked_at', 'is', null)
      .where('expires_at', '>', new Date())
      .executeTakeFirst();

    return result || null;
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await kysely
      .updateTable('refresh_tokens')
      .set({
        revoked_at: new Date(),
        updated_at: new Date()
      })
      .where('id', '=', tokenId)
      .execute();
  }

  /**
   * Rotate refresh token
   */
  async rotateRefreshToken(oldTokenHash: string, newTokenHash: string, expiresAt: Date): Promise<RefreshTokenTable | null> {
    return await kysely.transaction().execute(async (trx) => {
      // Find the old token
      const oldToken = await trx
        .selectFrom('refresh_tokens')
        .selectAll()
        .where('token_hash', '=', oldTokenHash)
        .where('revoked_at', 'is', null)
        .executeTakeFirst();

      if (!oldToken) {
        return null;
      }

      // Revoke old token
      await trx
        .updateTable('refresh_tokens')
        .set({
          revoked_at: new Date(),
          updated_at: new Date()
        })
        .where('id', '=', oldToken.id)
        .execute();

      // Create new token
      const newToken = await trx
        .insertInto('refresh_tokens')
        .values({
          id: uuidv4(),
          user_id: oldToken.user_id,
          token_hash: newTokenHash,
          expires_at: expiresAt,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return newToken;
    });
  }
}