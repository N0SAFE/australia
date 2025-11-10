'use client';

import { FC } from 'react';
import { ContentMetadata } from '@/types/capsule';

export const VideoContent: FC<{
  url: string;
  metadata?: ContentMetadata;
}> = ({ url, metadata }) => {
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <video
        controls
        className="w-full max-w-3xl rounded-lg"
        poster={metadata?.thumbnail}
      >
        <source src={url} type={metadata?.mimeType || 'video/mp4'} />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>

      {metadata && (
        <div className="text-sm text-gray-500">
          {metadata.duration && (
            <span>Durée: {Math.floor(metadata.duration / 60)}:{(metadata.duration % 60).toString().padStart(2, '0')}</span>
          )}
          {metadata.size && (
            <span className="ml-2">• {(metadata.size / 1024 / 1024).toFixed(2)} MB</span>
          )}
        </div>
      )}
    </div>
  );
};
