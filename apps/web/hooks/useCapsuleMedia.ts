import { useState, useCallback } from 'react';
import type { JSONContent } from '@repo/ui/tiptap-exports/react';
import type { UploadFunction } from '@repo/ui/components/tiptap-node/image-upload-node/image-upload-node-extension';

export interface TrackedMediaFile {
  file: File;
  uniqueId: string;
  type: 'image' | 'video' | 'audio';
}

export interface MediaState {
  kept: string[]; // File IDs to keep (for editing existing capsules)
  added: TrackedMediaFile[]; // New files with temporary IDs
}

/**
 * Generate a unique ID for tracking media files before upload
 */
function generateUniqueId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook to manage media files in capsule creation/editing
 * 
 * This hook provides:
 * - Media state tracking (kept + added files)
 * - Upload functions that track files with uniqueIds instead of uploading
 * - Content extraction to get media data for API submission
 */
export function useCapsuleMedia() {
  const [mediaState, setMediaState] = useState<MediaState>({
    kept: [],
    added: [],
  });

  /**
   * Track a new file with a unique ID
   * Returns the uniqueId to be used in content references
   */
  const trackFile = useCallback((file: File, type: 'image' | 'video' | 'audio'): string => {
    const uniqueId = generateUniqueId();
    
    setMediaState(prev => ({
      ...prev,
      added: [...prev.added, { file, uniqueId, type }],
    }));

    return uniqueId;
  }, []);

  /**
   * Set kept media (file IDs from existing capsule)
   */
  const setKeptMedia = useCallback((fileIds: string[]) => {
    setMediaState(prev => ({
      ...prev,
      kept: fileIds,
    }));
  }, []);

  /**
   * Reset media state
   */
  const resetMedia = useCallback(() => {
    setMediaState({
      kept: [],
      added: [],
    });
  }, []);

  /**
   * Get upload functions that track files instead of uploading
   * These return temporary URLs with uniqueId for editor display
   */
  const getUploadFunctions = useCallback((): {
    image: UploadFunction;
    video: UploadFunction;
    audio: UploadFunction;
  } => ({
    image: async (
      file: File, 
      onProgress?: (event: { progress: number }) => void, 
      signal?: AbortSignal
    ) => {
      const uniqueId = trackFile(file, 'image');
      
      // Simulate progress callback if provided
      if (onProgress) {
        onProgress({ progress: 100 });
      }
      
      // Return URL with uniqueId embedded (will be replaced on server)
      return `/storage/temp/${uniqueId}`;
    },
    video: async (
      file: File, 
      onProgress?: (event: { progress: number }) => void, 
      signal?: AbortSignal
    ) => {
      const uniqueId = trackFile(file, 'video');
      
      // Simulate progress callback if provided
      if (onProgress) {
        onProgress({ progress: 100 });
      }
      
      // Return URL with uniqueId embedded
      return `/storage/temp/${uniqueId}`;
    },
    audio: async (
      file: File, 
      onProgress?: (event: { progress: number }) => void, 
      signal?: AbortSignal
    ) => {
      const uniqueId = trackFile(file, 'audio');
      
      // Simulate progress callback if provided
      if (onProgress) {
        onProgress({ progress: 100 });
      }
      
      // Return URL with uniqueId embedded
      return `/storage/temp/${uniqueId}`;
    },
  }), [trackFile]);

  /**
   * Extract media data for API submission
   */
  const getMediaForSubmit = useCallback(() => {
    return {
      kept: mediaState.kept,
      added: mediaState.added,
    };
  }, [mediaState]);

  /**
   * Extract existing file IDs from capsule content
   * Used when editing an existing capsule to identify kept media
   */
  const extractFileIdsFromContent = useCallback((content: string): string[] => {
    try {
      const plateData = JSON.parse(content);
      const fileIds: string[] = [];

      // Recursively traverse Plate.js content tree
      const extractFromNode = (node: unknown): void => {
        if (typeof node !== 'object' || node === null) {
          return;
        }

        if (Array.isArray(node)) {
          node.forEach(extractFromNode);
          return;
        }

        const obj = node as Record<string, unknown>;

        for (const [key, value] of Object.entries(obj)) {
          // Check for url properties containing file IDs
          if (key === 'url' && typeof value === 'string') {
            // Extract file ID from URL (assuming format /storage/files/{fileId})
            const match = value.match(/\/storage\/files\/([a-zA-Z0-9-]+)/);
            if (match && match[1]) {
              fileIds.push(match[1]);
            }
          } else if (typeof value === 'object' && value !== null) {
            extractFromNode(value);
          }
        }
      };

      extractFromNode(plateData);
      return fileIds;
    } catch (error) {
      console.error('Error extracting file IDs from content:', error);
      return [];
    }
  }, []);

  return {
    mediaState,
    getUploadFunctions,
    getMediaForSubmit,
    setKeptMedia,
    resetMedia,
    extractFileIdsFromContent,
  };
}
