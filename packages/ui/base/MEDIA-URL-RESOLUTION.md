# Media URL Resolution System

## Overview

This document describes the media URL resolution system implemented in the SimpleEditor component. This system allows flexible handling of media URLs across different environments (API server, web app, CDN, etc.).

## Features

### 1. Dynamic URL Base Injection

The `SimpleEditor` component accepts an `injectMediaUrl` prop that maps URL IDs to base URLs:

```tsx
<SimpleEditor 
  injectMediaUrl={{
    api: 'https://api.example.com',
    web_app: 'https://app.example.com',
    cdn: 'https://cdn.example.com'
  }}
/>
```

### 2. Media Node `srcUrlId` Attribute

All media nodes (image, video, audio, file) now support an optional `srcUrlId` attribute that references a key in the `injectMediaUrl` map:

```typescript
// Example: Image node with srcUrlId
{
  type: 'image',
  attrs: {
    src: '/uploads/photo.jpg',
    srcUrlId: 'api',  // References the 'api' base URL
    alt: 'Photo',
    // ... other attributes
  }
}
```

### 3. URL Resolution Logic

The `resolveMediaUrl` function handles 4 different cases:

#### Case 1: Complete URL without srcUrlId
```typescript
// Input
src: "https://cdn.example.com/image.jpg"
srcUrlId: null

// Output: Use URL as-is
"https://cdn.example.com/image.jpg"
```

#### Case 2: Complete URL with srcUrlId
```typescript
// Input
src: "https://old-cdn.com/uploads/image.jpg"
srcUrlId: "api"
injectMediaUrl: { api: "https://api.example.com" }

// Output: Extract pathname and prepend base URL
"https://api.example.com/uploads/image.jpg"
```

#### Case 3: Relative path with srcUrlId
```typescript
// Input
src: "/uploads/image.jpg"
srcUrlId: "api"
injectMediaUrl: { api: "https://api.example.com" }

// Output: Prepend base URL
"https://api.example.com/uploads/image.jpg"
```

#### Case 4: Relative path without srcUrlId
```typescript
// Input
src: "/uploads/image.jpg"
srcUrlId: null

// Output: Use path as-is (relative to current app)
"/uploads/image.jpg"
```

## Implementation Details

### Files Modified

1. **`simple-editor.tsx`**
   - Added `injectMediaUrl?: Record<string, string>` prop
   - Added `onCreate` callback to store the prop in `editor.storage`

2. **`media-url-resolver.ts`** (new file)
   - Utility function `resolveMediaUrl()` with URL resolution logic

3. **Media Node Extensions** (`*-node-extension.ts`)
   - Added `srcUrlId: { default: null }` attribute to:
     - `image-node-extension.ts`
     - `video-node-extension.ts`
     - `audio-node-extension.ts`
     - `file-node-extension.ts`

4. **Media Node Views** (`*-node.tsx`)
   - Extract `srcUrlId` from node attributes
   - Get `injectMediaUrl` from editor storage
   - Call `resolveMediaUrl()` to get final URL
   - Use resolved URL in media elements

### Type Safety

TypeScript type assertions are used to access the custom `injectMediaUrl` property on editor storage:

```typescript
const storage = editor.storage as { injectMediaUrl?: Record<string, string> }
const injectMediaUrl = storage.injectMediaUrl
```

## Usage Examples

### Basic Usage

```tsx
import { SimpleEditor } from '@repo/ui/base'

function MyComponent() {
  return (
    <SimpleEditor 
      injectMediaUrl={{
        api: process.env.NEXT_PUBLIC_API_URL,
        cdn: process.env.NEXT_PUBLIC_CDN_URL
      }}
    />
  )
}
```

### Inserting Media with srcUrlId

When inserting media programmatically or through upload:

```typescript
editor.chain()
  .focus()
  .setImage({ 
    src: '/uploads/photo.jpg',
    srcUrlId: 'api',  // Will resolve to https://api.example.com/uploads/photo.jpg
    alt: 'Uploaded photo'
  })
  .run()
```

### Environment-Specific Configuration

```typescript
// Development
const mediaUrls = {
  api: 'http://localhost:3001',
  web_app: 'http://localhost:3000'
}

// Production
const mediaUrls = {
  api: 'https://api.production.com',
  cdn: 'https://cdn.production.com'
}

<SimpleEditor injectMediaUrl={mediaUrls} />
```

## Benefits

1. **Flexibility**: Easily switch between different media hosting environments
2. **Migration**: Update media URLs without changing document content
3. **Multi-tenant**: Different base URLs for different tenants
4. **CDN Integration**: Route media through CDN with srcUrlId
5. **Backward Compatible**: Existing content without srcUrlId continues to work

## Testing Recommendations

Test all 4 URL resolution cases:

```typescript
import { resolveMediaUrl } from '@/lib/media-url-resolver'

// Test Case 1: Complete URL, no srcUrlId
expect(resolveMediaUrl('https://cdn.com/img.jpg', null, {}))
  .toBe('https://cdn.com/img.jpg')

// Test Case 2: Complete URL, with srcUrlId
expect(resolveMediaUrl('https://old.com/path/img.jpg', 'api', { api: 'https://new.com' }))
  .toBe('https://new.com/path/img.jpg')

// Test Case 3: Relative path, with srcUrlId
expect(resolveMediaUrl('/uploads/img.jpg', 'api', { api: 'https://api.com' }))
  .toBe('https://api.com/uploads/img.jpg')

// Test Case 4: Relative path, no srcUrlId
expect(resolveMediaUrl('/uploads/img.jpg', null, {}))
  .toBe('/uploads/img.jpg')
```

## Future Enhancements

Potential improvements:

1. **UI for srcUrlId**: Add dropdown in media upload dialog to select srcUrlId
2. **Bulk Update**: Tool to update srcUrlId for existing media nodes
3. **URL Validation**: Validate that srcUrlId exists in injectMediaUrl map
4. **Fallback URLs**: Default fallback if srcUrlId not found
5. **CDN Token Signing**: Support for signed CDN URLs
