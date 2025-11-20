"use client";

/**
 * VideoProgressTracker - Real-time video processing progress tracker
 *
 * This component:
 * 1. Extracts video ID from node attributes (fileId or srcUrlId)
 * 2. Subscribes to real-time processing status via ORPC SSE
 * 3. Displays progress using the provided renderProgress callback
 * 4. Success: Shows toast + success icon, disappears after 3 seconds
 * 5. Error: Shows error icon, logs to console, stays for 10 seconds
 */
"use client";

import { useState, useEffect, type ComponentType } from "react";
import type {
  ProcessingProgress,
  VideoProgressComponentProps,
} from "@repo/ui/components/tiptap-node/video-node";
import { useVideoProcessing } from "@/hooks/useStorage";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc/index";

/**
 * VideoProgressTracker - Real-time video processing progress tracker
 *
 * This component:
 * 1. Extracts video ID from node attributes (fileId)
 * 2. Subscribes to real-time processing status via ORPC SSE
 * 3. Displays progress using the provided renderProgress callback
 * 4. Shows success toast and hides after 3 seconds on completion
 * 5. Shows error in console, keeps visible for 10 seconds on failure
 */
export const VideoProgressTracker: ComponentType<
  VideoProgressComponentProps
> = ({ attrs, renderProgress }) => {
  const { meta } = attrs;
  const fileId = typeof meta === "object" && meta !== null && "fileId" in meta && typeof meta.fileId === "string"
    ? meta.fileId
    : '';

  const { data: fileData, isFetched } = useQuery(
    orpc.storage.getVideoData.queryOptions({ input: { fileId }, enabled: !!fileId }),
  );

  const [isVisible, setIsVisible] = useState(true);
  
  console.log('call useVideoProcessing', !!(fileId && fileData && !fileData.isProcessed))
  console.log({
    fileId, fileData, isProcessed: fileData?.isProcessed
  })

  // Subscribe to video processing progress via ORPC SSE
  const {
    data: processingData,
    isFetching,
    isError,
    error,
  } = useVideoProcessing(fileId, {
    enabled: !!(fileId && fileData && !fileData.isProcessed),
  });

  console.log({
    processingData,
    isFetching,
    isError,
    error,
  });

  // Handle completion - 3 second timeout
  useEffect(() => {
    if (!isFetching && processingData) {
      toast.success("Video processing completed!", {
        icon: <CheckCircle className="h-5 w-5" />,
      });

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isFetching, processingData]);

  // Handle error state
  useEffect(() => {
    if (isError) {
      // Log error to console with full error object
      console.error("Video processing failed:", {
        fileId,
        error,
        errorMessage: error?.message,
        errorString: String(error),
        timestamp: new Date().toISOString(),
      });

      // Show error toast
      toast.error("Video processing failed", {
        icon: <XCircle className="h-5 w-5" />,
        description: error?.message || "An error occurred during processing",
      });

      // Keep visible for 10 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isError, error, fileId]);

  // Don't render if not visible or no data
  if (!isVisible || !processingData) {
    return null;
  }

  // Convert processing data to ProcessingProgress format
  // Infer status from query state: pending, error, or completed
  const status = isFetching ? "processing" : isError ? "failed" : "completed";

  const progress: ProcessingProgress = {
    progress: processingData.progress,
    status,
    message: processingData.message,
    error: isError
      ? error?.message || "An error occurred during processing"
      : undefined,
  };

  // Render using the provided renderProgress function
  return <>{renderProgress(progress, isVisible)}</>;
};
