"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogoUploader } from "./LogoUploader"
import { ORG_TYPES } from "@/lib/constants"
import { 
  PlusCircle, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  Calendar,
  X,
  Info
} from "lucide-react"
import { useState, useCallback, useMemo, useEffect, useRef, SetStateAction, FC } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// --- TYPE DEFINITIONS ---
interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message: {
    required?: string;
    minLength?: string;
    maxLength?: string;
    pattern?: string;
  };
}

type ValidationSchema = Record<string, ValidationRule>;
type FieldName = keyof ValidationSchema;

interface CreateOrgDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  formData?: Partial<Record<FieldName, any>>;
  onInputChange: (field: FieldName, value: any) => void;
  onFileChange: (file: File | null) => void;
  uploading?: boolean;
  onCreate: () => Promise<void>;
  loading?: boolean;
  duplicateCheck?: ((name: string) => Promise<boolean>) | null;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  description?: string;
  icon?: React.ElementType;
}

// --- VALIDATION LOGIC ---
const createValidationSchema = (): ValidationSchema => ({
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-ZÀ-ỹ0-9\s\-_.()]+$/,
    message: {
      required: "Tên tổ chức là bắt buộc",
      minLength: "Tên tổ chức phải có ít nhất 2 ký tự",
      maxLength: "Tên tổ chức không được vượt quá 100 ký tự",
      pattern: "Tên tổ chức chứa ký tự không hợp lệ"
    }
  },
  address: {
    required: true,
    minLength: 10,
    maxLength: 200,
    message: {
      required: "Địa chỉ là bắt buộc",
      minLength: "Địa chỉ phải có ít nhất 10 ký tự",
      maxLength: "Địa chỉ không được vượt quá 200 ký tự"
    }
  },
  type: {
    required: true,
    message: {
      required: "Vui lòng chọn loại tổ chức"
    }
  },
  phone: {
    required: false,
    pattern: /^(\+84|0)[3-9]\d{8}$/,
    message: {
      pattern: "Số điện thoại không hợp lệ (VD: 0912345678)"
    }
  },
  email: {
    required: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: {
      pattern: "Email không hợp lệ"
    }
  },
  website: {
    required: false,
    pattern: /^https?:\/\/.+\..+/,
    message: {
      pattern: "Website không hợp lệ (VD: https://example.com)"
    }
  }
});

const validateField = (field: FieldName, value: any, schema: ValidationSchema): string | null => {
  const rules = schema[field];
  if (!rules) return null;
  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  if (rules.required && (!trimmedValue || trimmedValue === '')) {
    return rules.message.required ?? null;
  }
  if (!rules.required && (!trimmedValue || trimmedValue === '')) {
    return null;
  }
  if (rules.minLength && trimmedValue.length < rules.minLength) {
    return rules.message.minLength ?? null;
  }
  if (rules.maxLength && trimmedValue.length > rules.maxLength) {
    return rules.message.maxLength ?? null;
  }
  if (rules.pattern && !rules.pattern.test(trimmedValue)) {
    return rules.message.pattern ?? null;
  }
  return null;
};


