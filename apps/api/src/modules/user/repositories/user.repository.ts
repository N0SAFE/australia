import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../core/modules/database/services/database.service";
import { user, invite } from "@/config/drizzle/schema/auth";
import { eq, desc, asc, like, count, and, SQL, sql } from "drizzle-orm";
import { userCreateInput, userUpdateInput, userListInput, userFindByIdOutput } from "@repo/api-contracts";
import { z } from "zod";
import { randomUUID } from "crypto";

export type CreateUserInput = z.infer<typeof userCreateInput>;
export type UpdateUserInput = z.infer<typeof userUpdateInput>;
export type GetUsersInput = z.infer<typeof userListInput>;

export type GetUserOutput = z.infer<typeof userFindByIdOutput>;

@Injectable()
export class UserRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    /**
     * Transform user object for API response (serialize dates)
     */
    private transformUser<
        T extends {
            createdAt: Date;
            updatedAt: Date;
        } | null
    >(user: T) {
        if (!user) {
            return null;
        }
        return {
            ...user,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }

    /**
     * Transform multiple users for API response
     */
    private transformUsers<T extends {
      createdAt: Date,
      updatedAt: Date
    }>(users: T[]) {
        return users.map((user) => this.transformUser(user));
    }

    /**
     * Create a new user
     */
    async create(input: CreateUserInput) {
        const newUser = await this.databaseService.db
            .insert(user)
            .values({
                id: randomUUID(),
                name: input.name,
                email: input.email,
                image: input.image ?? null,
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return this.transformUser(newUser[0]);
    }

    /**
     * Find user by ID
     */
    async findById(id: string) {
        const foundUser = await this.databaseService.db.select().from(user).where(eq(user.id, id)).limit(1);

        return this.transformUser(foundUser[0] || null);
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string) {
        const foundUser = await this.databaseService.db.select().from(user).where(eq(user.email, email)).limit(1);

        return this.transformUser(foundUser[0] || null);
    }

    /**
     * Find all users with pagination and filtering
     * This includes both:
     * 1. Users who have accounts (with or without invitations)
     * 2. Pending invitations for users who haven't created accounts yet
     */
    async findMany(input: GetUsersInput) {
        // Build the where conditions for users
        const userConditions: SQL[] = [];
        const invitationConditions: SQL[] = [];

        if (input.filter?.name) {
            userConditions.push(like(user.name, `%${input.filter.name}%`));
        }

        if (input.filter?.email) {
            userConditions.push(like(user.email, `%${input.filter.email}%`));
            invitationConditions.push(like(invite.email, `%${input.filter.email}%`));
        }

        if (input.filter?.id) {
            userConditions.push(eq(user.id, input.filter.id));
        }

        const userWhereCondition = userConditions.length > 0 ? (userConditions.length === 1 ? userConditions[0] : and(...userConditions)) : undefined;
        const invitationWhereCondition = invitationConditions.length > 0 ? (invitationConditions.length === 1 ? invitationConditions[0] : and(...invitationConditions)) : undefined;

        // Build the order by condition
        let orderByCondition: SQL;

        if (!input.sort) {
            // Default sorting when no sort is provided
            orderByCondition = desc(user.createdAt);
        } else {
            switch (input.sort.field) {
                case "id":
                    orderByCondition = input.sort.direction === "asc" ? asc(user.id) : desc(user.id);
                    break;
                case "name":
                    orderByCondition = input.sort.direction === "asc" ? asc(user.name) : desc(user.name);
                    break;
                case "email":
                    orderByCondition = input.sort.direction === "asc" ? asc(user.email) : desc(user.email);
                    break;
                case "emailVerified":
                    orderByCondition = input.sort.direction === "asc" ? asc(user.emailVerified) : desc(user.emailVerified);
                    break;
                case "image":
                    orderByCondition = input.sort.direction === "asc" ? asc(user.image) : desc(user.image);
                    break;
                case "createdAt":
                    orderByCondition = input.sort.direction === "asc" ? asc(user.createdAt) : desc(user.createdAt);
                    break;
                case "updatedAt":
                    orderByCondition = input.sort.direction === "asc" ? asc(user.updatedAt) : desc(user.updatedAt);
                    break;
                default:
                    throw new Error(`Unsupported sort field: ${input.sort.field as string}`);
            }
        }

        // First, get all existing users with their invite status
        const existingUsersQuery = this.databaseService.db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                image: user.image,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                role: user.role,
                invitationStatus: sql<string | null>`
                    CASE 
                        WHEN ${invite.usedAt} IS NOT NULL THEN 'accepted'
                        WHEN ${invite.expiresAt} < NOW() THEN 'expired'
                        WHEN ${invite.token} IS NOT NULL THEN 'pending'
                        WHEN ${user.emailVerified} = TRUE THEN 'accepted'
                        ELSE NULL
                    END
                `.as('invitation_status'),
                invitationToken: invite.token,
            })
            .from(user)
            .leftJoin(invite, eq(user.email, invite.email))
            .orderBy(orderByCondition);

        const existingUsers = userWhereCondition
            ? await existingUsersQuery.where(userWhereCondition)
            : await existingUsersQuery;

        // Get all invite emails that have users (to exclude them from pending invitations)
        const existingUserEmails = new Set(existingUsers.map(u => u.email));

        // Second, get pending invitations for emails that don't have user accounts yet
        const pendingInvitationsQuery = this.databaseService.db
            .select({
                id: invite.id,
                email: invite.email,
                token: invite.token,
                createdAt: invite.createdAt,
                expiresAt: invite.expiresAt,
                usedAt: invite.usedAt,
            })
            .from(invite);

        const allInvitations = invitationWhereCondition
            ? await pendingInvitationsQuery.where(invitationWhereCondition)
            : await pendingInvitationsQuery;

        // Filter out invitations for emails that already have user accounts
        const pendingInvitations = allInvitations
            .filter(inv => !existingUserEmails.has(inv.email))
            .map(inv => {
                const now = new Date();
                let status: 'pending' | 'expired' | 'accepted' = 'pending';
                
                if (inv.usedAt) {
                    status = 'accepted';
                } else if (inv.expiresAt < now) {
                    status = 'expired';
                }

                return {
                    id: inv.id, // Use invite ID for pending invitations
                    name: inv.email.split('@')[0], // Generate name from email
                    email: inv.email,
                    emailVerified: false,
                    image: null,
                    createdAt: inv.createdAt ?? new Date(),
                    updatedAt: inv.createdAt ?? new Date(),
                    role: null,
                    invitationStatus: status,
                    invitationToken: inv.token,
                };
            });

        // Combine existing users and pending invitations
        const allRecords = [...existingUsers, ...pendingInvitations];

        // Apply pagination
        const paginatedRecords = allRecords.slice(
            input.pagination.offset,
            input.pagination.offset + input.pagination.limit
        );

        const total = allRecords.length;

        return {
            users: paginatedRecords.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                emailVerified: u.emailVerified,
                image: u.image,
                createdAt: u.createdAt.toISOString(),
                updatedAt: u.updatedAt.toISOString(),
                role: u.role,
                invitationStatus: u.invitationStatus as 'pending' | 'accepted' | 'expired' | null,
                invitationToken: u.invitationToken,
            })),
            meta: {
                pagination: {
                    total,
                    limit: input.pagination.limit,
                    offset: input.pagination.offset,
                    hasMore: input.pagination.offset + input.pagination.limit < total,
                },
            },
        };
    }

    /**
     * Update user by ID
     */
    async update(id: string, input: Omit<UpdateUserInput, "id">) {
        const updatedUser = await this.databaseService.db
            .update(user)
            .set({
                ...input,
                createdAt: new Date(input.createdAt ?? Date.now()),
                updatedAt: new Date(),
            })
            .where(eq(user.id, id))
            .returning();

        return this.transformUser(updatedUser[0] || null);
    }

    /**
     * Delete user by ID
     */
    async delete(id: string) {
        const deletedUser = await this.databaseService.db.delete(user).where(eq(user.id, id)).returning();

        return this.transformUser(deletedUser[0] || null);
    }

    /**
     * Check if user exists by email
     */
    async existsByEmail(email: string): Promise<boolean> {
        const existingUser = await this.databaseService.db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);

        return existingUser.length > 0;
    }

    /**
     * Get user count
     */
    async getCount(): Promise<number> {
        const result = await this.databaseService.db.select({ count: count() }).from(user);

        return result[0]?.count || 0;
    }
}
