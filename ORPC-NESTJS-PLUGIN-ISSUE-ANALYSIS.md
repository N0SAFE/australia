# ORPC NestJS Plugin/Interceptor Issue Analysis

## Problem Summary

**YOU ARE CONFUSING TWO DIFFERENT TYPES OF PLUGINS IN ORPC!**

When trying to use **Handler Plugins** (like `CORSPlugin`, `BatchHandlerPlugin`, etc. from `@orpc/server/plugins`) in `ORPCModule.forRootAsync()`, they don't work because:

1. **Handler Plugins** are for `RPCHandler` or `OpenAPIHandler` (the HTTP request handlers)
2. **NestJS Integration** uses **Client Interceptors** (for server-side procedure clients)
3. These are **completely different systems** that work at different layers

## ORPC Architecture: Two Plugin Systems

### 1. **Handler Plugins** (for RPCHandler/OpenAPIHandler)

These work with **HTTP request handlers** that process incoming HTTP requests:

```typescript
// This is for RPCHandler or OpenAPIHandler - NOT for NestJS!
import { RPCHandler } from '@orpc/server/fetch'
import { CORSPlugin, BatchHandlerPlugin } from '@orpc/server/plugins'

const handler = new RPCHandler(router, {
  plugins: [
    new CORSPlugin(),           // ← Handler Plugin
    new BatchHandlerPlugin()    // ← Handler Plugin
  ],
  rootInterceptors: [...],      // ← Handler-level interceptors
  clientInterceptors: [...],    // ← Client-level interceptors
})
```

**Handler Plugin Interface**:
```typescript
interface StandardHandlerPlugin<T extends Context> {
  order?: number;
  init?(options: StandardHandlerOptions<T>, router: Router<any, T>): void;
}

interface StandardHandlerOptions<TContext extends Context> {
  plugins?: StandardHandlerPlugin<TContext>[];
  rootInterceptors?: Interceptor<...>[];      // HTTP request level
  clientInterceptors?: Interceptor<...>[];    // Procedure client level
  interceptors?: Interceptor<...>[];          // Error catching level
}
```

### 2. **Client Interceptors** (for NestJS Integration)

The `@orpc/nest` integration uses **server-side procedure clients**, not HTTP handlers:

```typescript
// This is what @orpc/nest uses
interface ORPCModuleConfig extends CreateProcedureClientOptions<...> {
  interceptors?: Interceptor<ProcedureClientInterceptorOptions, ...>[];
  // ↑ These are CLIENT interceptors, NOT handler plugins!
}
```

### 3. **Why Handler Plugins Don't Work in NestJS**

**Architectural Mismatch**:

1. **Handler Plugins expect `StandardHandlerOptions`**:
   - They call `init(options, router)` where options has `plugins[]`, `rootInterceptors[]`, `clientInterceptors[]`
   - Used by `RPCHandler` and `OpenAPIHandler` to process HTTP requests
   - Examples: CORSPlugin adds CORS headers, BatchHandlerPlugin handles batched requests

2. **NestJS uses `CreateProcedureClientOptions`**:
   - The `ImplementInterceptor` calls `createProcedureClient(procedure, this.config)`
   - `this.config` is `ORPCModuleConfig` which extends `CreateProcedureClientOptions`
   - This type ONLY has `interceptors[]` - no `plugins[]`, no `rootInterceptors[]`, no `clientInterceptors[]`

3. **Incompatible Interfaces**:
   ```typescript
   // What Handler Plugins need:
   interface StandardHandlerOptions {
     plugins?: StandardHandlerPlugin[];
     rootInterceptors?: Interceptor[];
     clientInterceptors?: Interceptor[];
     interceptors?: Interceptor[];
   }
   
   // What NestJS provides:
   interface CreateProcedureClientOptions {
     interceptors?: Interceptor[];  // ← Only this!
     context?: Context;
   }
   ```

4. **Different Execution Contexts**:
   - **Handler Plugins** run in HTTP request context (with req, res, headers)
   - **Client Interceptors** run in procedure execution context (with input, context, meta)
   - NestJS integration never creates an HTTP handler, it creates procedure clients

**Why This Matters**:
- `CORSPlugin` tries to set HTTP response headers → No HTTP response in procedure client
- `BatchHandlerPlugin` tries to handle multiple requests → Procedure client handles single execution
- `RequestHeadersPlugin` tries to read HTTP headers → No HTTP request in procedure client

## Solutions for NestJS

Since Handler Plugins cannot be used (they require `StandardHandlerOptions` with `plugins[]` array, while NestJS only provides `CreateProcedureClientOptions` with `interceptors[]`), here are your options:

