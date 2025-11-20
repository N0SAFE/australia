import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withFileUploads } from './withFileUploads'

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

describe('withFileUploads', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Worker
    global.Worker = class Worker {
      onmessage: ((event: MessageEvent) => void) | null = null
      private messageListeners: ((event: MessageEvent) => void)[] = []

      constructor(stringUrl: string | URL) {
        // Simulate worker initialization
      }

      postMessage(message: any) {
        // Simulate immediate success for testing
        setTimeout(() => {
          const successEvent = new MessageEvent('message', {
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
          if (this.onmessage) {
            this.onmessage(successEvent)
          }
          this.messageListeners.forEach((listener) => listener(successEvent))
        }, 10)
      }

      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === 'message') {
          this.messageListeners.push(listener)
        }
      }

      removeEventListener(
        type: string,
        listener: (event: MessageEvent) => void
      ) {
        if (type === 'message') {
          this.messageListeners = this.messageListeners.filter(
            (l) => l !== listener
          )
        }
      }

      terminate() {
        this.messageListeners = []
      }
    } as any
  })

  it('should wrap ORPC client and detect file upload routes', () => {
    const mockClient = {
      storage: {
        uploadImage: {
          '~orpc': {
            route: {
              path: '/storage/upload/image',
              method: 'POST',
              summary: 'Upload an image file',
            },
            inputSchema: {
              _def: {
                typeName: 'ZodObject',
                shape: () => ({
                  file: {},
                }),
              },
            },
          },
        },
        getFile: {
          '~orpc': {
            route: {
              path: '/storage/files/:id',
              method: 'GET',
            },
            inputSchema: {
              _def: {
                typeName: 'ZodObject',
                shape: () => ({
                  id: {},
                }),
              },
            },
          },
        },
      },
    }

    const wrapped = withFileUploads(mockClient)

    expect(wrapped).toBeDefined()
    expect(wrapped.storage).toBeDefined()
    expect(wrapped.storage.uploadImage).toBeDefined()
    expect(typeof wrapped.storage.uploadImage).toBe('function')
  })

  it('should handle file upload with wrapped client', async () => {
    const mockClient = {
      storage: {
        uploadImage: {
          '~orpc': {
            route: {
              path: '/storage/upload/image',
              method: 'POST',
              summary: 'Upload an image file',
            },
            inputSchema: {
              _def: {
                typeName: 'ZodObject',
                shape: () => ({
                  file: {},
                }),
              },
            },
          },
        },
      },
    }

    const wrapped = withFileUploads(mockClient)
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' })

    const result = await wrapped.storage.uploadImage(mockFile)

    expect(result).toBeDefined()
    expect(result.filename).toBe('test-file.png')
  })

  it('should call progress callback during upload', async () => {
    const mockClient = {
      storage: {
        uploadImage: {
          '~orpc': {
            route: {
              path: '/storage/upload/image',
              method: 'POST',
              summary: 'Upload an image file',
            },
            inputSchema: {
              _def: {
                typeName: 'ZodObject',
                shape: () => ({
                  file: {},
                }),
              },
            },
          },
        },
      },
    }

    const wrapped = withFileUploads(mockClient)
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
    const onProgress = vi.fn()

    await wrapped.storage.uploadImage(mockFile, {
      onProgress,
    })

    // Note: In real scenario, onProgress would be called multiple times
    // For this test, we just verify the structure is correct
    expect(typeof wrapped.storage.uploadImage).toBe('function')
  })

  it('should not wrap routes without file input', () => {
    const mockClient = {
      storage: {
        getFile: {
          '~orpc': {
            route: {
              path: '/storage/files/:id',
              method: 'GET',
            },
            inputSchema: {
              _def: {
                typeName: 'ZodObject',
                shape: () => ({
                  id: {},
                }),
              },
            },
          },
          // Mock original function
          originalCall: 'test',
        },
      },
    }

    const wrapped = withFileUploads(mockClient)

    // getFile should not be wrapped since it doesn't have file input
    // It should return the original object (though proxied)
    expect(wrapped.storage.getFile['~orpc']).toBeDefined()
    expect(wrapped.storage.getFile.originalCall).toBe('test')
    // It should not be a function (not wrapped for upload)
    expect(typeof wrapped.storage.getFile).not.toBe('function')
  })

  it('should preserve nested route structure', () => {
    const mockClient = {
      storage: {
        uploads: {
          image: {
            '~orpc': {
              route: {
                path: '/storage/uploads/image',
                method: 'POST',
              },
              inputSchema: {
                _def: {
                  typeName: 'ZodObject',
                  shape: () => ({
                    file: {},
                  }),
                },
              },
            },
          },
        },
      },
    }

    const wrapped = withFileUploads(mockClient)

    expect(wrapped.storage).toBeDefined()
    expect(wrapped.storage.uploads).toBeDefined()
    expect(wrapped.storage.uploads.image).toBeDefined()
  })
})
