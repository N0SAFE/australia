import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UserRepository, type CreateUserInput, type UpdateUserInput, type GetUsersInput } from '../repositories/user.repository';
import { AuthService } from '@/core/modules/auth/services/auth.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
  ) {}

  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput) {
    // Check if user already exists with this email
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    return await this.userRepository.create(input);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Get user by ID (nullable version for update/delete operations)
   */
  async findUserById(id: string) {
    return await this.userRepository.findById(id);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    return await this.userRepository.findByEmail(email);
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(input: GetUsersInput) {
    return await this.userRepository.findMany(input);
  }

  /**
   * Update user by ID
   */
  async updateUser(id: string, input: Omit<UpdateUserInput, "id">) {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      return null;
    }

    // Check if email is being updated and if it conflicts with another user
    if (input.email && input.email !== existingUser.email) {
      const emailExists = await this.userRepository.existsByEmail(input.email);
      if (emailExists) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Handle password update separately using Better Auth API
    if (input.password) {
      await this.authService.api.adminUpdateUser({
        body: {
          userId: id,
          data: {
            password: input.password,
          },
        },
      });
    }

    // Update user info (excluding password as it's handled by Better Auth)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userDataWithoutPassword } = input;
    return await this.userRepository.update(id, userDataWithoutPassword);
  }

  /**
   * Delete user by ID
   */
  async deleteUser(id: string) {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      return null;
    }

    return await this.userRepository.delete(id);
  }

  /**
   * Check if user exists by email
   */
  async checkUserExistsByEmail(email: string): Promise<{ exists: boolean }> {
    const exists = await this.userRepository.existsByEmail(email);
    return { exists };
  }

  /**
   * Get user count
   */
  async getUserCount(): Promise<{ count: number }> {
    const count = await this.userRepository.getCount();
    return { count };
  }
}