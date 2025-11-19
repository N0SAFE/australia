'use client'

import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { UserAppLayoutHome } from '@/routes'
import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { getApiUrl } from '@/lib/api-url'

export default function PresentationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirectUrl')
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showButton, setShowButton] = useState(false)

  // Fetch the current video from the database
  const { data: video, isLoading } = useQuery(orpc.presentation.getCurrent.queryOptions({
    input: {}
  }))

  useEffect(() => {
    // Attempt to enter fullscreen and play the video when component mounts
    const enterFullscreenAndPlay = async () => {
      if (containerRef.current && videoRef.current) {
        try {
          // Try to enter fullscreen
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen()
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            await (containerRef.current as any).webkitRequestFullscreen()
          } else if ((containerRef.current as any).mozRequestFullScreen) {
            await (containerRef.current as any).mozRequestFullScreen()
          } else if ((containerRef.current as any).msRequestFullscreen) {
            await (containerRef.current as any).msRequestFullscreen()
          }
        } catch (error) {
          console.log('Fullscreen request failed:', error)
        }

        // Try to play the video
        try {
          await videoRef.current.play()
        } catch (error) {
          console.error('Auto-play failed:', error)
          // If autoplay fails (browser policy), show controls to allow user to play manually
          if (videoRef.current) {
            videoRef.current.controls = true
          }
        }
      }
    }

    if (video) {
      enterFullscreenAndPlay()
    }
  }, [video])

  const handleVideoEnd = () => {
    setShowButton(true)
  }

  const handleGoToHome = () => {
    // Set cookie to mark presentation as seen
    // Use SameSite=None with Secure in production (HTTPS), SameSite=Lax in development
    const isProduction = process.env.NODE_ENV === 'production'
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
    const useSecure = isProduction || isHttps
    const cookieAttributes = useSecure 
        ? `path=/; SameSite=None; Secure` 
        : `path=/; SameSite=Lax`
    
    document.cookie = `presentation_seen=true; max-age=31536000; ${cookieAttributes}` // 1 year
    
    // Navigate to redirectUrl or home
    router.push(redirectUrl || UserAppLayoutHome({}))
  }

  // Show error state if no video is configured
  if (!isLoading && !video) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ width: '100dvw', height: '100dvh' }}>
        <div className="text-white text-center space-y-4">
          <p className="text-2xl font-semibold">No presentation setup yet</p>
          <p className="text-gray-400">Please contact an administrator to configure the presentation</p>
          <Button
            onClick={handleGoToHome}
            className="mt-4"
          >
            Go to Homepage
          </Button>
        </div>
      </div>
    )
  }

  // Show loading state while fetching
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ width: '100dvw', height: '100dvh' }}>
        <div className="text-white text-center">
          <p className="text-xl">Loading presentation...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black flex flex-col items-center justify-center"
      style={{ width: '100dvw', height: '100dvh' }}
    >
      {/* Video player */}
      <video
        ref={videoRef}
        className="object-contain"
        style={{ width: '100dvw', height: '100dvh' }}
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        controls={true}
        src={getApiUrl('/presentation/video')}
      >
        Your browser does not support the video tag.
      </video>

      {/* Button overlay - shown after video ends */}
      {showButton && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Button
            size="lg"
            onClick={handleGoToHome}
            className="text-lg px-8 py-6"
          >
            Go to Homepage
          </Button>
        </div>
      )}
    </div>
  )
}
