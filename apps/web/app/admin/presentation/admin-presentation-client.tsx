'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@repo/ui/components/shadcn/card';
import { Upload, Video, Trash2, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { orpc } from '@/lib/orpc';
import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/lib/api-url';
import { Progress } from '@repo/ui/components/shadcn/progress';
import { useUploadPresentation, useSubscribeProcessingProgress } from '@/hooks/presentation/hooks';

export function AdminPresentationClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use the upload presentation hook with progress tracking
  const uploadPresentationMutation = useUploadPresentation();
  
  // Subscribe to video processing progress
  const { data: processingProgress, error: processingError } = useSubscribeProcessingProgress(isProcessing);

  // Fetch current video
  const { data: currentVideo } = useQuery(orpc.presentation.getCurrent.queryOptions({
    input: {},
  }));

  // Create preview URL when file is selected
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((file) => file.type.startsWith('video/'));

    if (videoFile) {
      setSelectedFile(videoFile);
    } else {
      toast.error('Please select a video file');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
    } else {
      toast.error('Please select a video file');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      // Use the upload presentation hook - it handles progress and cache invalidation internally
      await uploadPresentationMutation.mutateAsync({ file: selectedFile });
      
      // Success - start subscribing to processing progress
      setIsProcessing(true);
      toast.success('Upload complete! Video processing started...');
      
      // Clean up selection
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      // Error is already handled by the hook with toast
      console.error('Upload error:', error);
    }
  };
  
  // Stop processing subscription when completed or failed
  useEffect(() => {
    if (processingProgress?.status === 'completed') {
      setIsProcessing(false);
      toast.success('Video processing completed successfully!');
    } else if (processingProgress?.status === 'failed') {
      setIsProcessing(false);
      toast.error('Video processing failed');
    }
  }, [processingProgress?.status]);
  
  // Log and display processing errors
  useEffect(() => {
    if (processingError) {
      console.error('Processing progress error:', processingError);
      console.error('Error details:', JSON.stringify(processingError, null, 2));
      toast.error(`Processing error: ${processingError.message || 'Unknown error'}`);
      setIsProcessing(false);
    }
  }, [processingError]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Presentation Video</h1>
          <p className="text-muted-foreground mt-2">
            Upload or replace the main presentation video
          </p>
        </div>

        <Card className="p-8">
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-12 text-center
              transition-colors duration-200
              ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'}
              ${selectedFile ? 'bg-accent/50' : 'hover:border-primary hover:bg-accent/30'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              id="video-upload"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadPresentationMutation.isPending}
            />

            {!selectedFile ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    Drop your video here or click to browse
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Supports MP4, WebM, and other video formats
                  </p>
                </div>

                <Button
                  onClick={() => document.getElementById('video-upload')?.click()}
                  variant="outline"
                  size="lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select Video
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {previewUrl && (
                  <div className="max-w-2xl mx-auto">
                    <video
                      controls
                      muted
                      className="w-full rounded-lg shadow-lg"
                      src={previewUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{selectedFile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type}
                  </p>
                </div>

                {/* Upload Progress */}
                {uploadPresentationMutation.isPending && (
                  <div className="space-y-3">
                    <Progress value={uploadPresentationMutation.uploadProgress} className="w-full" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {uploadPresentationMutation.uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
                      </span>
                      <span className="font-medium">{Math.round(uploadPresentationMutation.uploadProgress)}%</span>
                    </div>
                    {uploadPresentationMutation.uploadProgress === 100 && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing video on server...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Error */}
                {uploadPresentationMutation.error && !uploadPresentationMutation.isPending && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{uploadPresentationMutation.error.message}</span>
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={handleUpload}
                    disabled={uploadPresentationMutation.isPending}
                    size="lg"
                  >
                    {uploadPresentationMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading... {Math.round(uploadPresentationMutation.uploadProgress)}%
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Video
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      setSelectedFile(null);
                    }}
                    disabled={uploadPresentationMutation.isPending}
                    variant="outline"
                    size="lg"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Video Processing Error */}
        {processingError && (
          <Card className="p-6 border-destructive">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-destructive">Processing Stream Error</h3>
                  <p className="text-sm text-muted-foreground">
                    {processingError.message || 'Unknown error occurred'}
                  </p>
                  {processingError instanceof Error && processingError.stack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View error details
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-64">
                        {JSON.stringify(processingError, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Video Processing Progress */}
        {isProcessing && processingProgress && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Video Processing</h2>
                <div className="flex items-center gap-2">
                  {processingProgress.status === 'processing' && (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  )}
                  {processingProgress.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  {processingProgress.status === 'failed' && (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium capitalize">
                    {processingProgress.status}
                  </span>
                </div>
              </div>
              
              <Progress value={processingProgress.progress} className="w-full" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{processingProgress.message}</span>
                <span className="font-medium">{Math.round(processingProgress.progress)}%</span>
              </div>
              
              {processingProgress.metadata && processingProgress.status !== 'completed' && (
                <div className="text-xs text-muted-foreground">
                  <pre className="bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(processingProgress.metadata, null, 2)}
                  </pre>
                </div>
              )}
              
              {processingProgress.error && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{processingProgress.error}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {currentVideo && !selectedFile && (
          <Card className="p-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Current Presentation Video</h2>
              <div className="max-w-3xl mx-auto">
                <video
                  controls
                  muted
                  className="w-full rounded-lg shadow-lg"
                  src={getApiUrl('/presentation/video')}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">{currentVideo.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(currentVideo.size)} • {currentVideo.mimeType}
                </p>
                {currentVideo.duration && (
                  <p className="text-sm text-muted-foreground">
                    Duration: {Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')}
                  </p>
                )}
                {currentVideo.width && currentVideo.height && (
                  <p className="text-sm text-muted-foreground">
                    Resolution: {currentVideo.width}x{currentVideo.height}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Uploaded: {new Date(currentVideo.uploadedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-muted/50">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Video className="w-4 h-4" />
              Important Notes
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
              <li>Uploading a new video will replace the existing one</li>
              <li>Recommended video format: MP4 (H.264 codec)</li>
              <li>Maximum file size: 500MB (enforced by server)</li>
              <li>Upload timeout: 10 minutes for large files</li>
              <li>The video will be available immediately after upload</li>
              <li>Progress bar shows upload status - do not close this page during upload</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