const validateForm = (data: Partial<Record<FieldName, any>>, schema: ValidationSchema) => {
  const errors: Partial<Record<FieldName, string>> = {};
  (Object.keys(schema) as FieldName[]).forEach(field => {
    const error = validateField(field, data[field], schema);
    if (error) {
      errors[field] = error;
    }
  });
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

// --- CUSTOM HOOK ---
const useFormValidation = (formData: Partial<Record<FieldName, any>>) => {
  const schema = useMemo(() => createValidationSchema(), []);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string | null>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  const validation = useMemo(() => 
    validateForm(formData, schema), 
    [formData, schema]
  );

  const validateSingleField = useCallback((field: FieldName, value: any) => {
    const error = validateField(field, value, schema);
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  }, [schema]);

  const markFieldTouched = useCallback((field: FieldName) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const getFieldError = useCallback((field: FieldName): string | null => {
    if (touched[field]) {
      return errors[field] ?? validation.errors[field] ?? null;
    }
    return null;
  }, [touched, errors, validation.errors]);

  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors: validation.errors,
    isValid: validation.isValid,
    getFieldError,
    validateSingleField,
    markFieldTouched,
    resetValidation
  };
};

// --- UI COMPONENTS ---
const FormField: FC<FormFieldProps> = ({ 
  label, 
  required, 
  error, 
  children, 
  description,
  icon: Icon 
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <Label className="text-sm font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
    </div>
    {children}
    {description && (
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        {description}
      </p>
    )}
    {error && (
      <div className="flex items-center gap-1 text-sm text-red-600 animate-in slide-in-from-left-1">
        <AlertCircle className="h-3 w-3" />
        {error}
      </div>
    )}
  </div>
);

export function CreateOrgDialog({ 
  open, 
  setOpen, 
  formData = {}, 
  onInputChange, 
  onFileChange, 
  uploading = false, 
  onCreate,
  loading = false,
  duplicateCheck = null
}: CreateOrgDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  
  const {
    isValid,
    getFieldError,
    validateSingleField,
    markFieldTouched,
    resetValidation
  } = useFormValidation(formData);

  const [draftData, setDraftData] = useState<Partial<Record<FieldName, any>> | null>(null);
  
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      setDraftData(formData);
    }
  }, [formData]);

  const handleInputChange = useCallback((field: FieldName, value: any) => {
    onInputChange(field, value);
    
    if (['name', 'email', 'phone'].includes(field)) {
      setTimeout(() => {
        validateSingleField(field, value);
      }, 300);
    }

    if (field === 'name' && duplicateCheck && value.trim().length > 2) {
      const timeoutId = setTimeout(async () => {
        try {
          const isDuplicate = await duplicateCheck(value.trim());
          setDuplicateWarning(isDuplicate ? 'Tên tổ chức này có thể đã tồn tại' : null);
        } catch (error) {
          console.error('Duplicate check error:', error);
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [onInputChange, validateSingleField, duplicateCheck]);

  // -------------------------
  // FIXED: handleClose phải khai báo trước khi dùng trong handleSubmit!
  // -------------------------
  const handleClose = useCallback(() => {
    if (!loading && !uploading) {
      setOpen(false);
      setTimeout(() => {
        setStep(1);
        setPreview(false);
        setDuplicateWarning(null);
        resetValidation();
      }, 150);
    }
  }, [setOpen, loading, uploading, resetValidation]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { errors: finalErrors, isValid: isFinalValid } = validateForm(formData, createValidationSchema());

    if (step === 1) {
      const step1Fields: FieldName[] = ['name', 'address', 'type'];
      const hasStep1Errors = step1Fields.some(field => !!finalErrors[field]);
      
      step1Fields.forEach(field => markFieldTouched(field));

      if (!hasStep1Errors) {
        setStep(2);
      } else {
        toast.error("Vui lòng điền đủ thông tin bắt buộc ở bước 1.");
      }
      return;
    }

    if (step === 2) {
      if (!isFinalValid) {
        Object.keys(finalErrors).forEach(field => markFieldTouched(field as FieldName));
        toast.error("Vui lòng kiểm tra lại thông tin, một số trường vẫn còn lỗi.");
        return;
      }

      try {
        await onCreate();
        toast.success("Tạo tổ chức thành công!");
        handleClose();
      } catch (error) {
        console.error('Create organization error:', error);
        toast.error((error as Error).message || "Có lỗi xảy ra khi tạo tổ chức");
      }
    }
  }, [step, formData, onCreate, markFieldTouched, handleClose]);

  const goToStep = useCallback((targetStep: number) => {
    if (targetStep < step || targetStep === 1) {
      setStep(targetStep);
    }
  }, [step]);

  const togglePreview = useCallback(() => {
    setPreview(prev => !prev);
  }, []);

  const selectedOrgType = useMemo(() => 
    ORG_TYPES.find(type => type.value === formData.type),
    [formData.type]
  );
  
  // --- RENDER FUNCTIONS ---
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {[1, 2].map((stepNum) => (
          <div key={stepNum} className="flex items-center">
            <button
              type="button"
              onClick={() => goToStep(stepNum)}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                step >= stepNum
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
                stepNum < step && "cursor-pointer hover:bg-primary/80"
              )}
            >
              {step > stepNum ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
            </button>
            {stepNum < 2 && (
              <div className={cn(
                "w-8 h-0.5 mx-2 transition-colors",
                step > stepNum ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <FormField
        label="Tên tổ chức"
        required
        error={getFieldError('name')}
        icon={Building2}
        description="Tên chính thức của tổ chức"
      >
        <Input
          id="name"
          placeholder="VD: Công ty TNHH ABC..."
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          onBlur={() => markFieldTouched('name')}
          className={cn(
            "transition-all duration-200",
            getFieldError('name') && "border-red-500 focus-visible:ring-red-500"
          )}
          disabled={loading || uploading}
          autoComplete="organization"
        />
        {duplicateWarning && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {duplicateWarning}
            </AlertDescription>
          </Alert>
        )}
      </FormField>

      <FormField
        label="Địa chỉ"
        required
        error={getFieldError('address')}
        icon={MapPin}
        description="Địa chỉ trụ sở chính"
      >
        <Textarea
          id="address"
          placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
          value={formData.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
          onBlur={() => markFieldTouched('address')}
          className={cn(
            "min-h-[80px] transition-all duration-200",
            getFieldError('address') && "border-red-500 focus-visible:ring-red-500"
          )}
          disabled={loading || uploading}
          rows={3}
        />
      </FormField>

      <FormField
        label="Loại tổ chức"
        required
        error={getFieldError('type')}
        icon={Users}
        description="Chọn loại hình tổ chức phù hợp"
      >
        <Select
          value={formData.type || ''}
          onValueChange={(value) => handleInputChange('type', value)}
          disabled={loading || uploading}
        >
          <SelectTrigger 
            className={cn(
              "transition-all duration-200",
              getFieldError('type') && "border-red-500 focus:ring-red-500"
            )}
            onBlur={() => markFieldTouched('type')}
          >
            <SelectValue placeholder="Chọn loại tổ chức..." />
          </SelectTrigger>
          <SelectContent>
            {ORG_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{type.label}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedOrgType && (
          <Badge variant="secondary" className="mt-2">
            {selectedOrgType.label}
          </Badge>
        )}
      </FormField>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Số điện thoại"
          error={getFieldError('phone')}
          icon={Phone}
          description="Số liên hệ chính"
        >
          <Input
            id="phone"
            type="tel"
            placeholder="0912345678"
            value={formData.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            onBlur={() => markFieldTouched('phone')}
            className={cn(
              "transition-all duration-200",
              getFieldError('phone') && "border-red-500 focus-visible:ring-red-500"
            )}
            disabled={loading || uploading}
            autoComplete="tel"
          />
        </FormField>

        <FormField
          label="Email"
          error={getFieldError('email')}
          icon={Mail}
          description="Email liên hệ"
        >
          <Input
            id="email"
            type="email"
            placeholder="contact@example.com"
            value={formData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={() => markFieldTouched('email')}
            className={cn(
              "transition-all duration-200",
              getFieldError('email') && "border-red-500 focus-visible:ring-red-500"
            )}
            disabled={loading || uploading}
            autoComplete="email"
          />
        </FormField>
      </div>

      <FormField
        label="Website"
        error={getFieldError('website')}
        icon={Globe}
        description="Trang web chính thức (không bắt buộc)"
      >
        <Input
          id="website"
          type="url"
          placeholder="https://example.com"
          value={formData.website || ''}
          onChange={(e) => handleInputChange('website', e.target.value)}
          onBlur={() => markFieldTouched('website')}
          className={cn(
            "transition-all duration-200",
            getFieldError('website') && "border-red-500 focus-visible:ring-red-500"
          )}
          disabled={loading || uploading}
          autoComplete="url"
        />
      </FormField>

      <FormField
        label="Mô tả"
        error={getFieldError('description')}
        description="Mô tả ngắn về tổ chức (không bắt buộc)"
      >
        <Textarea
          id="description"
          placeholder="Mô tả về hoạt động, mục tiêu của tổ chức..."
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="min-h-[100px] transition-all duration-200"
          disabled={loading || uploading}
          rows={4}
          maxLength={500}
        />
        <div className="text-xs text-muted-foreground text-right">
          {(formData.description || '').length}/500
        </div>
      </FormField>

      <FormField
        label="Logo tổ chức"
        description="File JPG, PNG, SVG. Kích thước tối đa 2MB"
      >
        <LogoUploader
          onFileChange={onFileChange}
          uploading={uploading}
          logo_url={formData.logo}
        />
      </FormField>
    </div>
  );

  const renderPreview = () => (
    <Card className="border-dashed">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            {formData.logo && (
              <img 
                src={formData.logo} 
                alt="Logo" 
                className="w-16 h-16 rounded-lg object-cover border"
              />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{formData.name}</h3>
              {selectedOrgType && (
                <Badge variant="outline" className="mt-1">
                  {selectedOrgType.label}
                </Badge>
              )}
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{formData.address}</span>
              </div>
              {formData.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{formData.phone}</span>
                </div>
              )}
              {formData.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{formData.email}</span>
                </div>
              )}
              {formData.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-blue-600 hover:underline">
                    {formData.website}
                  </span>
                </div>
              )}
            </div>
            {formData.description && (
              <div>
                <h4 className="font-medium mb-2">Mô tả:</h4>
                <p className="text-muted-foreground">{formData.description}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
          <PlusCircle className="h-4 w-4" />
          Thêm tổ chức
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Thêm tổ chức mới
            {preview && <Badge variant="secondary">Xem trước</Badge>}
          </DialogTitle>
        </DialogHeader>
        
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {!preview && renderStepIndicator()}
          
          <div className="py-4">
            {preview ? renderPreview() : (
              step === 1 ? renderStep1() : renderStep2()
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading || uploading}
                className="flex-1 sm:flex-none"
              >
                Hủy
              </Button>
              
              {step === 2 && !preview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading || uploading}
                >
                  Quay lại
                </Button>
              )}
              
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={togglePreview}
                  disabled={loading || uploading}
                >
                  {preview ? 'Chỉnh sửa' : 'Xem trước'}
                </Button>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || uploading || (step === 2 && !isValid)}
              className="flex-1 sm:flex-none min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : step === 1 ? (
                'Tiếp tục'
              ) : (
                'Tạo tổ chức'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
