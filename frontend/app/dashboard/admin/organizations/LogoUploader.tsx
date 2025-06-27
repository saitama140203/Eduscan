"use client"
import { Input } from "@/components/ui/input"

export function LogoUploader({ logo_url, uploading, onFileChange }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {logo_url ? (
          <img
            src={logo_url}
            alt="Logo"
            className="h-12 w-12 object-contain border rounded bg-white"
          />
        ) : (
          <div className="h-12 w-12 flex items-center justify-center bg-gray-100 border rounded text-xs text-gray-400">
            Chưa có logo
          </div>
        )}
      </div>
      <Input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="flex-1"
        disabled={uploading}
      />
    </div>
  )
}
