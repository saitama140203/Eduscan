"use client"

import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult
} from "@hello-pangea/dnd"
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  Users, 
  Target, 
  Clock, 
  Activity,
  Plus,
  Settings,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Palette,
  Layout,
  Grid,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  Download,
  Upload
} from "lucide-react"

interface DashboardWidget {
  id: string
  type: 'chart' | 'stat' | 'table' | 'activity' | 'calendar' | 'progress'
  title: string
  subtitle?: string
  size: 'small' | 'medium' | 'large' | 'full'
  position: { x: number; y: number }
  config: {
    chartType?: 'bar' | 'line' | 'pie' | 'area' | 'scatter'
    dataSource?: string
    refreshInterval?: number
    showLegend?: boolean
    colorScheme?: string
    animation?: boolean
  }
  isVisible: boolean
  isLocked: boolean
}

interface DashboardLayout {
  id: string
  name: string
  description: string
  widgets: DashboardWidget[]
  theme: 'light' | 'dark' | 'auto'
  gridSize: number
  isDefault: boolean
}

const WIDGET_TEMPLATES: Omit<DashboardWidget, 'id' | 'position'>[] = [
  {
    type: 'stat',
    title: 'Tổng học sinh',
    subtitle: 'Số lượng học sinh hiện tại',
    size: 'small',
    config: { dataSource: 'students_count' },
    isVisible: true,
    isLocked: false
  },
  {
    type: 'stat',
    title: 'Điểm trung bình',
    subtitle: 'Điểm TB của tất cả bài kiểm tra',
    size: 'small',
    config: { dataSource: 'average_score' },
    isVisible: true,
    isLocked: false
  },
  {
    type: 'chart',
    title: 'Phân bố điểm số',
    subtitle: 'Biểu đồ phân bố điểm',
    size: 'medium',
    config: { 
      chartType: 'bar', 
      dataSource: 'score_distribution',
      showLegend: true,
      colorScheme: 'blue',
      animation: true
    },
    isVisible: true,
    isLocked: false
  },
  {
    type: 'chart',
    title: 'Xu hướng hiệu suất',
    subtitle: 'Biến động theo thời gian',
    size: 'large',
    config: { 
      chartType: 'line', 
      dataSource: 'performance_trends',
      showLegend: true,
      colorScheme: 'green',
      animation: true
    },
    isVisible: true,
    isLocked: false
  },
  {
    type: 'activity',
    title: 'Hoạt động gần đây',
    subtitle: 'Các sự kiện mới nhất',
    size: 'medium',
    config: { 
      dataSource: 'recent_activities',
      refreshInterval: 30
    },
    isVisible: true,
    isLocked: false
  },
  {
    type: 'table',
    title: 'Top học sinh',
    subtitle: 'Học sinh có điểm cao nhất',
    size: 'medium',
    config: { 
      dataSource: 'top_students',
      refreshInterval: 60
    },
    isVisible: true,
    isLocked: false
  },
  {
    type: 'progress',
    title: 'Tiến độ bài kiểm tra',
    subtitle: 'Tỷ lệ hoàn thành các bài thi',
    size: 'small',
    config: { 
      dataSource: 'exam_progress',
      refreshInterval: 10
    },
    isVisible: true,
    isLocked: false
  }
]

const COLOR_SCHEMES = [
  { name: 'Blue', value: 'blue', colors: ['#3b82f6', '#1d4ed8', '#1e40af'] },
  { name: 'Green', value: 'green', colors: ['#10b981', '#059669', '#047857'] },
  { name: 'Purple', value: 'purple', colors: ['#8b5cf6', '#7c3aed', '#6d28d9'] },
  { name: 'Orange', value: 'orange', colors: ['#f59e0b', '#d97706', '#b45309'] },
  { name: 'Red', value: 'red', colors: ['#ef4444', '#dc2626', '#b91c1c'] },
  { name: 'Teal', value: 'teal', colors: ['#14b8a6', '#0d9488', '#0f766e'] }
]

