/**
 * FFmpeg Integration Tests
 * 
 * These tests require:
 * 1. FFmpeg to be installed (available in Docker)
 * 2. fluent-ffmpeg package to be installed
 * 3. Test video files to be available
 * 
 * Run with: vitest run src/core/modules/ffmpeg/ffmpeg.integration.test.ts
 * 
 * Note: These tests are skipped by default. Remove .skip to run them.
 */

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { FfmpegService } from './services/ffmpeg.service';
import { describe, it, expect, beforeEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe.skip('FfmpegService Integration Tests', () => {
  let service: FfmpegService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FfmpegService],
    }).compile();

    service = module.get<FfmpegService>(FfmpegService);
  });

  describe('checkFfmpegAvailability', () => {
    it('should detect FFmpeg availability', async () => {
      const isAvailable = await service.checkFfmpegAvailability();
      expect(isAvailable).toBe(true);
    });
  });

  describe('getVideoMetadata', () => {
    it('should get metadata from a video file', async () => {
      // This test requires a real video file
      // You would need to provide a test video file path
      const testVideoPath = '/path/to/test/video.mp4';
      
      if (existsSync(testVideoPath)) {
        const metadata = await service.getVideoMetadata(testVideoPath);
        
        expect(metadata).toHaveProperty('duration');
        expect(metadata).toHaveProperty('width');
        expect(metadata).toHaveProperty('height');
        expect(metadata).toHaveProperty('codec');
        expect(metadata).toHaveProperty('format');
        expect(metadata.duration).toBeGreaterThan(0);
      }
    });
  });

  describe('convertVideoToH264AndReplace', () => {
    it('should convert and replace a video file', async () => {
      // This test requires a test video file that can be replaced
      const testVideoPath = '/tmp/test-video-to-replace.mov';
      
      // You would need to copy a test file here first
      if (existsSync(testVideoPath)) {
        await service.convertVideoToH264AndReplace(testVideoPath);
        
        // Original file should be gone
        expect(existsSync(testVideoPath)).toBe(false);
        
        // New MP4 file should exist
        const mp4Path = testVideoPath.replace(/\.[^.]+$/, '.mp4');
        expect(existsSync(mp4Path)).toBe(true);
        
        // Verify it's H.264
        const metadata = await service.getVideoMetadata(mp4Path);
        expect(metadata.codec).toBe('h264');
        
        // Cleanup
        unlinkSync(mp4Path);
      }
    }, 30000);
  });
});

/**
 * Test Instructions:
 * 
 * 1. Build and start the Docker container:
 *    docker compose -f ./docker/compose/api/docker-compose.api.dev.yml up --build
 * 
 * 2. Enter the container:
 *    docker exec -it <container-name> sh
 * 
 * 3. Verify FFmpeg is installed:
 *    bun scripts/test-ffmpeg.ts
 * 
 * 4. Place test video files in the container:
 *    - Upload a MOV file via the API
 *    - Or copy test files into the container
 * 
 * 5. Run integration tests:
 *    bun run test src/core/modules/ffmpeg/ffmpeg.integration.test.ts
 * 
 * Note: Remove .skip from describe to enable tests
 */
