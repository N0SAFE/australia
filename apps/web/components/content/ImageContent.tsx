'use client';

import { FC, useState } from 'react';
import Image from 'next/image';
import { ContentMetadata } from '@/types/capsule';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ImageContent: FC<{
  url: string;
  metadata?: ContentMetadata;
}> = ({ url, metadata }) => {
  const [zoom, setZoom] = useState(1);

  const handleDownload = () => {
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="relative overflow-hidden rounded-lg">
        <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}>
          {metadata?.width && metadata?.height ? (
            <Image
              src={url}
              alt="Capsule content"
              width={metadata.width}
              height={metadata.height}
              className="max-w-full h-auto"
            />
          ) : (
            <img
              src={url}
              alt="Capsule content"
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

      {metadata && (
        <div className="text-sm text-gray-500">
          {metadata.width && metadata.height && (
            <span>{metadata.width} × {metadata.height}px</span>
          )}
          {metadata.size && (
            <span className="ml-2">• {(metadata.size / 1024).toFixed(2)} KB</span>
          )}
        </div>
      )}
    </div>
  );
};
