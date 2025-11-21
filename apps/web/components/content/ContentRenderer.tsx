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

  // Create injectMediaUrl callback that resolves contentMediaId strategy
  const injectMediaUrl = useMemo(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    return {
      // Existing API resolver for srcUrlId strategy
      api: (src: string) => `${apiUrl}${src}`,
      
      // New contentMediaId resolver
      contentMediaId: (contentMediaId: string) => {
        const media = attachedMedia.find(m => m.contentMediaId === contentMediaId);
        if (media) {
          const resolvedUrl = `${apiUrl}/storage/files/${media.filePath}`;
          console.log('✅ Resolved contentMediaId:', { contentMediaId, filePath: media.filePath, url: resolvedUrl });
          return resolvedUrl;
        }
        console.warn('⚠️ Failed to resolve contentMediaId:', contentMediaId, 'Available:', attachedMedia.map(m => m.contentMediaId));
        return ''; // Return empty string if not found
      },
    };
  }, [attachedMedia]);

  return (
    <SimpleViewer
      value={content}
      className="pink-theme"
      injectMediaUrl={injectMediaUrl}
    />
  );
};