### Solution 1: Use Client Interceptors (For Procedure-Level Logic)

Client interceptors run during procedure execution and have access to input, context, and meta:

```typescript
// In app.module.ts
ORPCModule.forRootAsync({
  useFactory: (request: Request) => ({
    interceptors: [
      // Error handling
      onError((error, ctx) => {
        console.error("oRPC Error:", error);
        // Transform error, log to monitoring, etc.
      }),
      
      // Logging interceptor (replaces RequestHeadersPlugin functionality)
      async (input, ctx, next) => {
        console.log('Request:', {
          input,
          user: ctx.user,
          timestamp: new Date().toISOString()
        });
        
        const result = await next();
        
        console.log('Response:', result);
        return result;
      },
      
      // Authentication interceptor
      async (input, ctx, next) => {
        if (!ctx.user) {
          throw new Error('Unauthorized');
        }
        return next();
      },
      
      // Rate limiting
      async (input, ctx, next) => {
        const key = ctx.user?.id || ctx.ip;
        await checkRateLimit(key);
        return next();
      }
    ],
    context: { request },
  }),
  inject: [REQUEST],
})
```

**What You Can Do with Client Interceptors**:
- ✅ Error handling and transformation
- ✅ Logging and monitoring  
- ✅ Authentication and authorization
- ✅ Rate limiting
- ✅ Input validation
- ✅ Response transformation
- ✅ Timing and performance tracking

**What You Cannot Do** (because no HTTP context):
- ❌ Set HTTP response headers (CORS, Content-Type)
- ❌ Handle batched HTTP requests
- ❌ Access raw HTTP request/response objects
- ❌ Modify HTTP status codes directly

### Solution 2: Use NestJS Middleware/Guards for HTTP-Level Concerns

For functionality that requires HTTP context (like CORS, batch requests), use NestJS middleware or guards:

#### A. Using NestJS Middleware

```typescript
// In app.module.ts or main.ts
@Module({
  imports: [ORPCModule.forRootAsync({...})],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        // CORS middleware (replaces CORSPlugin)
        (req, res, next) => {
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
          res.header('Access-Control-Allow-Headers', 'Content-Type');
          if (req.method === 'OPTIONS') {
            res.sendStatus(200);
          } else {
            next();
          }
        },
        
        // Request logging middleware
        (req, res, next) => {
          console.log(`${req.method} ${req.path}`);
          next();
        }
      )
      .forRoutes('*');
  }
}
```

#### B. Using NestJS app.use() in main.ts

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global CORS (replaces CORSPlugin)
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });
  
  // Global compression
  app.use(compression());
  
  // Global rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }));
  
  await app.listen(3000);
}
```

### Solution 3: Procedure-Level Middlewares in Controllers

For shared logic across procedures, use ORPC middlewares in controllers:

```typescript
// Create base implementation helper
// src/core/orpc/base-implementation.ts
import { implement } from '@orpc/server';
import type { AnyContractProcedure } from '@orpc/contract';

export function baseImplement<T extends AnyContractProcedure>(contract: T) {
  return implement(contract)
    .use(loggingMiddleware)      // Logs all requests
    .use(errorHandlingMiddleware) // Transforms errors
    .use(authMiddleware);         // Checks authentication
}

// In controller
@Implement(userContract.create)
async createUser() {
  return baseImplement(userContract.create)
    .handler(async ({ input, context }) => {
      // Handler logic
    });
}
```

**Pros**:
- ✅ Centralized middleware configuration
- ✅ Reusable across all controllers
- ✅ Type-safe with full ORPC middleware capabilities
- ✅ Easy to understand and maintain

**Cons**:
- ⚠️ Requires manual use in each controller method
- ⚠️ Not as "automatic" as module-level config

### Solution 4: Custom Batch Request Handler (If Needed)

If you need batch request handling (like `BatchHandlerPlugin`), implement it as a custom interceptor:

```typescript
function createBatchInterceptor(options: { maxBatchSize?: number; windowMs?: number } = {}) {
  const { maxBatchSize = 10, windowMs = 10 } = options;
  const pending: Array<{
    input: any;
    resolve: (result: any) => void;
    reject: (error: any) => void;
  }> = [];
  
  let batchTimeout: NodeJS.Timeout | null = null;
  
  return async (input, ctx, next) => {
    // If batching is disabled for this request, execute immediately
    if (!ctx.enableBatch) {
      return next();
    }
    
    // Add to batch
    return new Promise((resolve, reject) => {
      pending.push({ input, resolve, reject });
      
      // If batch is full, execute immediately
      if (pending.length >= maxBatchSize) {
        executeBatch();
        return;
      }
      
      // Otherwise, wait for batch window
      if (!batchTimeout) {
        batchTimeout = setTimeout(executeBatch, windowMs);
      }
    });
    
    async function executeBatch() {
      const batch = [...pending];
      pending.length = 0;
      if (batchTimeout) {
        clearTimeout(batchTimeout);
        batchTimeout = null;
      }
      
      // Execute all in parallel
      const results = await Promise.allSettled(
        batch.map(() => next())
      );
      
      // Resolve/reject each promise
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          batch[i].resolve(result.value);
        } else {
          batch[i].reject(result.reason);
        }
      });
    }
  };
}

