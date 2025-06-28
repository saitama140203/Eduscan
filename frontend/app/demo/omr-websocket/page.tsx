"use client"

import { OMRWebSocketDemo } from '@/components/demo/OMRWebSocketDemo'

export default function OMRWebSocketDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">OMR WebSocket Demo</h1>
          <p className="text-gray-600 mt-2">
            Test tính năng nhận dạng OMR realtime với WebSocket
          </p>
        </div>
        
        <OMRWebSocketDemo examId={1} />
      </div>
    </div>
  )
} 