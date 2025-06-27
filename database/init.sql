-- Initialize EduScan Database
-- This file will be executed when PostgreSQL container starts

-- Create database if not exists
SELECT 'CREATE DATABASE eduscan_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'eduscan_db')\gexec

-- Connect to the database
\c eduscan_db;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Import the main SQL structure
-- Note: The actual tables will be created by Alembic migrations 