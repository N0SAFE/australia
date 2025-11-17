import { Test, TestingModule } from '@nestjs/testing';
import { FfmpegService } from './ffmpeg.service';
import { describe, it, expect, beforeEach } from 'vitest';

describe('FfmpegService', () => {
  let service: FfmpegService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FfmpegService],
    }).compile();

    service = module.get<FfmpegService>(FfmpegService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have convertToH264 method', () => {
    expect(service.convertToH264).toBeDefined();
    expect(typeof service.convertToH264).toBe('function');
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
