import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { presentationVideo } from '@/config/drizzle/schema/presentation';
import { eq } from 'drizzle-orm';

export interface PresentationVideoData {
  filePath: string;
  filename: string;
  mimeType: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  thumbnailPath?: string;
}

export type PresentationVideoRecord = typeof presentationVideo.$inferSelect;

@Injectable()
export class PresentationRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Upsert presentation video (insert or replace)
   * Enforces single-row constraint
   */
  async upsert(data: PresentationVideoData): Promise<PresentationVideoRecord> {
    const db = this.databaseService.db;

    // Delete existing video if any
    await db.delete(presentationVideo).where(eq(presentationVideo.id, 'singleton'));

    // Insert new video
    const [video] = await db
      .insert(presentationVideo)
      .values({
        id: 'singleton',
        ...data,
      })
      .returning();

    return video;
  }

  /**
   * Get current presentation video
   */
  async findCurrent(): Promise<PresentationVideoRecord | null> {
    const db = this.databaseService.db;

    const result = await db
      .select()
      .from(presentationVideo)
      .where(eq(presentationVideo.id, 'singleton'))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Delete presentation video
   */
  async delete() {
    const db = this.databaseService.db;
    await db.delete(presentationVideo).where(eq(presentationVideo.id, 'singleton'));
  }
}
