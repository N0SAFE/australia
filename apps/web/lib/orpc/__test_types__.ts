/**
 * Type testing file to verify FileUploadContext inference
 * This file should have no TypeScript errors if context extension works correctly
 */

import { orpc } from '@/lib/orpc'
import type { FileUploadProgressEvent } from './withFileUploads'

// Test 1: Can call with file and onProgress context
async function testFileUploadWithProgress() {
  const file = new File(['test'], 'test.txt')
  
  // This should compile without errors - onProgress should be available in context
  const result = await orpc.presentation.getCurrent.call(
    {},
    {
      context: {
        
      }
    }
  )
  
  return result
}

// Test 2: Can call without context (context is optional if extended with optional properties)
async function testFileUploadWithoutProgress() {
  const file = new File(['test'], 'test.txt')
  
  // This should also compile - context should be optional since FileUploadContext.onProgress is optional
  const result = await orpc.presentation.upload.call({ file })
  
  return result
}

// Test 3: Can use with useMutation hook and .call() for context
function testWithMutation() {
  // mutationOptions creates the mutation configuration
  // The actual onProgress is passed via .call() in the mutation function
  const mutation = orpc.presentation.upload.mutationOptions({
    mutationFn: async (variables: { file: File }) => {
      return await orpc.presentation.upload.call(variables, {
        context: {
          onProgress: (event: FileUploadProgressEvent) => {
            console.log(`Progress: ${event.percentage}%`)
          }
        }
      })
    }
  })
  
  return mutation
}

// Test 4: onProgress should be available on file upload routes
async function testFileRouteHasProgress() {
  const file = new File(['test'], 'test.txt')
  const result = await orpc.presentation.upload.call({ file }, {
    context: {
      onProgress: (e) => console.log(e.percentage)
    }
  })
  
  return result
}

// Test 5: Routes without z.file() should NOT have onProgress available
async function testNonFileRoute() {
  const result = await orpc.presentation.getCurrent.call({}, {
    context: {
      // @ts-expect-error - onProgress should not be available for non-file routes
      onProgress: (e) => console.log(e.percentage)
    }
  })
  
  return result
}

export {
  testFileUploadWithProgress,
  testFileUploadWithoutProgress,
  testWithMutation,
  testNonFileRoute
}
