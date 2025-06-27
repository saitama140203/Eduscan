'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Move, 
  Eye, 
  Save, 
  Upload,
  Download,
  Grid,
  Target,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  Copy
} from 'lucide-react';

// Standard OMR field block structure (matching backend template.json)
interface BubbleArea {
  fieldType: string;
  origin: [number, number];
  fieldLabels: string[];
  bubblesGap: number;
  labelsGap: number;
  rows: number;
  cols: number;
}

interface OMRTemplateConfig {
  pageDimensions: [number, number];
  bubbleDimensions: [number, number];
  fieldBlocks: Record<string, BubbleArea>;
  customLabels?: Record<string, string>;
  preProcessors?: Array<{
    name: string;
    options: Record<string, any>;
  }>;
}

interface OMRTemplateBuilderProps {
  templateId?: number;
  initialConfig?: OMRTemplateConfig;
  referenceImage?: string;
  onSave?: (config: OMRTemplateConfig) => void;
  onPreview?: (config: OMRTemplateConfig, sampleImage?: File) => void;
}

// Sync với backend OMRChecker/src/constants.py
const FIELD_TYPES = {
  'QTYPE_MCQ4': { 
    label: 'Trắc nghiệm 4 đáp án', 
    bubbleValues: ['A', 'B', 'C', 'D'],
    direction: 'horizontal',
    description: 'Câu hỏi trắc nghiệm với 4 lựa chọn A, B, C, D'
  },
  'QTYPE_MCQ5': { 
    label: 'Trắc nghiệm 5 đáp án', 
    bubbleValues: ['A', 'B', 'C', 'D', 'E'],
    direction: 'horizontal',
    description: 'Câu hỏi trắc nghiệm với 5 lựa chọn A, B, C, D, E'
  },
  'QTYPE_MCQ2': { 
    label: 'Đúng/Sai', 
    bubbleValues: ['T', 'F'],
    direction: 'horizontal',
    description: 'Câu hỏi đúng/sai với 2 lựa chọn True/False'
  },
  'QTYPE_INT': { 
    label: 'Mã đề thị', 
    bubbleValues: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    direction: 'vertical',
    description: 'Mã đề thị hoặc các số từ 0-9, sắp xếp theo cột'
  },
  'QTYPE_INT_FROM_1': { 
    label: 'Số từ 1-0', 
    bubbleValues: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    direction: 'vertical',
    description: 'Số từ 1-9 rồi 0, sắp xếp theo cột'
  },
  'QTYPE_INT10_SYMBOL': { 
    label: 'Số báo danh', 
    bubbleValues: ['-', ',', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    direction: 'vertical',
    description: 'Số báo danh với ký tự đặc biệt và số 0-9'
  }
};

// Validation functions
const validateFieldBlock = (block: BubbleArea): string[] => {
  const errors: string[] = [];
  
  // Validate block exists and has basic properties
  if (!block) {
    errors.push('Field block không hợp lệ');
    return errors;
  }
  
  // Note: fieldBlocks don't have 'name' field in standard template format
  // The name is the key in the fieldBlocks object
  
  if (!Array.isArray(block.origin) || block.origin.length !== 2 || block.origin[0] < 0 || block.origin[1] < 0) {
    errors.push('Vị trí origin phải là số dương');
  }
  
  if (!block.rows || typeof block.rows !== 'number' || block.rows <= 0 || 
      !block.cols || typeof block.cols !== 'number' || block.cols <= 0) {
    errors.push('Số rows và cols phải lớn hơn 0');
  }
  
  if (!Array.isArray(block.fieldLabels) || block.fieldLabels.length === 0) {
    errors.push('Phải có ít nhất 1 field label');
  }
  
  if (!block.fieldType || typeof block.fieldType !== 'string') {
    errors.push('Field type không được trống');
    return errors;
  }
  
  const fieldType = FIELD_TYPES[block.fieldType as keyof typeof FIELD_TYPES];
  if (!fieldType) {
    errors.push('Loại field không hợp lệ');
  } else {
    // Validation rules based on real template structure:
    // MCQ fields: rows = number of questions, cols = number of choices
    // INT fields: rows = 10 (digits 0-9), cols = number of digits
    if (block.fieldType === 'QTYPE_MCQ4' && block.cols !== 4) {
      errors.push('QTYPE_MCQ4 phải có 4 cột (A,B,C,D)');
    }
    if (block.fieldType === 'QTYPE_MCQ2' && block.cols !== 2) {
      errors.push('QTYPE_MCQ2 phải có 2 cột (T,F)');
    }
    if (block.fieldType === 'QTYPE_INT' && block.rows !== 10) {
      errors.push('QTYPE_INT phải có 10 hàng (số 0-9)');
    }
  }
  
  return errors;
};

const validateTemplate = (config: OMRTemplateConfig): string[] => {
  const errors: string[] = [];
  
  // Validate config exists
  if (!config) {
    errors.push('Template config không hợp lệ');
    return errors;
  }
  
  // Validate page dimensions
  if (!Array.isArray(config.pageDimensions) || 
      config.pageDimensions.length !== 2 || 
      config.pageDimensions[0] <= 0 || 
      config.pageDimensions[1] <= 0) {
    errors.push('Page dimensions phải là số dương');
  }
  
  // Validate bubble dimensions  
  if (!Array.isArray(config.bubbleDimensions) || 
      config.bubbleDimensions.length !== 2 || 
      config.bubbleDimensions[0] <= 0 || 
      config.bubbleDimensions[1] <= 0) {
    errors.push('Bubble dimensions phải là số dương');
  }
  
  // Validate field blocks
  if (!config.fieldBlocks || typeof config.fieldBlocks !== 'object') {
    errors.push('Field blocks không hợp lệ');
    return errors;
  }
  
  if (Object.keys(config.fieldBlocks).length === 0) {
    errors.push('Template phải có ít nhất 1 field block');
  }
  
  // Validate each field block safely
  Object.entries(config.fieldBlocks).forEach(([name, block]) => {
    try {
      const blockErrors = validateFieldBlock(block);
      blockErrors.forEach(err => errors.push(`${name}: ${err}`));
    } catch (error) {
      errors.push(`${name}: Lỗi validation - ${error}`);
    }
  });
  
  return errors;
};

export default function OMRTemplateBuilder({
  templateId,
  initialConfig,
  referenceImage,
  onSave,
  onPreview
}: OMRTemplateBuilderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Helper function to create safe default config
  const createDefaultConfig = (): OMRTemplateConfig => ({
    pageDimensions: [2084, 2947],
    bubbleDimensions: [45, 45],
    fieldBlocks: {},
    customLabels: {},
    preProcessors: [{
      name: 'AdvancedFeatureAlignment',
      options: {
        reference: '',
        featureType: 'ORB',
        maxFeatures: 5000,
        goodMatchPercent: 0.2
      }
    }]
  });

  // Safe config initialization
  const [config, setConfig] = useState<OMRTemplateConfig>(() => {
    if (initialConfig) {
      // Validate and sanitize initial config
      try {
        return {
          pageDimensions: Array.isArray(initialConfig.pageDimensions) ? initialConfig.pageDimensions : [2084, 2947],
          bubbleDimensions: Array.isArray(initialConfig.bubbleDimensions) ? initialConfig.bubbleDimensions : [45, 45],
          fieldBlocks: initialConfig.fieldBlocks && typeof initialConfig.fieldBlocks === 'object' ? initialConfig.fieldBlocks : {},
          customLabels: initialConfig.customLabels || {},
          preProcessors: Array.isArray(initialConfig.preProcessors) ? initialConfig.preProcessors : [{
            name: 'AdvancedFeatureAlignment',
            options: {
              reference: '',
              featureType: 'ORB',
              maxFeatures: 5000,
              goodMatchPercent: 0.2
            }
          }]
        };
      } catch (error) {
        console.warn('Invalid initial config, using defaults:', error);
        return createDefaultConfig();
      }
    }
    return createDefaultConfig();
  });
  
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [newBlockType, setNewBlockType] = useState<string>('QTYPE_MCQ4');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    config: OMRTemplateConfig;
    image?: File;
    json: string;
  } | null>(null);

  // Load background image
  useEffect(() => {
    if (referenceImage) {
      const img = new Image();
      img.onload = () => {
        setBackgroundImage(img);
        drawCanvas();
      };
      img.src = referenceImage;
    }
  }, [referenceImage]);

  // Draw canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    if (backgroundImage) {
      const scaleX = canvas.width / backgroundImage.width;
      const scaleY = canvas.height / backgroundImage.height;
      setScale(Math.min(scaleX, scaleY));
      
      ctx.drawImage(
        backgroundImage,
        0, 0,
        backgroundImage.width * scale,
        backgroundImage.height * scale
      );
    }

    // Draw field blocks
    Object.entries(config.fieldBlocks).forEach(([blockName, block]) => {
      drawFieldBlock(ctx, blockName, block);
    });
  };

  const drawFieldBlock = (ctx: CanvasRenderingContext2D, blockName: string, block: BubbleArea) => {
    // Safe guard for invalid block data
    if (!block || !Array.isArray(block.origin) || block.origin.length !== 2) {
      console.warn(`Invalid block data for ${blockName}:`, block);
      return;
    }
    
    const [x, y] = block.origin;
    const scaledX = (x || 0) * scale;
    const scaledY = (y || 0) * scale;
    const [bubbleW, bubbleH] = config.bubbleDimensions;
    
    // Draw block outline
    ctx.strokeStyle = selectedBlock === blockName ? '#ff0000' : '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      scaledX - 5,
      scaledY - 5,
      (block.cols * (bubbleW + block.bubblesGap) - block.bubblesGap + 10) * scale,
      (block.rows * (bubbleH + block.labelsGap) - block.labelsGap + 10) * scale
    );

    // Draw bubbles
    ctx.fillStyle = selectedBlock === blockName ? 'rgba(255,0,0,0.3)' : 'rgba(0,255,0,0.3)';
    
    for (let row = 0; row < block.rows; row++) {
      for (let col = 0; col < block.cols; col++) {
        const bubbleX = scaledX + col * (bubbleW + block.bubblesGap) * scale;
        const bubbleY = scaledY + row * (bubbleH + block.labelsGap) * scale;
        
        ctx.fillRect(bubbleX, bubbleY, bubbleW * scale, bubbleH * scale);
        ctx.strokeRect(bubbleX, bubbleY, bubbleW * scale, bubbleH * scale);
      }
    }

    // Draw label
    ctx.fillStyle = '#000000';
    ctx.font = `${12 * scale}px Arial`;
    ctx.fillText(blockName, scaledX, scaledY - 10);
  };

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    // Check if clicked on existing block
    const clickedBlock = Object.entries(config.fieldBlocks).find(([_, block]) => {
      const [blockX, blockY] = block.origin;
      const [bubbleW, bubbleH] = config.bubbleDimensions;
      const blockWidth = block.cols * (bubbleW + block.bubblesGap) - block.bubblesGap;
      const blockHeight = block.rows * (bubbleH + block.labelsGap) - block.labelsGap;
      
      return x >= blockX && x <= blockX + blockWidth &&
             y >= blockY && y <= blockY + blockHeight;
    });

    if (clickedBlock) {
      setSelectedBlock(clickedBlock[0]);
    } else if (isDrawing) {
      // Create new block
      createNewBlock(x, y);
    }
  };

  const createNewBlock = (x: number, y: number) => {
    // Generate block name based on type and count
    const typePrefix = newBlockType === 'QTYPE_MCQ4' ? 'Part' : 
                      newBlockType === 'QTYPE_MCQ2' ? 'Part' :
                      newBlockType === 'QTYPE_INT' ? 'MaDeThi' : 'Block';
    const blockCount = Object.keys(config.fieldBlocks).filter(name => name.startsWith(typePrefix)).length + 1;
    const blockName = `${typePrefix}${blockCount > 1 ? `_${blockCount}` : ''}`;
    
    // Generate field labels based on template patterns
    let fieldLabels: string[] = [];
    let rows = 1, cols = 1, bubblesGap = 70, labelsGap = 38;
    
    if (newBlockType === 'QTYPE_MCQ4') {
      // MCQ4: Variable questions, 4 choices each
      fieldLabels = Array.from({length: 4}, (_, i) => `q${i + 1}`);
      rows = fieldLabels.length; // Number of questions
      cols = 4; // A, B, C, D
      bubblesGap = 70;
      labelsGap = 38;
    } else if (newBlockType === 'QTYPE_MCQ2') {
      // MCQ2: Variable questions, 2 choices each  
      fieldLabels = Array.from({length: 4}, (_, i) => `${13 + i}_a`);
      rows = fieldLabels.length; // Number of questions
      cols = 2; // T, F or Yes, No
      bubblesGap = 70;
      labelsGap = 38;
    } else if (newBlockType === 'QTYPE_INT') {
      // INT: Code digits (like exam code)
      fieldLabels = ['mdt_1', 'mdt_2', 'mdt_3'];
      rows = 10; // Digits 0-9
      cols = fieldLabels.length; // Number of digit positions
      bubblesGap = 48;
      labelsGap = 30;
    } else if (newBlockType === 'QTYPE_INT10_SYMBOL') {
      // Student ID
      fieldLabels = ['sbd_1', 'sbd_2', 'sbd_3', 'sbd_4', 'sbd_5', 'sbd_6'];
      rows = 10; // Digits 0-9
      cols = fieldLabels.length; // Number of digit positions
      bubblesGap = 57;
      labelsGap = 40;
    }

    const newBlock: BubbleArea = {
      fieldType: newBlockType,
      origin: [Math.round(x), Math.round(y)],
      fieldLabels,
      bubblesGap,
      labelsGap,
      rows,
      cols
    };

    // Validate new block
    const errors = validateFieldBlock(newBlock);
    if (errors.length > 0) {
      toast.error(`Không thể tạo field block: ${errors[0]}`);
      return;
    }

    setConfig(prev => ({
      ...prev,
      fieldBlocks: {
        ...prev.fieldBlocks,
        [blockName]: newBlock
      }
    }));
    
    setSelectedBlock(blockName);
    setIsDrawing(false);
    toast.success(`Đã tạo field block: ${blockName}`);
  };

  const updateSelectedBlock = (updates: Partial<BubbleArea>) => {
    if (!selectedBlock) return;

    setConfig(prev => ({
      ...prev,
      fieldBlocks: {
        ...prev.fieldBlocks,
        [selectedBlock]: {
          ...prev.fieldBlocks[selectedBlock],
          ...updates
        }
      }
    }));
  };

  const deleteSelectedBlock = () => {
    if (!selectedBlock) return;

    setConfig(prev => {
      const newBlocks = { ...prev.fieldBlocks };
      delete newBlocks[selectedBlock];
      return {
        ...prev,
        fieldBlocks: newBlocks
      };
    });

    setSelectedBlock(null);
  };

  const handleSave = () => {
    // Validate template before saving
    const errors = validateTemplate(config);
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      toast.error(`Template không hợp lệ: ${errors[0]}`);
      return;
    }
    
    if (onSave) {
      onSave(config);
      toast.success('OMR template đã được lưu thành công!');
    }
  };

  const handlePreview = () => {
    // Validate template before preview
    const errors = validateTemplate(config);
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      toast.error(`Template có lỗi, không thể preview: ${errors[0]}`);
      return;
    }

    // Create standard template format
    const standardTemplate = {
      pageDimensions: config.pageDimensions,
      bubbleDimensions: config.bubbleDimensions,
      customLabels: config.customLabels || {},
      fieldBlocks: config.fieldBlocks,
      preProcessors: config.preProcessors || []
    };

    const fileInput = fileInputRef.current;
    const sampleImage = fileInput?.files?.[0];
    
    setPreviewData({
      config: standardTemplate,
      image: sampleImage,
      json: JSON.stringify(standardTemplate, null, 2)
    });
    setShowPreview(true);

    // Also call parent preview if provided
    if (onPreview) {
      onPreview(config, sampleImage);
    }
  };

  const exportConfig = () => {
    // Create template.json in standard format (match backend structure)
    const standardTemplate = {
      pageDimensions: config.pageDimensions,
      bubbleDimensions: config.bubbleDimensions,
      customLabels: config.customLabels || {},
      fieldBlocks: config.fieldBlocks,
      preProcessors: config.preProcessors || []
    };
    
    const dataStr = JSON.stringify(standardTemplate, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_${templateId || 'new'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Template đã được export theo format chuẩn');
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        setConfig(importedConfig);
        toast.success('Template đã được import');
      } catch (error) {
        toast.error('File không hợp lệ');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    try {
      drawCanvas();
      // Auto-validate when config changes
      const errors = validateTemplate(config);
      setValidationErrors(errors);
    } catch (error) {
      console.error('Error in template validation/drawing:', error);
      setValidationErrors([`Lỗi hệ thống: ${error}`]);
    }
  }, [config, backgroundImage, scale, selectedBlock]);

  const selectedBlockData = selectedBlock ? config.fieldBlocks[selectedBlock] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-screen">
      {/* Canvas Area */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>OMR Template Designer</span>
              <div className="flex gap-2">
                <Button
                  variant={isDrawing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsDrawing(!isDrawing)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isDrawing ? 'Drawing Mode' : 'Select Mode'}
                </Button>
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleSave}
                  disabled={validationErrors.length > 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardTitle>
            {/* Field Type Selector for Drawing Mode */}
            {isDrawing && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-sm font-medium text-blue-800">Chọn loại field để tạo:</Label>
                <Select value={newBlockType} onValueChange={setNewBlockType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPES).map(([key, type]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-gray-500">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 text-xs text-blue-600">
                  <Info className="w-3 h-3 inline mr-1" />
                  Click trên canvas để tạo field block loại "{FIELD_TYPES[newBlockType as keyof typeof FIELD_TYPES]?.label}"
                </div>
              </div>
            )}
            
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Template có {validationErrors.length} lỗi:</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {validationErrors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {validationErrors.length > 3 && (
                      <li>... và {validationErrors.length - 3} lỗi khác</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="p-4">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="border border-gray-300 cursor-crosshair w-full"
              onClick={handleCanvasClick}
            />
            <div className="mt-4">
              <Label htmlFor="sample-image">Sample Image for Preview:</Label>
              <Input
                id="sample-image"
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Template Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Page Width</Label>
                <Input
                  type="number"
                  value={config.pageDimensions[0]}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    pageDimensions: [parseInt(e.target.value) || 2084, prev.pageDimensions[1]]
                  }))}
                />
              </div>
              <div>
                <Label>Page Height</Label>
                <Input
                  type="number"
                  value={config.pageDimensions[1]}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    pageDimensions: [prev.pageDimensions[0], parseInt(e.target.value) || 2947]
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Bubble Width</Label>
                <Input
                  type="number"
                  value={config.bubbleDimensions[0]}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    bubbleDimensions: [parseInt(e.target.value) || 45, prev.bubbleDimensions[1]]
                  }))}
                />
              </div>
              <div>
                <Label>Bubble Height</Label>
                <Input
                  type="number"
                  value={config.bubbleDimensions[1]}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    bubbleDimensions: [prev.bubbleDimensions[0], parseInt(e.target.value) || 45]
                  }))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportConfig}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => document.getElementById('import-config')?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <input
                id="import-config"
                type="file"
                accept=".json"
                className="hidden"
                onChange={importConfig}
              />
            </div>
          </CardContent>
        </Card>

        {/* Template Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Template Status</span>
              {validationErrors.length === 0 && Object.keys(config.fieldBlocks).length > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Field Blocks:</span>
              <Badge variant="outline">{Object.keys(config.fieldBlocks).length}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Page Size:</span>
              <span className="text-gray-600">{config.pageDimensions[0]} × {config.pageDimensions[1]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Bubble Size:</span>
              <span className="text-gray-600">{config.bubbleDimensions[0]} × {config.bubbleDimensions[1]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Questions:</span>
              <Badge variant="secondary">
                {Object.values(config.fieldBlocks).reduce((total, block) => {
                  return total + (block.fieldType.includes('MCQ') || block.fieldType.includes('INT') ? block.fieldLabels.length : 0);
                }, 0)}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Validation:</span>
              {validationErrors.length === 0 ? (
                <span className="text-green-600 text-xs flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Hợp lệ
                </span>
              ) : (
                <span className="text-red-600 text-xs flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {validationErrors.length} lỗi
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Field Blocks List */}
        <Card>
          <CardHeader>
            <CardTitle>Field Blocks ({Object.keys(config.fieldBlocks).length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(config.fieldBlocks).map(([blockName, block]) => (
              <div
                key={blockName}
                className={`p-2 border rounded cursor-pointer ${
                  selectedBlock === blockName ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedBlock(blockName)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{blockName}</span>
                  <Badge variant="secondary">
                    {FIELD_TYPES[block.fieldType as keyof typeof FIELD_TYPES]?.label || block.fieldType}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500">
                  {block.rows}×{block.cols} at ({block.origin[0]}, {block.origin[1]})
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Selected Block Editor */}
        {selectedBlockData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Edit: {selectedBlock}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelectedBlock}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Field Type</Label>
                <Select
                  value={selectedBlockData.fieldType}
                  onValueChange={(value) => {
                    // Auto-configure based on template standards
                    let rows = selectedBlockData.rows;
                    let cols = selectedBlockData.cols;
                    let bubblesGap = selectedBlockData.bubblesGap;
                    let labelsGap = selectedBlockData.labelsGap;
                    
                    if (value === 'QTYPE_MCQ4') {
                      cols = 4; // A, B, C, D
                      bubblesGap = 70;
                      labelsGap = 38;
                    } else if (value === 'QTYPE_MCQ2') {
                      cols = 2; // T, F
                      bubblesGap = 70;
                      labelsGap = 38;
                    } else if (value === 'QTYPE_INT') {
                      rows = 10; // Digits 0-9
                      bubblesGap = 48;
                      labelsGap = 30;
                    } else if (value === 'QTYPE_INT10_SYMBOL') {
                      rows = 10; // Digits 0-9
                      bubblesGap = 57;
                      labelsGap = 40;
                    }
                    
                    updateSelectedBlock({ 
                      fieldType: value,
                      rows,
                      cols,
                      bubblesGap,
                      labelsGap
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPES).map(([key, type]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-gray-500">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                                 {/* Field Type Info */}
                 {selectedBlockData.fieldType && (
                   <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                     <div className="font-medium mb-2">Cấu trúc field (theo template chuẩn):</div>
                     <ul className="space-y-1 text-gray-600">
                       {selectedBlockData.fieldType === 'QTYPE_MCQ4' && (
                         <>
                           <li>• Loại: Trắc nghiệm 4 đáp án</li>
                           <li>• Cột: 4 (A, B, C, D)</li>
                           <li>• Hàng: Số câu hỏi (fieldLabels.length)</li>
                         </>
                       )}
                       {selectedBlockData.fieldType === 'QTYPE_MCQ2' && (
                         <>
                           <li>• Loại: Đúng/Sai</li>
                           <li>• Cột: 2 (T, F)</li>
                           <li>• Hàng: Số câu hỏi (fieldLabels.length)</li>
                         </>
                       )}
                       {selectedBlockData.fieldType === 'QTYPE_INT' && (
                         <>
                           <li>• Loại: Mã đề thị</li>
                           <li>• Hàng: 10 (số 0-9)</li>
                           <li>• Cột: Số chữ số (fieldLabels.length)</li>
                         </>
                       )}
                       {selectedBlockData.fieldType === 'QTYPE_INT10_SYMBOL' && (
                         <>
                           <li>• Loại: Số báo danh</li>
                           <li>• Hàng: 10 (số 0-9)</li>
                           <li>• Cột: Số chữ số (fieldLabels.length)</li>
                         </>
                       )}
                       <li>• Bubble values: {FIELD_TYPES[selectedBlockData.fieldType as keyof typeof FIELD_TYPES]?.bubbleValues.join(', ')}</li>
                     </ul>
                   </div>
                 )}
                
                                 {/* Validation for selected block */}
                 {(() => {
                   if (!selectedBlockData) return null;
                   try {
                     const blockErrors = validateFieldBlock(selectedBlockData);
                     return blockErrors.length > 0 && (
                       <Alert className="mt-2">
                         <AlertCircle className="h-4 w-4" />
                         <AlertDescription>
                           <div className="font-medium">Field block có lỗi:</div>
                           <ul className="list-disc list-inside text-sm mt-1">
                             {blockErrors.map((error, index) => (
                               <li key={index}>{error}</li>
                             ))}
                           </ul>
                         </AlertDescription>
                       </Alert>
                     );
                   } catch (error) {
                     return (
                       <Alert className="mt-2">
                         <AlertCircle className="h-4 w-4" />
                         <AlertDescription>
                           <div className="font-medium">Lỗi validation:</div>
                           <div className="text-sm">{String(error)}</div>
                         </AlertDescription>
                       </Alert>
                     );
                   }
                 })()}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Rows</Label>
                  <Input
                    type="number"
                    value={selectedBlockData.rows}
                    onChange={(e) => updateSelectedBlock({ rows: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Columns</Label>
                  <Input
                    type="number"
                    value={selectedBlockData.cols}
                    onChange={(e) => updateSelectedBlock({ cols: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Bubbles Gap</Label>
                  <Input
                    type="number"
                    value={selectedBlockData.bubblesGap}
                    onChange={(e) => updateSelectedBlock({ bubblesGap: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div>
                  <Label>Labels Gap</Label>
                  <Input
                    type="number"
                    value={selectedBlockData.labelsGap}
                    onChange={(e) => updateSelectedBlock({ labelsGap: parseInt(e.target.value) || 38 })}
                  />
                </div>
              </div>

              <div>
                <Label>Field Labels (comma separated)</Label>
                <Input
                  value={selectedBlockData.fieldLabels.join(', ')}
                  onChange={(e) => updateSelectedBlock({ 
                    fieldLabels: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="q1, q2, q3, q4, q5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Origin X</Label>
                  <Input
                    type="number"
                    value={selectedBlockData.origin[0]}
                    onChange={(e) => updateSelectedBlock({ 
                      origin: [parseInt(e.target.value) || 0, selectedBlockData.origin[1]]
                    })}
                  />
                </div>
                <div>
                  <Label>Origin Y</Label>
                  <Input
                    type="number"
                    value={selectedBlockData.origin[1]}
                    onChange={(e) => updateSelectedBlock({ 
                      origin: [selectedBlockData.origin[0], parseInt(e.target.value) || 0]
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Template Preview</h3>
              <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Template Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Thông tin Template</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Kích thước trang:</span> {previewData.config.pageDimensions[0]} x {previewData.config.pageDimensions[1]}px
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Kích thước bubble:</span> {previewData.config.bubbleDimensions[0]} x {previewData.config.bubbleDimensions[1]}px
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Số field blocks:</span> {Object.keys(previewData.config.fieldBlocks).length}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Processor:</span> {previewData.config.preProcessors?.[0]?.name || 'None'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Field Blocks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {Object.entries(previewData.config.fieldBlocks).map(([name, block]) => (
                        <div key={name} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-gray-600">
                            {block.fieldType} | {block.rows}x{block.cols} | Labels: {block.fieldLabels.length}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sample Image Preview */}
              {previewData.image && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sample Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-auto">
                      <img 
                        src={URL.createObjectURL(previewData.image)} 
                        alt="Sample" 
                        className="max-w-full h-auto border rounded"
                        onLoad={(e) => {
                          // Cleanup object URL after loading
                          setTimeout(() => URL.revokeObjectURL(e.currentTarget.src), 1000);
                        }}
                      />
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      File: {previewData.image.name} ({(previewData.image.size / 1024).toFixed(1)} KB)
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* JSON Config Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex justify-between items-center">
                    <span>JSON Configuration</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(previewData.json);
                        toast.success('JSON đã được copy to clipboard');
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                    {previewData.json}
                  </pre>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="default"
                  onClick={() => {
                    exportConfig();
                    setShowPreview(false);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    handleSave();
                    setShowPreview(false);
                  }}
                  disabled={validationErrors.length > 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 