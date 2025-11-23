'use client';

import { FC, useMemo } from 'react';
import { Capsule } from '@/types/capsule';
import dynamic from 'next/dynamic';

const SimpleViewer = dynamic(
  () => import('@/components/tiptap/viewer').then(mod => ({ default: mod.SimpleViewer })),
  { ssr: false }
);

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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  
  const imageStrategy = async (meta: any) => {
    if (!meta?.contentMediaId) return "";
    const media = attachedMedia.find(m => m.contentMediaId === meta.contentMediaId);
    if (!media) {
      console.warn('⚠️ Image not found for contentMediaId:', meta.contentMediaId);
      return "";
    }
    return `${API_URL}/storage/image/${media.fileId}`;
  };
  
  const videoStrategy = async (meta: any) => {
    if (!meta?.contentMediaId) return "";
    const media = attachedMedia.find(m => m.contentMediaId === meta.contentMediaId);
    if (!media) {
      console.warn('⚠️ Video not found for contentMediaId:', meta.contentMediaId);
      return "";
    }
    return `${API_URL}/storage/video/${media.fileId}`;
  };
  
  const audioStrategy = async (meta: any) => {
    if (!meta?.contentMediaId) return "";
    const media = attachedMedia.find(m => m.contentMediaId === meta.contentMediaId);
    if (!media) {
      console.warn('⚠️ Audio not found for contentMediaId:', meta.contentMediaId);
      return "";
    }
    return `${API_URL}/storage/audio/${media.fileId}`;
  };
  
  const fileStrategy = async (meta: any) => {
    if (!meta?.contentMediaId) return "";
    const media = attachedMedia.find(m => m.contentMediaId === meta.contentMediaId);
    if (!media) {
      console.warn('⚠️ File not found for contentMediaId:', meta.contentMediaId);
      return "";
    }
    return `${API_URL}/storage/file/${media.fileId}`;
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
