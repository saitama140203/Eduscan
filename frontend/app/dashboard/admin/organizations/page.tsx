"use client"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Organization, organizationsApi } from "@/lib/api/organizations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { 
  Pencil, 
  Trash2, 
  Building2, 
  Search, 
  X, 
  BarChart, 
  Plus,
  Filter,
  Download,
  Upload,
  Eye,
  MoreVertical,
  MapPin,
  Calendar,
  TrendingUp,
  Sparkles,
  Layers,
  Grid3X3,
  List,
  ArrowUpDown,
  RefreshCw
} from "lucide-react"
import { timeAgo } from "@/lib/timeago"
import { ORG_TYPES } from "@/lib/constants"
import { CreateOrgDialog } from "./CreateOrgDialog"
import { EditOrgDialog } from "./EditOrgDialog"
import { LogoCropDialog } from "./LogoCropDialog"

const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/eduscan/image/upload"
const CLOUDINARY_UPLOAD_PRESET = "eduscan"

async function uploadToCloudinary(blob: Blob): Promise<string> {
  const formData = new FormData()
  formData.append("file", blob)
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)
  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: formData })
  const data = await res.json()
  if (data.secure_url) return data.secure_url
  throw new Error("Upload ảnh lên Cloudinary thất bại")
}

const EMPTY_FORM: Partial<Organization> = {
  name: "",
  address: "",
  type: ORG_TYPES[0].value,
  logo_url: ""
}

