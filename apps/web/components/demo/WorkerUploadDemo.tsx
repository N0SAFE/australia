'use client'

import { useState } from 'react'
import { useWorkerUploadImage } from '@/hooks/useWorkerFileUpload'
import { Button } from '@repo/ui/button'
import { Progress } from '@repo/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'

/**
 * Demo component showing Web Worker-based file upload
 * This component demonstrates:
 * - File selection
 * - Upload progress tracking
 * - Cancellation support
 * - Result display
 */
export function WorkerUploadDemo() {
  const upload = useWorkerUploadImage()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      upload.mutate(selectedFile)
    }
  }

  const handleCancel = () => {
    upload.cancel()
    setSelectedFile(null)
  }

  const handleReset = () => {
    upload.reset()
    setSelectedFile(null)
  }

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
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || upload.isPending}
          >
            {upload.isPending ? 'Uploading...' : 'Upload'}
          </Button>
          {upload.isPending && (
            <Button onClick={handleCancel} variant="destructive">
              Cancel Upload
            </Button>
          )}
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
              <span>{upload.uploadProgress.toFixed(1)}%</span>
            </div>
            <Progress value={upload.uploadProgress} className="w-full" />
          </div>
        )}

        {/* Success Display */}
        {upload.data && (
          <div className="rounded-lg bg-green-50 p-4 space-y-2">
            <h3 className="font-medium text-green-900">Upload Successful!</h3>
            <dl className="text-sm space-y-1">
              <div>
                <dt className="inline font-medium text-green-800">Filename: </dt>
                <dd className="inline text-green-700">{upload.data.filename}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-green-800">Size: </dt>
                <dd className="inline text-green-700">
                  {(upload.data.size / 1024).toFixed(2)} KB
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-green-800">Type: </dt>
                <dd className="inline text-green-700">{upload.data.mimeType}</dd>
              </div>
            </dl>
            {upload.data.url && (
              <div className="mt-4">
                <img
                  src={upload.data.url}
                  alt={upload.data.filename}
                  className="max-w-full h-auto rounded-md"
                />
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
  )
}
