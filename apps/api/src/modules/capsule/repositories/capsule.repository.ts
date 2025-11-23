import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../../../core/modules/database/services/database.service";
import { StorageEventService } from "@/modules/storage/events/storage.event";
import { capsule } from "@/config/drizzle/schema/capsule";
import { capsuleMedia } from "@/config/drizzle/schema/capsule-media";
import { file } from "@/config/drizzle/schema/file";
import { imageFile } from "@/config/drizzle/schema/file";
import { videoFile } from "@/config/drizzle/schema/file";
import { audioFile } from "@/config/drizzle/schema/file";
import { eq, desc, asc, count, and, SQL, gte, lt, lte, inArray, isNull, not } from "drizzle-orm";
import { capsuleCreateInput, capsuleUpdateInput, capsuleListInput, capsuleFindByIdOutput } from "@repo/api-contracts";
import { z } from "zod";
import { randomUUID } from "crypto";

// Repository input types exclude media field (handled by service layer)
export type CreateCapsuleInput = Omit<z.infer<typeof capsuleCreateInput>, 'media'>;
export type UpdateCapsuleInput = Omit<z.infer<typeof capsuleUpdateInput>, 'media'>;
export type GetCapsulesInput = z.infer<typeof capsuleListInput>;
export type GetCapsuleOutput = z.infer<typeof capsuleFindByIdOutput>;

@Injectable()
export class CapsuleRepository {
    private readonly logger = new Logger(CapsuleRepository.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly storageEventService: StorageEventService,
    ) {}

    /**
     * Fetch attached media for a capsule by joining capsuleMedia → file → type-specific tables
     */
    private async getAttachedMedia(capsuleId: string) {
        // Get capsuleMedia records for this capsule
        const mediaRecords = await this.databaseService.db
            .select()
            .from(capsuleMedia)
            .where(eq(capsuleMedia.capsuleId, capsuleId))
            .orderBy(capsuleMedia.order);

        // Fetch detailed metadata for each media record
        const attachedMedia = await Promise.all(
            mediaRecords.map(async (mediaRecord) => {
                // Get file record
                const fileRecord = await this.databaseService.db
                    .select()
                    .from(file)
                    .where(eq(file.id, mediaRecord.fileId))
                    .limit(1);

                if (fileRecord.length === 0) {
                    this.logger.warn(`File not found for capsuleMedia record: ${mediaRecord.id}`);
                    return null;
                }

                const f = fileRecord[0];

                // Base media object
                const baseMedia = {
                    contentMediaId: mediaRecord.contentMediaId,
                    type: mediaRecord.type,
                    fileId: f.id,
                    filePath: f.filePath,
                    filename: f.filename,
                    mimeType: f.mimeType,
                    size: f.size,
                    createdAt: f.createdAt.toISOString(),
                };

                // Fetch type-specific metadata
                if (mediaRecord.type === 'image') {
                    const imageRecord = await this.databaseService.db
                        .select()
                        .from(imageFile)
                        .where(eq(imageFile.id, f.contentId))
                        .limit(1);

                    if (imageRecord.length > 0) {
                        const img = imageRecord[0];
                        return {
                            ...baseMedia,
                            width: img.width,
                            height: img.height,
                            thumbnailPath: img.thumbnailPath,
                        };
                    }
                } else if (mediaRecord.type === 'video') {
                    const videoRecord = await this.databaseService.db
                        .select()
                        .from(videoFile)
                        .where(eq(videoFile.id, f.contentId))
                        .limit(1);

                    if (videoRecord.length > 0) {
                        const vid = videoRecord[0];
                        return {
                            ...baseMedia,
                            width: vid.width,
                            height: vid.height,
                            duration: vid.duration,
                            thumbnailPath: vid.thumbnailPath,
                        };
                    }
                } else {
                    const audioRecord = await this.databaseService.db
                        .select()
                        .from(audioFile)
                        .where(eq(audioFile.id, f.contentId))
                        .limit(1);

                    if (audioRecord.length > 0) {
                        const aud = audioRecord[0];
                        return {
                            ...baseMedia,
                            duration: aud.duration,
                        };
                    }
                }

                // Return base media if type-specific lookup failed
                return baseMedia;
            })
        );

        // Filter out nulls and return
        return attachedMedia.filter((media): media is NonNullable<typeof media> => media !== null);
    }

