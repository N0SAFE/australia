"use client";

import { FC, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Capsule } from "@/types/capsule";
import { getPath } from "@/lib/orpc/utils/getPath";
import { appContract } from "@repo/api-contracts";
import { validateEnvPath } from "#/env";

const SimpleEditor = dynamic(
  () =>
    import("@/components/tiptap/editor").then(
      (mod) => ({ default: mod.SimpleEditor }),
    ),
  { ssr: false },
);

const SimpleViewer = dynamic(
  () =>
    import("@/components/tiptap/viewer").then(
      (mod) => ({ default: mod.SimpleViewer }),
    ),
  { ssr: false },
);

interface TipTapContentRendererProps {
  mode: 'editor' | 'viewer';
  value: any;
  onChange?: (newValue: any) => void;
  capsule: Capsule | null | undefined;
  placeholder?: string;
  onEditorReady?: () => void;
}

export const TipTapContentRenderer: FC<TipTapContentRendererProps> = ({
  mode,
  value,
  onChange,
  capsule,
  placeholder = "Écrivez le contenu de votre capsule temporelle...",
  onEditorReady,
}) => {
  const API_URL = validateEnvPath(
    process.env.NEXT_PUBLIC_API_URL ?? "",
    "NEXT_PUBLIC_API_URL"
  );

  /**
   * Resolve media URL based on strategy meta
   * The node views pass strategy.meta directly to these strategy functions
   * @param mediaType - Type of media (image, video, audio, file)
   * @param meta - The strategy meta object containing contentMediaId
   */
  const resolveMediaUrl = useCallback(async (
    mediaType: 'image' | 'video' | 'audio' | 'file', 
    meta: any
  ): Promise<string> => {
    console.log(`🔵 [${mediaType}] Strategy called with meta:`, meta);
    
    // Check for contentMediaId in meta
    if (!meta?.contentMediaId) {
      console.warn(`⚠️ [${mediaType}] No contentMediaId in meta`);
      return "";
    }
    
    // Look up in attachedMedia to get fileId
    const media = capsule?.attachedMedia?.find((m: any) => m.contentMediaId === meta.contentMediaId);
    if (!media) {
      console.warn(`⚠️ [${mediaType}] contentMediaId not found in attachedMedia:`, meta.contentMediaId);
      return "";
    }
    
    // Map media type to the correct contract
    const contractMap = {
      image: appContract.storage.getImage,
      video: appContract.storage.getVideo,
      audio: appContract.storage.getAudio,
      file: appContract.storage.getRawFile,
    };
    
    const url = getPath(
      contractMap[mediaType],
      { fileId: media.fileId },
      { baseURL: API_URL }
    );
    console.log(`✅ [${mediaType}] URL resolved:`, url);
    return url;
  }, [capsule?.attachedMedia, API_URL]);

  // Strategy functions for each media type
  // These receive meta directly from the node views (e.g., ImageNodeView passes strategy.meta)
  const imageStrategy = useCallback((meta: any) => resolveMediaUrl('image', meta), [resolveMediaUrl]);
  const videoStrategy = useCallback((meta: any) => resolveMediaUrl('video', meta), [resolveMediaUrl]);
  const audioStrategy = useCallback((meta: any) => resolveMediaUrl('audio', meta), [resolveMediaUrl]);
  const fileStrategy = useCallback((meta: any) => resolveMediaUrl('file', meta), [resolveMediaUrl]);

  // Upload functions - only for editor mode
  const uploadFunctions = useMemo(() => {
    if (mode !== 'editor') return undefined;
    
    return {
      image: async (file: File) => {
        const contentMediaId = crypto.randomUUID();
        const blobUrl = URL.createObjectURL(file);
        
        console.log('📤 [Image Upload] Created blob URL:', { contentMediaId, blobUrl });
        
        return {
          url: blobUrl,
          meta: {
            // For useFileUpload validation
            contentMediaId,
            // For BaseUploadNode to build strategy structure
            strategyName: 'api',
            strategyMeta: { contentMediaId }
          }
        };
      },
      video: async (file: File) => {
        const contentMediaId = crypto.randomUUID();
        const blobUrl = URL.createObjectURL(file);
        
        console.log('📤 [Video Upload] Created blob URL:', { contentMediaId, blobUrl });
        
        return {
          url: blobUrl,
          meta: {
            // For useFileUpload validation
            contentMediaId,
            // For BaseUploadNode to build strategy structure
            strategyName: 'api',
            strategyMeta: { contentMediaId }
          }
        };
      },
      audio: async (file: File) => {
        const contentMediaId = crypto.randomUUID();
        const blobUrl = URL.createObjectURL(file);
        
        console.log('📤 [Audio Upload] Created blob URL:', { contentMediaId, blobUrl });
        
        return {
          url: blobUrl,
          meta: {
            // For useFileUpload validation
            contentMediaId,
            // For BaseUploadNode to build strategy structure
            strategyName: 'api',
            strategyMeta: { contentMediaId }
          }
        };
      },
    };
  }, [mode]);

  // Common props shared between editor and viewer
  const commonProps = {
    value,
    imageStrategy,
    videoStrategy,
    audioStrategy,
    fileStrategy,
  };

  if (mode === 'editor') {
    return (
      <SimpleEditor
        {...commonProps}
        onChange={onChange}
        editable={true}
        placeholder={placeholder}
        uploadFunctions={uploadFunctions}
        onEditorReady={onEditorReady}
      />
    );
  }

  return <SimpleViewer {...commonProps} />;
};
