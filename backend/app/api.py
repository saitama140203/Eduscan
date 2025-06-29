from fastapi import APIRouter
from app.routes import (
    auth, users, organizations, classes, students, exams, 
    answer_templates, files, omr, dashboard, settings, 
    password_reset_requests, manager, teacher
)

api_router = APIRouter()

# Include tất cả các router con vào đây
api_router.include_router(auth.router, tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(classes.router, prefix="/classes", tags=["Classes"])
api_router.include_router(students.router, prefix="/students", tags=["Students"])
api_router.include_router(exams.router, prefix="/exams", tags=["Exams"])
api_router.include_router(answer_templates.router, prefix="/answer-templates", tags=["Answer Templates"])
api_router.include_router(files.router, prefix="/files", tags=["Files"])
api_router.include_router(omr.router, prefix="/omr", tags=["OMR"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(password_reset_requests.router, prefix="/password-reset", tags=["Password Reset"])
api_router.include_router(teacher.router, prefix="/teacher", tags=["Teacher"])
api_router.include_router(manager.router, prefix="/manager", tags=["Manager"]) 