/**
 * Web Worker for handling file uploads in the background
 * This worker handles XMLHttpRequest-based file uploads without blocking the main thread
 */

// Message types for communication between worker and main thread
export type UploadWorkerMessage =
  | {
      type: 'upload'
      id: string
      file: File
      url: string
      withCredentials: boolean
    }
  | {
      type: 'cancel'
      id: string
    }

export type UploadWorkerResponse =
  | {
      type: 'progress'
      id: string
      loaded: number
      total: number
      percentage: number
    }
  | {
      type: 'success'
      id: string
      data: any
    }
  | {
      type: 'error'
      id: string
      error: string
    }
  | {
      type: 'cancelled'
      id: string
    }

// Store active XHR requests for cancellation
const activeRequests = new Map<string, XMLHttpRequest>()

/**
 * Handle upload request
 */
function handleUpload(
  id: string,
  file: File,
  url: string,
  withCredentials: boolean
) {
  const xhr = new XMLHttpRequest()
  activeRequests.set(id, xhr)

  xhr.open('POST', url)
  xhr.withCredentials = withCredentials

  // Track upload progress
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable) {
      const response: UploadWorkerResponse = {
        type: 'progress',
        id,
        loaded: e.loaded,
        total: e.total,
        percentage: (e.loaded / e.total) * 100,
      }
      postMessage(response)
    }
  })

  // Handle completion
  xhr.addEventListener('load', () => {
    activeRequests.delete(id)

    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const data = JSON.parse(xhr.responseText)
        const response: UploadWorkerResponse = {
          type: 'success',
          id,
          data,
        }
        postMessage(response)
      } catch (err) {
        const response: UploadWorkerResponse = {
          type: 'error',
          id,
          error: 'Failed to parse server response',
        }
        postMessage(response)
      }
    } else {
      let errorMessage = 'Upload failed'
      try {
        const errorResponse = JSON.parse(xhr.responseText)
        errorMessage = errorResponse.message || errorMessage
      } catch {
        errorMessage = xhr.statusText || errorMessage
      }

      const response: UploadWorkerResponse = {
        type: 'error',
        id,
        error: errorMessage,
      }
      postMessage(response)
    }
  })

  // Handle errors
  xhr.addEventListener('error', () => {
    activeRequests.delete(id)
    const response: UploadWorkerResponse = {
      type: 'error',
      id,
      error: 'Network request failed',
    }
    postMessage(response)
  })

  // Handle abort
  xhr.addEventListener('abort', () => {
    activeRequests.delete(id)
    const response: UploadWorkerResponse = {
      type: 'cancelled',
      id,
    }
    postMessage(response)
  })

  // Create FormData and append file
  const formData = new FormData()
  formData.append('file', file)

  // Send the request
  xhr.send(formData)
}

/**
 * Handle cancel request
 */
function handleCancel(id: string) {
  const xhr = activeRequests.get(id)
  if (xhr) {
    xhr.abort()
    activeRequests.delete(id)
  }
}

// Listen for messages from main thread
self.addEventListener('message', (event: MessageEvent<UploadWorkerMessage>) => {
  const message = event.data

  switch (message.type) {
    case 'upload':
      handleUpload(message.id, message.file, message.url, message.withCredentials)
      break
    case 'cancel':
      handleCancel(message.id)
      break
  }
})

// Export empty object to make this a valid ES module
export {}
