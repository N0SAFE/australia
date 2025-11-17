# Event Bridge Service

Type-safe, application-wide event system with async iterator support for ORPC streaming.

## Features

- ✅ **Type-safe event factories** - Events are strongly typed with Zod schemas
- ✅ **Async iterator subscriptions** - Perfect for ORPC `eventIterator` streaming
- ✅ **Callback-based listeners** - Traditional event listener pattern
- ✅ **Automatic cleanup** - Subscribers are automatically cleaned up
- ✅ **Multiple subscribers** - Many subscribers can listen to the same event
- ✅ **Validation** - Payloads are validated against schemas before emission

## Architecture

```
EventBridgeService (Global)
    ↓
Event Factories (Type-safe event creators)
    ↓
Subscribers (Async iterators or callbacks)
    ↓
Emitters (Services that emit events)
```

## Usage

### 1. Define Event Factory

```typescript
// event-factories.ts
export const createVideoProcessingEvent = (
  eventBridgeService: EventBridgeService
) => {
  return eventBridgeService.createEventFactory(
    'video:processing',
    (videoId: string) => ({
      eventName: videoId,
      schema: z.object({
        progress: z.number().min(0).max(100),
        status: z.enum(['processing', 'completed', 'failed']),
        message: z.string().optional(),
        timestamp: z.string(),
      }),
    })
  );
};
```

### 2. Subscribe to Events (ORPC Controller)

```typescript
@Controller()
export class StorageController {
  private readonly videoProcessingEvent: ReturnType<typeof createVideoProcessingEvent>;

  constructor(private readonly eventBridgeService: EventBridgeService) {
    this.videoProcessingEvent = createVideoProcessingEvent(eventBridgeService);
  }

  @Implement(storageContract.subscribeVideoProcessing)
  subscribeVideoProcessing() {
    return implement(storageContract.subscribeVideoProcessing).handler(
      async function* ({ input }) {
        const { videoId } = input;
        const event = this.videoProcessingEvent(videoId);
        
        // Subscribe and yield events to client
        for await (const eventData of this.eventBridgeService.subscribe(event)) {
          yield eventData;
          
          if (eventData.status === 'completed' || eventData.status === 'failed') {
            break;
          }
        }
      }.bind(this)
    );
  }
}
```

### 3. Emit Events (Service)

```typescript
@Injectable()
export class VideoProcessingService {
  private readonly videoProcessingEvent: ReturnType<typeof createVideoProcessingEvent>;

  constructor(private readonly eventBridgeService: EventBridgeService) {
    this.videoProcessingEvent = createVideoProcessingEvent(eventBridgeService);
  }

  async processVideo(videoId: string) {
    const event = this.videoProcessingEvent(videoId);
    
    // Emit progress updates
    this.eventBridgeService.emit(event, {
      progress: 0,
      status: 'processing',
      message: 'Starting...',
      timestamp: new Date().toISOString(),
    });

    // ... do processing ...

    this.eventBridgeService.emit(event, {
      progress: 100,
      status: 'completed',
      message: 'Done!',
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 4. Client-Side Consumption

```typescript
// Client subscribes via ORPC
for await (const event of client.storage.subscribeVideoProcessing({ videoId: 'uuid-123' })) {
  console.log(`${event.progress}% - ${event.message}`);
  
  if (event.status === 'completed') {
    console.log('Processing complete!');
    break;
  }
}
```

## ORPC Contract Definition

```typescript
// subscribeVideoProcessing.ts
export const subscribeVideoProcessingContract = oc
  .route({
    method: 'GET',
    path: '/subscribe/video/:videoId',
  })
  .input(
    z.object({
      videoId: z.string().uuid(),
    })
  )
  .output(
    eventIterator(
      z.object({
        progress: z.number().min(0).max(100),
        status: z.enum(['processing', 'completed', 'failed']),
        message: z.string().optional(),
        timestamp: z.string(),
      })
    )
  );
