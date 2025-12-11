import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

export interface MinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
}

export interface MinioUploadOptions {
  bucket: string;
  fileName: string;
  buffer: Buffer;
  metadata?: Record<string, string>;
  contentType?: string;
}

export interface MinioDownloadOptions {
  bucket: string;
  fileName: string;
}

export interface MinioDeleteOptions {
  bucket: string;
  fileName: string;
}

export interface MinioPresignedUrlOptions {
  bucket: string;
  fileName: string;
  expirySeconds?: number;
}

/**
 * MinIO Service - Provider for object storage operations
 * 
 * This service can be used with custom credentials per operation,
 * allowing both default configuration and dynamic access tokens.
 * 
 * Usage:
 * - Use default client (from env vars): await minioService.uploadFile(...)
 * - Use custom credentials: await minioService.uploadFileWithCredentials({ accessKey, secretKey }, ...)
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private defaultClient: Minio.Client | null = null;
  private readonly defaultConfig: Partial<MinioConfig>;

  constructor(private readonly configService: ConfigService) {
    // Load default configuration from environment
    this.defaultConfig = {
      endPoint: this.configService.get<string>('MINIO_ENDPOINT'),
      port: parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY'),
    };
  }

  async onModuleInit() {
    // Initialize default client if credentials are available
    if (this.defaultConfig.accessKey && this.defaultConfig.secretKey && this.defaultConfig.endPoint) {
      try {
        this.defaultClient = this.createClient(this.defaultConfig as MinioConfig);
        await this.ensureDefaultBucket();
        this.logger.log('MinIO default client initialized successfully');
      } catch (error) {
        this.logger.warn('MinIO default client initialization failed - will require custom credentials per request', error);
      }
    } else {
      this.logger.log('MinIO default configuration not provided - will require custom credentials per request');
    }
  }

  /**
   * Create a MinIO client with custom or default credentials
   */
  private createClient(config: MinioConfig): Minio.Client {
    return new Minio.Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
  }

  /**
   * Get client - either default or create with custom credentials
   */
  private getClient(credentials?: { accessKey: string; secretKey: string }): Minio.Client {
    if (credentials) {
      // Create client with custom credentials
      return this.createClient({
        ...this.defaultConfig,
        accessKey: credentials.accessKey,
        secretKey: credentials.secretKey,
      } as MinioConfig);
    }

    if (!this.defaultClient) {
      throw new Error('MinIO default client not initialized and no custom credentials provided');
    }

    return this.defaultClient;
  }

  /**
   * Ensure default bucket exists (only for default client)
   */
  private async ensureDefaultBucket(bucketName: string = 'assets') {
    if (!this.defaultClient) {
      return;
    }

    try {
      const exists = await this.defaultClient.bucketExists(bucketName);
      if (!exists) {
        await this.defaultClient.makeBucket(bucketName, 'us-east-1');
        this.logger.log(`Created default bucket: ${bucketName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create bucket ${bucketName}:`, error);
    }
  }

  /**
   * Upload file with default credentials
   */
  async uploadFile(options: MinioUploadOptions): Promise<string> {
    return this.uploadFileWithCredentials(undefined, options);
  }

  /**
   * Upload file with custom credentials
   */
  async uploadFileWithCredentials(
    credentials: { accessKey: string; secretKey: string } | undefined,
    options: MinioUploadOptions,
  ): Promise<string> {
    const client = this.getClient(credentials);
    const { bucket, fileName, buffer, metadata = {}, contentType } = options;

    const metaData: Record<string, string> = {
      ...metadata,
    };

    if (contentType) {
      metaData['Content-Type'] = contentType;
    }

    await client.putObject(bucket, fileName, buffer, buffer.length, metaData);
    this.logger.log(`Uploaded file to MinIO: ${bucket}/${fileName}`);
    return fileName;
  }

  /**
   * Download file with default credentials
   */
  async getObject(options: MinioDownloadOptions): Promise<Readable> {
    return this.getObjectWithCredentials(undefined, options);
  }

  /**
   * Download file with custom credentials
   */
  async getObjectWithCredentials(
    credentials: { accessKey: string; secretKey: string } | undefined,
    options: MinioDownloadOptions,
  ): Promise<Readable> {
    const client = this.getClient(credentials);
    const { bucket, fileName } = options;
    return await client.getObject(bucket, fileName);
  }

  /**
   * Get partial object with range support (for video streaming)
   */
  async getPartialObject(
    options: MinioDownloadOptions & { offset: number; length: number },
    credentials?: { accessKey: string; secretKey: string },
  ): Promise<Readable> {
    const client = this.getClient(credentials);
    const { bucket, fileName, offset, length } = options;
    return await client.getPartialObject(bucket, fileName, offset, length);
  }

  /**
   * Delete file with default credentials
   */
  async deleteObject(options: MinioDeleteOptions): Promise<void> {
    return this.deleteObjectWithCredentials(undefined, options);
  }

  /**
   * Delete file with custom credentials
   */
  async deleteObjectWithCredentials(
    credentials: { accessKey: string; secretKey: string } | undefined,
    options: MinioDeleteOptions,
  ): Promise<void> {
    const client = this.getClient(credentials);
    const { bucket, fileName } = options;
    await client.removeObject(bucket, fileName);
    this.logger.log(`Deleted file from MinIO: ${bucket}/${fileName}`);
  }

  /**
   * Get presigned URL with default credentials
   */
  async getPresignedUrl(options: MinioPresignedUrlOptions): Promise<string> {
    return this.getPresignedUrlWithCredentials(undefined, options);
  }

  /**
   * Get presigned URL with custom credentials
   */
  async getPresignedUrlWithCredentials(
    credentials: { accessKey: string; secretKey: string } | undefined,
    options: MinioPresignedUrlOptions,
  ): Promise<string> {
    const client = this.getClient(credentials);
    const { bucket, fileName, expirySeconds = 3600 } = options;
    return await client.presignedGetObject(bucket, fileName, expirySeconds);
  }

  /**
   * Get object stats (metadata) with default credentials
   */
  async statObject(options: MinioDownloadOptions): Promise<Minio.BucketItemStat> {
    return this.statObjectWithCredentials(undefined, options);
  }

  /**
   * Get object stats with custom credentials
   */
  async statObjectWithCredentials(
    credentials: { accessKey: string; secretKey: string } | undefined,
    options: MinioDownloadOptions,
  ): Promise<Minio.BucketItemStat> {
    const client = this.getClient(credentials);
    const { bucket, fileName } = options;
    return await client.statObject(bucket, fileName);
  }

  /**
   * Check if bucket exists
   */
  async bucketExists(
    bucketName: string,
    credentials?: { accessKey: string; secretKey: string },
  ): Promise<boolean> {
    const client = this.getClient(credentials);
    return await client.bucketExists(bucketName);
  }

  /**
   * Create bucket
   */
  async makeBucket(
    bucketName: string,
    region: string = 'us-east-1',
    credentials?: { accessKey: string; secretKey: string },
  ): Promise<void> {
    const client = this.getClient(credentials);
    await client.makeBucket(bucketName, region);
    this.logger.log(`Created bucket: ${bucketName}`);
  }
}
