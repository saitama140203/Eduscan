"use client"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useRef, useState, useEffect, useCallback } from "react"
import { User, Upload, X, Check, AlertTriangle, Building, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation } from "@tanstack/react-query"
import { userApi } from "@/lib/api/users"
import { useToast } from "@/components/ui/use-toast"
import { rolesMap } from "@/lib/constants"

// Cloudinary config
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/eduscan/image/upload"
const CLOUDINARY_UPLOAD_PRESET = "eduscan"

async function uploadToCloudinary(blob: Blob) {
  const formData = new FormData()
  formData.append("file", blob)
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData })
  const data = await res.json()
  if (data.secure_url) return data.secure_url
  throw new Error("Upload ảnh lên Cloudinary thất bại")
}

// Tái sử dụng InputField
function InputField({ 
  name, 
  label, 
  placeholder, 
  required = false, 
  type = "text", 
  icon: Icon, 
  value = "",
  error,
  onChange, 
  disabled = false 
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          value={value || ''}
          onChange={onChange}
          disabled={disabled}
          autoComplete="off"
          spellCheck={true}
          className={cn(
            "transition-all duration-200",
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200',
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          )}
        />
        {error && (
          <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
            <AlertTriangle className="w-3 h-3" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

// Tách component chọn và upload ảnh đại diện dùng chung
function AvatarUploader({ 
  url, 
  isLoading, 
  fileInputRef, 
  dragActive, 
  handleDrag, 
  handleDrop, 
  onFileChange 
}) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex-shrink-0">
        {url ? (
          <div className="relative group">
            <img
              src={url}
              alt="Avatar"
              className="h-20 w-20 rounded-full border-4 border-gray-200 shadow-lg object-cover transition-all duration-200 group-hover:border-blue-300"
            />
          </div>
        ) : (
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-4 border-gray-200 flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex-1 border-2 border-dashed rounded-xl p-4 transition-all duration-200 cursor-pointer",
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-center">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            <span className="font-medium text-blue-600">Nhấp để chọn</span> hoặc kéo thả ảnh vào đây
          </p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF tối đa 10MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
          disabled={isLoading}
        />
      </div>
      {isLoading && (
        <div className="flex items-center gap-2 text-blue-600">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Đang tải...</span>
        </div>
      )}
    </div>
  )
}

// Tiêu chuẩn hóa props
interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any; // Đổi tên prop từ form sang user để rõ ràng hơn
  onSuccess: () => void;
}

export function EditUserDialog({
  open, onOpenChange, user, onSuccess
}: EditUserDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null)
  
  // Form state sẽ được quản lý nội bộ
  const [form, setForm] = useState({
    email: "",
    hoTen: "",
    soDienThoai: "",
    maToChuc: 0,
    vaiTro: "",
    trangThai: true,
    urlAnhDaiDien: ""
  })
  
  // Update form khi user prop thay đổi
  useEffect(() => {
    if (user) {
      setForm({
        email: user.email || "",
        hoTen: user.hoTen || "",
        soDienThoai: user.soDienThoai || "",
        maToChuc: user.maToChuc || 0,
        vaiTro: user.vaiTro || "teacher",
        trangThai: user.trangThai ?? true,
        urlAnhDaiDien: user.urlAnhDaiDien || ""
      })
      
      // Reset avatar preview
      setPreviewAvatarUrl(user.urlAnhDaiDien || null)
      setAvatarFile(null)
    }
  }, [user])
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (userData: Partial<User>) => 
      userApi.updateUser(user.maNguoiDung, userData),
    onSuccess: () => {
      toast({ title: "Cập nhật người dùng thành công!" })
      onSuccess()
      onOpenChange(false)
      setErrors({})
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật người dùng.",
        variant: "destructive"
      })
    }
  })

  // Handle input change
  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field if exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }, [errors])
  
  // Handle file change
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewAvatarUrl(url)
    }
  }, [])
  
  // Handle status change
  const onStatusChange = useCallback((checked: boolean) => {
    setForm(prev => ({
      ...prev,
      trangThai: checked
    }))
  }, [])

  // Validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}
    if (!form.hoTen?.trim()) newErrors.hoTen = "Họ tên là bắt buộc"
    if (form.soDienThoai && !/^[0-9+\-\s()]+$/.test(form.soDienThoai)) 
      newErrors.soDienThoai = "Số điện thoại không hợp lệ"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [form])

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user?.maNguoiDung) return
    
    try {
      let avatarUrl: string | undefined = undefined
      
      // Upload avatar if changed
      if (avatarFile) {
        avatarUrl = await uploadToCloudinary(avatarFile)
      }
      
      // Prepare update data
      const updateData = {
        hoTen: form.hoTen,
        soDienThoai: form.soDienThoai,
        vaiTro: form.vaiTro,
        trangThai: form.trangThai,
      }
      
      // Add avatar URL if uploaded or changed
      if (avatarUrl) {
        Object.assign(updateData, { urlAnhDaiDien: avatarUrl })
      }
      
      // Update user
      await updateUserMutation.mutateAsync(updateData)
    } catch (error: any) {
      toast({
        title: "Lỗi tải ảnh",
        description: error.message || "Không thể tải ảnh đại diện.",
        variant: "destructive"
      })
    }
  }, [form, validateForm, avatarFile, updateUserMutation, user, toast])

  // Drag-n-drop logic
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        setAvatarFile(file)
        setPreviewAvatarUrl(URL.createObjectURL(file))
      }
    }
  }, [])
  
  // Prevent error if user is undefined
  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl shadow-2xl border-0 bg-white overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 -mx-6 -mt-6 mb-6">
          <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            Chỉnh sửa người dùng
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6">
          {/* Thông tin cá nhân */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
              Thông tin cá nhân
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                name="email"
                label="Email"
                placeholder="example@company.com"
                type="email"
                required
                icon={User}
                value={form.email}
                error={errors.email}
                onChange={onInputChange}
                disabled // Email không được sửa
              />
              <InputField
                name="hoTen"
                label="Họ tên"
                placeholder="Nguyen Van A"
                required
                value={form.hoTen}
                error={errors.hoTen}
                onChange={onInputChange}
              />
            </div>
            <InputField
              name="soDienThoai"
              label="Số điện thoại"
              placeholder="+84 123 456 789"
              type="tel"
              value={form.soDienThoai}
              error={errors.soDienThoai}
              onChange={onInputChange}
            />
          </div>

          {/* Avatar */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
              Ảnh đại diện
            </h3>
            <AvatarUploader
              url={previewAvatarUrl ?? form.urlAnhDaiDien}
              isLoading={updateUserMutation.isPending}
              fileInputRef={fileInputRef}
              dragActive={dragActive}
              handleDrag={handleDrag}
              handleDrop={handleDrop}
              onFileChange={onFileChange}
            />
          </div>

          {/* Vai trò và Trạng thái */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
              Phân quyền và Trạng thái
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Vai trò
                </label>
                <div className="relative">
                  <select
                    name="vaiTro"
                    required
                    value={form.vaiTro || ''}
                    onChange={onInputChange}
                    className="w-full border rounded p-2 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200"
                  >
                    {Object.entries(rolesMap).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            
              <div className="flex items-center justify-between p-3 border rounded-md border-gray-200 bg-gray-50">
                <label htmlFor="status-toggle-edit" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Trạng thái hoạt động
                </label>
                <Switch
                  id="status-toggle-edit"
                  checked={form.trangThai}
                  onCheckedChange={onStatusChange}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 -mx-6 -mb-6 bg-gray-50 flex justify-end gap-3 rounded-b-3xl border-t border-gray-100">
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              Hủy
            </Button>
            <Button type="submit" disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