export default function DashboardBuilder() {
  const [layouts, setLayouts] = useState<DashboardLayout[]>([
    {
      id: 'default',
      name: 'Dashboard mặc định',
      description: 'Layout chuẩn cho giáo viên',
      widgets: [],
      theme: 'light',
      gridSize: 12,
      isDefault: true
    }
  ])
  
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout>(layouts[0])
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null)
  const [isWidgetDialogOpen, setIsWidgetDialogOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const { toast } = useToast()

  const generateWidgetId = () => `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const addWidget = useCallback((template: Omit<DashboardWidget, 'id' | 'position'>) => {
    const newWidget: DashboardWidget = {
      ...template,
      id: generateWidgetId(),
      position: { x: 0, y: 0 }
    }
    
    setCurrentLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }))
    
    toast({
      title: "Đã thêm widget",
      description: `Widget "${template.title}" đã được thêm vào dashboard`,
    })
  }, [toast])

  const updateWidget = useCallback((widgetId: string, updates: Partial<DashboardWidget>) => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget => 
        widget.id === widgetId ? { ...widget, ...updates } : widget
      )
    }))
  }, [])

  const removeWidget = useCallback((widgetId: string) => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(widget => widget.id !== widgetId)
    }))
    
    toast({
      title: "Đã xóa widget",
      description: "Widget đã được xóa khỏi dashboard",
    })
  }, [toast])

  const duplicateWidget = useCallback((widget: DashboardWidget) => {
    const duplicatedWidget: DashboardWidget = {
      ...widget,
      id: generateWidgetId(),
      title: `${widget.title} (Copy)`,
      position: { x: widget.position.x + 1, y: widget.position.y + 1 }
    }
    
    setCurrentLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, duplicatedWidget]
    }))
    
    toast({
      title: "Đã sao chép widget",
      description: `Widget "${widget.title}" đã được sao chép`,
    })
  }, [toast])

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(currentLayout.widgets)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setCurrentLayout(prev => ({
      ...prev,
      widgets: items
    }))
  }, [currentLayout.widgets])

  const saveLayout = useCallback(() => {
    setLayouts(prev => 
      prev.map(layout => 
        layout.id === currentLayout.id ? currentLayout : layout
      )
    )
    
    toast({
      title: "Đã lưu layout",
      description: "Cấu hình dashboard đã được lưu thành công",
    })
  }, [currentLayout, toast])

  const resetLayout = useCallback(() => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: []
    }))
    
    toast({
      title: "Đã reset layout",
      description: "Dashboard đã được reset về trạng thái trống",
    })
  }, [toast])

  const exportLayout = useCallback(() => {
    const dataStr = JSON.stringify(currentLayout, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `dashboard_${currentLayout.name.replace(/\s+/g, '_')}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    
    toast({
      title: "Đã xuất layout",
      description: "File cấu hình dashboard đã được tải xuống",
    })
  }, [currentLayout, toast])

  const getWidgetIcon = (type: DashboardWidget['type']) => {
    switch (type) {
      case 'chart': return <BarChart3 className="h-4 w-4" />
      case 'stat': return <Target className="h-4 w-4" />
      case 'table': return <Grid className="h-4 w-4" />
      case 'activity': return <Activity className="h-4 w-4" />
      case 'progress': return <Clock className="h-4 w-4" />
      default: return <Layout className="h-4 w-4" />
    }
  }

  const getWidgetSizeClass = (size: DashboardWidget['size']) => {
    switch (size) {
      case 'small': return 'col-span-1 row-span-1'
      case 'medium': return 'col-span-2 row-span-2'
      case 'large': return 'col-span-3 row-span-2'
      case 'full': return 'col-span-full row-span-3'
      default: return 'col-span-1 row-span-1'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Builder</h2>
          <p className="text-muted-foreground">Tùy chỉnh dashboard theo ý muốn</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="preview-mode">Preview</Label>
            <Switch 
              id="preview-mode"
              checked={previewMode}
              onCheckedChange={setPreviewMode}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="edit-mode">Edit Mode</Label>
            <Switch 
              id="edit-mode"
              checked={isEditMode}
              onCheckedChange={setIsEditMode}
              disabled={previewMode}
            />
          </div>
          
          <Button variant="outline" onClick={resetLayout}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button variant="outline" onClick={exportLayout}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button onClick={saveLayout}>
            <Save className="h-4 w-4 mr-2" />
            Lưu Layout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Widget Library */}
        {isEditMode && !previewMode && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Widget Library
              </CardTitle>
              <CardDescription>Kéo thả để thêm widget</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {WIDGET_TEMPLATES.map((template, index) => (
                  <Card 
                    key={index}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => addWidget(template)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        {getWidgetIcon(template.type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{template.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {template.subtitle}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {template.size}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Canvas */}
        <Card className={isEditMode && !previewMode ? "lg:col-span-3" : "lg:col-span-4"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentLayout.name}</CardTitle>
                <CardDescription>{currentLayout.description}</CardDescription>
              </div>
              
              {isEditMode && (
                <Dialog open={isWidgetDialogOpen} onOpenChange={setIsWidgetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Layout Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Cài đặt Layout</DialogTitle>
                      <DialogDescription>
                        Tùy chỉnh các thiết lập chung cho dashboard
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="general" className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="general">Chung</TabsTrigger>
                        <TabsTrigger value="theme">Giao diện</TabsTrigger>
                        <TabsTrigger value="grid">Lưới</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="general" className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="layout-name">Tên layout</Label>
                          <Input
                            id="layout-name"
                            value={currentLayout.name}
                            onChange={(e) => setCurrentLayout(prev => ({
                              ...prev,
                              name: e.target.value
                            }))}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="layout-description">Mô tả</Label>
                          <Input
                            id="layout-description"
                            value={currentLayout.description}
                            onChange={(e) => setCurrentLayout(prev => ({
                              ...prev,
                              description: e.target.value
                            }))}
                          />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="theme" className="space-y-4">
                        <div className="space-y-2">
                          <Label>Theme</Label>
                          <Select 
                            value={currentLayout.theme} 
                            onValueChange={(value: 'light' | 'dark' | 'auto') => 
                              setCurrentLayout(prev => ({ ...prev, theme: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                              <SelectItem value="auto">Auto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="grid" className="space-y-4">
                        <div className="space-y-2">
                          <Label>Grid Size: {currentLayout.gridSize}</Label>
                          <Slider
                            value={[currentLayout.gridSize]}
                            onValueChange={([value]) => 
                              setCurrentLayout(prev => ({ ...prev, gridSize: value }))
                            }
                            max={24}
                            min={6}
                            step={2}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {currentLayout.widgets.length === 0 ? (
              <div className="text-center py-12">
                <Layout className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Dashboard trống</h3>
                <p className="text-muted-foreground mb-4">
                  {isEditMode ? "Thêm widget từ thư viện bên trái" : "Bật Edit Mode để thêm widget"}
                </p>
                {!isEditMode && (
                  <Button onClick={() => setIsEditMode(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Bật Edit Mode
                  </Button>
                )}
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="dashboard">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`grid gap-4 grid-cols-${Math.min(currentLayout.gridSize, 12)}`}
                    >
                      {currentLayout.widgets.map((widget, index) => (
                        <Draggable 
                          key={widget.id} 
                          draggableId={widget.id} 
                          index={index}
                          isDragDisabled={!isEditMode || widget.isLocked}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${getWidgetSizeClass(widget.size)} ${
                                snapshot.isDragging ? 'opacity-50' : ''
                              }`}
                            >
                              <Card className={`h-full ${isEditMode ? 'ring-2 ring-blue-200' : ''}`}>
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between">
                                    <div 
                                      {...provided.dragHandleProps}
                                      className="flex items-center gap-2 flex-1 cursor-move"
                                    >
                                      {getWidgetIcon(widget.type)}
                                      <div>
                                        <CardTitle className="text-sm">{widget.title}</CardTitle>
                                        {widget.subtitle && (
                                          <CardDescription className="text-xs">
                                            {widget.subtitle}
                                          </CardDescription>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {isEditMode && (
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => updateWidget(widget.id, { 
                                            isVisible: !widget.isVisible 
                                          })}
                                        >
                                          {widget.isVisible ? (
                                            <Eye className="h-3 w-3" />
                                          ) : (
                                            <EyeOff className="h-3 w-3" />
                                          )}
                                        </Button>
                                        
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => duplicateWidget(widget)}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                        
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => setSelectedWidget(widget)}
                                        >
                                          <Settings className="h-3 w-3" />
                                        </Button>
                                        
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => removeWidget(widget.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </CardHeader>
                                
                                <CardContent className="pt-0">
                                  <div className="h-32 bg-muted/30 rounded flex items-center justify-center">
                                    <p className="text-sm text-muted-foreground">
                                      {widget.type} widget preview
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Widget Configuration Dialog */}
      {selectedWidget && (
        <Dialog open={!!selectedWidget} onOpenChange={() => setSelectedWidget(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cấu hình Widget: {selectedWidget.title}</DialogTitle>
              <DialogDescription>
                Tùy chỉnh các thiết lập cho widget này
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList>
                <TabsTrigger value="general">Chung</TabsTrigger>
                <TabsTrigger value="appearance">Giao diện</TabsTrigger>
                <TabsTrigger value="data">Dữ liệu</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tiêu đề</Label>
                    <Input
                      value={selectedWidget.title}
                      onChange={(e) => updateWidget(selectedWidget.id, { 
                        title: e.target.value 
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Kích thước</Label>
                    <Select 
                      value={selectedWidget.size}
                      onValueChange={(value: DashboardWidget['size']) => 
                        updateWidget(selectedWidget.id, { size: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Nhỏ</SelectItem>
                        <SelectItem value="medium">Vừa</SelectItem>
                        <SelectItem value="large">Lớn</SelectItem>
                        <SelectItem value="full">Toàn màn hình</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Input
                    value={selectedWidget.subtitle || ''}
                    onChange={(e) => updateWidget(selectedWidget.id, { 
                      subtitle: e.target.value 
                    })}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="appearance" className="space-y-4">
                {selectedWidget.type === 'chart' && (
                  <>
                    <div className="space-y-2">
                      <Label>Loại biểu đồ</Label>
                      <Select 
                        value={selectedWidget.config.chartType}
                        onValueChange={(value) => updateWidget(selectedWidget.id, {
                          config: { ...selectedWidget.config, chartType: value as any }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Cột</SelectItem>
                          <SelectItem value="line">Đường</SelectItem>
                          <SelectItem value="pie">Tròn</SelectItem>
                          <SelectItem value="area">Vùng</SelectItem>
                          <SelectItem value="scatter">Phân tán</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Bảng màu</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {COLOR_SCHEMES.map((scheme) => (
                          <Button
                            key={scheme.value}
                            variant={selectedWidget.config.colorScheme === scheme.value ? "default" : "outline"}
                            className="h-12 p-2"
                            onClick={() => updateWidget(selectedWidget.id, {
                              config: { ...selectedWidget.config, colorScheme: scheme.value }
                            })}
                          >
                            <div className="flex gap-1">
                              {scheme.colors.map((color, i) => (
                                <div
                                  key={i}
                                  className="w-3 h-3 rounded"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={selectedWidget.config.showLegend}
                        onCheckedChange={(checked) => updateWidget(selectedWidget.id, {
                          config: { ...selectedWidget.config, showLegend: checked }
                        })}
                      />
                      <Label>Hiển thị chú thích</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={selectedWidget.config.animation}
                        onCheckedChange={(checked) => updateWidget(selectedWidget.id, {
                          config: { ...selectedWidget.config, animation: checked }
                        })}
                      />
                      <Label>Hiệu ứng động</Label>
                    </div>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="data" className="space-y-4">
                <div className="space-y-2">
                  <Label>Nguồn dữ liệu</Label>
                  <Select 
                    value={selectedWidget.config.dataSource}
                    onValueChange={(value) => updateWidget(selectedWidget.id, {
                      config: { ...selectedWidget.config, dataSource: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="students_count">Số lượng học sinh</SelectItem>
                      <SelectItem value="average_score">Điểm trung bình</SelectItem>
                      <SelectItem value="score_distribution">Phân bố điểm</SelectItem>
                      <SelectItem value="performance_trends">Xu hướng hiệu suất</SelectItem>
                      <SelectItem value="recent_activities">Hoạt động gần đây</SelectItem>
                      <SelectItem value="top_students">Top học sinh</SelectItem>
                      <SelectItem value="exam_progress">Tiến độ bài kiểm tra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Tần suất cập nhật (giây)</Label>
                  <Slider
                    value={[selectedWidget.config.refreshInterval || 30]}
                    onValueChange={([value]) => updateWidget(selectedWidget.id, {
                      config: { ...selectedWidget.config, refreshInterval: value }
                    })}
                    max={300}
                    min={10}
                    step={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedWidget.config.refreshInterval || 30} giây
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 