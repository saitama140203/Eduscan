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
import Webcam from 'react-webcam'

import { useOMRWebSocket, OMRProgressData, CompleteDetails, RecognitionFailedDetails } from '@/lib/hooks/useOMRWebSocket'
import { useToast } from '@/components/ui/use-toast'

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

interface WebcamScannerUIProps {
  isConnected: boolean;
  isScanning: boolean;
  statusMessage: string;
  recognitionStatus: OMRProgressData['status'];
  previewImage: string | null;
  lastSuccessfulResult: CompleteDetails | null;
  onStartScan: () => void;
  onStopScan: () => void;
  onCapture: () => void;
  webcamRef: React.RefObject<Webcam>;
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
    isLoading: cameraLoading,
    error: cameraError,
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

const WebcamScannerUI: React.FC<WebcamScannerUIProps> = ({
    isConnected, isScanning, statusMessage, recognitionStatus, previewImage, 
    lastSuccessfulResult, onStartScan, onStopScan, onCapture, webcamRef
}) => (
    <Card>
        <CardHeader>
            <CardTitle>3. Quét phiếu</CardTitle>
            <p className="text-sm text-muted-foreground">
                Trạng thái kết nối: 
                <span className={isConnected ? "text-green-500" : "text-red-500"}>
                    {isConnected ? " Đã kết nối" : " Mất kết nối"}
                </span>
            </p>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="relative aspect-[3/4] bg-gray-200 rounded-md overflow-hidden">
                    {isScanning ? (
                        <Webcam 
                            audio={false} 
                            ref={webcamRef} 
                            screenshotFormat="image/jpeg" 
                            className="w-full h-full object-cover" 
                            videoConstraints={{ facingMode: "environment" }} 
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-16 h-16 text-gray-400" />
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Trạng thái</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-3">
                                {(recognitionStatus === 'processing' || recognitionStatus === 'matching') && <Loader2 className="h-6 w-6 animate-spin text-blue-500" />}
                                {(recognitionStatus === 'recognition_success' || recognitionStatus === 'complete') && <CheckCircle className="h-6 w-6 text-green-500" />}
                                {(recognitionStatus === 'recognition_failed' || recognitionStatus === 'error') && <AlertCircle className="h-6 w-6 text-red-500" />}
                                <p className={`text-lg font-medium ${
                                    (recognitionStatus === 'recognition_failed' || recognitionStatus === 'error') ? 'text-red-600' : 
                                    (recognitionStatus === 'recognition_success' || recognitionStatus === 'complete') ? 'text-green-600' : ''
                                }`}>
                                    {statusMessage}
                                </p>
                            </div>
                            {previewImage && <div className="mt-4"><p className="text-sm font-medium mb-2">Ảnh đã căn chỉnh:</p><img src={previewImage} alt="Preview" className="rounded-md border max-w-full" /></div>}
                        </CardContent>
                    </Card>
                    {lastSuccessfulResult && (
                        <Card className="bg-green-50 border-green-200">
                            <CardHeader><CardTitle>Kết quả cuối cùng</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                <p><strong>SBD:</strong> {lastSuccessfulResult.sbd}</p>
                                <p><strong>Học sinh:</strong> {lastSuccessfulResult.student_name || 'Không tìm thấy'}</p>
                                <p><strong>Điểm số:</strong> <span className="font-bold text-xl">{lastSuccessfulResult.total_score.toFixed(2)}</span> / 10</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            <div className="mt-6 flex justify-between items-center">
                {!isScanning ? (
                    <Button size="lg" onClick={onStartScan} disabled={!isConnected}>
                        <Play className="w-5 h-5 mr-2" /> Bắt đầu quét
                    </Button>
                ) : (
                    <Button size="lg" variant="destructive" onClick={onStopScan}>
                        <Square className="w-5 h-5 mr-2" /> Dừng quét
                    </Button>
                )}
                <Button size="lg" onClick={onCapture} disabled={!isScanning}>
                    <Camera className="w-5 h-5 mr-2" /> Chụp ảnh
                </Button>
            </div>
        </CardContent>
    </Card>
);

export const WebcamScanner = ({ examId, templateId }: { examId: number | null, templateId: number | null }) => {
    const webcamRef = useRef<Webcam>(null);
    const { toast } = useToast();

    const [statusMessage, setStatusMessage] = useState('Sẵn sàng để quét');
    const [recognitionStatus, setRecognitionStatus] = useState<OMRProgressData['status']>('idle');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [lastSuccessfulResult, setLastSuccessfulResult] = useState<CompleteDetails | null>(null);
    
    const { 
        isConnected, isScanning, startScanning, captureFrame, disconnect,
    } = useOMRWebSocket({
        examId: examId ?? undefined,
        templateId: templateId ?? undefined,
        onProgress: (data) => {
            setStatusMessage(data.message);
            setRecognitionStatus(data.status);
            if (data.status === 'recognition_failed' || data.status === 'complete') {
                const details = data.details as RecognitionFailedDetails | CompleteDetails;
                setPreviewImage(details.aligned_image || null);
            } else {
                setPreviewImage(null);
            }
        },
        onResultSaved: (result) => {
            if (result.success) {
                setLastSuccessfulResult(result);
                toast({ title: "Chấm thành công!", description: `SBD ${result.sbd} - Điểm: ${result.total_score}` });
            }
        },
    });

    const handleCapture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                setLastSuccessfulResult(null);
                setPreviewImage(null);
                setStatusMessage('Đang xử lý...');
                setRecognitionStatus('processing');
                captureFrame(imageSrc);
            }
        }
    }, [webcamRef, captureFrame]);

    return (
        <WebcamScannerUI 
            isConnected={isConnected}
            isScanning={isScanning}
            statusMessage={statusMessage}
            recognitionStatus={recognitionStatus}
            previewImage={previewImage}
            lastSuccessfulResult={lastSuccessfulResult}
            onStartScan={startScanning}
            onStopScan={disconnect}
            onCapture={handleCapture}
            webcamRef={webcamRef}
        />
    )
}