"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { 
  Download, 
  Upload, 
  Database, 
  Calendar, 
  Clock, 
  RefreshCw, 
  Trash2, 
  Play, 
  Pause, 
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

interface BackupRecord {
  id: number
  name: string
  type: 'full' | 'incremental' | 'differential'
  status: 'completed' | 'running' | 'failed' | 'scheduled'
  createdAt: string
  size: number
  duration: number
  description?: string
  tables: string[]
  location: string
}

interface BackupSchedule {
  id: number
  name: string
  type: 'full' | 'incremental'
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string
  enabled: boolean
  lastRun?: string
  nextRun: string
}

const BACKUP_TYPES = [
  { value: 'full', label: 'Sao lưu đầy đủ', description: 'Sao lưu toàn bộ dữ liệu' },
  { value: 'incremental', label: 'Sao lưu tăng dần', description: 'Chỉ sao lưu dữ liệu thay đổi' },
  { value: 'differential', label: 'Sao lưu khác biệt', description: 'Sao lưu từ lần backup cuối' }
]

const DATABASE_TABLES = [
  'TOCHUC', 'NGUOIDUNG', 'LOPHOC', 'HOCSINH', 'BAIKIEMTRA', 
  'KETQUA', 'CAIDAT', 'PHIEUDAPAN', 'DAPAN', 'LICHSU'
]

