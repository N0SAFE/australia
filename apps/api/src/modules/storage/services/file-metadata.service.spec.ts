import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileMetadataService } from './file-metadata.service';
import { DatabaseService } from '@/core/modules/database/services/database.service';

describe('FileMetadataService', () => {
  let service: FileMetadataService;
  let mockDatabaseService: any;

  beforeEach(async () => {
    // Create mock database service
    mockDatabaseService = {
      db: {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn(),
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileMetadataService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<FileMetadataService>(FileMetadataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVideoFile', () => {
    it('should create a video file entry', async () => {
      const mockVideoMetadata = { id: 'video-uuid-123' };
      const mockFileEntry = { id: 'file-uuid-456' };

      mockDatabaseService.db.returning
        .mockResolvedValueOnce([mockVideoMetadata])
        .mockResolvedValueOnce([mockFileEntry]);

      const result = await service.createVideoFile({
        filePath: 'videos/test.mp4',
        filename: 'test.mp4',
        storedFilename: 'uuid-test.mp4',
        mimeType: 'video/mp4',
        size: 1024000,
        videoMetadata: {
          width: 1920,
          height: 1080,
          duration: 60,
        },
      });

      expect(result).toBeDefined();
      expect(result.file).toEqual(mockFileEntry);
      expect(result.videoMetadata).toEqual(mockVideoMetadata);
      expect(mockDatabaseService.db.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('createImageFile', () => {
    it('should create an image file entry', async () => {
      const mockImageMetadata = { id: 'image-uuid-123' };
      const mockFileEntry = { id: 'file-uuid-456' };

      mockDatabaseService.db.returning
        .mockResolvedValueOnce([mockImageMetadata])
        .mockResolvedValueOnce([mockFileEntry]);

      const result = await service.createImageFile({
        filePath: 'images/test.jpg',
        filename: 'test.jpg',
        storedFilename: 'uuid-test.jpg',
        mimeType: 'image/jpeg',
        size: 512000,
        imageMetadata: {
          width: 1920,
          height: 1080,
        },
      });

      expect(result).toBeDefined();
      expect(result.file).toEqual(mockFileEntry);
      expect(result.imageMetadata).toEqual(mockImageMetadata);
      expect(mockDatabaseService.db.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('createAudioFile', () => {
    it('should create an audio file entry', async () => {
      const mockAudioMetadata = { id: 'audio-uuid-123' };
      const mockFileEntry = { id: 'file-uuid-456' };

      mockDatabaseService.db.returning
        .mockResolvedValueOnce([mockAudioMetadata])
        .mockResolvedValueOnce([mockFileEntry]);

      const result = await service.createAudioFile({
        filePath: 'audio/test.mp3',
        filename: 'test.mp3',
        storedFilename: 'uuid-test.mp3',
        mimeType: 'audio/mpeg',
        size: 256000,
        audioMetadata: {
          duration: 180,
          sampleRate: 44100,
          channels: 2,
        },
      });

      expect(result).toBeDefined();
      expect(result.file).toEqual(mockFileEntry);
      expect(result.audioMetadata).toEqual(mockAudioMetadata);
      expect(mockDatabaseService.db.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('createTextFile', () => {
    it('should create a text file entry', async () => {
      const mockTextMetadata = { id: 'text-uuid-123' };
      const mockFileEntry = { id: 'file-uuid-456' };

      mockDatabaseService.db.returning
        .mockResolvedValueOnce([mockTextMetadata])
        .mockResolvedValueOnce([mockFileEntry]);

      const result = await service.createTextFile({
        filePath: 'files/test.txt',
        filename: 'test.txt',
        storedFilename: 'uuid-test.txt',
        mimeType: 'text/plain',
        size: 10240,
        textMetadata: {
          encoding: 'utf-8',
          lineCount: 100,
        },
      });

      expect(result).toBeDefined();
      expect(result.file).toEqual(mockFileEntry);
      expect(result.textMetadata).toEqual(mockTextMetadata);
      expect(mockDatabaseService.db.insert).toHaveBeenCalledTimes(2);
    });
  });
});
