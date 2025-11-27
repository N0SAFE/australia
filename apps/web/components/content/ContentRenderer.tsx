'use client';

import { FC, useMemo } from 'react';
import { Capsule } from '@/types/capsule';
import { SimpleViewer } from '@/components/tiptap/viewer';
import { getPath } from '@/lib/orpc/utils/getPath';
import { appContract } from '@repo/api-contracts';
import { validateEnvPath } from '#/env';

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

  return (
    <SimpleViewer
      value={content}
      className="pink-theme"
      // Media URL resolution strategies
      imageStrategy={imageStrategy}
      videoStrategy={videoStrategy}
      audioStrategy={audioStrategy}
      fileStrategy={fileStrategy}
    />
  );
};
