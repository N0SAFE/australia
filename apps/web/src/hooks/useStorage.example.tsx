/**
 * Example: File Upload Component
 * 
 * This file demonstrates how to use the storage hooks for file uploads.
 * Copy this pattern into your actual components.
 */

'use client'

import { useUploadImage, useUploadVideo, useUploadAudio, useStorageActions } from '@/hooks/useStorage'
import { useState } from 'react'

// Example 1: Simple image upload
export function SimpleImageUpload() {
  const { mutate: uploadImage, isPending } = useUploadImage()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadImage({ file })
    }
  }

  return (
    <div>
      <input 
        type="file" 
        accept="image/*"
        onChange={handleFileChange}
        disabled={isPending}
      />
      {isPending && <p>Uploading...</p>}
    </div>
  )
}

// Example 2: Image upload with preview
export function ImageUploadWithPreview() {
  const { mutate: uploadImage, isPending, data } = useUploadImage()
  const [preview, setPreview] = useState<string>()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload file
      uploadImage({ file })
    }
  }

  return (
    <div>
      <input 
        type="file" 
        accept="image/*"
        onChange={handleFileChange}
        disabled={isPending}
      />
      {preview && <img src={preview} alt="Preview" style={{ maxWidth: 200 }} />}
      {isPending && <p>Uploading...</p>}
      {data && (
        <div>
          <p>Uploaded successfully!</p>
          <p>Filename: {data.filename}</p>
          <p>Path: {data.path}</p>
          <p>Size: {(data.size / 1024).toFixed(2)} KB</p>
        </div>
      )}
    </div>
  )
}

// Example 3: Multiple file types with unified actions
export function MultipleFileTypeUpload() {
  const { 
    uploadImage, 
    uploadVideo, 
    uploadAudio,
    isLoading,
    errors 
  } = useStorageActions()

  const [fileType, setFileType] = useState<'image' | 'video' | 'audio'>('image')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      switch (fileType) {
        case 'image':
          uploadImage({ file })
          break
        case 'video':
          uploadVideo({ file })
          break
        case 'audio':
          uploadAudio({ file })
          break
      }
    }
  }

  const isAnyLoading = isLoading.image || isLoading.video || isLoading.audio
  const currentError = errors[fileType]

  return (
    <div>
      <select value={fileType} onChange={(e) => setFileType(e.target.value as any)}>
        <option value="image">Image</option>
        <option value="video">Video</option>
        <option value="audio">Audio</option>
      </select>

      <input 
        type="file" 
        accept={
          fileType === 'image' ? 'image/*' :
          fileType === 'video' ? 'video/*' :
          'audio/*'
        }
        onChange={handleFileChange}
        disabled={isAnyLoading}
      />

      {isAnyLoading && <p>Uploading {fileType}...</p>}
      {currentError && <p style={{ color: 'red' }}>{currentError.message}</p>}
    </div>
  )
}

// Example 4: Async upload with error handling
export function AsyncUploadExample() {
  const { mutateAsync: uploadImage } = useUploadImage()
  const [status, setStatus] = useState<string>()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setStatus('Uploading...')
      const result = await uploadImage({ file })
      setStatus(`Success! File available at: ${result.path}`)
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleUpload} />
      {status && <p>{status}</p>}
    </div>
  )
}

// Example 5: Form with controlled upload
export function FormWithUpload() {
  const { mutate: uploadImage, isPending, data: uploadResult } = useUploadImage()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageFile: null as File | null,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.imageFile) {
      uploadImage({ file: formData.imageFile }, {
        onSuccess: (result) => {
          console.log('Form submitted with image:', {
            title: formData.title,
            description: formData.description,
            imagePath: result.path,
          })
          // Reset form
          setFormData({ title: '', description: '', imageFile: null })
        }
      })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFormData({ ...formData, imageFile: e.target.files?.[0] || null })}
      />
      <button type="submit" disabled={isPending || !formData.imageFile}>
        {isPending ? 'Uploading...' : 'Submit'}
      </button>
    </form>
  )
}
