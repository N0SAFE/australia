'use client';

import * as React from 'react';
import { Image, Video, Music, Loader2 } from 'lucide-react';
import { Progress } from '@repo/ui/components/shadcn/progress';
import { cn } from '@/lib/utils';

interface MediaUploadOverlayProps {
  type: 'image' | 'video' | 'audio';
  progress: number;
  processingProgress?: number;
  isProcessing?: boolean;
  filename?: string;
}

export function MediaUploadOverlay({
  type,
  progress,
  processingProgress,
  isProcessing,
  filename,
}: MediaUploadOverlayProps) {
  const Icon = type === 'image' ? Image : type === 'video' ? Video : Music;
  const label = type === 'image' ? 'Image' : type === 'video' ? 'Video' : 'Audio';
  
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-lg bg-card p-6 shadow-lg border">
        {/* Header with icon */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            isProcessing ? "bg-orange-100 dark:bg-orange-900/20" : "bg-primary/10"
          )}>
            {isProcessing ? (
              <Loader2 className="h-6 w-6 animate-spin text-orange-600 dark:text-orange-400" />
            ) : (
              <Icon className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">
              {isProcessing ? `Processing ${label}` : `Uploading ${label}`}
            </h3>
            {filename && (
              <p className="text-xs text-muted-foreground truncate">{filename}</p>
            )}
          </div>
        </div>

        {/* Upload progress */}
        {!isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Upload Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Processing progress (for videos) */}
        {isProcessing && processingProgress !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Server Processing</span>
              <span className="font-medium">{Math.round(processingProgress)}%</span>
            </div>
            <Progress value={processingProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Converting video for optimal playback...
            </p>
          </div>
        )}

        {/* Status message */}
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs text-center text-muted-foreground">
            {isProcessing 
              ? 'This may take a few moments. You can continue editing while processing completes.'
              : 'Please wait while your file is being uploaded...'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
