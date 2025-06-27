#!/bin/bash

# Activate conda environment
source ~/miniconda3/etc/profile.d/conda.sh
conda activate eduscan

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Start the backend server
echo "🚀 Starting EduScan Backend with conda env: eduscan"
echo "📍 Working directory: $(pwd)"
echo "🐍 Python version: $(python --version)"
echo "📦 FastAPI version: $(python -c 'import fastapi; print(fastapi.__version__)')"

# Define absolute paths to SSL certificates
CERT_DIR=$(cd "$(dirname "$0")/../frontend/certificates" && pwd)
CERT_FILE="${CERT_DIR}/cert.pem"
KEY_FILE="${CERT_DIR}/key.pem"

# Check if certificates exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo "🔒 Using SSL certificates from: ${CERT_DIR}"
  # Run the FastAPI server with SSL
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --ssl-keyfile "$KEY_FILE" --ssl-certfile "$CERT_FILE"
else
  echo "⚠️ SSL certificates not found. Running without SSL."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 
fi 