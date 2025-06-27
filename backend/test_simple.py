from fastapi import FastAPI

app = FastAPI(title="EduScan Test")

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/")
def root():
    return {"message": "EduScan OMR System is running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 