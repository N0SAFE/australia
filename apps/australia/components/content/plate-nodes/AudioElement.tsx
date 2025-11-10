'use client';

import type { TElement } from 'platejs';

// Plate.js audio node structure (custom node type)
export type AudioPlateElement = TElement & {
  type: 'audio';
  url: string;
  mimeType?: string;
  duration?: number; // in seconds
  size?: number; // in bytes
};

/**
 * Custom Plate.js audio renderer with audio player
 * Preserves the nice UI from the original AudioContent component
 */
export function AudioElement({
  element,
  children,
}: {
  element: AudioPlateElement;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-4 my-4" contentEditable={false}>
      <div className="w-full max-w-2xl bg-linear-to-r from-pink-100 to-pink-200 rounded-lg p-6">
        <audio
          controls
          className="w-full"
        >
          <source src={element.url} type={element.mimeType || 'audio/mpeg'} />
          Votre navigateur ne supporte pas la lecture audio.
        </audio>
      </div>

      {(element.duration || element.size) && (
        <div className="text-sm text-gray-500">
          {element.duration && (
            <span>
              Durée: {Math.floor(element.duration / 60)}:{(element.duration % 60).toString().padStart(2, '0')}
            </span>
          )}
          {element.size && (
            <span className="ml-2">• {(element.size / 1024).toFixed(2)} KB</span>
          )}
        </div>
      )}
      
      {/* Plate.js requires children for proper editor functionality */}
      <div style={{ display: 'none' }}>{children}</div>
    </div>
  );
}
