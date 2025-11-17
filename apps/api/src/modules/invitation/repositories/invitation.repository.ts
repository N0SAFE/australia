/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { eq } from 'drizzle-orm';
import { invite } from '@/config/drizzle/schema/auth';
import * as crypto from 'crypto';

export interface CreateInvitationInput {
  email: string;
  role?: string;
  createdByUserId?: string;
}

@Injectable()
export class InvitationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create a new invitation
   */
  async create(input: CreateInvitationInput) {
    const token = crypto.randomBytes(32).toString('hex');
    const id = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const results = await this.databaseService.db
      .insert(invite)
      .values({
        id,
        email: input.email,
        token,
        role: input.role ?? 'user',
        expiresAt,
        createdByUserId: input.createdByUserId,
      })
      .returning();

    const newInvitation = results[0];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!newInvitation) {
      throw new Error('Failed to create invitation');
    }

    return newInvitation;
  }

  /**
   * Find invitation by token
   */
  async findByToken(token: string) {
    const results = await this.databaseService.db
      .select()
      .from(invite)
      .where(eq(invite.token, token))
      .limit(1);

    return results[0] ?? null;
  }

  /**
   * Mark invitation as used
   */
  async markAsUsed(token: string) {
    const results = await this.databaseService.db
      .update(invite)
      .set({ usedAt: new Date() })
      .where(eq(invite.token, token))
      .returning();

    return results[0] ?? null;
  }

  /**
   * Check if invitation is valid (not used and not expired)
   */
  async isValid(token: string): Promise<boolean> {
    const inv = await this.findByToken(token);
    
    if (!inv as boolean) {
      return false;
    }

    // Check if already used
    if (inv.usedAt) {
      return false;
    }

    // Check if expired
    if (new Date() > inv.expiresAt) {
      return false;
    }

    return true;
  }
}
