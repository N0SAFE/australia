'use client';

import { FC } from 'react';
import { Capsule } from '@/types/capsule';
import { PlateContentRenderer } from './PlateContentRenderer';

/**
 * ContentRenderer - renders capsule content using Plate.js
 * Content is stored as Plate.js JSON and can contain text, images, videos, and audio
 */
export const ContentRenderer: FC<{
  capsule: Capsule;
}> = ({ capsule }) => {
  return <PlateContentRenderer content={capsule.content} />;
};
