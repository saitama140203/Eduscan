from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.db.session import get_async_db
from app.services.system_service import SystemService, AuditLogService, BackupService
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
from app.models.user import User
from app.utils.auth import check_admin_permission

router = APIRouter(prefix="/admin", tags=["admin"])

# System Settings Endpoints
@router.get("/settings", response_model=List[SystemSettingOut])
async def get_system_settings(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in key or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Get system settings with optional filters"""
    return await SystemService.get_system_settings(
        db, category=category, search=search, skip=skip, limit=limit
    )

@router.post("/settings", response_model=SystemSettingOut, status_code=status.HTTP_201_CREATED)
async def create_system_setting(
    setting_data: SystemSettingCreate,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Create a new system setting"""
    try:
        setting = await SystemService.create_system_setting(db, setting_data)
        
        # Log the creation
        await AuditLogService.create_audit_log(
            db,
            AuditLogCreate(
                user_id=current_user.maNguoiDung,
                action='create',
                resource='setting',
                resource_id=setting.id,
                details=f"Created system setting: {setting.key}",
                status='success',
                severity='medium',
                ip_address="",
                user_agent=""
            )
        )
        
        return setting
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/settings/{setting_id}", response_model=SystemSettingOut)
async def get_system_setting(
    setting_id: int,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Get a specific system setting"""
    settings = await SystemService.get_system_settings(db, skip=0, limit=1000)
    setting = next((s for s in settings if s.id == setting_id), None)
    
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting with ID {setting_id} not found"
        )
    
    return setting

@router.put("/settings/{setting_id}", response_model=SystemSettingOut)
async def update_system_setting(
    setting_id: int,
    setting_data: SystemSettingUpdate,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Update a system setting"""
    try:
        setting = await SystemService.update_system_setting(db, setting_id, setting_data)
        
        # Log the update
        await AuditLogService.create_audit_log(
            db,
            AuditLogCreate(
                user_id=current_user.maNguoiDung,
                action='update',
                resource='setting',
                resource_id=setting.id,
                details=f"Updated system setting: {setting.key}",
                status='success',
                severity='medium',
                ip_address="",
                user_agent=""
            )
        )
        
        return setting
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/settings/{setting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_system_setting(
    setting_id: int,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Delete a system setting"""
    try:
        await SystemService.delete_system_setting(db, setting_id)
        
        # Log the deletion
        await AuditLogService.create_audit_log(
            db,
            AuditLogCreate(
                user_id=current_user.maNguoiDung,
                action='delete',
                resource='setting',
                resource_id=setting_id,
                details=f"Deleted system setting with ID: {setting_id}",
                status='success',
                severity='high',
                ip_address="",
                user_agent=""
            )
        )
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

# Audit Logs Endpoints
@router.get("/audit-logs", response_model=List[AuditLogOut])
async def get_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    resource: Optional[str] = Query(None, description="Filter by resource"),
    status: Optional[str] = Query(None, description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    search: Optional[str] = Query(None, description="Search in user name, details, or IP"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Get audit logs with filters"""
    return await AuditLogService.get_audit_logs(
        db,
        user_id=user_id,
        action=action,
        resource=resource,
        status=status,
        severity=severity,
        start_date=start_date,
        end_date=end_date,
        search=search,
        skip=skip,
        limit=limit
    )

@router.get("/audit-logs/stats")
async def get_audit_stats(
    days: int = Query(30, ge=1, le=365, description="Number of days for statistics"),
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Get audit log statistics"""
    return await AuditLogService.get_audit_stats(db, days=days)

@router.post("/audit-logs", response_model=AuditLogOut, status_code=status.HTTP_201_CREATED)
async def create_audit_log(
    log_data: AuditLogCreate,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Create an audit log entry (for testing purposes)"""
    return await AuditLogService.create_audit_log(db, log_data)

# Backup & Restore Endpoints
@router.get("/backups", response_model=List[BackupOut])
async def get_backups(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Get list of backups"""
    return await BackupService.get_backups(db, skip=skip, limit=limit)

@router.post("/backups", response_model=BackupOut, status_code=status.HTTP_201_CREATED)
async def create_backup(
    backup_data: BackupCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Create a new backup"""
    try:
        # Create backup in background
        backup = await BackupService.create_backup(db, backup_data, current_user.maNguoiDung)
        return backup
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create backup: {str(e)}"
        )

@router.get("/backups/{backup_id}", response_model=BackupOut)
async def get_backup(
    backup_id: int,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Get a specific backup"""
    backups = await BackupService.get_backups(db)
    backup = next((b for b in backups if b.id == backup_id), None)
    
    if not backup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backup with ID {backup_id} not found"
        )
    
    return backup

@router.post("/backups/{backup_id}/restore")
async def restore_backup(
    backup_id: int,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Restore from a backup"""
    try:
        success = await BackupService.restore_backup(db, backup_id, current_user.maNguoiDung)
        
        if success:
            return {"message": f"Successfully restored from backup {backup_id}"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Restore operation failed"
            )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restore backup: {str(e)}"
        )

@router.delete("/backups/{backup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backup(
    backup_id: int,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Delete a backup"""
    try:
        await BackupService.delete_backup(db, backup_id, current_user.maNguoiDung)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete backup: {str(e)}"
        )

@router.get("/backups/stats")
async def get_backup_stats(
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Get backup statistics"""
    return await BackupService.get_backup_stats(db)

# System Health & Monitoring
@router.get("/system/health")
async def get_system_health(
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Get system health status"""
    try:
        # Check database connection
        await db.execute("SELECT 1")
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    # Check disk space (mock)
    disk_usage = {
        "total": 50 * 1024 * 1024 * 1024,  # 50GB
        "used": 2.5 * 1024 * 1024 * 1024,  # 2.5GB
        "free": 47.5 * 1024 * 1024 * 1024  # 47.5GB
    }
    
    # System metrics (mock)
    metrics = {
        "cpu_usage": 25.5,
        "memory_usage": 45.2,
        "active_connections": 12,
        "uptime": 86400  # 1 day in seconds
    }
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "disk": disk_usage,
        "metrics": metrics,
        "timestamp": datetime.utcnow()
    }

@router.get("/system/stats", response_model=SystemStatsOut)
async def get_system_stats(
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Get comprehensive system statistics"""
    from app.services.dashboard_service import DashboardService
    
    # Get admin stats
    admin_stats = await DashboardService.admin_stats(db)
    
    # Get audit stats
    audit_stats = await AuditLogService.get_audit_stats(db, days=30)
    
    # Get backup stats
    backup_stats = await BackupService.get_backup_stats(db)
    
    return SystemStatsOut(
        users=admin_stats,
        audit_logs=audit_stats,
        backups=backup_stats,
        system_health={
            "status": "healthy",
            "uptime": 86400,
            "last_backup": backup_stats.get("latest_backup", {}).get("created_at") if backup_stats.get("latest_backup") else None
        }
    )

# Configuration Management
@router.get("/config/export")
async def export_configuration(
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Export system configuration"""
    settings = await SystemService.get_system_settings(db, limit=1000)
    
    config = {
        "version": "1.0",
        "exported_at": datetime.utcnow().isoformat(),
        "exported_by": current_user.hoTen,
        "settings": [setting.dict() for setting in settings]
    }
    
    # Log the export
    await AuditLogService.create_audit_log(
        db,
        AuditLogCreate(
            user_id=current_user.maNguoiDung,
            action='export',
            resource='configuration',
            details="Exported system configuration",
            status='success',
            severity='medium',
            ip_address="",
            user_agent=""
        )
    )
    
    return config

@router.post("/config/import")
async def import_configuration(
    config_data: dict,
    current_user: User = Depends(check_admin_permission),
    db: AsyncSession = Depends(get_async_db)
):
    """Import system configuration"""
    try:
        imported_count = 0
        
        if "settings" in config_data:
            for setting_data in config_data["settings"]:
                if not setting_data.get("is_system", False):  # Don't import system settings
                    try:
                        await SystemService.create_system_setting(
                            db,
                            SystemSettingCreate(**setting_data)
                        )
                        imported_count += 1
                    except Exception:
                        # Skip if setting already exists or invalid
                        pass
        
        # Log the import
        await AuditLogService.create_audit_log(
            db,
            AuditLogCreate(
                user_id=current_user.maNguoiDung,
                action='import',
                resource='configuration',
                details=f"Imported {imported_count} configuration settings",
                status='success',
                severity='high',
                ip_address="",
                user_agent=""
            )
        )
        
        return {
            "message": f"Successfully imported {imported_count} settings",
            "imported_count": imported_count
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to import configuration: {str(e)}"
        ) 