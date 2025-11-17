# WebSocket Setup Instructions

## Overview

This PR adds WebSocket support for real-time file processing updates. The implementation uses NestJS WebSockets with Socket.IO.

## Installation Required

### Dependencies to Install

The following dependencies need to be added to the project:

```bash
# From the root of the monorepo
bun add @nestjs/websockets@^11.0.10 @nestjs/platform-socket.io@^11.0.10 socket.io@^4.8.1 --filter=api
```

Or manually add to `apps/api/package.json`:

```json
{
  "dependencies": {
    "@nestjs/websockets": "catalog:api:nest",
    "@nestjs/platform-socket.io": "catalog:api:nest",
    "socket.io": "^4.8.1"
  }
}
```

Then run:
```bash
bun install
```

## Architecture

The WebSocket implementation follows the standard NestJS Gateway pattern alongside the existing ORPC endpoints.

### Components Added

1. **FileProcessingGateway** (`gateways/file-processing.gateway.ts`)
   - WebSocket gateway for real-time updates
   - Namespace: `/file-processing`
   - Room-based subscriptions (one room per file)

2. **VideoProcessingService** (`services/video-processing.service.ts`)
   - Handles async video processing
   - Emits progress updates via WebSocket
   - Updates database with processing status

3. **Updated StorageController**
   - Triggers async processing on video upload
   - Returns fileId and videoId for WebSocket subscription

### Why This Approach?

**ORPC + WebSockets**:
- ORPC doesn't have native WebSocket support
- NestJS WebSockets is the standard solution for real-time features
- This is a common pattern: REST/RPC for operations, WebSockets for real-time updates

**Alternative Considered**:
- Server-Sent Events (SSE): One-way only, less flexible
- Long polling: Higher latency, more server load
- ORPC streaming: Not available in current version

## Usage Flow

1. **Client uploads video via ORPC**
   ```typescript
   const response = await uploadVideo({ file });
   // Returns: { fileId, videoId, isProcessed: false, ... }
   ```

2. **Client connects to WebSocket**
   ```typescript
   const socket = io('http://localhost:3001/file-processing');
   ```

3. **Client subscribes to file**
   ```typescript
   socket.emit('subscribe:file', { fileId: response.videoId });
   ```

4. **Client receives progress updates**
   ```typescript
   socket.on('processing:progress', (data) => {
     console.log(`Progress: ${data.progress}%`);
   });
   ```

## WebSocket Events

### Client → Server

- `subscribe:file` - Subscribe to file processing updates
  ```typescript
  { fileId: string }
  ```

- `unsubscribe:file` - Unsubscribe from updates
  ```typescript
  { fileId: string }
  ```

### Server → Client

- `subscribed` - Subscription confirmation
- `processing:started` - Processing has begun
- `processing:progress` - Progress update (0-100%)
- `processing:completed` - Processing finished successfully
- `processing:failed` - Processing failed with error

## Testing

Once dependencies are installed, run:

```bash
cd apps/api
bun test src/modules/storage/gateways/
```

## Configuration

### CORS

Update the gateway CORS settings for production in `file-processing.gateway.ts`:

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/file-processing',
})
```

### Environment Variables

Add to `.env`:
```
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## Documentation

See `WEBSOCKET_USAGE.md` for detailed client-side usage examples including:
- React hooks example
- Vanilla JavaScript example
- Testing with wscat
- Best practices

## Future Enhancements

1. **Authentication**: Add JWT authentication to WebSocket connections
2. **Reconnection**: Implement automatic reconnection with exponential backoff
3. **Message Queue**: Use Redis for distributed WebSocket support
4. **Rate Limiting**: Add rate limiting for subscriptions
5. **Metrics**: Add monitoring for WebSocket connections and events

## Troubleshooting

### WebSocket not connecting

Check that:
1. Dependencies are installed correctly
2. CORS is configured properly
3. Firewall allows WebSocket connections
4. No reverse proxy blocking WebSocket upgrade

### Type errors during build

Ensure `@nestjs/websockets` and `socket.io` types are properly installed:
```bash
bun add -D @types/socket.io@^3.0.2
```

## Notes

- WebSocket runs on the same port as the HTTP server
- The `/file-processing` namespace keeps WebSocket traffic separate
- Room-based subscriptions ensure efficient message delivery
- The gateway is automatically registered when the StorageModule is imported
