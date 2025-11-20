# PWA Features - Gossip Club

## Overview

Gossip Club has been enhanced with Progressive Web App (PWA) capabilities to provide a better user experience, offline support, and native app-like functionality.

## Features Implemented

### 1. Service Worker with Caching Strategies

The app uses a custom service worker (`/public/sw-custom.js`) that implements intelligent caching strategies:

- **Network-First** for API calls and pages (fresh data when online, cached fallback when offline)
- **Cache-First** for static assets and videos (faster loading, bandwidth savings)
- **Stale-While-Revalidate** for images (instant display, background updates)

### 2. Offline Support

The app works offline with:
- Precached critical assets (home page, offline page, favicon)
- Automatic caching of visited pages and assets
- Dedicated offline fallback page at `/offline`
- Graceful degradation when network is unavailable

### 3. Install Prompt

Smart installation prompt that:
- Detects when the app can be installed
- Shows after 5 seconds on first visit
- Remembers dismissal for 7 days
- Provides clear call-to-action buttons
- Uses browser's native install dialog

### 4. Update Notifications

Automatic update detection system:
- Checks for new versions hourly
- Notifies users when updates are available
- Allows users to update immediately or defer
- Automatically reloads after update installation
- Seamless update experience with skip waiting

### 5. Background Sync Capabilities

Background sync utilities (`/lib/pwa/background-sync.ts`) for:
- Queuing actions when offline
- Automatic retry when connection restored
- LocalStorage-based queue management
- Service Worker Sync API integration
- Extensible task processing system

### 6. Enhanced Manifest

The web manifest (`/public/site.webmanifest`) includes:
- App name and description
- Icons for various platforms (iOS, Android, desktop)
- Display mode set to "standalone" for app-like experience
- Theme and background colors
- Shortcuts for quick access
- Proper categorization

### 7. Platform-Specific Optimizations

- **iOS**: Apple-specific meta tags for web app capabilities
- **Android**: Mobile web app capable tags
- **Desktop**: Installable as desktop app
- **All platforms**: Responsive and adaptive UI

## Technical Implementation

### File Structure

```
apps/web/
├── app/
│   ├── layout.tsx                    # PWA components integration
│   └── offline/
│       └── page.tsx                  # Offline fallback page
├── components/
│   └── pwa/
│       ├── InstallPrompt.tsx         # Install prompt component
│       ├── UpdateNotification.tsx    # Update notification component
│       └── ServiceWorkerProvider.tsx # Service worker registration
├── lib/
│   └── pwa/
│       └── background-sync.ts        # Background sync utilities
└── public/
    ├── sw-custom.js                  # Custom service worker
    └── site.webmanifest              # PWA manifest
```

### Service Worker Lifecycle

1. **Install**: Precaches critical assets
2. **Activate**: Cleans up old caches
3. **Fetch**: Intercepts requests and applies caching strategies
4. **Sync**: Processes background sync tasks
5. **Message**: Handles skip waiting and other commands

### Caching Strategy Details

#### Network-First (API calls, pages)
- Try network request first
- Cache successful responses
- Fall back to cache if network fails
- Return offline page for navigation requests

#### Cache-First (static assets, videos)
- Check cache first
- Fetch from network if not cached
- Cache network responses
- Fastest loading for static content

#### Stale-While-Revalidate (images)
- Return cached version immediately
- Fetch fresh version in background
- Update cache with fresh version
- Best user experience with fresh content

## Usage

### For Users

#### Installing the App

1. Visit Gossip Club in your browser
2. Wait for the install prompt (appears after 5 seconds)
3. Click "Install" to add to your device
4. Launch from home screen/app launcher

Or manually:
- **Chrome/Edge**: Menu → Install Gossip Club
- **Safari (iOS)**: Share → Add to Home Screen

#### Using Offline

1. Visit pages while online to cache them
2. When offline, previously visited pages will load
3. New content will sync automatically when back online
4. Offline page appears for unvisited pages

#### Updating the App

1. Update notification appears when new version available
2. Click "Refresh Now" to update immediately
3. Or click "Later" and update when convenient
4. App reloads automatically after update

### For Developers

#### Testing PWA Features

```bash
# Build for production (PWA features enabled in production only)
bun run build

# Start production server
bun run start

# Test on localhost with service worker
# Note: Service workers require HTTPS or localhost
```

#### Registering Background Sync Tasks

```typescript
import { addToSyncQueue } from "@/lib/pwa/background-sync";

// Queue an action for background sync
await addToSyncQueue({
  type: "upload-photo",
  data: {
    photoUrl: "...",
    metadata: {...},
  },
});
```

#### Checking Sync Status

```typescript
import { 
  hasPendingSyncTasks,
  getPendingSyncTaskCount,
  getSyncQueue 
} from "@/lib/pwa/background-sync";

const hasPending = hasPendingSyncTasks();
const count = getPendingSyncTaskCount();
const queue = getSyncQueue();
```

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 15.4+ (limited service worker support)
- ✅ Samsung Internet 14+
- ✅ Opera 76+

**Note**: Some PWA features have limited support in Safari/iOS due to platform restrictions.

## Monitoring and Debugging

### Chrome DevTools

1. Open DevTools → Application tab
2. Service Workers: View registration status
3. Cache Storage: Inspect cached resources
4. Manifest: Validate PWA manifest
5. Storage: Check background sync queue

### Console Logs

The service worker logs important events:
- Registration success/failure
- Cache hits and misses
- Background sync operations
- Update availability

### Testing Offline

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Navigate through the app
4. Verify cached content loads

## Future Enhancements

Potential improvements for future versions:

- [ ] Push notifications for new content
- [ ] Periodic background sync for auto-updates
- [ ] Enhanced offline media viewing
- [ ] Share target API for sharing to the app
- [ ] Badging API for unread count
- [ ] File system access for downloads
- [ ] Advanced caching controls in settings

## Troubleshooting

### Service Worker Not Registering

- Ensure app is served over HTTPS or localhost
- Check browser console for errors
- Verify service worker file is accessible
- Clear browser cache and reload

### Install Prompt Not Showing

- App must meet PWA criteria (manifest, service worker, HTTPS)
- User may have previously dismissed (7-day cooldown)
- Some browsers have specific requirements
- Check manifest validation in DevTools

### Updates Not Working

- Service worker may be stuck
- Try unregistering and re-registering
- Clear cache and hard reload
- Check for service worker errors

### Offline Mode Issues

- Content must be visited while online to cache
- Check cache storage in DevTools
- Verify service worker is active
- Look for fetch event errors

## Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
