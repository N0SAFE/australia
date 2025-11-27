# Video Streaming HTTP/2 Range Request Fix

## Problem Description

The video streaming endpoint was returning `ERR_HTTP2_PROTOCOL_ERROR` in production when using HTTP range requests, even though the response was correctly returning a 206 Partial Content status. The issue manifested specifically with:

- HTTP/2 protocol errors in browser
- Missing `content-type` header in some responses
- Potential header casing issues with HTTP/2

## Root Causes

1. **HTTP/2 Header Casing**: HTTP/2 requires lowercase header names, but the response was using mixed case headers like `Content-Range`, `Accept-Ranges`, etc.

2. **Nginx HTTP/2 Configuration**: The older `listen 443 ssl http2` syntax can cause issues with range requests. The newer `http2 on` directive provides better HTTP/2 handling.

3. **Missing Range Header Forwarding**: Nginx wasn't explicitly forwarding the `Range` header to the backend, which could cause inconsistent behavior.

4. **Missing HTTP/2 Range Settings**: Nginx needed specific directives for handling range requests over HTTP/2 (`proxy_force_ranges`, `proxy_ignore_headers`).

## Changes Made

### 1. Header Casing Fix (`file-range.service.ts`)

**Before:**
```typescript
buildRangeHeaders(...): Record<string, string> {
  return {
    'Content-Range': `bytes ${start}-${end}/${totalSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength.toString(),
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=3600',
  };
}
```

**After:**
```typescript
buildRangeHeaders(...): Record<string, string> {
  return {
    'content-range': `bytes ${start}-${end}/${totalSize}`,
    'accept-ranges': 'bytes',
    'content-length': contentLength.toString(),
    'content-type': mimeType,
    'cache-control': 'public, max-age=3600',
  };
}
```

**Reason:** HTTP/2 requires all header names to be lowercase. Using mixed case can cause protocol errors.

### 2. Nginx HTTP/2 Configuration (`nginx.conf`)

**Before:**
```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.gossip-club.sebille.net;
    # ...
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_buffering off;
        # ...
    }
}
```

**After:**
```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name api.gossip-club.sebille.net;
    # ...
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        # CRITICAL: Forward Range header for video streaming
        proxy_set_header Range $http_range;
        
        # Disable buffering for streaming
        proxy_buffering off;
        proxy_request_buffering off;
        
        # HTTP/2 specific: Don't buffer responses for range requests
        proxy_force_ranges on;
        proxy_ignore_headers X-Accel-Buffering;
        # ...
    }
}
```

**Changes:**
- Used newer `http2 on` directive instead of `listen 443 ssl http2`
- Added `proxy_set_header Range $http_range` to explicitly forward Range header
- Added `proxy_force_ranges on` to enable range request support through proxy
- Added `proxy_ignore_headers X-Accel-Buffering` to prevent buffering interference

### 3. Added Debug Logging

Added comprehensive logging to track the flow of range requests:

**In `presentation.controller.ts`:**
```typescript
console.log('[PresentationController] Range header:', rangeHeader);
console.log('[PresentationController] All headers:', JSON.stringify(headers));
console.log('[PresentationController] Response status:', result.status);
console.log('[PresentationController] Response headers:', JSON.stringify(result.headers));
```

**In `file-range.service.ts`:**
```typescript
console.log('[FileRangeService] File size:', fileSize, 'MIME:', mimeType);
console.log('[FileRangeService] Range header:', rangeHeader);
console.log('[FileRangeService] Parsed range:', { start, end, contentLength });
console.log('[FileRangeService] Returning 206 with headers:', headers);
```

## Deployment Steps

### 1. Deploy Code Changes

```bash
# Commit and push changes
git add apps/api/src/core/modules/file/services/file-range.service.ts
git add apps/api/src/modules/presentation/controllers/presentation.controller.ts
git add nginx.conf
git commit -m "fix: HTTP/2 range request streaming with lowercase headers"
git push

# Or if using direct deployment, restart the API service
cd /path/to/production
git pull
docker compose restart api
# or
pm2 restart api
# or
systemctl restart australia-api
```

### 2. Update Nginx Configuration

```bash
# On production server
sudo cp nginx.conf /etc/nginx/sites-available/gossip-club
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload without downtime
```

### 3. Monitor Logs

**API Logs:**
```bash
# Docker
docker compose logs -f api | grep -E '\[PresentationController\]|\[FileRangeService\]'

# PM2
pm2 logs api | grep -E '\[PresentationController\]|\[FileRangeService\]'

