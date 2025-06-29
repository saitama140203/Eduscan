from fastapi import FastAPI
from app.api import api_router
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.routing import APIRoute

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"], 
)

# Mount a static directory to serve processed images
app.mount("/storage", StaticFiles(directory=settings.STORAGE_PATH), name="storage")

@app.get("/", tags=["Root"])
def read_root():
    return {
        "AppName": settings.APP_NAME,
        "Version": "1.0.0",
        "Status": "Running"
    }

app.include_router(api_router, prefix=settings.API_PREFIX) 