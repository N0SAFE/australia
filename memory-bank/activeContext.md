# Active Context

## Current Task
Fixing the "Add Media" (+) button in the Tiptap editor which was unresponsive.

## Recent Changes
- Refactored `MediaDropdownMenu` to accept an explicit `editor` prop.
- Updated `SimpleEditor` to pass the `editor` instance to `MediaDropdownMenu` via `MainToolbarContent`.
- Installed `@tiptap/extension-placeholder` to fix missing dependency.
- Fixed lint errors in `simple-editor.tsx` (ref access, any types, template literals).

## Next Steps
- Verify the fix for the "Add Media" button.
- Resume Phase 4: Video Processing Overlay.
