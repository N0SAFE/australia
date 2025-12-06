"use client";

import { FC, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Capsule } from "@/types/capsule";
import { getPath } from "@/lib/orpc/utils/getPath";
import { appContract } from "@repo/api-contracts";
import { validateEnvPath } from "#/env";
import type { MediaDownloadHandler } from "@repo/ui/lib/media-url-resolver";

const SimpleEditor = dynamic(
  () =>
    import("@/components/tiptap/editor").then(
      (mod) => ({ default: mod.SimpleEditor }),
    ),
  { ssr: false },
);

const SimpleViewer = dynamic(
  () =>
    import("@/components/tiptap/viewer").then(
      (mod) => ({ default: mod.SimpleViewer }),
    ),
  { ssr: false },
);

interface TipTapContentRendererProps {
  mode: 'editor' | 'viewer';
  value: any;
  onChange?: (newValue: any) => void;
  capsule: Capsule | null | undefined;
  placeholder?: string;
  onEditorReady?: () => void;
}

export const TipTapContentRenderer: FC<TipTapContentRendererProps> = ({
  mode,
  value,
  onChange,
  capsule,
  placeholder = "Écrivez le contenu de votre capsule temporelle...",
  onEditorReady,
}) => {
  const API_URL = validateEnvPath(
    process.env.NEXT_PUBLIC_API_URL ?? "",
    "NEXT_PUBLIC_API_URL"
  );

  /**
   * Resolve media URL based on strategy meta
   * The node views pass strategy.meta directly to these strategy functions
   * @param mediaType - Type of media (image, video, audio, file)
   * @param meta - The strategy meta object containing contentMediaId
   */
  const resolveMediaUrl = useCallback(async (
    mediaType: 'image' | 'video' | 'audio' | 'file', 
    meta: any
  ): Promise<string> => {
    console.log(`🔵 [${mediaType}] Strategy called with meta:`, meta);
    
    // Check for contentMediaId in meta
    if (!meta?.contentMediaId) {
      console.warn(`⚠️ [${mediaType}] No contentMediaId in meta`);
      return "";
    }
    
    // Look up in attachedMedia to get fileId
    const media = capsule?.attachedMedia?.find((m: any) => m.contentMediaId === meta.contentMediaId);
    if (!media) {
      console.warn(`⚠️ [${mediaType}] contentMediaId not found in attachedMedia:`, meta.contentMediaId);
      return "";
    }
    
    // Map media type to the correct contract
    const contractMap = {
      image: appContract.storage.getImage,
      video: appContract.storage.getVideo,
      audio: appContract.storage.getAudio,
      file: appContract.storage.getRawFile,
    };
    
    const url = getPath(
      contractMap[mediaType],
      { fileId: media.fileId },
      { baseURL: API_URL }
    );
    console.log(`✅ [${mediaType}] URL resolved:`, url);
    return url;
  }, [capsule?.attachedMedia, API_URL]);

  // Strategy functions for each media type
  // These receive meta directly from the node views (e.g., ImageNodeView passes strategy.meta)
  const imageStrategy = useCallback((meta: any) => resolveMediaUrl('image', meta), [resolveMediaUrl]);
  const videoStrategy = useCallback((meta: any) => resolveMediaUrl('video', meta), [resolveMediaUrl]);
  const audioStrategy = useCallback((meta: any) => resolveMediaUrl('audio', meta), [resolveMediaUrl]);
  const fileStrategy = useCallback((meta: any) => resolveMediaUrl('file', meta), [resolveMediaUrl]);

  /**
   * Create a download handler for a given media type
   * Downloads media with progress tracking using streaming fetch
   */
  const createDownloadHandler = useCallback((mediaType: 'image' | 'video' | 'audio' | 'file'): MediaDownloadHandler => {
    return async (meta: unknown, filename: string, onProgress) => {
      const typedMeta = meta as { contentMediaId?: string } | null;
      
      if (!typedMeta?.contentMediaId) {
        console.warn(`⚠️ [${mediaType}] Download: No contentMediaId in meta`);
        return;
      }

      // Look up in attachedMedia to get fileId and filename
      const media = capsule?.attachedMedia?.find((m: any) => m.contentMediaId === typedMeta.contentMediaId);
      if (!media) {
        console.warn(`⚠️ [${mediaType}] Download: contentMediaId not found in attachedMedia:`, typedMeta.contentMediaId);
        return;
      }

      // Map media type to the correct contract
      const contractMap = {
        image: appContract.storage.getImage,
        video: appContract.storage.getVideo,
        audio: appContract.storage.getAudio,
        file: appContract.storage.getRawFile,
      };

      const url = getPath(
        contractMap[mediaType],
        { fileId: media.fileId },
        { baseURL: API_URL }
      );

      console.log(`📥 [${mediaType}] Starting download:`, { url, filename: media.filename || filename });

      try {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body reader');
        }

        const chunks: BlobPart[] = [];
        let loaded = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          loaded += value.byteLength;

          if (total > 0) {
            const progress = Math.round((loaded / total) * 100);
            onProgress(progress);
          }
        }

        // Create blob from chunks
        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = media.filename || filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Cleanup
        URL.revokeObjectURL(blobUrl);
        onProgress(100);

        console.log(`✅ [${mediaType}] Download complete:`, media.filename || filename);
      } catch (error) {
        console.error(`❌ [${mediaType}] Download failed:`, error);
        throw error;
      }
    };
  }, [capsule?.attachedMedia, API_URL]);

  // Create download handlers for each media type
  const imageDownloadHandler = useMemo(() => createDownloadHandler('image'), [createDownloadHandler]);
  const videoDownloadHandler = useMemo(() => createDownloadHandler('video'), [createDownloadHandler]);
  const audioDownloadHandler = useMemo(() => createDownloadHandler('audio'), [createDownloadHandler]);
  const fileDownloadHandler = useMemo(() => createDownloadHandler('file'), [createDownloadHandler]);

  // Upload functions - only for editor mode
  const uploadFunctions = useMemo(() => {
    if (mode !== 'editor') return undefined;
    
    return {
      image: async (file: File) => {
        const contentMediaId = crypto.randomUUID();
        const blobUrl = URL.createObjectURL(file);
        
        console.log('📤 [Image Upload] Created blob URL:', { contentMediaId, blobUrl });
        
        return {
          url: blobUrl,
          meta: {
            // For useFileUpload validation
            contentMediaId,
            // For BaseUploadNode to build strategy structure
            strategyName: 'api',
            strategyMeta: { contentMediaId }
          }
        };
      },
      video: async (file: File) => {
        const contentMediaId = crypto.randomUUID();
        const blobUrl = URL.createObjectURL(file);
        
        console.log('📤 [Video Upload] Created blob URL:', { contentMediaId, blobUrl });
        
        return {
          url: blobUrl,
          meta: {
            // For useFileUpload validation
            contentMediaId,
            // For BaseUploadNode to build strategy structure
            strategyName: 'api',
            strategyMeta: { contentMediaId }
          }
        };
      },
      audio: async (file: File) => {
        const contentMediaId = crypto.randomUUID();
        const blobUrl = URL.createObjectURL(file);
        
        console.log('📤 [Audio Upload] Created blob URL:', { contentMediaId, blobUrl });
        
        return {
          url: blobUrl,
          meta: {
            // For useFileUpload validation
            contentMediaId,
            // For BaseUploadNode to build strategy structure
            strategyName: 'api',
            strategyMeta: { contentMediaId }
          }
        };
      },
    };
  }, [mode]);

  // Common props shared between editor and viewer
  const commonProps = {
    value,
    imageStrategy,
    videoStrategy,
    audioStrategy,
    fileStrategy,
    imageDownloadHandler,
    videoDownloadHandler,
    audioDownloadHandler,
    fileDownloadHandler,
  };

  if (mode === 'editor') {
    return (
      <SimpleEditor
        {...commonProps}
        onChange={onChange}
        editable={true}
        placeholder={placeholder}
        uploadFunctions={uploadFunctions}
        onEditorReady={onEditorReady}
      />
    );
  }

  return <SimpleViewer {...commonProps} />;
};
