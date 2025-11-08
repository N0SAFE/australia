import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../../../core/modules/database/services/database.service";
import { capsule } from "@/config/drizzle/schema/capsule";
import { eq, desc, asc, count, and, SQL, gte, lt } from "drizzle-orm";
import { capsuleCreateInput, capsuleUpdateInput, capsuleListInput, capsuleFindByIdOutput } from "@repo/api-contracts";
import { z } from "zod";
import { randomUUID } from "crypto";

export type CreateCapsuleInput = z.infer<typeof capsuleCreateInput>;
export type UpdateCapsuleInput = z.infer<typeof capsuleUpdateInput>;
export type GetCapsulesInput = z.infer<typeof capsuleListInput>;
export type GetCapsuleOutput = z.infer<typeof capsuleFindByIdOutput>;

@Injectable()
export class CapsuleRepository {
    private readonly logger = new Logger(CapsuleRepository.name);

    constructor(private readonly databaseService: DatabaseService) {}

    /**
     * Transform capsule object for API response (serialize dates)
     */
    private transformCapsule<
        T extends {
            createdAt: Date;
            updatedAt: Date;
        } | null
    >(capsule: T) {
        if (!capsule) {
            return null;
        }
        return {
            ...capsule,
            createdAt: capsule.createdAt.toISOString(),
            updatedAt: capsule.updatedAt.toISOString(),
        };
    }

    /**
     * Transform multiple capsules for API response
     */
    private transformCapsules<T extends {
      createdAt: Date,
      updatedAt: Date
    }>(capsules: T[]) {
        return capsules
            .map((cap) => this.transformCapsule(cap))
            .filter((cap): cap is NonNullable<typeof cap> => cap !== null);
    }

    /**
     * Create a new capsule
     */
    async create(input: CreateCapsuleInput) {
        const validInput = input as { openingDate: string; content: string; openingMessage?: string | null };
        const newCapsule = await this.databaseService.db
            .insert(capsule)
            .values({
                id: randomUUID(),
                openingDate: validInput.openingDate,
                content: validInput.content,
                openingMessage: validInput.openingMessage ?? null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return this.transformCapsule(newCapsule[0]);
    }

    /**
     * Find capsule by ID
     */
    async findById(id: string) {
        const foundCapsule = await this.databaseService.db
            .select()
            .from(capsule)
            .where(eq(capsule.id, id))
            .limit(1);

        return this.transformCapsule(foundCapsule[0] || null);
    }

    /**
     * Find all capsules with pagination
     */
    async findMany(input: GetCapsulesInput) {
        const validInput = input as { 
            sort?: { field: 'openingDate' | 'createdAt'; direction: 'asc' | 'desc' };
            pagination?: { limit?: number; offset?: number };
        };
        
        // Build the order by condition
        let orderByCondition: SQL;

        if (!validInput.sort) {
            // Default sorting by opening date ascending
            orderByCondition = asc(capsule.openingDate);
        } else {
            switch (validInput.sort.field) {
                case "openingDate":
                    orderByCondition = validInput.sort.direction === "asc" ? asc(capsule.openingDate) : desc(capsule.openingDate);
                    break;
                case "createdAt":
                    orderByCondition = validInput.sort.direction === "asc" ? asc(capsule.createdAt) : desc(capsule.createdAt);
                    break;
                default:
                    throw new Error(`Unsupported sort field: ${validInput.sort.field as string}`);
            }
        }

        const limit = validInput.pagination?.limit ?? 100;
        const offset = validInput.pagination?.offset ?? 0;

        // Execute the main query
        const capsules = await this.databaseService.db
            .select()
            .from(capsule)
            .orderBy(orderByCondition)
            .limit(limit)
            .offset(offset);

        // Get total count for pagination info
        const totalResult = await this.databaseService.db
            .select({ count: count() })
            .from(capsule);

        const total = totalResult[0]?.count || 0;

        return {
            capsules: this.transformCapsules(capsules),
            meta: {
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total,
                },
            },
        };
    }

    /**
     * Find capsules by day
     */
    async findByDay(day: string) {
        const capsules = await this.databaseService.db
            .select()
            .from(capsule)
            .where(eq(capsule.openingDate, day))
            .orderBy(asc(capsule.createdAt));

        return this.transformCapsules(capsules);
    }

    /**
     * Find capsules for specified month
     */
    async findByMonth(month: string) {
        // Parse YYYY-MM format
        const [year, monthNum] = month.split('-');
        
        const startOfMonth = `${year}-${monthNum}-01`;
        
        // Calculate end of month (FIXED: monthNum is 1-indexed but Date constructor expects 0-indexed)
        const nextMonth = new Date(Number(year), Number(monthNum), 1);
        
        const endOfMonth = new Date(nextMonth.getTime() - 1);
        
        // Add one day to end date for lt comparison
        const nextDay = new Date(endOfMonth.getTime() + 24 * 60 * 60 * 1000);
        const nextDayStr = nextDay.toISOString().split('T')[0];

        const capsules = await this.databaseService.db
            .select()
            .from(capsule)
            .where(
                and(
                    gte(capsule.openingDate, startOfMonth),
                    lt(capsule.openingDate, nextDayStr)
                )
            )
            .orderBy(asc(capsule.openingDate));

        this.logger.debug(`[Repository] Found capsules: ${capsules.length}`);
        
        return this.transformCapsules(capsules);
    }

    /**
     * Update capsule by ID
     */
    async update(id: string, input: Omit<UpdateCapsuleInput, "id">) {
        const updatedCapsule = await this.databaseService.db
            .update(capsule)
            .set({
                ...input,
                updatedAt: new Date(),
            })
            .where(eq(capsule.id, id))
            .returning();

        return this.transformCapsule(updatedCapsule[0] || null);
    }

    /**
     * Delete capsule by ID
     */
    async delete(id: string) {
        const deletedCapsule = await this.databaseService.db
            .delete(capsule)
            .where(eq(capsule.id, id))
            .returning();

        return this.transformCapsule(deletedCapsule[0] || null);
    }
}
