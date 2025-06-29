"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scan, Upload, Camera, ImageIcon, Video, Brain, Zap } from 'lucide-react';
import clsx from 'clsx';

export const ScanModeSelector = ({ onModeSelect, selectedMode }: { 
  onModeSelect: (mode: 'upload' | 'webcam') => void; 
  selectedMode: 'upload' | 'webcam' | null 
}) => (
  <Card>
    <CardHeader className="pb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Scan className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <CardTitle>3. Chọn phương thức chấm</CardTitle>
          <p className="text-sm text-muted-foreground">Lựa chọn cách thức quét phiếu trả lời</p>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={clsx(
          "p-6 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group",
          "hover:border-blue-400 hover:bg-blue-50/50",
          selectedMode === 'upload' 
            ? "border-blue-500 bg-blue-50 shadow-lg" 
            : "border-gray-300 hover:shadow-md"
        )} onClick={() => onModeSelect('upload')}>
          <div className="text-center space-y-4">
            <div className={clsx("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300 group-hover:scale-110", selectedMode === 'upload' ? "bg-blue-600 text-white shadow-lg" : "bg-blue-100 text-blue-600 group-hover:bg-blue-200")}>
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className={clsx("text-lg font-semibold mb-2 transition-colors", selectedMode === 'upload' ? "text-blue-900" : "text-gray-900 group-hover:text-blue-700")}>
                Tải lên ảnh
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Chọn và tải lên ảnh phiếu trả lời từ thiết bị của bạn</p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-2"><ImageIcon className="w-3 h-3" /><span>Hỗ trợ JPG, PNG</span></div>
              <div className="flex items-center justify-center gap-2"><Zap className="w-3 h-3" /><span>Xử lý hàng loạt</span></div>
            </div>
          </div>
        </div>
        <div className={clsx(
          "p-6 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer group",
          "hover:border-green-400 hover:bg-green-50/50",
          selectedMode === 'webcam' 
            ? "border-green-500 bg-green-50 shadow-lg" 
            : "border-gray-300 hover:shadow-md"
        )} onClick={() => onModeSelect('webcam')}>
          <div className="text-center space-y-4">
            <div className={clsx("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all duration-300 group-hover:scale-110", selectedMode === 'webcam' ? "bg-green-600 text-white shadow-lg" : "bg-green-100 text-green-600 group-hover:bg-green-200")}>
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className={clsx("text-lg font-semibold mb-2 transition-colors", selectedMode === 'webcam' ? "text-green-900" : "text-gray-900 group-hover:text-green-700")}>
                Quét trực tiếp
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Sử dụng camera để quét phiếu trả lời theo thời gian thực</p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-2"><Video className="w-3 h-3" /><span>Realtime scanning</span></div>
              <div className="flex items-center justify-center gap-2"><Brain className="w-3 h-3" /><span>AI detection</span></div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
) 