    /**
     * Check if a capsule has any videos that are still being processed
     */
    private async checkHasProcessingVideos(capsuleId: string): Promise<boolean> {
        // Join capsuleMedia → file → videoFile to check for unprocessed videos
        const result = await this.databaseService.db
            .select({ 
                videoId: videoFile.id,
                isProcessed: videoFile.isProcessed 
            })
            .from(capsuleMedia)
            .innerJoin(file, eq(capsuleMedia.fileId, file.id))
            .innerJoin(videoFile, eq(file.contentId, videoFile.id))
            .where(and(
                eq(capsuleMedia.capsuleId, capsuleId),
                eq(file.type, 'video'),
                eq(videoFile.isProcessed, false)
            ))
            .limit(1); // We only need to know if ANY video is unprocessed

        return result.length > 0;
    }

    /**
     * Batch check processing status for multiple capsules
     * Returns a Map of capsuleId -> hasProcessingVideos
     */
    private async batchCheckProcessingStatus(capsuleIds: string[]): Promise<Map<string, boolean>> {
        if (capsuleIds.length === 0) {
            return new Map();
        }

        // Query all videos for these capsules that might be processing
        // Get videos that are not yet fully processed (isProcessed = false)
        const candidateVideos = await this.databaseService.db
            .select({ 
                capsuleId: capsuleMedia.capsuleId,
                videoId: videoFile.id,
                fileId: file.id,
                isProcessed: videoFile.isProcessed,
                processingStartedAt: videoFile.processingStartedAt
            })
            .from(capsuleMedia)
            .innerJoin(file, eq(capsuleMedia.fileId, file.id))
            .innerJoin(videoFile, eq(file.contentId, videoFile.id))
            .where(and(
                inArray(capsuleMedia.capsuleId, capsuleIds),
                eq(file.type, 'video'),
                eq(videoFile.isProcessed, false)
            ));

        console.log('🔍 Checking processing status for capsules:', capsuleIds);
        console.log('📹 Candidate unprocessed videos:', candidateVideos);

        // Build map of which capsules have processing videos
        const processingMap = new Map<string, boolean>();
        
        // Initialize all capsules to false
        capsuleIds.forEach(id => processingMap.set(id, false));
        
        // Check each candidate video to see if it's ACTUALLY processing
        // (not just unprocessed, but actively being processed right now)
        for (const video of candidateVideos) {
            const isActuallyProcessing = this.storageEventService.isProcessing(
                'videoProcessing',
                { fileId: video.fileId }
            );
            
            if (isActuallyProcessing) {
                console.log(`✅ Video ${video.fileId} in capsule ${video.capsuleId} IS actively processing`);
                processingMap.set(video.capsuleId, true);
            } else {
                console.log(`⏸️  Video ${video.fileId} in capsule ${video.capsuleId} is unprocessed but NOT actively processing`);
            }
        }

        console.log('✅ Final processing map result:', Array.from(processingMap.entries()));

        return processingMap;
    }

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
        openedAt: Date | null;
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
        openedAt: string | null;
        isOpened: boolean;
        attachedMedia: {
            contentMediaId: string;
            type: 'image' | 'video' | 'audio';
            fileId: string;
            filePath: string;
            filename: string;
            mimeType: string;
            size: number;
            width?: number;
            height?: number;
            duration?: number;
            thumbnailPath?: string | null;
            createdAt: string;
        }[];
        hasProcessingVideos: boolean;
        createdAt: string;
        updatedAt: string;
    } | null> {
        if (!capsule) {
            return Promise.resolve(null);
        }
        
        // Fetch attached media for this capsule
        const attachedMedia = await this.getAttachedMedia(capsule.id);
        
        // Check if any videos are still being processed
        const hasProcessingVideos = await this.checkHasProcessingVideos(capsule.id);
        
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
            openedAt: capsule.openedAt ? capsule.openedAt.toISOString() : null,
            isOpened: capsule.openedAt !== null, // Derived field: true if openedAt is not null
            attachedMedia, // Include attached media in response
            hasProcessingVideos, // Include processing status
            createdAt: capsule.createdAt.toISOString(),
            updatedAt: capsule.updatedAt.toISOString(),
        };
        
        return Promise.resolve(result);
    }

    /**
     * Transform multiple capsules for API response
     * Optimized to batch-check processing status for all capsules at once
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
        openedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]) {
        // Batch check processing status for all capsules
        const capsuleIds = capsules.map(c => c.id);
        const processingStatusMap = await this.batchCheckProcessingStatus(capsuleIds);
        
        // Transform each capsule with pre-fetched processing status
        const transformed = await Promise.all(
            capsules.map(async (cap) => {
                // Fetch attached media for this capsule
                const attachedMedia = await this.getAttachedMedia(cap.id);
                
                // Get processing status from batch results
                const hasProcessingVideos = processingStatusMap.get(cap.id) ?? false;
                
                // Return transformed capsule
                return {
                    id: cap.id,
                    openingDate: cap.openingDate,
                    content: cap.content,
                    openingMessage: cap.openingMessage,
                    isLocked: cap.isLocked,
                    lockType: cap.lockType as 'code' | 'voice' | 'device_shake' | 'device_tilt' | 'device_tap' | 'api' | 'time_based' | null,
                    lockConfig: cap.lockConfig === null ? null : cap.lockConfig as 
                        | { type: 'code'; code: string; attempts?: number }
                        | { type: 'voice'; phrase: string; language?: string }
                        | { type: 'device_shake' | 'device_tilt' | 'device_tap'; threshold?: number; pattern?: number[] }
                        | { type: 'api'; endpoint: string; method?: 'GET' | 'POST'; headers?: Record<string, string>; expectedResponse?: unknown }
                        | { type: 'time_based'; delayMinutes: number },
                    unlockedAt: cap.unlockedAt ? cap.unlockedAt.toISOString() : null,
                    openedAt: cap.openedAt ? cap.openedAt.toISOString() : null,
                    isOpened: cap.openedAt !== null,
                    attachedMedia,
                    hasProcessingVideos,
                    createdAt: cap.createdAt.toISOString(),
                    updatedAt: cap.updatedAt.toISOString(),
                };
            })
        );
        
        return transformed;
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
                isLocked: input.isLocked,
                lockType: input.lockType ?? null,
                lockConfig: input.lockConfig ?? null,
                unlockedAt: null,
                openedAt: null,
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
     * Get recent capsules for home page
     * Returns:
     * - All capsules from the past week
     * - All locked capsules from the past
     * - All unread (unlocked but not opened) capsules from the past
     */
    async getRecent() {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const todayStr = now.toISOString().split('T')[0];

        // Get all capsules with opening date in the past (up to today)
        const capsules = await this.databaseService.db
            .select()
            .from(capsule)
            .where(
                lte(capsule.openingDate, todayStr)
            )
            .orderBy(asc(capsule.openingDate));

        // Filter to include:
        // 1. All capsules from past week
        // 2. All locked capsules from the past
        // 3. All unlocked but not opened capsules from the past
        const filteredCapsules = capsules.filter(c => {
            const openingDate = new Date(c.openingDate);
            const isFromPastWeek = openingDate >= oneWeekAgo;
            const isLocked = c.isLocked;
            const isUnread = !c.isLocked && !c.openedAt;

            return isFromPastWeek || isLocked || isUnread;
        });

        this.logger.debug(`[Repository] Found ${String(filteredCapsules.length)} recent capsules (from ${String(capsules.length)} total past capsules)`);
        
        return await this.transformCapsules(filteredCapsules);
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

    /**
     * Mark a capsule as opened by updating openedAt timestamp
     */
    async markAsOpened(id: string) {
        const openedCapsule = await this.databaseService.db
            .update(capsule)
            .set({
                openedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(capsule.id, id))
            .returning();

        return this.transformCapsule(openedCapsule[0] || null);
    }
}
