'use client';

import { FC, useMemo, useCallback } from 'react';
import { Capsule } from '@/types/capsule';
import { SimpleViewer } from '@/components/tiptap/viewer';
import { getPath } from '@/lib/orpc/utils/getPath';
import { appContract } from '@repo/api-contracts';
import { validateEnvPath } from '#/env';
import type { MediaDownloadHandler } from '@repo/ui/lib/media-url-resolver';

// AttachedMedia type from API response
type AttachedMedia = {
  contentMediaId: string;
  type: 'image' | 'video' | 'audio';
  fileId: string;
  filePath: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  thumbnailPath?: string | null;
  createdAt: string;
};

/**
 * ContentRenderer - renders capsule content using TipTap
 * Content is stored as TipTap JSON and can contain text, images, videos, and audio
 * Resolves contentMediaId references using attachedMedia array
 */
export const ContentRenderer: FC<{
  capsule: Capsule;
  attachedMedia?: AttachedMedia[];
}> = ({ capsule, attachedMedia = [] }) => {
  // Parse the content JSON string
  const content: any = useMemo(() => {
    try {
      return JSON.parse(capsule.content);
    } catch (error) {
      console.error('Failed to parse capsule content:', error);
      return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Erreur: Contenu invalide' }] }] };
    }
  }, [capsule.content]);

  // Media URL resolution strategies using contentMediaId
  const API_URL = validateEnvPath(
    process.env.NEXT_PUBLIC_API_URL ?? "",
    "NEXT_PUBLIC_API_URL"
  );
  
  console.log('🔵 [ContentRenderer] Attached media:', attachedMedia.length, attachedMedia);
  
  const imageStrategy = async (meta: any) => {
    console.log('🔵 [ContentRenderer] imageStrategy called with meta:', meta);
    if (!meta?.contentMediaId) {
      console.warn('⚠️ Image strategy: no contentMediaId in meta');
      return "";
    }
    const media = attachedMedia.find(m => m.contentMediaId === meta.contentMediaId);
    if (!media) {
      console.warn('⚠️ Image not found for contentMediaId:', meta.contentMediaId);
      return "";
    }
    const url = getPath(
      appContract.storage.getImage,
      { fileId: media.fileId },
      { baseURL: API_URL }
    );
    console.log('✅ [ContentRenderer] Image URL resolved:', url);
    return url;
  };
  
  const videoStrategy = async (meta: any) => {
    console.log('🔵 [ContentRenderer] videoStrategy called with meta:', meta);
    if (!meta?.contentMediaId) {
      console.warn('⚠️ Video strategy: no contentMediaId in meta');
      return "";
    }
    const media = attachedMedia.find(m => m.contentMediaId === meta.contentMediaId);
    if (!media) {
      console.warn('⚠️ Video not found for contentMediaId:', meta.contentMediaId);
      return "";
    }
    const url = getPath(
      appContract.storage.getVideo,
      { fileId: media.fileId },
      { baseURL: API_URL }
    );
    console.log('✅ [ContentRenderer] Video URL resolved:', url);
    return url;
  };
  
  const audioStrategy = async (meta: any) => {
    console.log('🔵 [ContentRenderer] audioStrategy called with meta:', meta);
    if (!meta?.contentMediaId) {
      console.warn('⚠️ Audio strategy: no contentMediaId in meta');
      return "";
    }
    const media = attachedMedia.find(m => m.contentMediaId === meta.contentMediaId);
    if (!media) {
      console.warn('⚠️ Audio not found for contentMediaId:', meta.contentMediaId);
      return "";
    }
    const url = getPath(
      appContract.storage.getAudio,
      { fileId: media.fileId },
      { baseURL: API_URL }
    );
    console.log('✅ [ContentRenderer] Audio URL resolved:', url);
    return url;
  };
  
  const fileStrategy = async (meta: any) => {
    console.log('🔵 [ContentRenderer] fileStrategy called with meta:', meta);
    if (!meta?.contentMediaId) {
      console.warn('⚠️ File strategy: no contentMediaId in meta');
      return "";
    }
    const media = attachedMedia.find(m => m.contentMediaId === meta.contentMediaId);
    if (!media) {
      console.warn('⚠️ File not found for contentMediaId:', meta.contentMediaId);
      return "";
    }
    const url = getPath(
      appContract.storage.getRawFile,
      { fileId: media.fileId },
      { baseURL: API_URL }
    );
    console.log('✅ [ContentRenderer] File URL resolved:', url);
    return url;
  };

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
      const media = attachedMedia.find(m => m.contentMediaId === typedMeta.contentMediaId);
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
  }, [attachedMedia, API_URL]);

  // Create download handlers for each media type
  const imageDownloadHandler = useMemo(() => createDownloadHandler('image'), [createDownloadHandler]);
  const videoDownloadHandler = useMemo(() => createDownloadHandler('video'), [createDownloadHandler]);
  const audioDownloadHandler = useMemo(() => createDownloadHandler('audio'), [createDownloadHandler]);
  const fileDownloadHandler = useMemo(() => createDownloadHandler('file'), [createDownloadHandler]);

  return (
    <SimpleViewer
      value={content}
      className="pink-theme"
      // Media URL resolution strategies
      imageStrategy={imageStrategy}
      videoStrategy={videoStrategy}
      audioStrategy={audioStrategy}
      fileStrategy={fileStrategy}
      // Media download handlers
      imageDownloadHandler={imageDownloadHandler}
      videoDownloadHandler={videoDownloadHandler}
      audioDownloadHandler={audioDownloadHandler}
      fileDownloadHandler={fileDownloadHandler}
    />
  );
};
