"use client"

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Camera, Play, Square, Wifi, WifiOff } from 'lucide-react'
import { useOMRWebSocket } from '@/lib/hooks/useOMRWebSocket'

export function OMRWebSocketDemo({ examId = 1 }: { examId?: number }) {
  const [isScanning, setIsScanning] = useState(false)
  const [currentResult, setCurrentResult] = useState<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const { 
    isConnected, 
    startScanning, 
    stopScanning, 
    processFrame,
    captureResult 
  } = useOMRWebSocket({
    examId,
    onResult: (result) => {
      console.log('WebSocket result:', result)
      if (result.success && result.data) {
        setCurrentResult(result.data)
      }
    },
    onCaptureSaved: (result) => {
      console.log('Capture saved:', result)
    }
  })

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      })
      
      setStream(mediaStream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Camera access denied:', error)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    return canvas.toDataURL('image/jpeg', 0.8)
  }, [])

  const handleStartScan = async () => {
    await startCamera()
    setIsScanning(true)
    startScanning()
    
    // Start processing frames
    const interval = setInterval(() => {
      const frameData = captureFrame()
      if (frameData && processFrame) {
        processFrame(frameData)
      }
    }, 2000) // Process every 2 seconds

    // Store interval for cleanup
    ;(window as any).frameInterval = interval
  }

  const handleStopScan = () => {
    setIsScanning(false)
    stopScanning()
    stopCamera()
    
    // Clear interval
    if ((window as any).frameInterval) {
      clearInterval((window as any).frameInterval)
    }
  }

  const handleCapture = () => {
    if (currentResult && captureResult) {
      captureResult(currentResult)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>OMR WebSocket Demo</span>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge className="bg-green-500">
                  <Wifi className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Disconnected
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {isScanning && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-red-500">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2" />
                    SCANNING
                  </Badge>
                </div>
              )}
              
              {currentResult && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/75 text-white p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Detection Result</h4>
                      <Badge className="bg-green-600">
                        Score: {currentResult.score || 'N/A'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>SBD: {currentResult.sbd || 'N/A'}</div>
                      <div>Code: {currentResult.exam_code || 'N/A'}</div>
                      {currentResult.student && (
                        <div className="col-span-2">
                          Student: {currentResult.student.hoTen}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-4">
              {!isScanning ? (
                <Button 
                  size="lg" 
                  onClick={handleStartScan}
                  disabled={!isConnected}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Scanning
                </Button>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    variant="destructive"
                    onClick={handleStopScan}
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Stop Scanning
                  </Button>
                  <Button 
                    size="lg"
                    onClick={handleCapture}
                    disabled={!currentResult}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Capture Result
                  </Button>
                </>
              )}
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <p>Exam ID: {examId}</p>
              <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
              <p>Scanning: {isScanning ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
