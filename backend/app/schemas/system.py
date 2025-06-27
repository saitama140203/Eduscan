from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class SystemSettingBase(BaseModel):
    key: str
    value: str
    type: str = 'string'  # 'string', 'number', 'boolean', 'json'
    category: str = 'general'
    description: str

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSettingUpdate(BaseModel):
    value: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

class SystemSettingOut(SystemSettingBase):
    id: int
    is_system: bool = False
    updated_at: datetime

    class Config:
        from_attributes = True

# Audit Log schemas
class AuditLogBase(BaseModel):
    user_id: int
    action: str
    resource: str
    resource_id: Optional[int] = None
    details: str
    status: str = 'success'
    severity: str = 'medium'
    ip_address: str
    user_agent: str

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogOut(AuditLogBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# Backup schemas
class BackupBase(BaseModel):
    name: str
    description: Optional[str] = None
    backup_type: str = 'full'
    status: str = 'pending'

class BackupCreate(BackupBase):
    pass

class BackupOut(BackupBase):
    id: int
    created_at: datetime
    file_size: Optional[int] = None
    file_path: Optional[str] = None

    class Config:
        from_attributes = True

# System Stats schemas
class SystemStatsOut(BaseModel):
    users: Dict[str, Any]
    audit_logs: Dict[str, Any]
    backups: Dict[str, Any]
    system_health: Dict[str, Any] 