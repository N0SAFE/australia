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

  return (
    <SimpleViewer
      value={content}
      injectMediaUrl={{
        api: (src) => `${process.env.NEXT_PUBLIC_API_URL || ''}${src}`
      }}
    />
  );
};