export default function BackupRestorePage() {
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [schedules, setSchedules] = useState<BackupSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('backups')
  const [backupDialog, setBackupDialog] = useState(false)
  const [restoreDialog, setRestoreDialog] = useState(false)
  const [scheduleDialog, setScheduleDialog] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null)
  const [backupProgress, setBackupProgress] = useState(0)
  const [isBackupRunning, setIsBackupRunning] = useState(false)
  const { toast } = useToast()

  // Form states
  const [backupForm, setBackupForm] = useState({
    name: '',
    type: 'full' as const,
    description: '',
    tables: DATABASE_TABLES
  })

  const [scheduleForm] = useState({
    name: '',
    type: 'full' as const,
    frequency: 'daily' as const,
    time: '02:00',
    enabled: true
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Mock data
      const mockBackups: BackupRecord[] = [
        {
          id: 1,
          name: 'backup_2024_01_15_full',
          type: 'full',
          status: 'completed',
          createdAt: '2024-01-15T02:00:00Z',
          size: 1024 * 1024 * 150, // 150MB
          duration: 300, // 5 minutes
          description: 'Sao lưu đầy đủ hàng ngày',
          tables: DATABASE_TABLES,
          location: '/backups/backup_2024_01_15_full.sql'
        },
        {
          id: 2,
          name: 'backup_2024_01_14_incremental',
          type: 'incremental',
          status: 'completed',
          createdAt: '2024-01-14T14:30:00Z',
          size: 1024 * 1024 * 25, // 25MB
          duration: 60, // 1 minute
          description: 'Sao lưu tăng dần',
          tables: ['KETQUA', 'BAIKIEMTRA'],
          location: '/backups/backup_2024_01_14_incremental.sql'
        },
        {
          id: 3,
          name: 'backup_2024_01_13_full',
          type: 'full',
          status: 'failed',
          createdAt: '2024-01-13T02:00:00Z',
          size: 0,
          duration: 0,
          description: 'Sao lưu thất bại do lỗi kết nối',
          tables: DATABASE_TABLES,
          location: ''
        }
      ]

      const mockSchedules: BackupSchedule[] = [
        {
          id: 1,
          name: 'Daily Full Backup',
          type: 'full',
          frequency: 'daily',
          time: '02:00',
          enabled: true,
          lastRun: '2024-01-15T02:00:00Z',
          nextRun: '2024-01-16T02:00:00Z'
        },
        {
          id: 2,
          name: 'Weekly Incremental',
          type: 'incremental',
          frequency: 'weekly',
          time: '14:00',
          enabled: false,
          nextRun: '2024-01-21T14:00:00Z'
        }
      ]

      setBackups(mockBackups)
      setSchedules(mockSchedules)
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu backup",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setIsBackupRunning(true)
    setBackupProgress(0)
    
    try {
      // Simulate backup progress
      const interval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setIsBackupRunning(false)
            setBackupDialog(false)
            
            // Add new backup to list
            const newBackup: BackupRecord = {
              id: Date.now(),
              name: backupForm.name || `backup_${format(new Date(), 'yyyy_MM_dd_HH_mm')}`,
              type: backupForm.type,
              status: 'completed',
              createdAt: new Date().toISOString(),
              size: Math.random() * 1024 * 1024 * 200, // Random size
              duration: Math.random() * 600, // Random duration
              description: backupForm.description,
              tables: backupForm.tables,
              location: `/backups/${backupForm.name}.sql`
            }
            
            setBackups(prev => [newBackup, ...prev])
            toast({ title: "Sao lưu hoàn thành!" })
            return 100
          }
          return prev + 10
        })
      }, 500)
    } catch (error) {
      setIsBackupRunning(false)
      toast({
        title: "Lỗi",
        description: "Không thể tạo backup",
        variant: "destructive"
      })
    }
  }

  const handleRestore = async () => {
    if (!selectedBackup) return
    
    try {
      // Mock restore process
      toast({ title: "Đang khôi phục dữ liệu..." })
      
      setTimeout(() => {
        setRestoreDialog(false)
        setSelectedBackup(null)
        toast({ title: "Khôi phục dữ liệu thành công!" })
      }, 3000)
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể khôi phục dữ liệu",
        variant: "destructive"
      })
    }
  }

  const handleDeleteBackup = async (backup: BackupRecord) => {
    try {
      setBackups(prev => prev.filter(b => b.id !== backup.id))
      toast({ title: "Đã xóa backup!" })
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa backup",
        variant: "destructive"
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />
      case 'running':
        return <RefreshCw size={16} className="text-blue-600 animate-spin" />
      case 'failed':
        return <XCircle size={16} className="text-red-600" />
      case 'scheduled':
        return <Clock size={16} className="text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Backup & Restore</h1>
          <p className="text-muted-foreground">Quản lý sao lưu và khôi phục dữ liệu hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw size={16} className="mr-2" />
            Làm mới
          </Button>
          <Button onClick={() => setBackupDialog(true)}>
            <Database size={16} className="mr-2" />
            Tạo Backup
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="backups">Backup History</TabsTrigger>
          <TabsTrigger value="schedules">Lịch trình</TabsTrigger>
          <TabsTrigger value="settings">Cài đặt</TabsTrigger>
        </TabsList>

        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử Backup</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Kích thước</TableHead>
                      <TableHead>Thời lượng</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-gray-200 animate-pulse rounded" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Chưa có backup nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{backup.name}</div>
                              {backup.description && (
                                <div className="text-xs text-muted-foreground">{backup.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {BACKUP_TYPES.find(t => t.value === backup.type)?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(backup.status)}
                              <Badge className={getStatusColor(backup.status)}>
                                {backup.status === 'completed' ? 'Hoàn thành' :
                                 backup.status === 'running' ? 'Đang chạy' :
                                 backup.status === 'failed' ? 'Thất bại' : 'Đã lên lịch'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(backup.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                          </TableCell>
                          <TableCell>{formatFileSize(backup.size)}</TableCell>
                          <TableCell>{formatDuration(backup.duration)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {backup.status === 'completed' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBackup(backup)
                                      setRestoreDialog(true)
                                    }}
                                  >
                                    <Upload size={14} className="mr-1" />
                                    Khôi phục
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      // Mock download
                                      toast({ title: "Đang tải xuống backup..." })
                                    }}
                                  >
                                    <Download size={14} />
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteBackup(backup)}
                              >
                                <Trash2 size={14} />
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
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Lịch trình Backup</CardTitle>
                <Button onClick={() => setScheduleDialog(true)}>
                  <Calendar size={16} className="mr-2" />
                  Thêm lịch trình
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Tần suất</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Lần chạy cuối</TableHead>
                      <TableHead>Lần chạy tiếp</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{schedule.type === 'full' ? 'Đầy đủ' : 'Tăng dần'}</Badge>
                        </TableCell>
                        <TableCell>
                          {schedule.frequency === 'daily' ? 'Hàng ngày' :
                           schedule.frequency === 'weekly' ? 'Hàng tuần' : 'Hàng tháng'}
                        </TableCell>
                        <TableCell>{schedule.time}</TableCell>
                        <TableCell className="text-sm">
                          {schedule.lastRun ? 
                            format(new Date(schedule.lastRun), 'dd/MM/yyyy HH:mm', { locale: vi }) : 
                            'Chưa chạy'
                          }
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(schedule.nextRun), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                            {schedule.enabled ? 'Bật' : 'Tắt'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              {schedule.enabled ? <Pause size={14} /> : <Play size={14} />}
                            </Button>
                            <Button size="sm" variant="outline">
                              <Settings size={14} />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt Backup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Thư mục lưu trữ</Label>
                  <Input value="/var/backups/eduscan" readOnly />
                </div>
                <div>
                  <Label>Số lượng backup tối đa</Label>
                  <Input type="number" defaultValue="30" />
                </div>
                <div>
                  <Label>Nén backup</Label>
                  <Select defaultValue="gzip">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không nén</SelectItem>
                      <SelectItem value="gzip">GZIP</SelectItem>
                      <SelectItem value="zip">ZIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>Lưu cài đặt</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thông tin hệ thống</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Dung lượng đã sử dụng:</span>
                  <span className="font-mono">2.5 GB</span>
                </div>
                <div className="flex justify-between">
                  <span>Dung lượng còn lại:</span>
                  <span className="font-mono">47.5 GB</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sử dụng ổ đĩa</span>
                    <span>5%</span>
                  </div>
                  <Progress value={5} />
                </div>
                <div className="flex justify-between">
                  <span>Số lượng backup:</span>
                  <span>{backups.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Backup Dialog */}
      <Dialog open={backupDialog} onOpenChange={setBackupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo Backup mới</DialogTitle>
          </DialogHeader>
          {isBackupRunning ? (
            <div className="space-y-4">
              <div className="text-center">
                <Database size={48} className="mx-auto mb-4 text-blue-600" />
                <h3 className="text-lg font-medium">Đang tạo backup...</h3>
                <p className="text-sm text-muted-foreground">Vui lòng đợi trong giây lát</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tiến độ</span>
                  <span>{backupProgress}%</span>
                </div>
                <Progress value={backupProgress} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="backup-name">Tên backup</Label>
                <Input
                  id="backup-name"
                  value={backupForm.name}
                  onChange={(e) => setBackupForm({ ...backupForm, name: e.target.value })}
                  placeholder="backup_2024_01_15"
                />
              </div>
              <div>
                <Label htmlFor="backup-type">Loại backup</Label>
                <Select
                  value={backupForm.type}
                  onValueChange={(value: any) => setBackupForm({ ...backupForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKUP_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div>{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="backup-description">Mô tả</Label>
                <Textarea
                  id="backup-description"
                  value={backupForm.description}
                  onChange={(e) => setBackupForm({ ...backupForm, description: e.target.value })}
                  rows={2}
                  placeholder="Mô tả backup này..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {!isBackupRunning && (
              <>
                <Button variant="outline" onClick={() => setBackupDialog(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreateBackup}>
                  <Database size={16} className="mr-2" />
                  Tạo Backup
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog} onOpenChange={setRestoreDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Khôi phục dữ liệu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Cảnh báo</h4>
                  <p className="text-sm text-yellow-700">
                    Việc khôi phục sẽ ghi đè lên dữ liệu hiện tại. Hãy chắc chắn bạn đã sao lưu dữ liệu trước khi thực hiện.
                  </p>
                </div>
              </div>
            </div>
            {selectedBackup && (
              <div className="space-y-2">
                <h4 className="font-medium">Thông tin backup:</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Tên:</strong> {selectedBackup.name}</div>
                  <div><strong>Loại:</strong> {BACKUP_TYPES.find(t => t.value === selectedBackup.type)?.label}</div>
                  <div><strong>Thời gian:</strong> {format(new Date(selectedBackup.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}</div>
                  <div><strong>Kích thước:</strong> {formatFileSize(selectedBackup.size)}</div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleRestore}>
              <Upload size={16} className="mr-2" />
              Khôi phục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 