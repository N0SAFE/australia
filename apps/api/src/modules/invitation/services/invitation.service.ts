 
 
import { Injectable, ConflictException } from '@nestjs/common';
import { InvitationRepository } from '../repositories/invitation.repository';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { AuthService } from '@/core/modules/auth/services/auth.service';

@Injectable()
export class InvitationService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly userRepository: UserRepository,
    private readonly databaseService: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Create a new invitation
   */
  async createInvitation(email: string, role = 'user', createdByUserId?: string) {
    // Check if user with this email already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const invitation = await this.invitationRepository.create({
      email,
      role,
      createdByUserId,
    });

    if (!invitation?.token || !invitation?.expiresAt) {
      throw new Error('Failed to create invitation');
    }

    return {
      success: true,
      token: invitation.token,
      expiresAt: (invitation.expiresAt).toISOString(),
    };
  }

  /**
   * Check if invitation token is valid
   */
  async checkInvitation(token: string) {
    // Check if invitation is valid
    const isValid = await this.invitationRepository.isValid(token);
    if (!isValid) {
      return {
        success: false as const,
        message: 'Invalid or expired invitation token',
      };
    }

    // Get invitation details
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation?.email) {
      return {
        success: false as const,
        message: 'Invitation not found',
      };
    }

    return {
      success: true as const,
      email: invitation.email,
      role: invitation.role,
    };
  }

  /**
   * Validate invitation and create user
   */
  async validateInvitation(token: string, password: string, name: string) {
    // Check if invitation is valid
    const isValid = await this.invitationRepository.isValid(token);
    if (!isValid) {
      return {
        success: false as const,
        message: 'Invalid or expired invitation token',
      };
    }

    // Get invitation details
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation?.email) {
      return {
        success: false as const,
        message: 'Invitation not found',
      };
    }

    // Check if user with this email already exists
    const existingUser = await this.userRepository.findByEmail(invitation.email);
    if (existingUser) {
      return {
        success: false as const,
        message: 'User with this email already exists',
      };
    }

    try {
      // Use Better Auth's createUser API to create user with proper password hashing
      // This ensures the password is hashed in the correct format
      const userResult = await this.authService.api.createUser({
        body: {
          name,
          email: invitation.email,
          password,
          data: {
            emailVerified: true, // Email is verified through invitation
            role: invitation.role || 'user', // Use role from invitation or default to 'user'
          },
        },
      });

      if (!userResult.user.id) {
        console.error('Better Auth createUser error: No user ID returned');
        return {
          success: false as const,
          message: 'Failed to create user account',
        };
      }

      const userId = userResult.user.id;

      // Mark invitation as used
      await this.invitationRepository.markAsUsed(token);

      return {
        success: true as const,
        message: 'User account created successfully',
        userId,
      };
    } catch (error) {
      console.error('Error creating user from invitation:', error);
      return {
        success: false as const,
        message: 'Failed to create user account',
      };
    }
  }
}
