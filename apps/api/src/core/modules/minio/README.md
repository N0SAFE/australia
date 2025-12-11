# MinIO Module

The MinIO module provides a flexible object storage provider that can be used alongside local file storage. It supports both default configuration from environment variables and custom credentials per operation.

## Features

- **Dual Authentication**: Use default credentials from env vars or provide custom credentials per operation
- **Global Provider**: Available throughout the application via dependency injection
- **S3 Compatible**: Works with MinIO, AWS S3, and other S3-compatible storage services
- **Range Requests**: Full support for video streaming with partial object retrieval
- **Presigned URLs**: Generate temporary URLs for direct client access

## Configuration

Add MinIO configuration to your `.env` file (all optional):

```env
# MinIO Configuration (Optional - can also provide credentials per operation)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

If these are not set, you can still use the service by providing credentials with each operation.

## Usage

### Basic Usage with Default Credentials

```typescript
import { Injectable } from '@nestjs/common';
import { MinioService } from '@/core/modules/minio';

@Injectable()
export class StorageService {
  constructor(private readonly minioService: MinioService) {}

  async uploadToMinio(file: Buffer, filename: string): Promise<string> {
    // Uses default credentials from environment variables
    return await this.minioService.uploadFile({
      bucket: 'my-bucket',
      fileName: filename,
      buffer: file,
      contentType: 'image/jpeg',
      metadata: {
        'x-amz-meta-user-id': 'user123',
        'x-amz-meta-original-name': 'photo.jpg',
      },
    });
  }

  async downloadFromMinio(filename: string): Promise<NodeJS.ReadableStream> {
    // Uses default credentials from environment variables
    return await this.minioService.getObject({
      bucket: 'my-bucket',
      fileName: filename,
    });
  }
}
```

### Usage with Custom Credentials per Operation

This is the key feature requested - you can provide access and secret keys dynamically:

```typescript
import { Injectable } from '@nestjs/common';
import { MinioService } from '@/core/modules/minio';

@Injectable()
export class StorageService {
  constructor(private readonly minioService: MinioService) {}

  async uploadWithCustomCredentials(
    file: Buffer,
    filename: string,
    userAccessKey: string,
    userSecretKey: string,
  ): Promise<string> {
    // Provide custom credentials for this specific operation
    return await this.minioService.uploadFileWithCredentials(
      {
        accessKey: userAccessKey,
        secretKey: userSecretKey,
      },
      {
        bucket: 'user-uploads',
        fileName: filename,
        buffer: file,
        contentType: 'application/pdf',
      },
    );
  }

  async downloadWithCustomCredentials(
    filename: string,
    userAccessKey: string,
    userSecretKey: string,
  ): Promise<NodeJS.ReadableStream> {
    // Provide custom credentials for this specific operation
    return await this.minioService.getObjectWithCredentials(
      {
        accessKey: userAccessKey,
        secretKey: userSecretKey,
      },
      {
        bucket: 'user-uploads',
        fileName: filename,
      },
    );
  }
}
```

### Mixed Usage - Default and Custom Credentials

You can use both approaches in the same service:

```typescript
@Injectable()
export class StorageService {
  constructor(private readonly minioService: MinioService) {}

  async uploadPublicFile(file: Buffer, filename: string): Promise<string> {
    // Use default credentials for public uploads
    return await this.minioService.uploadFile({
      bucket: 'public-assets',
      fileName: filename,
      buffer: file,
    });
  }

  async uploadUserFile(
    file: Buffer,
    filename: string,
    userAccessKey: string,
    userSecretKey: string,
  ): Promise<string> {
    // Use custom user credentials for private uploads
    return await this.minioService.uploadFileWithCredentials(
      { accessKey: userAccessKey, secretKey: userSecretKey },
      {
        bucket: 'user-private',
        fileName: filename,
        buffer: file,
      },
    );
  }
}
```

## Available Methods

All methods have two variants:
1. **Default credentials**: `methodName(options)` - uses env var credentials
2. **Custom credentials**: `methodNameWithCredentials(credentials, options)` - uses provided credentials

### Upload Operations

```typescript
// Default credentials
await minioService.uploadFile({
  bucket: 'my-bucket',
  fileName: 'file.pdf',
  buffer: fileBuffer,
  contentType: 'application/pdf',
  metadata: { 'x-custom-meta': 'value' },
});

// Custom credentials
await minioService.uploadFileWithCredentials(
  { accessKey: 'key', secretKey: 'secret' },
  { bucket: 'my-bucket', fileName: 'file.pdf', buffer: fileBuffer }
);
```

### Download Operations

```typescript
// Default credentials - full file
const stream = await minioService.getObject({
  bucket: 'my-bucket',
  fileName: 'file.pdf',
});

