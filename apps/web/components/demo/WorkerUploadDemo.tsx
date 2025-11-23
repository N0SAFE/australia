"use client";

import { useState } from "react";
import { orpc } from "@/lib/orpc";
import { Button } from "@repo/ui/components/shadcn/button";
import { Progress } from "@repo/ui/components/shadcn/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/shadcn/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api-url";

/**
 * Demo component showing Web Worker-based file upload via ORPC
 * This component demonstrates:
 * - File selection
 * - Upload progress tracking (built-in worker)
 * - Result display with image preview
 * - Separation of upload and data retrieval
 *
 * All file uploads now use background workers automatically via ORPC's
 * withFileUploads wrapper - no need for separate useWorkerUploadFile hook
 */
export function WorkerUploadDemo() {
  const upload = useMutation(
    orpc.storage.uploadImage.mutationOptions({
      context: {
        onProgress: (event) => {
          setUploadProgress(event.percentage);
        },
      },
    }),
  );
  
  // Fetch image data after successful upload
  const imageData = useQuery(
    orpc.storage.getImageData.queryOptions({
      input: {
        fileId: upload.data?.fileId ?? "",
      },
      enabled: !!upload.data?.fileId,
    }),
  );
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Construct image URL from fileId
  const imageUrl = upload.data?.fileId 
    ? `${getApiUrl()}/storage/image/${upload.data.fileId}`
    : null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      setUploadProgress(0);
      upload.mutate({ file: selectedFile });
    }
  };

  const handleReset = () => {
    upload.reset();
    setSelectedFile(null);
    setUploadProgress(0);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Web Worker File Upload Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Selection */}
        <div className="space-y-2">
          <label
            htmlFor="file-input"
            className="block text-sm font-medium text-gray-700"
          >
            Select an image file:
          </label>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={upload.isPending}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {selectedFile && (
            <p className="text-sm text-gray-600">
              Selected: {selectedFile.name} (
              {(selectedFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || upload.isPending}
          >
            {upload.isPending ? "Uploading..." : "Upload"}
          </Button>
          {(upload.data || upload.error) && (
            <Button onClick={handleReset} variant="outline">
              Reset
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        {upload.isPending && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress.toFixed(1)}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Success Display */}
        {upload.data && (
          <div className="rounded-lg bg-green-50 p-4 space-y-2">
            <h3 className="font-medium text-green-900">Upload Successful!</h3>
            <dl className="text-sm space-y-1">
              <div>
                <dt className="inline font-medium text-green-800">
                  Filename:{" "}
                </dt>
                <dd className="inline text-green-700">
                  {upload.data.filename}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-green-800">Size: </dt>
                <dd className="inline text-green-700">
                  {(upload.data.size / 1024).toFixed(2)} KB
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-green-800">Type: </dt>
                <dd className="inline text-green-700">
                  {upload.data.mimeType}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-green-800">File ID: </dt>
                <dd className="inline text-green-700 font-mono text-xs">
                  {upload.data.fileId}
                </dd>
              </div>
            </dl>
            {imageUrl && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-green-800">Preview:</p>
                {imageData.isLoading && (
                  <p className="text-sm text-green-700">Loading image...</p>
                )}
                {imageData.isError && (
                  <p className="text-sm text-red-600">
                    Failed to load image preview: {imageData.error.message}
                  </p>
                )}
                {!imageData.isLoading && !imageData.isError && (
                  <img
                    src={imageUrl}
                    alt={upload.data.filename}
                    className="max-w-full h-auto rounded-md border border-green-300"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {upload.error && (
          <div className="rounded-lg bg-red-50 p-4">
            <h3 className="font-medium text-red-900">Upload Failed</h3>
            <p className="text-sm text-red-700 mt-1">{upload.error.message}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium mb-2">✨ Web Worker Benefits:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Upload runs in background thread (UI stays responsive)</li>
            <li>Real-time progress tracking</li>
            <li>Easy cancellation support</li>
            <li>Handles large files without freezing the page</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
