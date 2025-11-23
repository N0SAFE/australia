'use client'

import { useCallback } from 'react';
import type { JSONContent } from '@repo/ui/tiptap-exports/react';

export interface TrackedMediaFile {
  file: File;
  contentMediaId: string;
  type: 'image' | 'video' | 'audio';
}

/**
 * Determine media type from File object
 */
function getMediaType(file: File): 'image' | 'video' | 'audio' {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'image'; // fallback
}

/**
 * Hook to manage media files in capsule creation/editing
 * 
 * Simplified structure:
 * - temp: { blobUrl, fileRef } - Temporary preview data
 * - strategy: { name: 'api', meta: { contentMediaId } } - URL resolution strategy
 * - attrs: { standard image/video/audio attributes } - Node attributes
 * 
 * Flow:
 * 1. Upload creates node with temp.blobUrl and strategy.meta.contentMediaId
 * 2. Before submit: Extract files from temp.fileRef and strategy metadata
 * 3. Remove temp data (not serializable)
 * 4. Return updated content + media list for API
 */
export function useCapsuleMedia() {
  /**
   * Process editor content before submission:
   * 1. Find all nodes with temp.fileRef (newly uploaded)
   * 2. Extract File objects and contentMediaIds
   * 3. Remove temp data (not needed after upload)
   * 4. Keep strategy data for URL resolution after save
   */
  const processContentForSubmit = useCallback((content: JSONContent[]): {
    processedContent: JSONContent[];
    media: {
      kept: string[];
      added: TrackedMediaFile[];
    };
  } => {
    const addedMedia: TrackedMediaFile[] = [];
    const keptFileIds = new Set<string>();
    
    // Extract files before cloning (File objects aren't serializable)
    const fileMap = new Map<string, File>();
    
    const extractFiles = (node: JSONContent): void => {
      // Access temp and strategy from attrs (where TipTap stores them)
      const temp = node.attrs?.temp as { fileRef?: File; blobUrl?: string } | undefined;
      const strategy = node.attrs?.strategy as { name?: string; meta?: { contentMediaId?: string } } | undefined;
      
      // Extract newly uploaded files (have temp.fileRef)
      if (temp?.fileRef) {
        const file = temp.fileRef;
        const contentMediaId = strategy?.meta?.contentMediaId;
        
        if (file instanceof File && contentMediaId) {
          console.log('📎 Extracted File:', {
            name: file.name,
            type: file.type,
            size: file.size,
            contentMediaId
          });
          fileMap.set(contentMediaId, file);
        }
      }
      
      // Extract kept file IDs (already uploaded, no temp data)
      if (!temp && strategy?.name === 'api') {
        const contentMediaId = strategy?.meta?.contentMediaId;
        if (contentMediaId) {
          keptFileIds.add(contentMediaId);
        }
      }
      
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(extractFiles);
      }
    };
    
    content.forEach(extractFiles);
    
    console.log('📦 File map size:', fileMap.size);
    
    // Deep clone content
    const processedContent = JSON.parse(JSON.stringify(content)) as JSONContent[];
    
    // Process nodes: extract media and remove temp data
    const processNode = (node: JSONContent): void => {
      // Access temp and strategy from attrs
      const temp = node.attrs?.temp as { fileRef?: File; blobUrl?: string } | undefined;
      const strategy = node.attrs?.strategy as { name?: string; meta?: { contentMediaId?: string } } | undefined;
      
      if (temp) {
        const contentMediaId = strategy?.meta?.contentMediaId;
        const file = fileMap.get(contentMediaId ?? '');
        
        if (file && contentMediaId) {
          const type = getMediaType(file);
          
          console.log('✅ Adding media:', { contentMediaId, type, fileName: file.name });
          
          addedMedia.push({ file, contentMediaId, type });
        }
        
        // Remove temp data from attrs (not needed after upload)
        if (node.attrs) {
          delete node.attrs.temp;
        }
      }
      
      // Recursively process children
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(processNode);
      }
    };
    
    processedContent.forEach(processNode);
    
    console.log('📊 Final media summary:', {
      keptCount: keptFileIds.size,
      addedCount: addedMedia.length,
      addedFiles: addedMedia.map(m => ({
        contentMediaId: m.contentMediaId,
        type: m.type,
        fileName: m.file.name,
        fileSize: m.file.size
      }))
    });
    
    return {
      processedContent,
      media: {
        kept: Array.from(keptFileIds),
        added: addedMedia,
      },
    };
  }, []);

  return {
    processContentForSubmit,
  };
}
