import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileMetadataRepository } from './file-metadata.repository';
import { DatabaseService } from '@/core/modules/database/services/database.service';

describe('FileMetadataRepository', () => {
  let repository: FileMetadataRepository;
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
        FileMetadataRepository,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    repository = module.get<FileMetadataRepository>(FileMetadataRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createVideoFile', () => {
    it('should create a video file entry in database', async () => {
      const mockVideoMetadata = { id: 'video-uuid-123' };
      const mockFileEntry = { id: 'file-uuid-456' };

      mockDatabaseService.db.returning
        .mockResolvedValueOnce([mockVideoMetadata])
        .mockResolvedValueOnce([mockFileEntry]);

      const result = await repository.createVideoFile({
        filePath: 'videos/test.mp4',
        filename: 'test.mp4',
        storedFilename: 'uuid-test.mp4',
        mimeType: 'video/mp4',
        size: 1024000,
        videoMetadata: {
          width: 1920,
          height: 1080,
          duration: 60,
          aspectRatio: '16:9',
        },
      });

      expect(result).toBeDefined();
      expect(result.file).toEqual(mockFileEntry);
      expect(result.videoMetadata).toEqual(mockVideoMetadata);
      expect(mockDatabaseService.db.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('createImageFile', () => {
    it('should create an image file entry in database', async () => {
      const mockImageMetadata = { id: 'image-uuid-123' };
      const mockFileEntry = { id: 'file-uuid-456' };

      mockDatabaseService.db.returning
        .mockResolvedValueOnce([mockImageMetadata])
        .mockResolvedValueOnce([mockFileEntry]);

      const result = await repository.createImageFile({
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
    it('should create an audio file entry in database', async () => {
      const mockAudioMetadata = { id: 'audio-uuid-123' };
      const mockFileEntry = { id: 'file-uuid-456' };

      mockDatabaseService.db.returning
        .mockResolvedValueOnce([mockAudioMetadata])
        .mockResolvedValueOnce([mockFileEntry]);

      const result = await repository.createAudioFile({
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

  describe('createRawFile', () => {
    it('should create a text file entry in database', async () => {
      const mockTextMetadata = { id: 'text-uuid-123' };
      const mockFileEntry = { id: 'file-uuid-456' };

      mockDatabaseService.db.returning
        .mockResolvedValueOnce([mockTextMetadata])
        .mockResolvedValueOnce([mockFileEntry]);

      const result = await repository.createRawFile({
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

  describe('getFileById', () => {
    it('should retrieve file by ID', async () => {
      const mockFile = { id: 'file-uuid-456', filePath: 'videos/test.mp4' };
      mockDatabaseService.db.where.mockResolvedValue([mockFile]);

      const result = await repository.getFileById('file-uuid-456');

      expect(result).toEqual(mockFile);
    });
  });

  describe('getFileByPath', () => {
    it('should retrieve file by path', async () => {
      const mockFile = { id: 'file-uuid-456', filePath: 'videos/test.mp4' };
      mockDatabaseService.db.where.mockResolvedValue([mockFile]);

      const result = await repository.getFileByPath('videos/test.mp4');

      expect(result).toEqual(mockFile);
    });
  });
});
