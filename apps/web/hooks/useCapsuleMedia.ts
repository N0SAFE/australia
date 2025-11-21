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
 * This hook provides functions to:
 * - Extract media nodes with 'local' strategy from editor content
 * - Convert local nodes to 'contentMediaId' strategy for API submission
 * - Collect File objects and prepare media data for upload
 * - Extract kept file IDs from nodes with 'api' strategy
 * 
 * Flow:
 * 1. Upload nodes create media nodes with strategy='local' + blob URL + fileRef + contentMediaId (UUID)
 * 2. Before submit: processContentForSubmit() extracts local nodes
 * 3. Extracts contentMediaIds from nodes, updates nodes to strategy='contentMediaId'
 * 4. Returns updated content + media list for API
 */
export function useCapsuleMedia() {
  /**
   * Process editor content before submission:
   * 1. Find all nodes with strategy='local' (blob URLs)
   * 2. Extract File objects from fileRef attributes
   * 3. Extract contentMediaIds that were generated during upload
   * 4. Update nodes to strategy='contentMediaId' with contentMediaId in src
   * 5. Return updated content + media list
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
    
    // First pass: Extract files from original content (before cloning)
    // We need to do this because fileRef is not serializable and will be lost in JSON clone
    const fileMap = new Map<string, File>();
    
    const extractFiles = (node: JSONContent): void => {
      if (node.attrs?.strategy === 'local' && node.attrs?.fileRef) {
        const file = node.attrs.fileRef as File;
        const blobUrl = node.attrs.src as string;
        
        // Validate we have a real File object
        if (file instanceof File) {
          console.log('📎 Extracted File:', {
            name: file.name,
            type: file.type,
            size: file.size,
            blobUrl
          });
          fileMap.set(blobUrl, file);
        } else {
          console.error('❌ Invalid file reference:', file);
        }
      }
      
      // Extract kept file IDs from api strategy nodes
      if (node.attrs?.strategy === 'api' && node.attrs?.src) {
        const match = (node.attrs.src as string).match(/\/storage\/files\/([a-zA-Z0-9-]+)/);
        if (match?.[1]) {
          keptFileIds.add(match[1]);
        }
      }
      
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(extractFiles);
      }
    };
    
    content.forEach(extractFiles);
    
    console.log('📦 File map size:', fileMap.size);
    
    // Deep clone content to avoid mutations
    const processedContent = JSON.parse(JSON.stringify(content)) as JSONContent[];
    
    // Second pass: Update cloned content with contentMediaIds
    const processNode = (node: JSONContent): void => {
      // Check if this is a media node with local strategy
      if (node.attrs?.strategy === 'local' && node.attrs?.src) {
        const blobUrl = node.attrs.src as string;
        const file = fileMap.get(blobUrl);
        
        console.log('🔍 Looking for file with blobUrl:', blobUrl);
        console.log('🔍 Found file:', file instanceof File ? 'YES' : 'NO', file);
        
        if (file) {
          // Extract the contentMediaId that was generated during upload
          const contentMediaId = node.attrs.contentMediaId;
          if (!contentMediaId) {
            console.error('❌ Missing contentMediaId for local media node');
            return;
          }
          
          const type = getMediaType(file);
          
          console.log('✅ Adding media:', { contentMediaId, type, fileName: file.name });
          
          // Add to media list
          addedMedia.push({ file, contentMediaId, type });
          
          // Update node to contentMediaId strategy
          node.attrs.strategy = 'contentMediaId';
          node.attrs.src = contentMediaId; // Store contentMediaId in src
          delete node.attrs.fileRef; // Remove file reference (not serializable)
        } else {
          console.error('❌ No file found for blobUrl:', blobUrl);
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
        fileSize: m.file.size,
        isFile: m.file instanceof File
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
