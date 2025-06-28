"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Camera, Play, Square, Save, X, Loader2, CheckCircle, 
  AlertCircle, Settings, Maximize2, RotateCcw, Zap,
  Volume2, VolumeX, Info, Download, BarChart3
} from 'lucide-react'
import clsx from 'clsx'

// Types
interface CameraConstraints {
  width: { ideal: number; max: number }
  height: { ideal: number; max: number }
  facingMode: string
  frameRate?: { ideal: number; max: number }
}

interface WebcamScannerProps {
  isConnected: boolean
  isScanning: boolean
  isProcessing: boolean
  onStartScan: () => void
  onCaptureFrame: (frameData: string) => void
  onSaveResult: (result: any) => void
  onEndSession: () => void
  lastResult: any
  className?: string
}

interface ScanStats {
  totalCaptured: number
  successfulScans: number
  errorCount: number
  averageProcessingTime: number
}

// Custom hook for camera management
const useCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setDevices(videoDevices)
      
      // Auto-select back camera if available
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      )
      if (backCamera && !selectedDeviceId) {
        setSelectedDeviceId(backCamera.deviceId)
      } else if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId)
      }
    } catch (error) {
      console.error('Failed to enumerate devices:', error)
    }
  }, [selectedDeviceId])

  const startCamera = useCallback(async (constraints?: Partial<CameraConstraints>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const defaultConstraints: CameraConstraints = {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        facingMode: 'environment',
        frameRate: { ideal: 30, max: 60 }
      }

      const finalConstraints = {
        video: {
          ...defaultConstraints,
          ...constraints,
          ...(selectedDeviceId && { deviceId: { exact: selectedDeviceId } })
        },
        audio: false
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(finalConstraints)
      setStream(mediaStream)
      setHasPermission(true)
      return mediaStream
    } catch (error: any) {
      console.error('Camera access failed:', error)
      setHasPermission(false)
      
      // Provide specific error messages
      if (error.name === 'NotAllowedError') {
        setError('Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.')
      } else if (error.name === 'NotFoundError') {
        setError('Không tìm thấy camera. Vui lòng kết nối camera và thử lại.')
      } else if (error.name === 'NotReadableError') {
        setError('Camera đang được sử dụng bởi ứng dụng khác.')
      } else {
        setError(`Lỗi camera: ${error.message}`)
      }
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [selectedDeviceId])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
        track.removeEventListener('ended', () => {})
      })
      setStream(null)
    }
    setError(null)
  }, [stream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  // Get devices on mount
  useEffect(() => {
    getDevices()
  }, [getDevices])

  return {
    stream,
    hasPermission,
    isLoading,
    error,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    startCamera,
    stopCamera,
    getDevices
  }
}

// Custom hook for scan statistics
const useScanStats = () => {
  const [stats, setStats] = useState<ScanStats>({
    totalCaptured: 0,
    successfulScans: 0,
    errorCount: 0,
    averageProcessingTime: 0
  })
  const [processingTimes, setProcessingTimes] = useState<number[]>([])

  const incrementCaptured = useCallback(() => {
    setStats(prev => ({ ...prev, totalCaptured: prev.totalCaptured + 1 }))
  }, [])

  const recordSuccess = useCallback((processingTime: number) => {
    setStats(prev => ({ ...prev, successfulScans: prev.successfulScans + 1 }))
    setProcessingTimes(prev => {
      const newTimes = [...prev, processingTime].slice(-10) // Keep last 10 times
      const average = newTimes.reduce((sum, time) => sum + time, 0) / newTimes.length
      setStats(current => ({ ...current, averageProcessingTime: average }))
      return newTimes
    })
  }, [])

  const recordError = useCallback(() => {
    setStats(prev => ({ ...prev, errorCount: prev.errorCount + 1 }))
  }, [])

  const resetStats = useCallback(() => {
    setStats({
      totalCaptured: 0,
      successfulScans: 0,
      errorCount: 0,
      averageProcessingTime: 0
    })
    setProcessingTimes([])
  }, [])

  return {
    stats,
    incrementCaptured,
    recordSuccess,
    recordError,
    resetStats
  }
}

