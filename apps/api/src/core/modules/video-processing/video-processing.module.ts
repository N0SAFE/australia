import { Module, type DynamicModule, Global } from '@nestjs/common';
import { VideoProcessingService } from './services/video-processing.service';
import type { IVideoProcessingRepository } from './interfaces/video-processing-repository.interface';
import type { IVideoProcessingEvents } from './interfaces/video-processing-events.interface';

/**
 * Video Processing Core Module (Dynamic)
 * 
 * Provides reusable video processing capabilities across the application.
 * Uses dependency injection to work with any storage/event implementation.
 * 
 * Usage in feature modules:
 * ```typescript
 * @Module({
 *   providers: [
 *     FileMetadataRepository,  // Register your implementations first
 *     StorageEventService,
 *   ],
 *   imports: [
 *     VideoProcessingModule.forFeature({
 *       repository: FileMetadataRepository,  // Reference them here
 *       events: StorageEventService,
 *     })
 *   ],
 * })
 * export class StorageModule {}
 * ```
 */
@Global()
@Module({})
export class VideoProcessingModule {
  /**
   * Configure the module with specific repository and event implementations
   * 
   * @param options.repository - Class that implements IVideoProcessingRepository (must be registered in parent module)
   * @param options.events - Class that implements IVideoProcessingEvents (must be registered in parent module)
   */
  static forFeature(options: {
    repository: new (...args: any[]) => IVideoProcessingRepository;
    events: new (...args: any[]) => IVideoProcessingEvents;
  }): DynamicModule {
    return {
      module: VideoProcessingModule,
      imports: [],
      providers: [
        // Register the implementation classes in this module's scope
        options.repository,
        options.events,
        // Then alias them to the injection tokens
        {
          provide: 'VIDEO_PROCESSING_REPOSITORY',
          useExisting: options.repository,
        },
        {
          provide: 'VIDEO_PROCESSING_EVENTS',
          useExisting: options.events,
        },
        VideoProcessingService,
      ],
      exports: [VideoProcessingService],
    };
  }
}
