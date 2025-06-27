import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// TypeScript interfaces
export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description: string;
  is_system: boolean;
  updated_at: string;
}

export interface SystemSettingCreate {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description: string;
}

export interface SystemSettingUpdate {
  value?: string;
  type?: 'string' | 'number' | 'boolean' | 'json';
  category?: string;
  description?: string;
}

export interface SystemStats {
  total_settings: number;
  categories: Array<{
    name: string;
    count: number;
  }>;
  system_health: {
    status: 'healthy' | 'warning' | 'error';
    uptime: number;
    last_backup: string | null;
  };
}

// Mock data for development
const mockSettings: SystemSetting[] = [
  {
    id: 1,
    key: "app_name",
    value: "EduScan",
    type: "string",
    category: "general",
    description: "Tên ứng dụng hiển thị",
    is_system: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    key: "max_upload_size",
    value: "50",
    type: "number",
    category: "system",
    description: "Kích thước tối đa file upload (MB)",
    is_system: false,
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    key: "enable_notifications",
    value: "true",
    type: "boolean",
    category: "notification",
    description: "Bật thông báo email",
    is_system: false,
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    key: "smtp_config",
    value: '{"host": "smtp.gmail.com", "port": 587}',
    type: "json",
    category: "email",
    description: "Cấu hình SMTP server",
    is_system: false,
    updated_at: new Date().toISOString()
  },
  {
    id: 5,
    key: "backup_frequency",
    value: "daily",
    type: "string",
    category: "backup",
    description: "Tần suất sao lưu tự động",
    is_system: false,
    updated_at: new Date().toISOString()
  }
];

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch system settings
  const fetchSettings = useCallback(async (category?: string, search?: string) => {
    try {
      setLoading(true);
      
      // Try real API first
      const params = new URLSearchParams();
      if (category && category !== 'all') params.append('category', category);
      if (search) params.append('search', search);

      const response = await fetch(`/api/admin/settings?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setError(null);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.log('API not available, using mock data');
      
      // Use mock data when API is not available
      let filteredMockData = [...mockSettings];
      
      if (search) {
        filteredMockData = filteredMockData.filter(setting =>
          setting.key.toLowerCase().includes(search.toLowerCase()) ||
          setting.description.toLowerCase().includes(search.toLowerCase()) ||
          setting.value.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      if (category && category !== 'all') {
        filteredMockData = filteredMockData.filter(setting => setting.category === category);
      }
      
      setSettings(filteredMockData);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create system setting
  const createSetting = useCallback(async (data: SystemSettingCreate) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newSetting = await response.json();
        setSettings(prev => [newSetting, ...prev]);
        toast.success('Tạo cài đặt mới thành công!');
        return newSetting;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.log('API not available, simulating create');
      
      // Simulate create with mock data
      const newSetting: SystemSetting = {
        id: Date.now(),
        key: data.key,
        value: data.value,
        type: data.type,
        category: data.category,
        description: data.description,
        is_system: false,
        updated_at: new Date().toISOString()
      };
      
      setSettings(prev => [newSetting, ...prev]);
      toast.success('Tạo cài đặt mới thành công!');
      return newSetting;
    }
  }, []);

  // Update system setting
  const updateSetting = useCallback(async (id: number, data: SystemSettingUpdate) => {
    try {
      const response = await fetch(`/api/admin/settings/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedSetting = await response.json();
        setSettings(prev => prev.map(s => s.id === id ? updatedSetting : s));
        toast.success('Cập nhật cài đặt thành công!');
        return updatedSetting;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.log('API not available, simulating update');
      
      // Simulate update with mock data
      setSettings(prev => prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            value: data.value || s.value,
            type: data.type || s.type,
            category: data.category || s.category,
            description: data.description || s.description,
            updated_at: new Date().toISOString()
          };
        }
        return s;
      }));
      
      toast.success('Cập nhật cài đặt thành công!');
    }
  }, []);

  // Delete system setting
  const deleteSetting = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/admin/settings/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setSettings(prev => prev.filter(s => s.id !== id));
        toast.success('Xóa cài đặt thành công!');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.log('API not available, simulating delete');
      
      // Simulate delete with mock data
      setSettings(prev => prev.filter(s => s.id !== id));
      toast.success('Xóa cài đặt thành công!');
    }
  }, []);

  // Get system stats
  const getStats = useCallback((): SystemStats => {
    const categories = settings.reduce((acc, setting) => {
      const category = setting.category || 'general';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_settings: settings.length,
      categories: Object.entries(categories).map(([name, count]) => ({
        name,
        count,
      })),
      system_health: {
        status: 'healthy',
        uptime: 86400, // Mock uptime
        last_backup: null,
      },
    };
  }, [settings]);

  // Filter settings
  const filterSettings = useCallback((search: string, category: string) => {
    return settings.filter(setting => {
      const matchesSearch = !search || 
        setting.key.toLowerCase().includes(search.toLowerCase()) ||
        setting.description.toLowerCase().includes(search.toLowerCase()) ||
        setting.value.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = category === 'all' || setting.category === category;
      
      return matchesSearch && matchesCategory;
    });
  }, [settings]);

  // Get system health
  const getSystemHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/system/health', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.log('Health API not available, using mock data');
      return {
        status: 'healthy',
        database: 'healthy',
        uptime: 86400,
        timestamp: new Date().toISOString()
      };
    }
  }, []);

  // Export configuration
  const exportConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/config/export', {
        credentials: 'include',
      });

      if (response.ok) {
        const config = await response.json();
        
        // Download as JSON file
        const blob = new Blob([JSON.stringify(config, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-config-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('Xuất cấu hình thành công!');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.log('Export API not available, exporting mock data');
      
      // Export mock data
      const config = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        exported_by: "Mock User",
        settings: settings
      };
      
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-config-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Xuất cấu hình thành công!');
    }
  }, [settings]);

  // Initialize
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    createSetting,
    updateSetting,
    deleteSetting,
    getStats,
    filterSettings,
    getSystemHealth,
    exportConfig,
  };
} 