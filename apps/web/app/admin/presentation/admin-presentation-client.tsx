'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@repo/ui/components/shadcn/card';
import { Upload, Video, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { orpc } from '@/lib/orpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function AdminPresentationClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current video
  const { data: currentVideo } = useQuery(orpc.presentation.getCurrent.queryOptions({
    input: {},
  }));

  // Use ORPC mutation for uploading
  const uploadMutation = useMutation(orpc.presentation.upload.mutationOptions({
    onSuccess: () => {
      toast.success('Presentation video uploaded successfully');
      setSelectedFile(null);
      setPreviewUrl(null);
      // Invalidate and refetch current video
      queryClient.invalidateQueries({ 
        queryKey: orpc.presentation.getCurrent.queryKey({ input: {} }) 
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to upload video');
    },
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
      await uploadMutation.mutateAsync({
        file: selectedFile,
      });
    } catch (error) {
      // Error already handled by onError in mutation options
      console.error('Upload error:', error);
    }
  };

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
              disabled={uploadMutation.isPending}
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

                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    size="lg"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Video
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setSelectedFile(null)}
                    disabled={uploadMutation.isPending}
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

        {currentVideo && !selectedFile && (
          <Card className="p-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Current Presentation Video</h2>
              <div className="max-w-3xl mx-auto">
                <video
                  controls
                  muted
                  className="w-full rounded-lg shadow-lg"
                  src="/api/nest/presentation/video"
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
              <li>Maximum file size: Limited by server configuration</li>
              <li>The video will be available immediately after upload</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
