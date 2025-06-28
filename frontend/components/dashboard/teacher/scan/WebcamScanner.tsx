"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Play, Square, Save, X, Loader2, CheckCircle } from 'lucide-react'

export const WebcamScanner = ({
  isConnected,
  isScanning,
  isProcessing,
  onStartScan,
  onCaptureFrame,
  onSaveResult,
  onEndSession,
  lastResult,
}: {
  isConnected: boolean
  isScanning: boolean
  isProcessing: boolean
  onStartScan: () => void
  onCaptureFrame: (frameData: string) => void
  onSaveResult: (result: any) => void
  onEndSession: () => void
  lastResult: any
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [capturedCount, setCapturedCount] = useState(0)
  
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
      setHasPermission(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Camera access denied:', error)
      setHasPermission(false)
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
    onStartScan()
  }

  const handleCaptureFrame = () => {
    const frameData = captureFrame()
    if (frameData) {
      onCaptureFrame(frameData)
      setCapturedCount(prev => prev + 1)
    }
  }

  const handleEndSession = () => {
    stopCamera()
    onEndSession()
    setCapturedCount(0)
  }

  // Start camera when scanning starts
  useEffect(() => {
    if (isScanning && !stream) {
      startCamera()
    } else if (!isScanning && stream) {
      stopCamera()
    }
  }, [isScanning, stream, startCamera, stopCamera])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera Scanner
            </CardTitle>
            <CardDescription>
              Sử dụng camera để chụp và chấm phiếu trả lời tự động
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Đã kết nối" : "Mất kết nối"}
            </Badge>
            {isScanning && (
              <Badge variant="secondary">
                Đã chụp: {capturedCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
            style={{ display: isScanning ? 'block' : 'none' }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center flex-col bg-black/50 text-white">
              <Camera className="w-12 h-12 mb-4" />
              <p className="text-center">
                Bấm "Bắt đầu quét" để khởi động camera và bắt đầu phiên chấm bài
              </p>
            </div>
          )}

          {hasPermission === false && isScanning && (
            <div className="absolute inset-0 flex items-center justify-center flex-col bg-red-900/80 text-white p-4 text-center">
              <p className="font-bold">Không thể truy cập camera</p>
              <p className="text-sm">Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt và tải lại trang.</p>
            </div>
          )}
          
          {isScanning && (
            <div className="absolute top-4 left-4">
              <Badge className="bg-green-500 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full mr-2" />
                ĐANG QUÉT...
              </Badge>
            </div>
          )}

          {isProcessing && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-blue-500">
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Đang xử lý...
              </Badge>
            </div>
          )}
          
          {lastResult && lastResult.success && lastResult.data && (
            <div className="absolute bottom-0 left-0 right-0">
              <div className="bg-black/75 text-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Kết quả nhận dạng</h4>
                  <Badge className="bg-green-600">
                    Điểm: {lastResult.data.score != null ? lastResult.data.score : 'N/A'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>SBD: {lastResult.data.sbd || 'N/A'}</div>
                  <div>Mã đề: {lastResult.data.exam_code || 'N/A'}</div>
                  {lastResult.data.student && (
                    <div className="col-span-2">
                      Học sinh: {lastResult.data.student.hoTen}
                    </div>
                  )}
                  {lastResult.data.message && (
                    <div className="col-span-2 text-yellow-300">
                      {lastResult.data.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4 pt-4">
          {!isScanning ? (
            <Button 
              size="lg" 
              onClick={handleStartScan}
              disabled={!isConnected}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-5 h-5 mr-2" />
              Bắt đầu quét
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <Button 
                size="lg"
                onClick={handleCaptureFrame}
                disabled={isProcessing || !stream || hasPermission === false}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Chụp ảnh
                  </>
                )}
              </Button>
              
              {lastResult && lastResult.success && lastResult.data && (
                <Button 
                  size="lg"
                  onClick={() => onSaveResult(lastResult.data)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Lưu kết quả
                </Button>
              )}
              
              <Button 
                size="lg" 
                variant="destructive"
                onClick={handleEndSession}
              >
                <X className="w-5 h-5 mr-2" />
                Kết thúc
              </Button>
            </div>
          )}
        </div>

        {/* Result Preview */}
        {lastResult && lastResult.data?.aligned_image && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Ảnh đã được căn chỉnh và xử lý:</h4>
            <img 
              src={lastResult.data.aligned_image} 
              alt="Processed result" 
              className="w-full max-w-md mx-auto rounded-lg border shadow-lg"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
} 