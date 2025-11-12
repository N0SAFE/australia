'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function HealthCheckContent() {
  const searchParams = useSearchParams()
  const json = searchParams.get('json')
  const from = searchParams.get('from')

  let healthData
  try {
    healthData = json ? JSON.parse(json) : null
  } catch {
    healthData = null
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-2xl rounded-lg border border-red-500 bg-red-50 p-6">
        <h1 className="mb-4 text-2xl font-bold text-red-700">
          API Health Check Failed
        </h1>
        <p className="mb-4 text-gray-700">
          The API health check failed. This usually means the API server is not
          running or not accessible.
        </p>
        {from && (
          <p className="mb-2 text-sm text-gray-600">
            <strong>From:</strong> {from}
          </p>
        )}
        {healthData && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">
              Health Check Details
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </details>
        )}
        <div className="mt-6">
          <a
            href="/"
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Go to Home
          </a>
        </div>
      </div>
    </div>
  )
}

export default function MiddlewareErrorHealthCheckPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="max-w-2xl rounded-lg border border-red-500 bg-red-50 p-6">
          <h1 className="mb-4 text-2xl font-bold text-red-700">
            Loading...
          </h1>
        </div>
      </div>
    }>
      <HealthCheckContent />
    </Suspense>
  )
}
