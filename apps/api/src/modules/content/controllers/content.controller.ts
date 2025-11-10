import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { ContentService } from '../services/content.service';
import type { Response } from 'express';
import { createReadStream } from 'fs';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get(':id/stream')
  async streamFile(
    @Param('id') id: string,
    @Query('type') type: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Validate type
    if (!['image', 'video', 'audio'].includes(type)) {
      throw new BadRequestException(
        'Invalid content type. Must be: image, video, or audio',
      );
    }

    const { filePath, mimeType, filename } =
      await this.contentService.getFileStream(
        id,
        type as 'image' | 'video' | 'audio',
      );

    const stream = createReadStream(filePath);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    return new StreamableFile(stream);
  }
}