# Systemd
journalctl -u australia-api -f | grep -E '\[PresentationController\]|\[FileRangeService\]'
```

**Nginx Logs:**
```bash
sudo tail -f /var/log/nginx/api-access.log
sudo tail -f /var/log/nginx/api-error.log
```

## Testing

### 1. Test in Browser

Navigate to the video page in production and open DevTools:

1. **Network Tab**: Check the request/response for `/presentation/video`
2. **Expected Response Headers** (all lowercase):
   ```
   content-type: video/mp4
   content-range: bytes 46333490-51576369/215625870
   accept-ranges: bytes
   content-length: 5242880
   cache-control: public, max-age=3600
   ```
3. **Status Code**: Should be `206 Partial Content` for range requests
4. **No Protocol Errors**: Should not see `ERR_HTTP2_PROTOCOL_ERROR`

### 2. Test with curl

```bash
# Full file request
curl -I https://api.gossip-club.sebille.net/presentation/video

# Range request (first 5MB)
curl -I -H "Range: bytes=0-5242879" https://api.gossip-club.sebille.net/presentation/video

# Range request (seeking to specific position)
curl -I -H "Range: bytes=46333490-" https://api.gossip-club.sebille.net/presentation/video
```

### 3. Check API Logs

Look for the debug output:
```
[FileRangeService] File size: 215625870 MIME: video/mp4
[FileRangeService] Range header: bytes=46333490-
[FileRangeService] Parsed range: { start: 46333490, end: 51576369, contentLength: 5242880 }
[FileRangeService] Returning 206 with headers: {"content-range":"bytes 46333490-51576369/215625870",...}
[PresentationController] Response status: 206
```

## Expected Results

### Before Fix
- ❌ `ERR_HTTP2_PROTOCOL_ERROR` in browser console
- ❌ Video playback fails or stutters
- ❌ Seeking in video doesn't work properly
- ❌ Mixed case headers: `Content-Range`, `Accept-Ranges`
- ❌ Response status shows 206 but protocol error occurs

### After Fix
- ✅ No protocol errors
- ✅ Smooth video playback
- ✅ Seeking works correctly
- ✅ Lowercase headers: `content-range`, `accept-ranges`
- ✅ Clean 206 Partial Content responses
- ✅ All response headers present including `content-type`

## Technical Details

### HTTP/2 and Header Casing

HTTP/2 uses binary framing and requires all header names to be lowercase. This is part of the HTTP/2 specification (RFC 7540). When you send mixed-case headers like `Content-Range`, they may:

1. Be automatically lowercased by the HTTP/2 implementation
2. Cause protocol errors if not handled correctly
3. Create duplicate headers if both cases exist

### Range Request Format

HTTP Range requests use inclusive byte ranges:
- `bytes=0-499` = bytes 0 through 499 (500 bytes total)
- `bytes=500-` = byte 500 through end of file
- `bytes=-500` = last 500 bytes of file

The response includes:
- Status: `206 Partial Content`
- Header: `Content-Range: bytes start-end/total`
- Header: `Content-Length: (end - start + 1)`

### Nginx Proxy Considerations

When proxying range requests with nginx:
- `proxy_force_ranges on` enables range support even if backend doesn't explicitly support it
- `proxy_buffering off` prevents nginx from buffering the entire response
- `proxy_set_header Range $http_range` ensures the Range header is forwarded to backend

## Rollback Plan

If issues arise after deployment:

### 1. Revert Code Changes
```bash
git revert HEAD
git push
# Restart API service
```

### 2. Revert Nginx Configuration
```bash
# Restore previous config from backup
sudo cp /etc/nginx/sites-available/gossip-club.backup /etc/nginx/sites-available/gossip-club
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Check Alternative: Disable HTTP/2 for API

If HTTP/2 continues to cause issues, temporarily disable it:

```nginx
server {
    listen 443 ssl;  # Remove http2
    listen [::]:443 ssl;
    # Remove: http2 on;
    server_name api.gossip-club.sebille.net;
    # ...
}
```

This will fall back to HTTP/1.1, which handles range requests differently and may avoid the protocol error.

## Future Improvements

1. **Remove Debug Logging**: Once confirmed working, remove the verbose console.log statements
2. **Add Unit Tests**: Test range header parsing with various edge cases
3. **Add Integration Tests**: Test video streaming with range requests
4. **Performance Monitoring**: Monitor response times for range requests
5. **Content Delivery Network**: Consider using a CDN for video delivery to reduce server load

## References

- [RFC 7233 - HTTP Range Requests](https://tools.ietf.org/html/rfc7233)
- [RFC 7540 - HTTP/2 Specification](https://tools.ietf.org/html/rfc7540)
- [Nginx HTTP/2 Module](http://nginx.org/en/docs/http/ngx_http_v2_module.html)
- [Nginx Proxy Module](http://nginx.org/en/docs/http/ngx_http_proxy_module.html)
