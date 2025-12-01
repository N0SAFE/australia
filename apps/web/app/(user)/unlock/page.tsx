'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Logo } from '@/components/svg/logo'
import { UserAppLayoutHome } from '@/routes'

export default function UnlockPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirectUrl')
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState(0)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isAnimatingUnlock, setIsAnimatingUnlock] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)

  const handleUnlock = async () => {
    // Set cookie with current timestamp
    const now = Date.now()
    
    // Use SameSite=None with Secure in production (HTTPS), SameSite=Lax in development
    const isProduction = process.env.NODE_ENV === 'production'
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
    const useSecure = isProduction || isHttps
    const cookieAttributes = useSecure 
        ? `path=/; SameSite=None; Secure` 
        : `path=/; SameSite=Lax`
    
    document.cookie = `lastUnlock=${now}; max-age=${60 * 60 * 24 * 365}; ${cookieAttributes}`
    
    // Wait for unlock animation to complete (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Redirect to redirectUrl or default to home
    router.push(redirectUrl || UserAppLayoutHome({}))
    router.refresh()
  }

  const handleStart = (clientX: number) => {
    setIsDragging(true)
    startXRef.current = clientX - dragPosition
  }

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const buttonWidth = 56 // Width of the draggable button (w-14 = 56px)
    const padding = 4 // p-1 = 4px padding
    const maxDrag = containerWidth - buttonWidth - (padding * 2)

    let newPosition = clientX - startXRef.current
    newPosition = Math.max(0, Math.min(newPosition, maxDrag))

    setDragPosition(newPosition)

    // Check if swiped far enough (80% of the way)
    if (newPosition >= maxDrag * 0.8 && !isAnimatingUnlock) {
      setIsUnlocked(true)
      setIsDragging(false)
      setIsAnimatingUnlock(true)
      
      // Animate to full width first
      setDragPosition(maxDrag)
      
      // Then trigger unlock after animation
      handleUnlock()
    }
  }

  const handleEnd = () => {
    if (!isUnlocked) {
      // Snap back with animation
      setDragPosition(0)
    }
    setIsDragging(false)
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX)
  }

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX)
  }

  const handleMouseUp = () => {
    handleEnd()
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      e.preventDefault() // Prevent scroll while dragging
      handleMove(e.touches[0].clientX)
    }
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  // Add/remove global event listeners
  useEffect(() => {
    if (isDragging) {
      // Disable body scroll while dragging
      document.body.style.overflow = 'hidden'
      
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)

      return () => {
        // Re-enable body scroll when dragging ends
        document.body.style.overflow = ''
        
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging])

  const dragProgress = containerRef.current 
    ? dragPosition / (containerRef.current.offsetWidth - 56 - 8)
    : 0

  return (
    <div className="h-dvh w-full flex flex-col items-center justify-between p-8 bg-linear-to-b from-pink-200 via-pink-300 to-pink-400 overflow-hidden">
      {/* Logo */}
      <Logo className="text-pink-dark mx-auto h-20 w-fit" ></Logo>

      {/* Center Content */}
      <div className="flex-1 flex items-center justify-center">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-script text-pink-600">
          Bonjour !
        </h1>
      </div>

      {/* Bottom Swipe to Unlock */}
      <div className="pb-12 w-full max-w-md mx-auto">
        <div
          ref={containerRef}
          className="relative w-full bg-white/90 rounded-full p-1 shadow-lg overflow-hidden select-none h-16"
          style={{
            backgroundColor: `rgba(255, 255, 255, ${0.9 - dragProgress * 0.3})`,
          }}
        >
          {/* Background track */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-500/20"
              style={{
                width: `${dragProgress * 100}%`,
                transition: isAnimatingUnlock ? 'width 0.5s ease-out, background-color 0.3s ease-out' : 'width 0.2s',
                backgroundColor: isAnimatingUnlock ? 'rgba(236, 72, 153, 0.4)' : 'rgba(236, 72, 153, 0.2)',
              }}
            />
          </div>

          {/* Text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-sm md:text-base font-medium uppercase tracking-wider text-pink-600 transition-opacity duration-200"
              style={{
                opacity: 1 - dragProgress,
              }}
            >
              Swipe pour déverrouiller
            </span>
          </div>

          {/* Draggable button */}
          <div
            className="absolute top-1 left-1 w-14 h-14 bg-pink-500 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg z-10 touch-none"
            style={{
              transform: `translateX(${dragPosition}px)`,
              transition: isDragging ? 'none' : isAnimatingUnlock ? 'transform 0.5s ease-out, opacity 0.3s ease-out 0.5s' : 'transform 0.3s ease-out',
              scale: isDragging ? '1.05' : '1',
              opacity: isAnimatingUnlock ? 0 : 1,
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <ArrowRight className="text-white" size={24} />
          </div>
        </div>
      </div>
    </div>
  )
}