// Custom credentials - full file
const stream = await minioService.getObjectWithCredentials(
  { accessKey: 'key', secretKey: 'secret' },
  { bucket: 'my-bucket', fileName: 'file.pdf' }
);

// Partial download (range requests for video streaming)
const partialStream = await minioService.getPartialObject(
  {
    bucket: 'videos',
    fileName: 'movie.mp4',
    offset: 0,
    length: 1024 * 1024, // 1MB chunk
  },
  { accessKey: 'key', secretKey: 'secret' } // optional
);
```

### Delete Operations

```typescript
// Default credentials
await minioService.deleteObject({
  bucket: 'my-bucket',
  fileName: 'file.pdf',
});

// Custom credentials
await minioService.deleteObjectWithCredentials(
  { accessKey: 'key', secretKey: 'secret' },
  { bucket: 'my-bucket', fileName: 'file.pdf' }
);
```

### Presigned URLs

Generate temporary URLs for direct client access:

```typescript
// Default credentials - expires in 1 hour (default)
const url = await minioService.getPresignedUrl({
  bucket: 'my-bucket',
  fileName: 'file.pdf',
});

// Custom credentials - custom expiry
const url = await minioService.getPresignedUrlWithCredentials(
  { accessKey: 'key', secretKey: 'secret' },
  {
    bucket: 'my-bucket',
    fileName: 'file.pdf',
    expirySeconds: 7200, // 2 hours
  }
);
```

### Bucket Operations

```typescript
// Check if bucket exists
const exists = await minioService.bucketExists(
  'my-bucket',
  { accessKey: 'key', secretKey: 'secret' } // optional
);

// Create bucket
await minioService.makeBucket(
  'new-bucket',
  'us-east-1',
  { accessKey: 'key', secretKey: 'secret' } // optional
);
```

### Object Stats

Get metadata about an object:

```typescript
// Default credentials
const stats = await minioService.statObject({
  bucket: 'my-bucket',
  fileName: 'file.pdf',
});
console.log(stats.size, stats.etag, stats.lastModified);

// Custom credentials
const stats = await minioService.statObjectWithCredentials(
  { accessKey: 'key', secretKey: 'secret' },
  { bucket: 'my-bucket', fileName: 'file.pdf' }
);
```

## Integration with Existing Storage Module

The MinIO service is designed to work alongside the existing local file storage:

```typescript
@Injectable()
export class StorageService {
  constructor(
    private readonly fileService: FileService,
    private readonly minioService: MinioService,
  ) {}

  async uploadFile(
    file: File,
    useMinIO: boolean,
    minioCredentials?: { accessKey: string; secretKey: string },
  ) {
    if (useMinIO) {
      // Use MinIO with optional custom credentials
      const buffer = Buffer.from(await file.arrayBuffer());
      return await this.minioService.uploadFileWithCredentials(
        minioCredentials,
        {
          bucket: 'uploads',
          fileName: file.name,
          buffer,
          contentType: file.type,
        }
      );
    } else {
      // Use local file storage
      return await this.fileService.uploadImage(file, ['storage']);
    }
  }
}
```

## Video Streaming with Range Requests

For video streaming, use partial object retrieval:

```typescript
@Injectable()
export class VideoStreamService {
  constructor(private readonly minioService: MinioService) {}

  async streamVideo(
    filename: string,
    start: number,
    end: number,
    credentials?: { accessKey: string; secretKey: string },
  ): Promise<NodeJS.ReadableStream> {
    const chunkSize = end - start + 1;
    
    return await this.minioService.getPartialObject(
      {
        bucket: 'videos',
        fileName: filename,
        offset: start,
        length: chunkSize,
      },
      credentials
    );
  }
}
```

## Error Handling

```typescript
try {
  await minioService.uploadFileWithCredentials(
    { accessKey: 'invalid', secretKey: 'invalid' },
    { bucket: 'my-bucket', fileName: 'file.pdf', buffer: fileBuffer }
  );
} catch (error) {
  if (error.message.includes('Invalid credentials')) {
    // Handle authentication error
  }
  // Handle other errors
}
```

## Performance Tips

1. **Use presigned URLs** for client-side uploads/downloads when possible
2. **Reuse default client** by setting env vars for frequently accessed buckets
3. **Use custom credentials** only when needed (per-user storage, multi-tenant scenarios)
4. **Implement caching** for presigned URLs to reduce MinIO API calls
5. **Use partial downloads** for video streaming to save bandwidth

## Security Considerations

1. **Never expose secret keys** to the client
2. **Use presigned URLs** with short expiry times for public access
3. **Implement proper authorization** before generating presigned URLs
4. **Validate file types and sizes** before uploading
5. **Use different buckets** for different security levels (public vs private)