// Use in ORPCModule
ORPCModule.forRootAsync({
  useFactory: () => ({
    interceptors: [
      createBatchInterceptor({ maxBatchSize: 10, windowMs: 10 }),
      // ... other interceptors
    ],
  }),
})
```

### Solution 5: Hybrid Approach (If You REALLY Need Handler Plugins)

If you absolutely need handler plugin functionality, create an RPCHandler alongside your NestJS app:

```typescript
// In main.ts
import { RPCHandler } from '@orpc/server/fetch';
import { CORSPlugin, BatchHandlerPlugin } from '@orpc/server/plugins';

async function bootstrap() {
  // NestJS app for main application logic
  const app = await NestFactory.create(AppModule);
  
  // Create RPCHandler for routes that need handler plugins
  const rpcHandler = new RPCHandler(router, {
    plugins: [
      new CORSPlugin(),
      new BatchHandlerPlugin(),
    ],
    clientInterceptors: [
      // Share interceptors with NestJS
      onError((error) => console.error(error)),
    ],
  });
  
  // Mount RPCHandler on specific path
  app.use('/api/rpc', async (req, res) => {
    const response = await rpcHandler.fetch(
      new Request(`http://localhost:3000${req.url}`, {
        method: req.method,
        headers: req.headers as any,
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      })
    );
    
    // Copy response to NestJS response
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const body = await response.text();
    res.send(body);
  });
  
  await app.listen(3000);
}
```

**Pros**:
- ✅ Allows using Handler Plugins for specific routes
- ✅ Maintains NestJS for main application logic

**Cons**:
- ❌ Adds complexity with two routing systems
- ❌ Duplicates some configuration
- ❌ More difficult to maintain

## Recommended Approach

**For most cases, use a combination of:**

1. **Solution 1** (Client Interceptors) - for procedure-level logic (auth, logging, validation)
2. **Solution 2** (NestJS Middleware/Guards) - for HTTP-level logic (CORS, compression, rate limiting)
3. **Solution 3** (Base Implementation Helper) - for shared ORPC middleware logic

This gives you all the functionality of Handler Plugins while staying within the NestJS architecture and respecting ORPC's design.

### Practical Implementation

```typescript
// 1. Base implementation helper
// src/core/orpc/base-implementation.ts
export function baseImplement<T extends AnyContractProcedure>(contract: T) {
  return implement(contract)
    .use(loggingMiddleware)
    .use(authMiddleware);
}

// 2. Module-level interceptors
// app.module.ts
ORPCModule.forRootAsync({
  useFactory: (request: Request) => ({
    interceptors: [
      onError((error) => console.error(error)),
    ],
    context: { request },
  }),
  inject: [REQUEST],
})

// 3. HTTP-level middleware
// main.ts
app.enableCors();
app.use(compression());

// 4. Use in controllers
@Implement(userContract.create)
async createUser() {
  return baseImplement(userContract.create)
    .handler(async ({ input }) => {
      // Handler logic
    });
}
```

## Conclusion

**The core issue**: ORPC has two separate plugin systems:

1. **Handler Plugins** (`StandardHandlerPlugin`) - Used with `RPCHandler`/`OpenAPIHandler`, have access to `StandardHandlerOptions` with `plugins[]`, `rootInterceptors[]`, `clientInterceptors[]`

2. **Client Interceptors** - Used with procedure clients, only have `interceptors[]` in `CreateProcedureClientOptions`

**Why NestJS can't use Handler Plugins**: The `@orpc/nest` integration uses the **client architecture** (`createProcedureClient`), not the **handler architecture** (`RPCHandler`). These are fundamentally incompatible at the type level.

**The solution**: Use Client Interceptors + NestJS Middleware + ORPC procedure middlewares to achieve the same functionality. This respects both ORPC's architecture and NestJS's design patterns.
