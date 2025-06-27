"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Download,
  Filter,
  Search,
  Activity,
  Shield,
  AlertTriangle,
  Info,
  User,
  Clock
} from "lucide-react"

interface AuditLog {
  id: number
  userId: number
  userName: string
  userEmail: string
  action: string
  resource: string
  details: string
  status: 'success' | 'failure' | 'warning'
  severity: 'low' | 'medium' | 'high' | 'critical'
  ipAddress: string
  userAgent: string
  timestamp: string
}

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    userId: 1,
    userName: "Super Admin",
    userEmail: "superadmin@eduscan.ai",
    action: "create",
    resource: "user",
    details: "Created new teacher account: john.doe@school.edu",
    status: "success",
    severity: "medium",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    timestamp: "2025-06-07T10:30:00Z"
  },
  {
    id: 2,
    userId: 2,
    userName: "Manager",
    userEmail: "manager@eduscan.ai",
    action: "update",
    resource: "system_settings",
    details: "Changed max upload size from 10MB to 20MB",
    status: "success",
    severity: "high",
    ipAddress: "192.168.1.101",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    timestamp: "2025-06-07T09:15:00Z"
  },
  {
    id: 3,
    userId: 3,
    userName: "Teacher",
    userEmail: "teacher@school.edu",
    action: "failed_login",
    resource: "authentication",
    details: "Failed login attempt with incorrect password",
    status: "failure",
    severity: "medium",
    ipAddress: "203.113.45.67",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1)",
    timestamp: "2025-06-07T08:45:00Z"
  },
  {
    id: 4,
    userId: 1,
    userName: "Super Admin",
    userEmail: "superadmin@eduscan.ai",
    action: "delete",
    resource: "exam",
    details: "Deleted exam: Mathematics Final Test (ID: 456)",
    status: "success",
    severity: "high",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    timestamp: "2025-06-07T07:20:00Z"
  },
  {
    id: 5,
    userId: 2,
    userName: "Manager",
    userEmail: "manager@eduscan.ai",
    action: "backup",
    resource: "database",
    details: "System backup completed successfully (size: 2.3GB)",
    status: "success",
    severity: "low",
    ipAddress: "192.168.1.101",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    timestamp: "2025-06-07T06:00:00Z"
  }
]

const ACTION_COLORS = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800", 
  delete: "bg-red-100 text-red-800",
  login: "bg-purple-100 text-purple-800",
  logout: "bg-gray-100 text-gray-800",
  failed_login: "bg-orange-100 text-orange-800",
  backup: "bg-cyan-100 text-cyan-800",
  restore: "bg-yellow-100 text-yellow-800"
}

const STATUS_VARIANTS = {
  success: "default" as const,
  failure: "destructive" as const,
  warning: "secondary" as const
}

const SEVERITY_ICONS = {
  low: Info,
  medium: AlertTriangle,
  high: Shield,
  critical: Activity
}

export default function AuditLogsPage() {
  const [logs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS)
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [isLoading] = useState(false)
  const { toast } = useToast()

  // Filter logs
  useEffect(() => {
    let filtered = logs

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress.includes(searchTerm)
      )
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter(log => log.action === actionFilter)
    }

    // Status filter  
    if (statusFilter !== "all") {
      filtered = filtered.filter(log => log.status === statusFilter)
    }

    // Severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter(log => log.severity === severityFilter)
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date()
      const cutoffDate = new Date()
      
      switch (dateFilter) {
        case "1d":
          cutoffDate.setDate(now.getDate() - 1)
          break
        case "7d":
          cutoffDate.setDate(now.getDate() - 7)
          break
        case "30d":
          cutoffDate.setDate(now.getDate() - 30)
          break
      }
      
      filtered = filtered.filter(log => new Date(log.timestamp) >= cutoffDate)
    }

    setFilteredLogs(filtered)
  }, [logs, searchTerm, actionFilter, statusFilter, severityFilter, dateFilter])

  const handleExport = () => {
    const csv = [
      "Timestamp,User,Email,Action,Resource,Status,Severity,IP Address,Details",
      ...filteredLogs.map(log => 
        `"${log.timestamp}","${log.userName}","${log.userEmail}","${log.action}","${log.resource}","${log.status}","${log.severity}","${log.ipAddress}","${log.details}"`
      )
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Export thành công",
      description: `Đã export ${filteredLogs.length} audit logs`
    })
  }

  const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(timestamp))
  }

  const getSeverityIcon = (severity: string) => {
    const IconComponent = SEVERITY_ICONS[severity as keyof typeof SEVERITY_ICONS] || Info
    return <IconComponent className="w-4 h-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Theo dõi và giám sát các hoạt động của hệ thống
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Tổng số logs</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Thành công</p>
                <p className="text-2xl font-bold">
                  {logs.filter(log => log.status === 'success').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Thất bại</p>
                <p className="text-2xl font-bold">
                  {logs.filter(log => log.status === 'failure').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Mức cao</p>
                <p className="text-2xl font-bold">
                  {logs.filter(log => log.severity === 'high' || log.severity === 'critical').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Hành động</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="create">Tạo mới</SelectItem>
                  <SelectItem value="update">Cập nhật</SelectItem>
                  <SelectItem value="delete">Xóa</SelectItem>
                  <SelectItem value="login">Đăng nhập</SelectItem>
                  <SelectItem value="failed_login">Đăng nhập thất bại</SelectItem>
                  <SelectItem value="backup">Sao lưu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="success">Thành công</SelectItem>
                  <SelectItem value="failure">Thất bại</SelectItem>
                  <SelectItem value="warning">Cảnh báo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Mức độ</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="critical">Nghiêm trọng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Thời gian</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="1d">24 giờ qua</SelectItem>
                  <SelectItem value="7d">7 ngày qua</SelectItem>
                  <SelectItem value="30d">30 ngày qua</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSearchTerm("")
                  setActionFilter("all")
                  setStatusFilter("all")
                  setSeverityFilter("all")
                  setDateFilter("all")
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Logs ({filteredLogs.length} / {logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Tài nguyên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Mức độ</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Chi tiết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{log.userName}</p>
                          <p className="text-sm text-muted-foreground">{log.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={ACTION_COLORS[log.action as keyof typeof ACTION_COLORS] || "bg-gray-100 text-gray-800"}
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.resource}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[log.status]}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(log.severity)}
                        <span className="capitalize">{log.severity}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                    <TableCell className="max-w-[300px] truncate" title={log.details}>
                      {log.details}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Không tìm thấy logs nào</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 