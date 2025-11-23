'use client';

import React, { createContext, useContext } from 'react';

/**
 * Attached media metadata from capsule API responses
 * Used for resolving contentMediaId to file paths in media renderers
 */
export interface AttachedMedia {
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
}

interface AttachedMediaContextValue {
  attachedMedia: AttachedMedia[];
}

const AttachedMediaContext = createContext<AttachedMediaContextValue | null>(null);

export interface AttachedMediaProviderProps {
  children: React.ReactNode;
  attachedMedia: AttachedMedia[];
}

/**
 * Provider for attached media context
 * Makes attachedMedia available to all media renderer components
 * 
 * Usage:
 * - In create page: provide empty array initially
 * - In edit page: provide attachedMedia from API response
 * - In viewer: provide attachedMedia from capsule data
 */
export function AttachedMediaProvider({ children, attachedMedia }: AttachedMediaProviderProps) {
  return (
    <AttachedMediaContext.Provider value={{ attachedMedia }}>
      {children}
    </AttachedMediaContext.Provider>
  );
}

/**
 * Hook to access attached media context
 * Returns attachedMedia array for resolving contentMediaIds
 */
export function useAttachedMedia(): AttachedMediaContextValue {
  const context = useContext(AttachedMediaContext);
  
  if (!context) {
    // Return empty array if context not provided
    // This allows components to work without context (graceful fallback)
    console.warn('useAttachedMedia used outside AttachedMediaProvider - returning empty array');
    return { attachedMedia: [] };
  }
  
  return context;
}

/**
 * Helper to resolve contentMediaId to file path
 */
export function useResolveMediaUrl(): (contentMediaId: string | undefined) => string | null {
  const { attachedMedia } = useAttachedMedia();
  
  return React.useCallback((contentMediaId: string | undefined): string | null => {
    if (!contentMediaId) {
      console.warn('No contentMediaId provided for resolution');
      return null;
    }
    
    const media = attachedMedia.find(m => m.contentMediaId === contentMediaId);
    
    if (!media) {
      console.warn(`No media found for contentMediaId: ${contentMediaId}`);
      return null;
    }
    
    // Return full URL for the file
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    return `${apiUrl}/storage/files/${media.filePath}`;
  }, [attachedMedia]);
}
