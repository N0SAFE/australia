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
     * Transform capsule object for API response (serialize dates and narrow types)
     */
    private async transformCapsule(capsule: {
        id: string;
        openingDate: string;
        content: string;
        openingMessage: string | null;
        isLocked: boolean;
        lockType: string | null;
        lockConfig: unknown;
        unlockedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    } | null): Promise<{
        id: string;
        openingDate: string;
        content: string;
        openingMessage: string | null;
        isLocked: boolean;
        lockType: 'code' | 'voice' | 'device_shake' | 'device_tilt' | 'device_tap' | 'api' | 'time_based' | null;
        lockConfig: 
            | { type: 'code'; code: string; attempts?: number }
            | { type: 'voice'; phrase: string; language?: string }
            | { type: 'device_shake' | 'device_tilt' | 'device_tap'; threshold?: number; pattern?: number[] }
            | { type: 'api'; endpoint: string; method?: 'GET' | 'POST'; headers?: Record<string, string>; expectedResponse?: unknown }
            | { type: 'time_based'; delayMinutes: number }
            | null;
        unlockedAt: string | null;
        createdAt: string;
        updatedAt: string;
    } | null> {
        if (!capsule) {
            return null;
        }
        
        // Return content field directly - it's already Plate.js JSON
        const result = {
            id: capsule.id,
            openingDate: capsule.openingDate,
            content: capsule.content,
            openingMessage: capsule.openingMessage,
            isLocked: capsule.isLocked,
            lockType: capsule.lockType as 'code' | 'voice' | 'device_shake' | 'device_tilt' | 'device_tap' | 'api' | 'time_based' | null,
            lockConfig: capsule.lockConfig === null ? null : capsule.lockConfig as 
                | { type: 'code'; code: string; attempts?: number }
                | { type: 'voice'; phrase: string; language?: string }
                | { type: 'device_shake' | 'device_tilt' | 'device_tap'; threshold?: number; pattern?: number[] }
                | { type: 'api'; endpoint: string; method?: 'GET' | 'POST'; headers?: Record<string, string>; expectedResponse?: unknown }
                | { type: 'time_based'; delayMinutes: number },
            unlockedAt: capsule.unlockedAt ? capsule.unlockedAt.toISOString() : null,
            createdAt: capsule.createdAt.toISOString(),
            updatedAt: capsule.updatedAt.toISOString(),
        };
        
        return result;
    }

    /**
     * Transform multiple capsules for API response
     */
    private async transformCapsules(capsules: {
        id: string;
        openingDate: string;
        content: string;
        openingMessage: string | null;
        isLocked: boolean;
        lockType: string | null;
        lockConfig: unknown;
        unlockedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]) {
        const transformed = await Promise.all(
            capsules.map((cap) => this.transformCapsule(cap))
        );
        return transformed.filter((cap): cap is NonNullable<typeof cap> => cap !== null);
    }

    /**
     * Create a new capsule with Plate.js content
     */
    async create(input: CreateCapsuleInput) {
        // Store Plate.js content directly in capsule table
        const newCapsule = await this.databaseService.db
            .insert(capsule)
            .values({
                id: randomUUID(),
                openingDate: input.openingDate,
                content: input.content, // Plate.js JSON string
                openingMessage: input.openingMessage ?? null,
                isLocked: input.isLocked ?? false,
                lockType: input.lockType ?? null,
                lockConfig: input.lockConfig ?? null,
                unlockedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return await this.transformCapsule(newCapsule[0]);
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

        return await this.transformCapsule(foundCapsule[0] || null);
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
            capsules: await this.transformCapsules(capsules),
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

        return await this.transformCapsules(capsules);
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

        this.logger.debug(`[Repository] Found capsules: ${String(capsules.length)}`);
        
        return await this.transformCapsules(capsules);
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

    /**
     * Unlock a capsule by updating unlockedAt timestamp
     */
    async unlock(id: string) {
        const unlockedCapsule = await this.databaseService.db
            .update(capsule)
            .set({
                unlockedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(capsule.id, id))
            .returning();

        return this.transformCapsule(unlockedCapsule[0] || null);
    }
}
