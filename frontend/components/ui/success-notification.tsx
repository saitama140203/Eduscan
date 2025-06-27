'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, X } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent } from './card'

interface SuccessNotificationProps {
  title: string
  message: string
  onClose: () => void
  autoClose?: boolean
  autoCloseDelay?: number
  showGif?: boolean
}

export function SuccessNotification({
  title,
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 3000,
  showGif = true
}: SuccessNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    // Animation entrance
    setIsVisible(true)

    if (autoClose) {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(progressInterval)
            // Trì hoãn onClose để tránh setState trong render
            setTimeout(() => onClose(), 0)
            return 0
          }
          return prev - (100 / (autoCloseDelay / 100))
        })
      }, 100)

      return () => clearInterval(progressInterval)
    }
  }, [autoClose, autoCloseDelay, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose(), 300)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card 
        className={`w-full max-w-md mx-4 transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            {/* Success Icon với animation */}
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
              <div className="relative bg-green-500 rounded-full w-16 h-16 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white animate-bounce" />
              </div>
            </div>

            {/* GIF Animation */}
            {showGif && (
              <div className="w-24 h-24 mx-auto">
                <div className="w-full h-full bg-green-100 rounded-lg flex items-center justify-center animate-pulse">
                  <div className="text-4xl">🎉</div>
                </div>
              </div>
            )}

            {/* Title */}
            <h3 className="text-xl font-semibold text-green-700">
              {title}
            </h3>

            {/* Message */}
            <p className="text-muted-foreground">
              {message}
            </p>

            {/* Progress bar (nếu autoClose) */}
            {autoClose && (
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 justify-center">
              <Button onClick={handleClose} variant="outline" size="sm">
                <X className="w-4 h-4 mr-2" />
                Đóng
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 