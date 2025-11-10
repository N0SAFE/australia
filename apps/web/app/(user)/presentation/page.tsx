'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { UserAppLayoutHome } from '@/routes'

export default function PresentationPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Attempt to play the video when component mounts
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error('Auto-play failed:', error)
        // If autoplay fails (browser policy), show controls to allow user to play manually
        if (videoRef.current) {
          videoRef.current.controls = true
        }
      })
    }
  }, [])

  const handleVideoEnd = () => {
    setShowButton(true)
  }

  const handleGoToHome = () => {
    // Set cookie to mark presentation as seen
    document.cookie = 'presentation_seen=true; path=/; max-age=31536000' // 1 year
    
    // Navigate to home
    router.push(UserAppLayoutHome({}))
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black flex items-center justify-center">
      {/* Video player */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        controls={true}
      >
        <source src="/public/vidéo%20Sarah.MP4" type="video/mp4" />
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
