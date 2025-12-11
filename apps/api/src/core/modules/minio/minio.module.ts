import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MinioService } from './minio.service';

/**
 * MinIO Module - Global module for object storage
 * 
 * This module provides MinioService as a global provider,
 * allowing it to be injected anywhere in the application.
 * 
 * The service supports:
 * - Default configuration from environment variables
 * - Custom credentials per operation (accessKey, secretKey)
 * - Both local and remote MinIO/S3 compatible storage
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}
