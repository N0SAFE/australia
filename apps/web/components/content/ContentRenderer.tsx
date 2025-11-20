'use client';

import { FC, useMemo } from 'react';
import { Capsule } from '@/types/capsule';
import dynamic from 'next/dynamic';

const SimpleViewer = dynamic(
  () => import('@/components/tiptap/viewer').then(mod => ({ default: mod.SimpleViewer })),
  { ssr: false }
);

/**
 * ContentRenderer - renders capsule content using TipTap
 * Content is stored as TipTap JSON and can contain text, images, videos, and audio
 */
export const ContentRenderer: FC<{
  capsule: Capsule;
}> = ({ capsule }) => {
  // Parse the content JSON string
  const content: any = useMemo(() => {
    try {
      return JSON.parse(capsule.content);
    } catch (error) {
      console.error('Failed to parse capsule content:', error);
      return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Erreur: Contenu invalide' }] }] };
    }
  }, [capsule.content]);

  // Media URL resolution strategies
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  
  const imageStrategy = async (meta: any) => {
    if (!meta?.fileId) return "";
    return `${API_URL}/storage/image/${meta.fileId}`;
  };
  
  const videoStrategy = async (meta: any) => {
    if (!meta?.fileId) return "";
    return `${API_URL}/storage/video/${meta.fileId}`;
  };
  
  const audioStrategy = async (meta: any) => {
    if (!meta?.fileId) return "";
    return `${API_URL}/storage/audio/${meta.fileId}`;
  };
  
  const fileStrategy = async (meta: any) => {
    if (!meta?.fileId) return "";
    return `${API_URL}/storage/file/${meta.fileId}`;
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
