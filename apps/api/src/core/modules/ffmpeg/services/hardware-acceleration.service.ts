import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';

/**
 * Hardware Acceleration Detection Service
 * Checks for available hardware acceleration on startup
 * 
 * Supports:
 * - VAAPI (Intel/AMD GPUs on Linux)
 * - NVENC (NVIDIA GPUs)
 * - QSV (Intel Quick Sync Video)
 */
@Injectable()
export class HardwareAccelerationService implements OnModuleInit {
  private readonly logger = new Logger(HardwareAccelerationService.name);
  private hardwareAccelAvailable = false;
  private hardwareAccelType: 'vaapi' | 'nvenc' | 'qsv' | null = null;
  private hardwareDevice: string | null = null;

  async onModuleInit() {
    this.logger.log('Checking hardware acceleration availability...');
    await this.detectHardwareAcceleration();
  }

  /**
   * Detect available hardware acceleration
   */
  private async detectHardwareAcceleration(): Promise<void> {
    // Try VAAPI first (most common on Linux)
    if (await this.checkVAAPI()) {
      this.hardwareAccelAvailable = true;
      this.hardwareAccelType = 'vaapi';
      this.hardwareDevice = '/dev/dri/renderD128';
      this.logger.log('✓ Hardware acceleration available: VAAPI');
      return;
    }

    // Try NVENC (NVIDIA)
    if (await this.checkNVENC()) {
      this.hardwareAccelAvailable = true;
      this.hardwareAccelType = 'nvenc';
      this.logger.log('✓ Hardware acceleration available: NVENC');
      return;
    }

    // Try QSV (Intel Quick Sync)
    if (await this.checkQSV()) {
      this.hardwareAccelAvailable = true;
      this.hardwareAccelType = 'qsv';
      this.logger.log('✓ Hardware acceleration available: QSV');
      return;
    }

    this.logger.warn('✗ No hardware acceleration available - will use software encoding');
  }

  /**
   * Check if VAAPI is available
   */
  private async checkVAAPI(): Promise<boolean> {
    try {
      // Check if VAAPI device exists
      const vaapiDevice = '/dev/dri/renderD128';
      await fs.access(vaapiDevice);
      
      // Test if FFmpeg can use VAAPI
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg()
          .inputOptions(['-vaapi_device', vaapiDevice, '-hwaccel', 'vaapi'])
          .input('color=c=black:s=64x64:d=0.1')
          .inputFormat('lavfi')
          .outputOptions([
            '-vf',
            'format=nv12,hwupload',
            '-c:v',
            'h264_vaapi',
          ])
          .output('/dev/null')
          .on('end', () => { resolve(); })
          .on('error', (err) => { reject(err); });

        // Set timeout to prevent hanging
        setTimeout(() => {
          command.kill('SIGKILL');
          reject(new Error('VAAPI test timeout'));
        }, 5000);

        command.run();
      });
      
      return true;
    } catch {
      this.logger.debug('VAAPI not available');
      return false;
    }
  }

  /**
   * Check if NVENC is available
   */
  private async checkNVENC(): Promise<boolean> {
    try {
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg()
          .input('color=c=black:s=64x64:d=0.1')
          .inputFormat('lavfi')
          .videoCodec('h264_nvenc')
          .output('/dev/null')
          .format('null')
          .on('end', () => { resolve(); })
          .on('error', (err) => { reject(err); });

        // Set timeout to prevent hanging
        setTimeout(() => {
          command.kill('SIGKILL');
          reject(new Error('NVENC test timeout'));
        }, 5000);

        command.run();
      });
      
      return true;
    } catch {
      this.logger.debug('NVENC not available');
      return false;
    }
  }

  /**
   * Check if QSV is available
   */
  private async checkQSV(): Promise<boolean> {
    try {
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg()
          .input('color=c=black:s=64x64:d=0.1')
          .inputFormat('lavfi')
          .videoCodec('h264_qsv')
          .output('/dev/null')
          .format('null')
          .on('end', () => { resolve(); })
          .on('error', (err) => { reject(err); });

        // Set timeout to prevent hanging
        setTimeout(() => {
          command.kill('SIGKILL');
          reject(new Error('QSV test timeout'));
        }, 5000);

        command.run();
      });
      
      return true;
    } catch {
      this.logger.debug('QSV not available');
      return false;
    }
  }

  /**
   * Check if hardware acceleration is available
   */
  isAvailable(): boolean {
    return this.hardwareAccelAvailable;
  }

  /**
   * Get hardware acceleration type
   */
  getType(): 'vaapi' | 'nvenc' | 'qsv' | null {
    return this.hardwareAccelType;
  }

  /**
   * Get hardware device path (for VAAPI)
   */
  getDevice(): string | null {
    return this.hardwareDevice;
  }

  /**
   * Get hardware acceleration configuration for FFmpeg
   */
  getConfig(): {
    available: boolean;
    type: 'vaapi' | 'nvenc' | 'qsv' | null;
    device: string | null;
    inputOptions: string[];
    videoCodec: string;
    outputOptions: string[];
  } {
    if (!this.hardwareAccelAvailable || !this.hardwareAccelType) {
      return {
        available: false,
        type: null,
        device: null,
        inputOptions: [],
        videoCodec: 'libx264',
        outputOptions: [
          '-preset', 'ultrafast',
          '-crf', '28',
          '-threads', '2',
          '-bufsize', '1M',
          '-maxrate', '2M',
        ],
      };
    }

    switch (this.hardwareAccelType) {
      case 'vaapi':
        return {
          available: true,
          type: 'vaapi',
          device: this.hardwareDevice,
          inputOptions: [
            '-vaapi_device', this.hardwareDevice ?? '/dev/dri/renderD128',
            '-hwaccel', 'vaapi',
            '-hwaccel_output_format', 'vaapi',
          ],
          videoCodec: 'h264_vaapi',
          outputOptions: ['-vf', 'format=nv12,hwupload', '-qp', '23'],
        };

      case 'nvenc':
        return {
          available: true,
          type: 'nvenc',
          device: null,
          inputOptions: ['-hwaccel', 'cuda'],
          videoCodec: 'h264_nvenc',
          outputOptions: ['-preset', 'fast', '-crf', '23'],
        };

      case 'qsv':
        return {
          available: true,
          type: 'qsv',
          device: null,
          inputOptions: ['-hwaccel', 'qsv', '-c:v', 'h264_qsv'],
          videoCodec: 'h264_qsv',
          outputOptions: ['-preset', 'fast', '-global_quality', '23'],
        };

      default:
        return {
          available: false,
          type: null,
          device: null,
          inputOptions: [],
          videoCodec: 'libx264',
          outputOptions: [
            '-preset', 'ultrafast',
            '-crf', '28',
            '-threads', '2',
            '-bufsize', '1M',
            '-maxrate', '2M',
          ],
        };
    }
  }
}
