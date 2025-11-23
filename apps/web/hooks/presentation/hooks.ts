'use client'

import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FileUploadProgressEvent, FileUploadContext } from "@/lib/orpc/withFileUploads";

/**
 * Hook to upload presentation video with progress tracking
 * Uses TanStack Query useMutation with custom mutationFn that calls ORPC with context.onProgress
 * Adds uploadProgress property for real-time upload tracking
 *
 * @example
 * ```tsx
 * const uploadMutation = useUploadPresentation()
 *
 * // Call with file and progress tracking
 * uploadMutation.mutate({ file })
 *
 * // Access upload progress
 * <Progress value={uploadMutation.uploadProgress} />
 * ```
 */
export function useUploadPresentation() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (variables: { file: File }) => {
      // Reset progress at start
      setUploadProgress(0);

      // Call ORPC with context.onProgress for upload tracking
      // The withFileUploads wrapper enhances routes with z.file() to accept FileUploadContext
      return await orpc.presentation.upload.call(variables, {
        context: {
          onProgress: (progressEvent: FileUploadProgressEvent) => {
            setUploadProgress(progressEvent.percentage);
          },
        },
      });
    },
    onSuccess: (data) => {
      // Invalidate presentation queries to refetch updated data
      queryClient.invalidateQueries({
        queryKey: orpc.presentation.getCurrent.queryKey({ input: {} }),
      });

      toast.success(`Presentation uploaded successfully: ${data.filename}`);
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(`Upload failed: ${errorMessage}`);
    },
  });

  return {
    ...mutation,
    uploadProgress,
  };
}

type ProcessingProgress = {
  progress: number;
  status: "processing" | "completed" | "failed";
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  isProcessed: boolean;
  error: string | null;
};

/**
 * Hook to subscribe to video processing progress updates
 * Uses ORPC experimental_liveOptions with TanStack Query for real-time SSE updates
 */
export function useSubscribeProcessingProgress(enabled: boolean = false) {
  const query = useQuery(
    orpc.presentation.subscribeProcessingProgress.experimental_liveOptions({
      input: {},
      enabled,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    }),
  );

  return query;
}

/**
 * Composite hook for all presentation operations
 */
export function usePresentation() {
  const uploadPresentation = useUploadPresentation();

  return {
    // Upload
    mutateAsync: uploadPresentation.mutateAsync,
    reset: uploadPresentation.reset,

    // States
    isPending: uploadPresentation.isPending,
    uploadProgress: uploadPresentation.uploadProgress,
    error: uploadPresentation.error,
    data: uploadPresentation.data,
  };
}
