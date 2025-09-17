import { Kysely } from 'kysely';
import { Database, UsersTable } from '../types';

export interface CreateUserParams {
  email: string;
  password_hash?: string;
  email_verified?: boolean;
}

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * User repository interface
 */
export interface UserRepository {
  createUser(params: CreateUserParams): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

/**
 * Database implementation of UserRepository
 * TODO: Wire into membership logic in PR7
 */
export class DatabaseUserRepository implements UserRepository {
  constructor(private db: Kysely<Database>) {}

  async createUser(params: CreateUserParams): Promise<User> {
    // TODO: Implement in PR7 - dual write pattern with existing membership
    throw new Error('Not implemented yet - will be wired in PR7');
  }

  async findByEmail(email: string): Promise<User | null> {
    // TODO: Implement in PR7 - dual write pattern with existing membership
    throw new Error('Not implemented yet - will be wired in PR7');
  }

  async findById(id: string): Promise<User | null> {
    // TODO: Implement in PR7 - dual write pattern with existing membership
    throw new Error('Not implemented yet - will be wired in PR7');
  }
}