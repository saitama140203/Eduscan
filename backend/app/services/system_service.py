from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, desc, func
from datetime import datetime, timedelta
import json
import asyncio
import subprocess
import os
from pathlib import Path

from app.models.setting import Setting
from app.schemas.system import (
    SystemSettingCreate, 
    SystemSettingUpdate, 
    SystemSettingOut,
    AuditLogCreate,
    AuditLogOut,
    BackupCreate,
    BackupOut,
    SystemStatsOut
)

class SystemService:
    """Service for system management operations"""
    
    @staticmethod
    async def get_system_settings(
        db: AsyncSession,
        category: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[SystemSettingOut]:
        """Get system settings with filters"""
        query = select(Setting)
        
        conditions = []
        # Note: Using actual model fields (tuKhoa, giaTri)
        if search:
            conditions.append(
                or_(
                    Setting.tuKhoa.ilike(f"%{search}%"),
                    Setting.giaTri.ilike(f"%{search}%")
                )
            )
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.offset(skip).limit(limit).order_by(Setting.tuKhoa)
        result = await db.execute(query)
        settings = result.scalars().all()
        
        return [SystemSettingOut(
            id=setting.maCaiDat,
            key=setting.tuKhoa,
            value=setting.giaTri or "",
            type="string",  # Default type
            category="general",  # Default category
            description=setting.tuKhoa,  # Use key as description for now
            is_system=False,
            updated_at=setting.thoiGianCapNhat
        ) for setting in settings]
    
    @staticmethod
    async def create_system_setting(
        db: AsyncSession,
        setting_data: SystemSettingCreate
    ) -> SystemSettingOut:
        """Create a new system setting"""
        setting = Setting(
            tuKhoa=setting_data.key,
            giaTri=setting_data.value,
            maToChuc=None  # System setting without organization
        )
        
        db.add(setting)
        await db.commit()
        await db.refresh(setting)
        
        return SystemSettingOut(
            id=setting.maCaiDat,
            key=setting.tuKhoa,
            value=setting.giaTri or "",
            type=setting_data.type,
            category=setting_data.category,
            description=setting_data.description,
            is_system=False,
            updated_at=setting.thoiGianCapNhat
        )
    
    @staticmethod
    async def update_system_setting(
        db: AsyncSession,
        setting_id: int,
        setting_data: SystemSettingUpdate
    ) -> SystemSettingOut:
        """Update a system setting"""
        query = select(Setting).where(Setting.maCaiDat == setting_id)
        result = await db.execute(query)
        setting = result.scalar_one_or_none()
        
        if not setting:
            raise ValueError(f"Setting with ID {setting_id} not found")
        
        # Update only the value for now
        if setting_data.value is not None:
            setting.giaTri = setting_data.value
        
        await db.commit()
        await db.refresh(setting)
        
        return SystemSettingOut(
            id=setting.maCaiDat,
            key=setting.tuKhoa,
            value=setting.giaTri or "",
            type=setting_data.type or "string",
            category=setting_data.category or "general",
            description=setting_data.description or setting.tuKhoa,
            is_system=False,
            updated_at=setting.thoiGianCapNhat
        )
    
    @staticmethod
    async def delete_system_setting(
        db: AsyncSession,
        setting_id: int
    ) -> bool:
        """Delete a system setting"""
        query = select(Setting).where(Setting.maCaiDat == setting_id)
        result = await db.execute(query)
        setting = result.scalar_one_or_none()
        
        if not setting:
            raise ValueError(f"Setting with ID {setting_id} not found")
        
        await db.delete(setting)
        await db.commit()
        
        return True
    
    @staticmethod
    async def get_setting_value(
        db: AsyncSession,
        key: str,
        default: Any = None
    ) -> Any:
        """Get a setting value by key"""
        query = select(Setting).where(Setting.tuKhoa == key)
        result = await db.execute(query)
        setting = result.scalar_one_or_none()
        
        if not setting:
            return default
        
        return setting.giaTri or default
    
    @staticmethod
    async def set_setting_value(
        db: AsyncSession,
        key: str,
        value: Any,
        user_id: int
    ) -> bool:
        """Set a setting value"""
        query = select(Setting).where(Setting.tuKhoa == key)
        result = await db.execute(query)
        setting = result.scalar_one_or_none()
        
        if not setting:
            raise ValueError(f"Setting with key '{key}' not found")
        
        setting.giaTri = str(value)
        await db.commit()
        
        return True

class AuditLogService:
    """Service for audit log management"""
    
    @staticmethod
    async def create_audit_log(
        db: AsyncSession,
        log_data: AuditLogCreate
    ) -> AuditLogOut:
        """Create an audit log entry - mock implementation"""
        # Mock implementation since we don't have audit log table
        return AuditLogOut(
            id=1,
            user_id=log_data.user_id,
            action=log_data.action,
            resource=log_data.resource,
            resource_id=log_data.resource_id,
            details=log_data.details,
            status=log_data.status,
            severity=log_data.severity,
            ip_address=log_data.ip_address,
            user_agent=log_data.user_agent,
            timestamp=datetime.utcnow()
        )
    
    @staticmethod
    async def get_audit_logs(
        db: AsyncSession,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        resource: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[AuditLogOut]:
        """Get audit logs - mock implementation"""
        return []
    
    @staticmethod
    async def get_audit_stats(
        db: AsyncSession,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get audit statistics - mock implementation"""
        return {
            "total_logs": 0,
            "actions": {},
            "resources": {},
            "severity": {}
        }

class BackupService:
    """Service for backup management"""
    
    @staticmethod
    async def create_backup(
        db: AsyncSession,
        backup_data: BackupCreate,
        user_id: int
    ) -> BackupOut:
        """Create backup - mock implementation"""
        return BackupOut(
            id=1,
            name=backup_data.name,
            description=backup_data.description,
            backup_type=backup_data.backup_type,
            status="completed",
            created_at=datetime.utcnow(),
            file_size=1024,
            file_path="/mock/path"
        )
    
    @staticmethod
    async def get_backups(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[BackupOut]:
        """Get backups - mock implementation"""
        return []
    
    @staticmethod
    async def restore_backup(
        db: AsyncSession,
        backup_id: int,
        user_id: int
    ) -> bool:
        """Restore backup - mock implementation"""
        return True
    
    @staticmethod
    async def delete_backup(
        db: AsyncSession,
        backup_id: int,
        user_id: int
    ) -> bool:
        """Delete backup - mock implementation"""
        return True
    
    @staticmethod
    async def get_backup_stats(db: AsyncSession) -> Dict[str, Any]:
        """Get backup statistics - mock implementation"""
        return {
            "total_backups": 0,
            "latest_backup": None,
            "total_size": 0
        } 