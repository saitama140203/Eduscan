'use client'

import { useState } from 'react'
import { Settings, Bell, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { RadioGroup, RadioGroupItem } from './radio-group'
import { Label } from './label'
import { Button } from './button'

export type NotificationMode = 'popup' | 'page' | 'both'

interface NotificationSettingsProps {
  currentMode: NotificationMode
  onModeChange: (mode: NotificationMode) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationSettings({
  currentMode,
  onModeChange,
  isOpen,
  onOpenChange
}: NotificationSettingsProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Cài đặt thông báo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-base font-medium">
              Chọn cách hiển thị thông báo khi phân công thành công:
            </Label>
          </div>

          <RadioGroup value={currentMode} onValueChange={(value) => onModeChange(value as NotificationMode)}>
            <div className="space-y-3">
              {/* Popup notification */}
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="popup" id="popup" />
                <Label htmlFor="popup" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-medium">Thông báo popup</p>
                      <p className="text-sm text-gray-600">Hiển thị popup với animation, tự động đóng sau vài giây</p>
                    </div>
                  </div>
                </Label>
              </div>

              {/* Success page */}
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="page" id="page" />
                <Label htmlFor="page" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-medium">Trang success</p>
                      <p className="text-sm text-gray-600">Chuyển đến trang chuyên dụng với thông tin chi tiết</p>
                    </div>
                  </div>
                </Label>
              </div>

              {/* Both */}
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <ExternalLink className="w-4 h-4 text-green-600 -ml-1" />
                    </div>
                    <div>
                      <p className="font-medium">Cả hai</p>
                      <p className="text-sm text-gray-600">Hiển thị popup trước, sau đó chuyển trang</p>
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>

          <div className="flex gap-2 pt-4">
            <Button onClick={() => onOpenChange(false)} className="flex-1">
              Lưu cài đặt
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 