```

## API Reference

### EventBridgeService

#### createEventFactory<TArgs, TPayload>(baseEventName, factory)

Creates a type-safe event factory function.

**Parameters:**
- `baseEventName` - Base namespace for the event
- `factory` - Function that takes arguments and returns `{ eventName, schema }`

**Returns:** Event factory function

#### subscribe<TPayload>(event)

Subscribe to an event with async iterator.

**Parameters:**
- `event` - Event from event factory

**Returns:** `AsyncIterable<TPayload>`

#### emit<TPayload>(event, payload)

Emit an event to all subscribers.

**Parameters:**
- `event` - Event from event factory
- `payload` - Event payload (validated against schema)

#### hasActiveSubscribers<TPayload>(event)

Check if an event has active subscriptions.

**Returns:** `boolean`

#### getSubscriberCount<TPayload>(event)

Get count of active subscribers.

**Returns:** `number`

#### on<TPayload>(event, listener)

Add a callback-based listener.

**Returns:** Unsubscribe function

#### removeAllSubscribers<TPayload>(event)

Remove all subscribers for an event.

#### getActiveEvents()

Get all active event names.

**Returns:** `string[]`

#### clearAll()

Clear all events and subscriptions.

## Event Factory Pattern

Event factories provide:

1. **Type Safety** - TypeScript inference for event payloads
2. **Namespacing** - Automatic event name generation with namespaces
3. **Schema Validation** - Zod schema validation for payloads
4. **Reusability** - Same factory used across services and controllers

### Example: Multiple Event Factories

```typescript
// Video processing events
const videoEvent = createVideoProcessingEvent(bridge);
const event1 = videoEvent('video-123'); // Creates 'video:processing:video-123'

// Image processing events
const imageEvent = createImageProcessingEvent(bridge);
const event2 = imageEvent('image-456'); // Creates 'image:processing:image-456'

// File upload events
const uploadEvent = createFileUploadEvent(bridge);
const event3 = uploadEvent('user-789'); // Creates 'file:upload:user-789'
```

## Best Practices

1. **Define event factories in `event-factories.ts`** - Centralize event definitions
2. **Initialize factories in constructor** - Create factory instances once
3. **Use async iterators for ORPC** - Perfect for streaming events to clients
4. **Use callbacks for internal listeners** - Simpler for service-to-service communication
5. **Always break iterator on completion** - Prevent infinite loops
6. **Validate with Zod schemas** - Ensure type safety at runtime
7. **Include timestamps** - Track when events occurred
8. **Cleanup on errors** - Async iterators auto-cleanup on break/throw

## Testing

```typescript
describe('EventBridgeService', () => {
  it('should emit events to subscribers', async () => {
    const factory = service.createEventFactory('test', (id: string) => ({
      eventName: id,
      schema: z.object({ value: z.number() }),
    }));

    const event = factory('event-1');
    const received: number[] = [];

    const subscriptionPromise = (async () => {
      for await (const data of service.subscribe(event)) {
        received.push(data.value);
        if (data.value === 3) break;
      }
    })();

    await new Promise(resolve => setTimeout(resolve, 10));

    service.emit(event, { value: 1 });
    service.emit(event, { value: 2 });
    service.emit(event, { value: 3 });

    await subscriptionPromise;

    expect(received).toEqual([1, 2, 3]);
  });
});
```

## Comparison: Event Bridge vs WebSocket

| Feature | Event Bridge | WebSocket |
|---------|--------------|-----------|
| **Protocol** | HTTP (SSE via ORPC) | WebSocket |
| **Type Safety** | ✅ Full TypeScript + Zod | Manual |
| **ORPC Integration** | ✅ Native | ❌ Separate |
| **Reconnection** | Automatic (HTTP) | Manual |
| **Firewall** | ✅ HTTP-friendly | May be blocked |
| **Complexity** | Low | Medium |
| **Real-time** | ✅ Yes (SSE) | ✅ Yes |

**Recommendation**: Use Event Bridge for ORPC streaming, WebSocket for bi-directional chat/multiplayer features.

## Troubleshooting

### Events not received

- Check that subscriber is active before emitting
- Verify event name matches exactly
- Ensure schema validation passes

### Memory leaks

- Always break async iterator loops
- Use `hasActiveSubscribers()` to check before emitting
- Call `clearAll()` in tests between cases

### Type errors

- Ensure event factory is initialized in constructor
- Check that payload matches schema exactly
- Verify Zod schema is correct