type ViewMode = "table" | "grid"
type SortField = "name" | "type" | "updated_at" | "created_at"
type SortOrder = "asc" | "desc"

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [formData, setFormData] = useState<Partial<Organization>>(EMPTY_FORM)
  const [showCrop, setShowCrop] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | undefined>(undefined)
  const [cropContext, setCropContext] = useState<"create" | "edit">("create")
  const cropperRef = useRef<any>(null)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  const [sortField, setSortField] = useState<SortField>("updated_at")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [showFilters, setShowFilters] = useState(false)
  const { toast } = useToast()

  // Statistics by type with growth indicators
  const stats = useMemo(() => {
    const total = organizations.length
    const byType: Record<string, number> = {}
    ORG_TYPES.forEach(type => byType[type.value] = 0)
    organizations.forEach(org => {
      if (byType[org.type] !== undefined) byType[org.type] += 1
    })
    
    // Calculate recent additions (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentCount = organizations.filter(org => 
      new Date(org.created_at || org.updated_at) > thirtyDaysAgo
    ).length
    
    return { total, byType, recentCount }
  }, [organizations])

  // Fetch orgs with loading states
  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await organizationsApi.getAll()
      setOrganizations(Array.isArray(data) ? data : data.organizations || [])
    } catch {
      toast({ 
        title: "Lỗi kết nối", 
        description: "Không thể tải danh sách tổ chức. Vui lòng thử lại.", 
        variant: "destructive" 
      })
      setOrganizations([])
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchOrganizations() }, [fetchOrganizations])

  // Input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Logo crop with better UX
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, context: "create" | "edit") => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: "Lỗi định dạng", 
        description: "Vui lòng chọn file ảnh hợp lệ.", 
        variant: "destructive" 
      })
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: "File quá lớn", 
        description: "Kích thước file không được vượt quá 5MB.", 
        variant: "destructive" 
      })
      return
    }
    
    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(reader.result as string)
      setShowCrop(true)
      setCropContext(context)
    }
    reader.readAsDataURL(file)
  }

  const handleCropAndUpload = async () => {
    if (!cropperRef.current) return
    setUploading(true)
    try {
      const canvas = cropperRef.current.cropper.getCroppedCanvas({ 
        width: 256, 
        height: 256, 
        fillColor: "#fff",
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      })
      const blob: Blob = await new Promise(resolve => 
        canvas.toBlob(resolve as any, "image/jpeg", 0.92)
      )
      const url = await uploadToCloudinary(blob)
      setFormData(prev => ({ ...prev, logo_url: url }))
      toast({ 
        title: "Thành công!", 
        description: "Logo đã được tải lên và cập nhật." 
      })
      setShowCrop(false)
    } catch (err) {
      toast({ 
        title: "Lỗi upload", 
        description: "Không thể tải lên logo. Vui lòng thử lại.", 
        variant: "destructive" 
      })
    } finally {
      setUploading(false)
    }
  }

  // Enhanced CRUD handlers with better feedback
  const handleCreateOrg = useCallback(async () => {
    try {
      await organizationsApi.create(formData)
      setIsCreateDialogOpen(false)
      setFormData(EMPTY_FORM)
      toast({ 
        title: "Tạo thành công!", 
        description: "Tổ chức mới đã được thêm vào hệ thống." 
      })
      fetchOrganizations()
    } catch (error) {
      toast({ 
        title: "Không thể tạo tổ chức", 
        description: "Vui lòng kiểm tra thông tin và thử lại.", 
        variant: "destructive" 
      })
    }
  }, [formData, fetchOrganizations, toast])

  const handleEditOrg = useCallback(async () => {
    if (!selectedOrg) return
    try {
      await organizationsApi.update(selectedOrg.id, formData)
      setIsEditDialogOpen(false)
      setSelectedOrg(null)
      setFormData(EMPTY_FORM)
      toast({ 
        title: "Cập nhật thành công!", 
        description: "Thông tin tổ chức đã được lưu." 
      })
      fetchOrganizations()
    } catch (error) {
      toast({ 
        title: "Không thể cập nhật", 
        description: "Vui lòng kiểm tra thông tin và thử lại.", 
        variant: "destructive" 
      })
    }
  }, [formData, selectedOrg, fetchOrganizations, toast])

  const handleDeleteOrg = async (org: Organization) => {
    if (!window.confirm(
      `Bạn có chắc chắn muốn xóa tổ chức "${org.name}"?\n\nHành động này không thể hoàn tác.`
    )) return
    
    try {
      await organizationsApi.delete(org.id)
      toast({ 
        title: "Đã xóa thành công", 
        description: `Tổ chức "${org.name}" đã được xóa khỏi hệ thống.` 
      })
      fetchOrganizations()
    } catch (error) {
      toast({ 
        title: "Không thể xóa", 
        description: "Có lỗi xảy ra khi xóa tổ chức. Vui lòng thử lại.", 
        variant: "destructive" 
      })
    }
  }

  const openEditDialog = (org: Organization) => {
    setSelectedOrg(org)
    setFormData({
      name: org.name,
      address: org.address,
      type: org.type,
      logo_url: org.logo_url
    })
    setIsEditDialogOpen(true)
  }

  // Enhanced sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // Enhanced filtering and sorting
  const filteredAndSortedOrganizations = useMemo(() => {
    let data = [...organizations]
    
    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      data = data.filter(org =>
        (org.name || '').toLowerCase().includes(searchLower) ||
        (org.address || '').toLowerCase().includes(searchLower)
      )
    }
    
    if (filterType) {
      data = data.filter(org => org.type === filterType)
    }
    
    // Apply sorting
    data.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortField) {
        case "name":
          aValue = a.name?.toLowerCase() || ""
          bValue = b.name?.toLowerCase() || ""
          break
        case "type":
          aValue = a.type || ""
          bValue = b.type || ""
          break
        case "updated_at":
          aValue = new Date(a.updated_at).getTime()
          bValue = new Date(b.updated_at).getTime()
          break
        case "created_at":
          aValue = new Date(a.created_at || a.updated_at).getTime()
          bValue = new Date(b.created_at || b.updated_at).getTime()
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })
    
    return data
  }, [organizations, search, filterType, sortField, sortOrder])

  const hasActiveFilters = search || filterType
  const clearFilters = () => {
    setSearch("")
    setFilterType("")
  }

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
          <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
          <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  )

  // Grid view component
  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredAndSortedOrganizations.map(org => (
        <Card key={org.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:scale-105 bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt={`${org.name} logo`}
                    className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-white shadow-lg">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white"></div>
              </div>
              
              <div className="space-y-2 w-full">
                <h3 className="font-bold text-lg text-gray-900 truncate" title={org.name}>
                  {org.name}
                </h3>
                <div className="flex items-center justify-center text-gray-500 text-sm">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span className="truncate" title={org.address}>{org.address}</span>
                </div>
                <Badge 
                  variant="secondary"
                  className="text-xs"
                  style={{
                    background: ORG_TYPES.find(t => t.value === org.type)?.color || "#f4f4f5",
                    color: "#222"
                  }}
                >
                  {ORG_TYPES.find(t => t.value === org.type)?.label || org.type}
                </Badge>
              </div>
              
              <div className="flex items-center text-xs text-gray-400">
                <Calendar className="w-3 h-3 mr-1" />
                {timeAgo(org.updated_at)}
              </div>
              
              <div className="flex gap-2 w-full pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => openEditDialog(org)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteOrg(org)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Xóa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <LogoCropDialog
        open={showCrop}
        setOpen={setShowCrop}
        cropSrc={cropSrc}
        cropperRef={cropperRef}
        uploading={uploading}
        handleCropAndUpload={handleCropAndUpload}
      />
      
      <div className="container mx-auto py-8 max-w-7xl space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-2">
                  Quản lý tổ chức
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                </h1>
                <p className="text-gray-600 mt-1">
                  Tạo, cập nhật và quản lý các tổ chức trong hệ thống một cách hiệu quả
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => {
              setFormData(EMPTY_FORM);
              setIsCreateDialogOpen(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 transition-all duration-300 text-white font-medium py-2 h-auto shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Tạo tổ chức mới
          </Button>
        </div>

        {/* Enhanced Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Total Organizations */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow col-span-1 md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Tổng số tổ chức</p>
                  <p className="text-3xl font-bold mb-2">{stats.total}</p>
                  <div className="flex items-center text-blue-100 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +{stats.recentCount} trong 30 ngày qua
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <BarChart className="w-8 h-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Types */}
          {ORG_TYPES.map(type => (
            <Card
              key={type.value}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 text-white hover:scale-105"
              style={{
                background: type.color || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              }}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium opacity-90 mb-1">{type.label}</p>
                    <p className="text-2xl font-bold">{stats.byType[type.value]}</p>
                  </div>
                  <div className="p-2 bg-white/30 rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Controls */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-6 rounded-2xl shadow-lg border-0">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Tìm kiếm tên hoặc địa chỉ tổ chức..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-200 bg-gray-50 focus:bg-white transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-12 flex items-center gap-2 ${showFilters ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <Filter className="w-4 h-4" />
              Bộ lọc
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {(search ? 1 : 0) + (filterType ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại tổ chức
                  </label>
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:ring-blue-200 bg-white"
                  >
                    <option value="">Tất cả loại tổ chức</option>
                    {ORG_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="flex items-center gap-2 mt-6 sm:mt-0"
                    >
                      <X className="w-4 h-4" />
                      Xóa bộ lọc
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Area */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : viewMode === "grid" ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Danh sách tổ chức ({filteredAndSortedOrganizations.length})
              </h2>
            </div>
            {filteredAndSortedOrganizations.length === 0 ? (
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="py-16">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-gray-300" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {hasActiveFilters ? "Không tìm thấy kết quả" : "Chưa có tổ chức nào"}
                      </h3>
                      <p className="text-gray-500">
                        {hasActiveFilters 
                          ? "Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm"
                          : "Bắt đầu bằng cách tạo tổ chức đầu tiên"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <GridView />
            )}
          </div>
        ) : (
          /* Enhanced Table */
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-gray-800">
                  Danh sách tổ chức ({filteredAndSortedOrganizations.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Xuất dữ liệu
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-700 pl-6">ID</TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <button
                          onClick={() => handleSort("name")}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Tên tổ chức
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">Địa chỉ</TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <button
                          onClick={() => handleSort("type")}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Loại
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">Logo</TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        <button
                          onClick={() => handleSort("updated_at")}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Cập nhật
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 pr-6">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedOrganizations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <Building2 className="w-8 h-8 text-gray-300" />
                            </div>
                            <div className="text-center">
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {hasActiveFilters ? "Không tìm thấy kết quả" : "Chưa có tổ chức nào"}
                              </h3>
                              <p className="text-gray-500">
                                {hasActiveFilters 
                                  ? "Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm"
                                  : "Bắt đầu bằng cách tạo tổ chức đầu tiên"
                                }
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedOrganizations.map((org, index) => (
                        <TableRow 
                          key={org.id} 
                          className="hover:bg-gray-50/50 transition-colors group"
                        >
                          <TableCell className="text-gray-500 font-mono pl-6">
                            #{org.id}
                          </TableCell>
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-3">
                              {org.logo_url ? (
                                <img
                                  src={org.logo_url}
                                  alt={`${org.name} logo`}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-100 shadow-sm"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-gray-100 shadow-sm">
                                  <Building2 className="w-5 h-5 text-white" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-gray-900">{org.name}</div>
                                <div className="text-xs text-gray-500">ID: {org.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="max-w-xs truncate" title={org.address}>
                                {org.address}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium px-3 py-1"
                              style={{
                                background: ORG_TYPES.find(t => t.value === org.type)?.color || "#f4f4f5",
                                color: "#222"
                              }}
                            >
                              {ORG_TYPES.find(t => t.value === org.type)?.label || org.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              {org.logo_url ? (
                                <div className="relative">
                                  <img
                                    src={org.logo_url}
                                    alt="Logo"
                                    className="h-12 w-12 rounded-full object-cover border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                  />
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                                  <Building2 className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              <span>{timeAgo(org.updated_at)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-6">
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                                onClick={() => openEditDialog(org)}
                                title="Chỉnh sửa tổ chức"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                onClick={() => handleDeleteOrg(org)}
                                title="Xóa tổ chức"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <EditOrgDialog
          open={isEditDialogOpen}
          setOpen={setIsEditDialogOpen}
          formData={formData}
          onInputChange={handleInputChange}
          onFileChange={e => handleFileChange(e, "edit")}
          uploading={uploading}
          onUpdate={handleEditOrg}
        />

        {/* Create Dialog */}
        <CreateOrgDialog
          open={isCreateDialogOpen}
          setOpen={setIsCreateDialogOpen}
          formData={formData}
          onInputChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
          onFileChange={e => handleFileChange(e, "create")}
          uploading={uploading}
          onCreate={handleCreateOrg}
          loading={false}
        />
      </div>
    </div>
  )
}