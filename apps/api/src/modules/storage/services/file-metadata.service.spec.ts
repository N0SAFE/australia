import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileMetadataService } from './file-metadata.service';
import { FileMetadataRepository } from '../repositories/file-metadata.repository';

describe('FileMetadataService', () => {
  let service: FileMetadataService;
  let mockRepository: any;

  beforeEach(async () => {
    // Create mock repository
    mockRepository = {
      createVideoFile: vi.fn(),
      createImageFile: vi.fn(),
      createAudioFile: vi.fn(),
      createRawFile: vi.fn(),
      getFileById: vi.fn(),
      getFileByPath: vi.fn(),
      updateVideoProcessingStatus: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileMetadataService,
        {
          provide: FileMetadataRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FileMetadataService>(FileMetadataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVideoFile', () => {
    it('should extract metadata and create a video file entry via repository', async () => {
      const mockResult = {
        file: { id: 'file-uuid-456' },
        videoMetadata: { id: 'video-uuid-123' },
      };

      mockRepository.createVideoFile.mockResolvedValue(mockResult);

      const result = await service.createVideoFile({
        filePath: 'videos/test.mp4',
        absoluteFilePath: '/uploads/videos/test.mp4',
        filename: 'test.mp4',
        storedFilename: 'uuid-test.mp4',
        mimeType: 'video/mp4',
        size: 1024000,
      });

      expect(result).toBeDefined();
      expect(result.file).toEqual(mockResult.file);
      expect(result.videoMetadata).toEqual(mockResult.videoMetadata);
      expect(mockRepository.createVideoFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('createImageFile', () => {
    it('should extract metadata and create an image file entry via repository', async () => {
      const mockResult = {
        file: { id: 'file-uuid-456' },
        imageMetadata: { id: 'image-uuid-123' },
      };

      mockRepository.createImageFile.mockResolvedValue(mockResult);

      const result = await service.createImageFile({
        filePath: 'images/test.jpg',
        absoluteFilePath: '/uploads/images/test.jpg',
        filename: 'test.jpg',
        storedFilename: 'uuid-test.jpg',
        mimeType: 'image/jpeg',
        size: 512000,
      });

      expect(result).toBeDefined();
      expect(result.file).toEqual(mockResult.file);
      expect(result.imageMetadata).toEqual(mockResult.imageMetadata);
      expect(mockRepository.createImageFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('createAudioFile', () => {
    it('should extract metadata and create an audio file entry via repository', async () => {
      const mockResult = {
        file: { id: 'file-uuid-456' },
        audioMetadata: { id: 'audio-uuid-123' },
      };

      mockRepository.createAudioFile.mockResolvedValue(mockResult);

      const result = await service.createAudioFile({
        filePath: 'audio/test.mp3',
        absoluteFilePath: '/uploads/audio/test.mp3',
        filename: 'test.mp3',
        storedFilename: 'uuid-test.mp3',
        mimeType: 'audio/mpeg',
        size: 256000,
      });

      expect(result).toBeDefined();
      expect(result.file).toEqual(mockResult.file);
      expect(result.audioMetadata).toEqual(mockResult.audioMetadata);
      expect(mockRepository.createAudioFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('createRawFile', () => {
    it('should extract metadata and create a text file entry via repository', async () => {
      const mockResult = {
        file: { id: 'file-uuid-456' },
        textMetadata: { id: 'text-uuid-123' },
      };

      mockRepository.createRawFile.mockResolvedValue(mockResult);

      const result = await service.createRawFile({
        filePath: 'files/test.txt',
        absoluteFilePath: '/uploads/files/test.txt',
        filename: 'test.txt',
        storedFilename: 'uuid-test.txt',
        mimeType: 'text/plain',
        size: 10240,
      });

      expect(result).toBeDefined();
      expect(result.file).toEqual(mockResult.file);
      expect(result.textMetadata).toEqual(mockResult.textMetadata);
      expect(mockRepository.createRawFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildRelativePath', () => {
    it('should build correct path for images', () => {
      const path = service.buildRelativePath('image/jpeg', 'test.jpg');
      expect(path).toBe('images/test.jpg');
    });

    it('should build correct path for videos', () => {
      const path = service.buildRelativePath('video/mp4', 'test.mp4');
      expect(path).toBe('videos/test.mp4');
    });

    it('should build correct path for audio', () => {
      const path = service.buildRelativePath('audio/mpeg', 'test.mp3');
      expect(path).toBe('audio/test.mp3');
    });
  });
});
