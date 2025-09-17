import { v4 as uuidv4 } from 'uuid';
import { User, UserRepository } from '../types/index.js';

/**
 * In-memory user repository implementation
 * TODO: Replace with PostgreSQL implementation in future phase
 */
export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    // Check if email already exists
    if (this.emailIndex.has(userData.email)) {
      throw new Error('User with this email already exists');
    }

    const now = new Date();
    const user: User = {
      id: uuidv4(),
      ...userData,
      createdAt: now,
      updatedAt: now
    };

    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user.id);

    console.info('User created', {
      userId: user.id,
      email: user.email,
      version: user.version
    });

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userId = this.emailIndex.get(email);
    return userId ? this.users.get(userId) || null : null;
  }

  async update(id: string, patch: Partial<User>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Handle email changes in index
    if (patch.email && patch.email !== existingUser.email) {
      if (this.emailIndex.has(patch.email)) {
        throw new Error('Email already in use');
      }
      this.emailIndex.delete(existingUser.email);
      this.emailIndex.set(patch.email, id);
    }

    const updatedUser: User = {
      ...existingUser,
      ...patch,
      id, // Ensure ID cannot be changed
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);

    console.info('User updated', {
      userId: id,
      updatedFields: Object.keys(patch),
      version: updatedUser.version
    });

    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.users.delete(id);
      this.emailIndex.delete(user.email);
      
      console.info('User deleted', { userId: id });
    }
  }

  /**
   * Get repository statistics for monitoring
   */
  getStats(): { userCount: number; memoryUsage: number } {
    return {
      userCount: this.users.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Clear all users (for testing purposes)
   */
  clear(): void {
    this.users.clear();
    this.emailIndex.clear();
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let size = 0;
    this.users.forEach(user => {
      size += JSON.stringify(user).length * 2; // rough estimate
    });
    return size;
  }
}

/**
 * TODO: PostgreSQL implementation for production use
 */
export class PostgreSQLUserRepository implements UserRepository {
  constructor(private connectionPool: any) {
    // TODO: Implement PostgreSQL connection
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    throw new Error('PostgreSQL repository not yet implemented - TODO for Phase 4');
  }

  async findById(id: string): Promise<User | null> {
    throw new Error('PostgreSQL repository not yet implemented - TODO for Phase 4');
  }

  async findByEmail(email: string): Promise<User | null> {
    throw new Error('PostgreSQL repository not yet implemented - TODO for Phase 4');
  }

  async update(id: string, patch: Partial<User>): Promise<User> {
    throw new Error('PostgreSQL repository not yet implemented - TODO for Phase 4');
  }

  async delete(id: string): Promise<void> {
    throw new Error('PostgreSQL repository not yet implemented - TODO for Phase 4');
  }
}