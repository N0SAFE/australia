import { Test, type TestingModule } from '@nestjs/testing';
import { FfmpegService } from './ffmpeg.service';
import { HardwareAccelerationService } from './hardware-acceleration.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('FfmpegService', () => {
  let service: FfmpegService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FfmpegService, HardwareAccelerationService],
    }).compile();

    service = module.get<FfmpegService>(FfmpegService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have getVideoMetadata method', () => {
    expect(service.getVideoMetadata).toBeDefined();
    expect(typeof service.getVideoMetadata).toBe('function');
  });

  it('should have checkFfmpegAvailability method', () => {
    expect(service.checkFfmpegAvailability).toBeDefined();
    expect(typeof service.checkFfmpegAvailability).toBe('function');
  });

  it('should have convertVideoToH264AndReplace method', () => {
    expect(service.convertVideoToH264AndReplace).toBeDefined();
    expect(typeof service.convertVideoToH264AndReplace).toBe('function');
  });
});
