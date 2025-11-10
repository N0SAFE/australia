'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TElement } from 'platejs';

// Plate.js image node structure
export type ImagePlateElement = TElement & {
  type: 'img';
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  size?: number; // in bytes
};

/**
 * Custom Plate.js image renderer with zoom and download features
 * Preserves the nice UI from the original ImageContent component
 */
export function ImageElement({
  element,
  children,
}: {
  element: ImagePlateElement;
  children: React.ReactNode;
}) {
  const [zoom, setZoom] = useState(1);

  const handleDownload = () => {
    window.open(element.url, '_blank');
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 my-4" contentEditable={false}>
      <div className="relative overflow-hidden rounded-lg">
        <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}>
          {element.width && element.height ? (
            <Image
              src={element.url}
              alt={element.alt || 'Capsule image'}
              width={element.width}
              height={element.height}
              className="max-w-full h-auto"
            />
          ) : (
            <img
              src={element.url}
              alt={element.alt || 'Capsule image'}
              className="max-w-full h-auto"
            />
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
          disabled={zoom <= 0.5}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
          disabled={zoom >= 3}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
        >
          <Download className="w-4 h-4 mr-2" />
          Télécharger
        </Button>
      </div>

      {(element.width || element.height || element.size) && (
        <div className="text-sm text-gray-500">
          {element.width && element.height && (
            <span>{element.width} × {element.height}px</span>
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
