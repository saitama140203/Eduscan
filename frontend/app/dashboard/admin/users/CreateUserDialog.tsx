"use client"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useRef, useState, useCallback, useMemo } from "react"
import { User, Upload, X, Check, AlertTriangle } from "lucide-react"
import { userApi } from "@/lib/api/users"
import { organizationsApi } from "@/lib/api/organizations"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { rolesMap } from "@/lib/constants"
import { cn } from "@/lib/utils"

// Định nghĩa kiểu dữ liệu form cho user mới
interface NewUserData {
  email: string;
  hoTen: string;
  soDienThoai?: string;
  maToChuc: number;
  vaiTro: string;
  trangThai: boolean;
  urlAnhDaiDien?: string;
}

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

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({
  open, onOpenChange, onSuccess
}: CreateUserDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null)

  // Initial form state for new user
  const [form, setForm] = useState<NewUserData>({
    email: '',
    hoTen: '',
    maToChuc: 0, // Sẽ được set khi chọn tổ chức
    vaiTro: 'teacher', // Default role
    trangThai: true, // Default to active
  })

  // Fetch organizations
  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => organizationsApi.getAll()
  })

  // Mutation to create user
  const createUserMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      toast({ title: "Tạo người dùng mới thành công!" })
      onSuccess()
      onOpenChange(false) // Close dialog on success
      setForm({
        email: '',
        hoTen: '',
        maToChuc: 0,
        vaiTro: 'teacher',
        trangThai: true,
      }) // Reset form
      setAvatarFile(null)
      setPreviewAvatarUrl(null)
      setErrors({}) // Clear errors
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo người dùng mới.",
        variant: "destructive"
      })
    },
  })

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }, [errors])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setPreviewAvatarUrl(URL.createObjectURL(file))
    }
  }, [])

  const onStatusChange = useCallback((checked: boolean) => {
    setForm(prev => ({
      ...prev,
      trangThai: checked
    }))
  }, [])

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}
    
    if (!form.email.trim()) {
      newErrors.email = "Email là bắt buộc"
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Email không hợp lệ"
    }
    
    if (!form.hoTen.trim()) {
      newErrors.hoTen = "Họ tên là bắt buộc"
    }
    
    if (form.soDienThoai && !/^[0-9+\-\s()]+$/.test(form.soDienThoai)) {
      newErrors.soDienThoai = "Số điện thoại không hợp lệ"
    }
    
    if (form.maToChuc === 0) {
      newErrors.maToChuc = "Vui lòng chọn tổ chức"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [form])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }
    
    try {
      let avatarUrl: string | undefined = undefined
      if (avatarFile) {
        avatarUrl = await uploadToCloudinary(avatarFile)
      }

      await createUserMutation.mutateAsync({
        ...form,
        urlAnhDaiDien: avatarUrl,
      })
    } catch (error: any) {
      toast({
        title: "Lỗi tải ảnh",
        description: error.message || "Không thể tải ảnh đại diện.",
        variant: "destructive"
      })
    }
  }, [form, avatarFile, validateForm, createUserMutation, toast])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        const syntheticEvent = {
          target: { files: [file] as unknown as FileList, value: '' },
          currentTarget: { files: [file] as unknown as FileList, value: '' },
        } as unknown as React.ChangeEvent<HTMLInputElement>
        onFileChange(syntheticEvent)
      }
    }
  }, [onFileChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl shadow-2xl border-0 bg-white overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 -mx-6 -mt-6 mb-6">
          <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            Thêm người dùng mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
              Thông tin cá nhân
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input 
                    name="email"
                    type="email"
                    placeholder="example@company.com"
                    required
                    value={form.email || ''}
                    onChange={onInputChange}
                    className={cn(
                      "transition-all duration-200",
                      errors.email 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                    )}
                  />
                  {errors.email && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      {errors.email}
                    </div>
                  )}
                </div>
              </div>

              {/* Họ tên */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Họ tên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input 
                    name="hoTen"
                    placeholder="Nguyen Van A"
                    required
                    value={form.hoTen || ''}
                    onChange={onInputChange}
                    className={cn(
                      "transition-all duration-200",
                      errors.hoTen 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                    )}
                  />
                  {errors.hoTen && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      {errors.hoTen}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Số điện thoại */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Số điện thoại
              </label>
              <div className="relative">
                <Input 
                  name="soDienThoai"
                  type="tel"
                  placeholder="+84 123 456 789"
                  value={form.soDienThoai || ''}
                  onChange={onInputChange}
                  className={cn(
                    "transition-all duration-200",
                    errors.soDienThoai 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                  )}
                />
                {errors.soDienThoai && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                    <AlertTriangle className="w-3 h-3" />
                    {errors.soDienThoai}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Avatar Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
              Ảnh đại diện
            </h3>
            
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                {previewAvatarUrl ? (
                  <div className="relative group">
                    <img 
                      src={previewAvatarUrl} 
                      alt="Avatar"
                      className="h-20 w-20 rounded-full border-4 border-gray-200 shadow-lg object-cover transition-all duration-200 group-hover:border-blue-300" 
                    />
                    <div className="absolute -top-2 -right-2 bg-green-500 w-6 h-6 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
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
                  className="hidden"
                  onChange={onFileChange}
                  accept="image/*"
                />
                {avatarFile && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 rounded-full text-red-500 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation() // Prevent triggering file input click
                      setAvatarFile(null)
                      setPreviewAvatarUrl(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '' // Clear the input
                      }
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Organization and Role Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
              Phân quyền và Tổ chức
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tổ chức */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Tổ chức <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="maToChuc"
                    required
                    value={form.maToChuc || ''}
                    onChange={onInputChange}
                    className={cn(
                      "w-full border rounded p-2 text-sm transition-all duration-200",
                      errors.maToChuc 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
                    )}
                  >
                    <option value="0" disabled>Chọn tổ chức</option>
                    {orgs.map((org: any) => (
                      <option key={org.maToChuc} value={org.maToChuc}>
                        {org.tenToChuc}
                      </option>
                    ))}
                  </select>
                  {errors.maToChuc && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                      <AlertTriangle className="w-3 h-3" />
                      {errors.maToChuc}
                    </div>
                  )}
                </div>
              </div>

              {/* Vai trò */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Vai trò <span className="text-red-500">*</span>
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
            </div>

            {/* Trạng thái hoạt động */}
            <div className="flex items-center justify-between p-3 border rounded-md border-gray-200 bg-gray-50">
              <label htmlFor="status-toggle" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                Trạng thái hoạt động
              </label>
              <Switch
                id="status-toggle"
                checked={form.trangThai}
                onCheckedChange={onStatusChange}
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 -mx-6 -mb-6 bg-gray-50 flex justify-end gap-3 rounded-b-3xl border-t border-gray-100">
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              Hủy
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Đang tạo..." : "Tạo người dùng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
