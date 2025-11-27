# File Upload with Progress Tracking

This document explains how to use the `withFileUploads` wrapper for automatic file upload progress tracking with ORPC.

## Overview

The `withFileUploads` wrapper automatically enhances ORPC routes that accept `z.file()` schemas to support progress tracking through Web Workers. This provides:

- **Non-blocking uploads**: File uploads happen in a separate Web Worker thread
- **Progress tracking**: Real-time upload progress via `onProgress` callback
- **Type safety**: TypeScript support with `FileUploadContext` type
- **Automatic detection**: Routes with `z.file()` are automatically wrapped

## Architecture

### 1. Global ORPC Client

The global ORPC client is wrapped with `withFileUploads` in `/apps/web/lib/orpc/index.ts`:

```typescript
import { withFileUploads } from "./withFileUploads";

export const orpc = createTanstackQueryUtils(
  withFileUploads(createORPCClientWithCookies())
);
```

This means **all** ORPC routes with `z.file()` schemas automatically support progress tracking.

### 2. File Upload Detection

The wrapper uses `schemaAcceptsFiles()` to detect if a route accepts files by checking for `z.file()` in the contract schema:

```typescript
function schemaAcceptsFiles(schema: ZodType): boolean {
  // Detects z.file(), z.instanceof(File), etc.
  // Also handles z.object(), z.array(), z.union(), z.optional(), etc.
}
```

### 3. Web Worker Upload

When a file is detected, the upload is handled by a Web Worker that:
- Uses `XMLHttpRequest` for progress events
- Sends progress updates back to the main thread
- Handles FormData construction recursively
- Supports nested objects, arrays, and multiple files

### 4. Context Extension

Routes with files accept an extended context type:

```typescript
export type FileUploadContext = {
  onProgress?: (event: FileUploadProgressEvent) => void
}

export type FileUploadProgressEvent = {
  loaded: number      // Bytes uploaded
  total: number       // Total bytes
  percentage: number  // Upload percentage (0-100)
  progress: number    // Alias for percentage
}
```

## Usage

### Basic Upload Hook

```typescript
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import type { FileUploadContext, FileUploadProgressEvent } from "@/lib/orpc/withFileUploads";

export function useUploadFile() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (variables: { file: File }) => {
      setUploadProgress(0);

      // Create context with onProgress callback
      const context: FileUploadContext = {
        onProgress: (progressEvent: FileUploadProgressEvent) => {
          setUploadProgress(progressEvent.percentage);
        },
      };

      // Call ORPC with context (requires 'as any' due to type system limitations)
      return await orpc.yourEndpoint.upload.call(variables, context as any);
    },
    onSuccess: (data) => {
      // Handle success
      queryClient.invalidateQueries({ queryKey: ["yourData"] });
    },
  });

  return {
    ...mutation,
    uploadProgress,
  };
}
```

### Using the Hook in a Component

```tsx
import { useUploadFile } from "@/hooks/useUploadFile";
import { Progress } from "@/components/ui/progress";

export function FileUploadComponent() {
  const { mutate, isPending, uploadProgress } = useUploadFile();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      mutate({ file });
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={isPending}
      />
      
      {isPending && (
        <Progress value={uploadProgress} className="mt-2" />
      )}
    </div>
  );
}
```

## Type System Note

Due to TypeScript limitations with complex type proxying, you need to use `as any` when passing the context:

```typescript
const context: FileUploadContext = {
  onProgress: (progressEvent) => {
    setUploadProgress(progressEvent.percentage);
  },
};

// The 'as any' is necessary due to type system complexity
return await orpc.endpoint.call(variables, context as any);
```

This is safe because:
1. The `FileUploadContext` type is properly defined
2. The runtime implementation correctly extracts and uses `context.onProgress`
3. The wrapper validates the context structure at runtime

## Implementation Details

### Wrapper Function

The `wrapRouteWithFileUpload` function:

```typescript
function wrapRouteWithFileUpload(procedure, contract) {
  const wrappedFunction = async (input, context) => {
    // Extract onProgress from context
    const hasContext = context && typeof context === 'object';
    const onProgress = hasContext && 'onProgress' in context 
      ? context.onProgress 
      : undefined;

    // Check if input contains files
    if (!containsFile(input)) {
      return await procedure(input, context);
    }

    // Upload with worker and progress tracking
    return await uploadWithWorker(input, endpoint, { onProgress });
  };

  // Preserve all ORPC utilities (useQuery, useMutation, etc.)
  const wrapped = Object.assign(wrappedFunction, procedure);
  wrapped.call = wrappedFunction;
  
  return wrapped;
}
```

### File Detection

Runtime file detection checks for:
- `File` instances
- `Blob` instances
- Nested files in objects/arrays

```typescript
function containsFile(obj: unknown): boolean {
  if (obj instanceof File || obj instanceof Blob) return true;
  if (Array.isArray(obj)) return obj.some(containsFile);
  if (obj && typeof obj === 'object') {
    return Object.values(obj).some(containsFile);
  }
  return false;
}
```

## Examples

### Example 1: Presentation Upload (Current Implementation)

```typescript
export function useUploadPresentation() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (variables: { file: File }) => {
      setUploadProgress(0);

      const context: FileUploadContext = {
        onProgress: (progressEvent: FileUploadProgressEvent) => {
          setUploadProgress(progressEvent.percentage);
        },
      };

      return await orpc.presentation.upload.call(variables, context as any);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: orpc.presentation.getCurrent.queryKey({ input: {} }),
      });
      toast.success(`Presentation uploaded: ${data.filename}`);
    },
  });

  return { ...mutation, uploadProgress };
}
```

### Example 2: Multiple File Upload

```typescript
export function useUploadMultipleFiles() {
  const [uploadProgress, setUploadProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (variables: { files: File[] }) => {
      setUploadProgress(0);

      const context: FileUploadContext = {
        onProgress: (progressEvent: FileUploadProgressEvent) => {
          setUploadProgress(progressEvent.percentage);
        },
      };

      return await orpc.storage.uploadMultiple.call(variables, context as any);
    },
  });

  return { ...mutation, uploadProgress };
}
```

### Example 3: Upload with Metadata

```typescript
export function useUploadWithMetadata() {
  const [uploadProgress, setUploadProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (variables: { 
      file: File; 
      title: string; 
      description: string;
    }) => {
      setUploadProgress(0);

      const context: FileUploadContext = {
        onProgress: (progressEvent: FileUploadProgressEvent) => {
          setUploadProgress(progressEvent.percentage);
        },
      };

      return await orpc.storage.uploadWithMetadata.call(variables, context as any);
    },
  });

  return { ...mutation, uploadProgress };
}
```

## Benefits

1. **Automatic Enhancement**: No need to manually detect file uploads
2. **Non-blocking**: Uploads happen in Web Workers
3. **Progress Tracking**: Real-time progress without additional code
4. **Type Safety**: Full TypeScript support with proper types
5. **Standard Pattern**: Uses standard TanStack Query mutation pattern
6. **Reusable**: Works with any ORPC route that accepts files

## Limitations

1. **Type System**: Requires `as any` cast due to complex type proxying
2. **Browser Support**: Requires Web Worker support (all modern browsers)
3. **File Detection**: Only detects `File` and `Blob` instances at runtime

## Future Improvements

Potential improvements could include:
- Better TypeScript type inference without `as any`
- Support for chunked uploads
- Pause/resume functionality
- Multiple file progress tracking
- Upload speed calculation
