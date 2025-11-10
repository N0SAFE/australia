import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import * as schema from '@/config/drizzle/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class ContentRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findById(id: string, type: 'text' | 'image' | 'video' | 'audio') {
    let result: any;
    
    switch (type) {
      case 'text':
        result = await this.databaseService.db
          .select()
          .from(schema.textContent)
          .where(eq(schema.textContent.id, id))
          .limit(1);
        break;
      case 'image':
        result = await this.databaseService.db
          .select()
          .from(schema.imageContent)
          .where(eq(schema.imageContent.id, id))
          .limit(1);
        break;
      case 'video':
        result = await this.databaseService.db
          .select()
          .from(schema.videoContent)
          .where(eq(schema.videoContent.id, id))
          .limit(1);
        break;
      case 'audio':
        result = await this.databaseService.db
          .select()
          .from(schema.audioContent)
          .where(eq(schema.audioContent.id, id))
          .limit(1);
        break;
    }

    return result[0] ?? null;
  }

  async createText(data: typeof schema.textContent.$inferInsert) {
    const result = await this.databaseService.db
      .insert(schema.textContent)
      .values(data)
      .returning();
    return result[0];
  }

  async createImage(data: typeof schema.imageContent.$inferInsert) {
    const result = await this.databaseService.db
      .insert(schema.imageContent)
      .values(data)
      .returning();
    return result[0];
  }

  async createVideo(data: typeof schema.videoContent.$inferInsert) {
    const result = await this.databaseService.db
      .insert(schema.videoContent)
      .values(data)
      .returning();
    return result[0];
  }

  async createAudio(data: typeof schema.audioContent.$inferInsert) {
    const result = await this.databaseService.db
      .insert(schema.audioContent)
      .values(data)
      .returning();
    return result[0];
  }

  async delete(id: string, type: 'text' | 'image' | 'video' | 'audio') {
    switch (type) {
      case 'text':
        await this.databaseService.db
          .delete(schema.textContent)
          .where(eq(schema.textContent.id, id));
        break;
      case 'image':
        await this.databaseService.db
          .delete(schema.imageContent)
          .where(eq(schema.imageContent.id, id));
        break;
      case 'video':
        await this.databaseService.db
          .delete(schema.videoContent)
          .where(eq(schema.videoContent.id, id));
        break;
      case 'audio':
        await this.databaseService.db
          .delete(schema.audioContent)
          .where(eq(schema.audioContent.id, id));
        break;
    }
  }
}
