# WebSocket File Processing Integration

## Overview

The file processing system uses WebSockets to provide real-time progress updates for async operations like video processing. This allows clients to track the progress of long-running operations without polling.

## Architecture

```
Client                      Server
  |                           |
  |  1. Upload Video (ORPC)   |
  |-------------------------->|
  |                           | Start processing (async)
  |  2. Response with videoId |
  |<--------------------------|
  |                           |
  |  3. Connect WebSocket     |
  |-------------------------->|
  |                           |
  |  4. Subscribe to videoId  |
  |-------------------------->|
  |                           |
  |  5. Processing updates    |
  |<--------------------------| (progress, status, etc.)
  |                           |
```

## Server Implementation

### WebSocket Gateway

**Namespace**: \`/file-processing\`
**URL**: \`ws://localhost:3001/file-processing\` (or wss:// for production)

The gateway provides:
- Room-based subscriptions (one room per file ID)
- Progress updates
- Status notifications (started, completed, failed)
- Automatic cleanup on disconnect

### Events Emitted by Server

#### \`processing:started\`
Emitted when processing begins.
\`\`\`typescript
{
  fileId: string;
  metadata?: any;
  timestamp: string;
}
\`\`\`

#### \`processing:progress\`
Emitted periodically during processing.
\`\`\`typescript
{
  fileId: string;
  progress: number;        // 0-100
  status: 'processing' | 'completed' | 'failed';
  message?: string;        // Human-readable status
  metadata?: any;
  timestamp: string;
}
\`\`\`

#### \`processing:completed\`
Emitted when processing finishes successfully.
\`\`\`typescript
{
  fileId: string;
  result?: any;            // Processing results (duration, dimensions, etc.)
  timestamp: string;
}
\`\`\`

#### \`processing:failed\`
Emitted if processing fails.
\`\`\`typescript
{
  fileId: string;
  error: string;
  timestamp: string;
}
\`\`\`

## Client Usage

### React Example with Socket.IO Client

\`\`\`typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface ProcessingStatus {
  progress: number;
  status: 'processing' | 'completed' | 'failed';
  message?: string;
}

function VideoUploadComponent() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:3001/file-processing', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleVideoUpload = async (file: File) => {
    // 1. Upload video via ORPC
    const response = await uploadVideo({ file });
    const { videoId } = response;

    // 2. Subscribe to processing updates
    if (socket) {
      socket.emit('subscribe:file', { fileId: videoId });

      // Listen for processing events
      socket.on('processing:started', (data) => {
        console.log('Processing started:', data);
        setProcessingStatus({ progress: 0, status: 'processing' });
      });

      socket.on('processing:progress', (data) => {
        console.log('Progress update:', data);
        setProcessingStatus({
          progress: data.progress,
          status: data.status,
          message: data.message,
        });
      });

      socket.on('processing:completed', (data) => {
        console.log('Processing completed:', data);
        setProcessingStatus({ progress: 100, status: 'completed' });
      });

      socket.on('processing:failed', (data) => {
        console.error('Processing failed:', data);
        setProcessingStatus({ progress: 0, status: 'failed', message: data.error });
      });
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleVideoUpload(e.target.files[0])} />
      {processingStatus && (
        <div>
          <progress value={processingStatus.progress} max={100} />
          <p>{processingStatus.message || processingStatus.status}</p>
        </div>
      )}
    </div>
  );
}
\`\`\`

### Vanilla JavaScript Example

\`\`\`javascript
import { io } from 'socket.io-client';

// Connect to WebSocket
const socket = io('http://localhost:3001/file-processing');

socket.on('connect', () => {
  console.log('Connected to WebSocket');
  
  // Subscribe to file processing updates
  socket.emit('subscribe:file', { fileId: 'video-uuid-123' });
});

socket.on('subscribed', (data) => {
  console.log('Subscribed to file:', data.fileId);
});

socket.on('processing:progress', (data) => {
  console.log(\`Progress: \${data.progress}% - \${data.message}\`);
  // Update UI with progress
  document.getElementById('progress-bar').value = data.progress;
  document.getElementById('status-text').textContent = data.message;
});

socket.on('processing:completed', (data) => {
  console.log('Processing completed!', data.result);
  // Show completion message
});

socket.on('processing:failed', (data) => {
  console.error('Processing failed:', data.error);
  // Show error message
});

// Cleanup when done
socket.emit('unsubscribe:file', { fileId: 'video-uuid-123' });
\`\`\`

## Testing

### Using wscat (CLI tool)

\`\`\`bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:3001/file-processing

# Subscribe to file
> {"event":"subscribe:file","data":{"fileId":"video-uuid-123"}}

# You'll receive updates:
< {"event":"processing:progress","data":{"fileId":"video-uuid-123","progress":20,"status":"processing","message":"Extracting metadata..."}}
\`\`\`

## Configuration

### CORS Settings

Update \`file-processing.gateway.ts\` for production:

\`\`\`typescript
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/file-processing',
})
\`\`\`

### Environment Variables

Add to \`.env\`:

\`\`\`
WEBSOCKET_CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
\`\`\`

## Best Practices

1. **Subscribe early**: Subscribe to WebSocket immediately after upload
2. **Handle reconnection**: Implement reconnection logic for dropped connections
3. **Cleanup subscriptions**: Unsubscribe when component unmounts
4. **Error handling**: Always listen for \`processing:failed\` events
5. **Fallback polling**: Consider polling as fallback if WebSocket fails

## Troubleshooting

### WebSocket not connecting

- Check CORS configuration
- Verify WebSocket is enabled in reverse proxy (nginx, etc.)
- Ensure firewall allows WebSocket connections

### Not receiving updates

- Confirm subscription was successful (\`subscribed\` event)
- Check that fileId matches the uploaded video
- Verify server logs for errors

### Connection drops

- Implement reconnection logic
- Use \`socket.io\` reconnection options:
\`\`\`typescript
const socket = io(url, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
\`\`\`
