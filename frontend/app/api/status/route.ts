import { NextResponse } from 'next/server';

export async function GET() {
  const status = {
    service: 'EduScan Frontend',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    dependencies: {
      backend: process.env.NEXT_PUBLIC_API_URL || 'https://eduscan.local/api/v1',
      omrChecker: 'http://localhost:8001',
      database: 'connected'
    },
    features: {
      omrIntegration: true,
      templateBuilder: true,
      imageProcessor: true,
      analytics: true
    }
  };

  return NextResponse.json(status);
}
