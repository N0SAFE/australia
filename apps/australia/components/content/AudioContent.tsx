'use client';

import { FC } from 'react';
import { ContentMetadata } from '@/types/capsule';

export const AudioContent: FC<{
  url: string;
  metadata?: ContentMetadata;
}> = ({ url, metadata }) => {
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="w-full max-w-2xl bg-gradient-to-r from-pink-100 to-pink-200 rounded-lg p-6">
        <audio
          controls
          className="w-full"
        >
          <source src={url} type={metadata?.mimeType || 'audio/mpeg'} />
          Votre navigateur ne supporte pas la lecture audio.
        </audio>
      </div>

      {metadata && (
        <div className="text-sm text-gray-500">
          {metadata.duration && (
            <span>Durée: {Math.floor(metadata.duration / 60)}:{(metadata.duration % 60).toString().padStart(2, '0')}</span>
          )}
          {metadata.size && (
            <span className="ml-2">• {(metadata.size / 1024).toFixed(2)} KB</span>
          )}
        </div>
      )}
    </div>
  );
};
