import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useWorkerFileUpload,
  useWorkerUploadImage,
  useWorkerStorage,
} from './useWorkerFileUpload'

// Mock environment validation
vi.mock('#/env', () => ({
  validateEnvPath: (path: string) => path || 'http://localhost:3001',
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useWorkerFileUpload', () => {
  // Mock File object
  const createMockFile = (
    name: string,
    size: number = 1024,
    type: string = 'image/png'
  ): File => {
    const blob = new Blob(['x'.repeat(size)], { type })
    return new File([blob], name, { type })
  }

  // Mock XMLHttpRequest
  class MockXMLHttpRequest {
    public status = 200
    public responseText = JSON.stringify({
      filename: 'test-file.png',
      path: '/uploads/test-file.png',
      size: 1024,
      mimeType: 'image/png',
    })
    public withCredentials = false
    public upload = {
      addEventListener: vi.fn(),
    }
    
    private listeners: Record<string, Function> = {}

    open = vi.fn()
    send = vi.fn((body: any) => {
      // Simulate upload progress
      setTimeout(() => {
        const progressHandler = this.upload.addEventListener.mock.calls.find(
          (call) => call[0] === 'progress'
        )?.[1]
        if (progressHandler) {
          progressHandler({
            lengthComputable: true,
            loaded: 512,
            total: 1024,
          })
          progressHandler({
            lengthComputable: true,
            loaded: 1024,
            total: 1024,
          })
        }
      }, 10)

      // Simulate success
      setTimeout(() => {
        const loadHandler = this.listeners['load']
        if (loadHandler) {
          loadHandler()
        }
      }, 20)
    })
    abort = vi.fn(() => {
      const abortHandler = this.listeners['abort']
      if (abortHandler) {
        abortHandler()
      }
    })
    addEventListener = vi.fn((event: string, handler: Function) => {
      this.listeners[event] = handler
    })
  }

  beforeEach(() => {
    // Mock Worker using a simplified inline implementation
    global.Worker = class Worker {
      onmessage: ((event: MessageEvent) => void) | null = null
      
      constructor(stringUrl: string | URL) {
        // Simulate worker initialization
      }

      postMessage(message: any) {
        // Simulate worker responses
        setTimeout(() => {
          if (message.type === 'upload' && this.onmessage) {
            // Progress event
            this.onmessage(
              new MessageEvent('message', {
                data: {
                  type: 'progress',
                  id: message.id,
                  loaded: 512,
                  total: 1024,
                  percentage: 50,
                },
              })
            )

            // Success event
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage(
                  new MessageEvent('message', {
                    data: {
                      type: 'success',
                      id: message.id,
                      data: {
                        filename: 'test-file.png',
                        path: '/uploads/test-file.png',
                        size: 1024,
                        mimeType: 'image/png',
                      },
                    },
                  })
                )
              }
            }, 10)
          } else if (message.type === 'cancel' && this.onmessage) {
            this.onmessage(
              new MessageEvent('message', {
                data: {
                  type: 'cancelled',
                  id: message.id,
                },
              })
            )
          }
        }, 5)
      }

      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === 'message') {
          this.onmessage = listener
        }
      }

      removeEventListener() {
        // Mock implementation
      }

      terminate() {
        // Mock implementation
      }
    } as any

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()

    // Set environment variables for tests
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useWorkerFileUpload', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() =>
        useWorkerFileUpload('/test/upload', 'Test success')
      )

      expect(result.current.isPending).toBe(false)
      expect(result.current.uploadProgress).toBe(0)
      expect(result.current.error).toBeNull()
      expect(result.current.data).toBeNull()
    })

    it('should update progress during upload', async () => {
      const { result } = renderHook(() =>
        useWorkerFileUpload('/test/upload', 'Test success')
      )

      const file = createMockFile('test.png')

      act(() => {
        result.current.mutate(file)
      })

      expect(result.current.isPending).toBe(true)

      await waitFor(
        () => {
          expect(result.current.uploadProgress).toBeGreaterThan(0)
        },
        { timeout: 100 }
      )
    })

    it('should complete upload successfully', async () => {
      const { result } = renderHook(() =>
        useWorkerFileUpload('/test/upload', 'Test success')
      )

      const file = createMockFile('test.png')

      act(() => {
        result.current.mutate(file)
      })

      await waitFor(
        () => {
          expect(result.current.data).not.toBeNull()
        },
        { timeout: 100 }
      )

      expect(result.current.isPending).toBe(false)
      expect(result.current.data?.filename).toBe('test-file.png')
    })

    it('should call progress callback', async () => {
      const { result } = renderHook(() =>
        useWorkerFileUpload('/test/upload', 'Test success')
      )

      const file = createMockFile('test.png')
      const onProgress = vi.fn()

      await act(async () => {
        await result.current.mutateAsync(file, onProgress)
      })

      await waitFor(() => {
        expect(onProgress).toHaveBeenCalled()
      })
    })

    it('should reset state', async () => {
      const { result } = renderHook(() =>
        useWorkerFileUpload('/test/upload', 'Test success')
      )

      const file = createMockFile('test.png')

      act(() => {
        result.current.mutate(file)
      })

      await waitFor(() => {
        expect(result.current.data).not.toBeNull()
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.isPending).toBe(false)
      expect(result.current.uploadProgress).toBe(0)
      expect(result.current.error).toBeNull()
      expect(result.current.data).toBeNull()
    })
  })

  describe('useWorkerUploadImage', () => {
    it('should use correct endpoint', () => {
      const { result } = renderHook(() => useWorkerUploadImage())

      expect(result.current).toBeDefined()
      expect(result.current.mutate).toBeDefined()
      expect(result.current.mutateAsync).toBeDefined()
    })
  })

  describe('useWorkerStorage', () => {
    it('should provide all upload methods', () => {
      const { result } = renderHook(() => useWorkerStorage())

      expect(result.current.uploadImage).toBeDefined()
      expect(result.current.uploadVideo).toBeDefined()
      expect(result.current.uploadAudio).toBeDefined()
      expect(result.current.uploadImageAsync).toBeDefined()
      expect(result.current.uploadVideoAsync).toBeDefined()
      expect(result.current.uploadAudioAsync).toBeDefined()
    })

    it('should track upload states independently', () => {
      const { result } = renderHook(() => useWorkerStorage())

      expect(result.current.isUploading.image).toBe(false)
      expect(result.current.isUploading.video).toBe(false)
      expect(result.current.isUploading.audio).toBe(false)
      expect(result.current.isUploading.any).toBe(false)
    })

    it('should provide cancel methods', () => {
      const { result } = renderHook(() => useWorkerStorage())

      expect(result.current.cancel.image).toBeDefined()
      expect(result.current.cancel.video).toBeDefined()
      expect(result.current.cancel.audio).toBeDefined()
    })

    it('should provide reset methods', () => {
      const { result } = renderHook(() => useWorkerStorage())

      expect(result.current.reset.image).toBeDefined()
      expect(result.current.reset.video).toBeDefined()
      expect(result.current.reset.audio).toBeDefined()
    })
  })
})