export const WebcamScanner: React.FC<WebcamScannerProps> = ({
  isConnected = true, // Default to true
  isScanning = false, // Default to false 
  isProcessing = false, // Default to false
  onStartScan,
  onCaptureFrame,
  onSaveResult,
  onEndSession,
  lastResult,
  className
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const processingStartTimeRef = useRef<number>(0)
  
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [autoCapture, setAutoCapture] = useState(false)
  const [captureQuality, setCaptureQuality] = useState(0.85)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [localIsScanning, setLocalIsScanning] = useState(false) // Local state để đảm bảo
  
  // Sync local scanning state with props
  useEffect(() => {
    setLocalIsScanning(isScanning)
  }, [isScanning])

  // Use local state or props state
  const actualIsScanning = localIsScanning || isScanning

  const {
    stream,
    hasPermission,
    isLoading: cameraLoading,
    error: cameraError,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    startCamera,
    stopCamera
  } = useCamera()

  const {
    stats,
    incrementCaptured,
    recordSuccess,
    recordError,
    resetStats
  } = useScanStats()

  // Capture function with error handling
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available')
      return null
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      console.error('Canvas context not available')
      return null
    }

    // Check if video is ready
    if (video.readyState < 2) {
      console.warn('Video not ready for capture')
      return null
    }
    
    try {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to data URL with specified quality
      return canvas.toDataURL('image/jpeg', captureQuality)
    } catch (error) {
      console.error('Failed to capture frame:', error)
      return null
    }
  }, [captureQuality])

  // Handle start scan with better error handling
  const handleStartScan = useCallback(async () => {
    try {
      setLocalIsScanning(true) // Set local state first
      await startCamera()
      onStartScan()
      resetStats()
      
      if (soundEnabled) {
        // Play start sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmBh6O9s')
        audio.volume = 0.3
        audio.play().catch(() => {}) // Ignore errors
      }
    } catch (error) {
      console.error('Failed to start scanning:', error)
      setLocalIsScanning(false) // Reset on error
    }
  }, [startCamera, onStartScan, resetStats, soundEnabled])

  // Enhanced capture handler
  const handleCaptureFrame = useCallback(() => {
    const frameData = captureFrame()
    if (frameData) {
      processingStartTimeRef.current = Date.now()
      incrementCaptured()
      onCaptureFrame(frameData)
      
      if (soundEnabled) {
        // Play capture sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmBh6O9s')
        audio.volume = 0.2
        audio.play().catch(() => {})
      }
    } else {
      recordError()
    }
  }, [captureFrame, incrementCaptured, onCaptureFrame, soundEnabled, recordError])

  // Handle end session with cleanup
  const handleEndSession = useCallback(() => {
    stopCamera()
    setLocalIsScanning(false) // Reset local state
    onEndSession()
    setIsFullscreen(false)
    
    if (soundEnabled) {
      // Play end sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmBh6O9s')
      audio.volume = 0.3
      audio.play().catch(() => {})
    }
  }, [stopCamera, onEndSession, soundEnabled])

  // Enhanced save result handler
  const handleSaveResult = useCallback((result: any) => {
    if (processingStartTimeRef.current > 0) {
      const processingTime = Date.now() - processingStartTimeRef.current
      recordSuccess(processingTime)
      processingStartTimeRef.current = 0
    }
    onSaveResult(result)
  }, [onSaveResult, recordSuccess])

  // Set up video stream when available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!actualIsScanning) return
      
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (!isProcessing) {
            handleCaptureFrame()
          }
          break
        case 'Enter':
          e.preventDefault()
          if (lastResult?.success && lastResult?.data) {
            handleSaveResult(lastResult.data)
          }
          break
        case 'Escape':
          e.preventDefault()
          handleEndSession()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [actualIsScanning, isProcessing, handleCaptureFrame, lastResult, handleSaveResult, handleEndSession])

  // Auto-capture every 3 seconds if enabled
  useEffect(() => {
    if (!autoCapture || !actualIsScanning || isProcessing) return
    
    const interval = setInterval(() => {
      handleCaptureFrame()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [autoCapture, actualIsScanning, isProcessing, handleCaptureFrame])

  // Memoized components
  const ConnectionStatus = useMemo(() => (
    <div className="flex items-center gap-2">
      <Badge variant={isConnected ? "default" : "destructive"}>
        {isConnected ? "Đã kết nối" : "Mất kết nối"}
      </Badge>
      {actualIsScanning && (
        <Badge variant="secondary">
          Đã chụp: {stats.totalCaptured}
        </Badge>
      )}
      {stats.successfulScans > 0 && (
        <Badge variant="outline" className="text-green-600 border-green-600">
          Thành công: {stats.successfulScans}
        </Badge>
      )}
    </div>
  ), [isConnected, actualIsScanning, stats])

  const VideoDisplay = useMemo(() => (
    <div className={clsx(
      "relative bg-gray-900 rounded-lg overflow-hidden",
      isFullscreen ? "fixed inset-0 z-50 rounded-none" : "aspect-video"
    )}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
        style={{ display: actualIsScanning ? 'block' : 'none' }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay for non-scanning state */}
      {!actualIsScanning && (
        <div className="absolute inset-0 flex items-center justify-center flex-col bg-black/50 text-white">
          <Camera className="w-12 h-12 mb-4" />
          <p className="text-center px-4">
            Bấm "Bắt đầu quét" để khởi động camera và bắt đầu phiên chấm bài
          </p>
          <p className="text-sm text-gray-300 mt-2">
            Phím tắt: Space (chụp), Enter (lưu), Esc (thoát)
          </p>
        </div>
      )}

      {/* Camera permission error */}
      {(hasPermission === false || cameraError) && actualIsScanning && (
        <div className="absolute inset-0 flex items-center justify-center flex-col bg-red-900/80 text-white p-4 text-center">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p className="font-bold">Không thể truy cập camera</p>
          <p className="text-sm">{cameraError || 'Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt và tải lại trang.'}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4 text-white border-white"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Tải lại trang
          </Button>
        </div>
      )}

      {/* Camera loading */}
      {cameraLoading && actualIsScanning && (
        <div className="absolute inset-0 flex items-center justify-center flex-col bg-black/75 text-white">
          <Loader2 className="w-8 h-8 mb-4 animate-spin" />
          <p>Đang khởi động camera...</p>
        </div>
      )}
      
      {/* Status indicators */}
      {actualIsScanning && (
        <>
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-green-500 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full mr-2" />
              ĐANG QUÉT...
            </Badge>
            {autoCapture && (
              <Badge className="bg-blue-500">
                <Zap className="w-3 h-3 mr-1" />
                Tự động
              </Badge>
            )}
          </div>
          
          <div className="absolute top-4 right-4 flex gap-2">
            {isProcessing && (
              <Badge className="bg-blue-500">
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Đang xử lý...
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white hover:bg-white/20"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
      
      {/* Result overlay */}
      {lastResult?.success && lastResult?.data && (
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
  ), [actualIsScanning, isFullscreen, hasPermission, cameraError, cameraLoading, isProcessing, autoCapture, lastResult])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera Scanner
              {stats.averageProcessingTime > 0 && (
                <Badge variant="outline" className="ml-2">
                  ~{Math.round(stats.averageProcessingTime)}ms
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Sử dụng camera để chụp và chấm phiếu trả lời tự động
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {ConnectionStatus}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Camera</label>
                <select 
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  disabled={actualIsScanning}
                >
                  {devices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${devices.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Chất lượng ảnh</label>
                <select 
                  value={captureQuality}
                  onChange={(e) => setCaptureQuality(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value={0.6}>Thấp (60%)</option>
                  <option value={0.8}>Trung bình (80%)</option>
                  <option value={0.85}>Cao (85%)</option>
                  <option value={0.95}>Rất cao (95%)</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoCapture"
                  checked={autoCapture}
                  onChange={(e) => setAutoCapture(e.target.checked)}
                  disabled={!actualIsScanning}
                />
                <label htmlFor="autoCapture" className="text-sm font-medium">
                  Tự động chụp (3s)
                </label>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {VideoDisplay}

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4 pt-4">
          {!actualIsScanning ? (
            <Button 
              size="lg" 
              onClick={handleStartScan}
              disabled={cameraLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {cameraLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Đang khởi động...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Bắt đầu quét
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap justify-center">
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
                    Chụp ảnh (Space)
                  </>
                )}
              </Button>
              
              {lastResult?.success && lastResult?.data && (
                <Button 
                  size="lg"
                  onClick={() => handleSaveResult(lastResult.data)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Lưu kết quả (Enter)
                </Button>
              )}
              
              <Button 
                size="lg" 
                variant="destructive"
                onClick={handleEndSession}
              >
                <X className="w-5 h-5 mr-2" />
                Kết thúc (Esc)
              </Button>
            </div>
          )}
          
          {/* Fallback: Always show start button if no other buttons are visible */}
          {!actualIsScanning && process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 ml-4">
              Nút "Bắt đầu quét" phải hiển thị ở đây
            </div>
          )}
        </div>

        {/* Statistics */}
        {actualIsScanning && stats.totalCaptured > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Thống kê phiên chấm
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg text-blue-600">{stats.totalCaptured}</div>
                <div className="text-gray-600">Tổng chụp</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-green-600">{stats.successfulScans}</div>
                <div className="text-gray-600">Thành công</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-red-600">{stats.errorCount}</div>
                <div className="text-gray-600">Lỗi</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-purple-600">
                  {stats.totalCaptured > 0 ? Math.round((stats.successfulScans / stats.totalCaptured) * 100) : 0}%
                </div>
                <div className="text-gray-600">Tỷ lệ thành công</div>
              </div>
            </div>
          </div>
        )}

        {/* Result Preview */}
        {lastResult?.data?.aligned_image && (
          <div className="mt-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Ảnh đã được căn chỉnh và xử lý:
            </h4>
            <div className="relative">
              <img 
                src={lastResult.data.aligned_image} 
                alt="Processed result" 
                className="w-full max-w-md mx-auto rounded-lg border shadow-lg"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = lastResult.data.aligned_image
                  link.download = `scan_result_${Date.now()}.jpg`
                  link.click()
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Debug info - chỉ hiển thị trong development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 text-center mt-2">
            Debug: isConnected={String(isConnected)}, isScanning={String(isScanning)}, localIsScanning={String(localIsScanning)}, actualIsScanning={String(actualIsScanning)}
          </div>
        )}

        {/* Help info */}
        <div className="flex items-center gap-2 text-sm text-gray-500 justify-center">
          <Info className="w-4 h-4" />
          <span>Sử dụng phím Space để chụp nhanh, Enter để lưu, Esc để thoát</span>
        </div>
      </CardContent>
    </Card>
  )
}