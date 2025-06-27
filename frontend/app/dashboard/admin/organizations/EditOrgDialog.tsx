"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { LogoUploader } from "./LogoUploader"
import { ORG_TYPES } from "@/lib/constants"
import { 
  Building2, 
  MapPin, 
  Tag, 
  Image, 
  Check, 
  X,
  AlertCircle,
  Upload,
  Loader2
} from "lucide-react"
import clsx from "clsx"

interface EditOrgDialogProps {
  open: boolean
  setOpen: (v: boolean) => void
  formData: {
    name?: string
    address?: string
    type?: string
    logo_url?: string
  }
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploading: boolean
  onUpdate: () => void
  errors?: {
    name?: string
    address?: string
    type?: string
    logo?: string
  }
}

const FormField = ({ 
  label, 
  icon: Icon, 
  children, 
  error, 
  required = false 
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  error?: string
  required?: boolean
}) => (
  <div className="space-y-2">
    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      <Icon className="w-4 h-4" />
      {label}
      {required && <span className="text-red-500">*</span>}
    </Label>
    <div className="relative">
      {children}
      {error && (
        <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  </div>
)

const TypeSelector = ({ 
  value, 
  onChange, 
  error 
}: { 
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  error?: string
}) => (
  <div className="relative">
    <select
      name="type"
      value={value || ORG_TYPES[0].value}
      onChange={onChange}
      className={clsx(
        "w-full px-4 py-3 pr-8 border rounded-lg transition-all duration-200",
        "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none",
        "bg-white hover:border-gray-400",
        error ? "border-red-500 bg-red-50" : "border-gray-300"
      )}
      required
    >
      {ORG_TYPES.map(type => (
        <option key={type.value} value={type.value}>
          {type.label}
        </option>
      ))}
    </select>
    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
      <Tag className="w-4 h-4 text-gray-400" />
    </div>
  </div>
)

const EnhancedLogoUploader = ({ 
  logo_url, 
  uploading, 
  onFileChange 
}: {
  logo_url?: string
  uploading: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const fakeEvent = {
        target: { files }
      } as React.ChangeEvent<HTMLInputElement>
      onFileChange(fakeEvent)
    }
  }

  return (
    <div className="space-y-3">
      {/* Current Logo Preview */}
      {logo_url && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border">
            <img
              src={logo_url}
              alt="Current logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Logo hiện tại</p>
            <p className="text-xs text-gray-500">Tải lên logo mới để thay thế</p>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="w-3 h-3 mr-1" />
            Đã có
          </Badge>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={clsx(
          "relative border-2 border-dashed rounded-lg p-6 transition-all duration-200",
          "hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer group",
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300",
          uploading && "pointer-events-none opacity-60"
        )}
        onDrop={handleDrop}
        onDragOver={e => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <input
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        <div className="text-center">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
              <p className="text-sm font-medium text-blue-600">Đang tải lên...</p>
              <p className="text-xs text-gray-500 mt-1">Vui lòng đợi</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {dragOver ? "Thả file vào đây" : "Tải lên logo mới"}
              </p>
              <p className="text-xs text-gray-500">
                Kéo thả hoặc click để chọn • PNG, JPG, GIF • Tối đa 5MB
              </p>
            </>
          )}
        </div>

        {/* Progress bar khi uploading */}
        {uploading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  )
}

export function EditOrgDialog({
  open,
  setOpen,
  formData,
  onInputChange,
  onFileChange,
  uploading,
  onUpdate,
  errors = {}
}: EditOrgDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await onUpdate()
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = uploading || isSubmitting
  const hasErrors = Object.values(errors).some(Boolean)

  if (!mounted) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header với icon */}
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Chỉnh sửa tổ chức
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Cập nhật thông tin chi tiết của tổ chức
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Fields */}
          <div className="space-y-6">
            {/* Organization Name */}
            <FormField
              label="Tên tổ chức"
              icon={Building2}
              error={errors.name}
              required
            >
              <Input
                name="name"
                value={formData.name || ""}
                onChange={onInputChange}
                placeholder="Nhập tên tổ chức..."
                className={clsx(
                  "h-12 px-4 transition-all duration-200",
                  "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                  errors.name ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                )}
                required
              />
            </FormField>

            {/* Address */}
            <FormField
              label="Địa chỉ"
              icon={MapPin}
              error={errors.address}
              required
            >
              <Input
                name="address"
                value={formData.address || ""}
                onChange={onInputChange}
                placeholder="Nhập địa chỉ đầy đủ..."
                className={clsx(
                  "h-12 px-4 transition-all duration-200",
                  "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                  errors.address ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                )}
                required
              />
            </FormField>

            {/* Organization Type */}
            <FormField
              label="Loại tổ chức"
              icon={Tag}
              error={errors.type}
              required
            >
              <TypeSelector
                value={formData.type || ""}
                onChange={onInputChange}
                error={errors.type}
              />
            </FormField>

            {/* Logo Upload */}
            <FormField
              label="Logo tổ chức"
              icon={Image}
              error={errors.logo}
            >
              <EnhancedLogoUploader
                logo_url={formData.logo_url}
                uploading={uploading}
                onFileChange={onFileChange}
              />
            </FormField>
          </div>

          {/* Error Summary */}
          {hasErrors && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Có lỗi cần sửa:</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {Object.entries(errors).map(([field, error]) => 
                  error && (
                    <li key={field} className="flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {error}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Footer Actions */}
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="flex-1 sm:flex-none h-11 px-6"
            >
              <X className="w-4 h-4 mr-2" />
              Hủy bỏ
            </Button>
            
            <Button
              type="submit"
              disabled={isLoading || hasErrors}
              className={clsx(
                "flex-1 sm:flex-none h-11 px-6 transition-all duration-200",
                "bg-blue-600 hover:bg-blue-700 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}