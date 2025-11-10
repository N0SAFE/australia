'use client';

import type { TElement } from 'platejs';

// Plate.js video node structure
export type VideoPlateElement = TElement & {
  type: 'video';
  url: string;
  mimeType?: string;
  thumbnail?: string;
  duration?: number; // in seconds
  size?: number; // in bytes
};

/**
 * Custom Plate.js video renderer with video player controls
 * Preserves the nice UI from the original VideoContent component
 */
export function VideoElement({
  element,
  children,
}: {
  element: VideoPlateElement;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-4 my-4" contentEditable={false}>
      <video
        controls
        className="w-full max-w-3xl rounded-lg"
        poster={element.thumbnail}
      >
        <source src={element.url} type={element.mimeType || 'video/mp4'} />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>

      {(element.duration || element.size) && (
        <div className="text-sm text-gray-500">
          {element.duration && (
            <span>
              Durée: {Math.floor(element.duration / 60)}:{(element.duration % 60).toString().padStart(2, '0')}
            </span>
          )}
          {element.size && (
            <span className="ml-2">• {(element.size / 1024 / 1024).toFixed(2)} MB</span>
          )}
        </div>
      )}
      
      {/* Plate.js requires children for proper editor functionality */}
      <div style={{ display: 'none' }}>{children}</div>
    </div>
  );
}
