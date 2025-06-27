import { Image as ImageIcon, Loader2 } from "lucide-react"
import { useRef } from "react"

type AvatarUploaderProps = {
  value: string
  uploading: boolean
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  size?: number             // Kích thước avatar (mặc định 72)
  placeholderUrl?: string   // Ảnh mặc định nếu chưa có avatar
  className?: string
}

export function AvatarUploader({
  value,
  uploading,
  onFileChange,
  size = 72,
  placeholderUrl = "https://placehold.co/96x96?text=Avatar",
  className = "",
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {/* Avatar Preview */}
      <div
        className="relative group cursor-pointer select-none"
        style={{ height: size, width: size, minWidth: size }}
        title="Bấm để đổi ảnh đại diện"
        onClick={() => !uploading && fileInputRef.current?.click()}
        tabIndex={0}
      >
        {value ? (
          <img
            src={value}
            alt="Avatar"
            className="h-full w-full rounded-full object-cover border border-gray-200 shadow-sm transition group-hover:border-blue-400"
          />
        ) : (
          <img
            src={placeholderUrl}
            alt="Chưa có ảnh"
            className="h-full w-full rounded-full object-cover border border-gray-200 shadow-sm transition group-hover:border-blue-400 bg-gray-50"
          />
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full z-10">
            <Loader2 className="animate-spin w-7 h-7 text-blue-500" />
          </div>
        )}

        {!uploading && (
          <div className="absolute inset-0 rounded-full bg-black/10 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
        )}
      </div>

      <button
        type="button"
        className="px-3 py-1.5 rounded bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm shadow disabled:opacity-70"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="animate-spin w-4 h-4 inline -mt-1 mr-1" />
        ) : (
          <ImageIcon size={16} className="inline mr-1 -mt-1" />
        )}
        {uploading ? "Đang tải..." : "Chọn ảnh"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
        disabled={uploading}
        tabIndex={-1}
      />
    </div>
  )
}
