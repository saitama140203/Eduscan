import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Mock metrics data
  const metrics = {
    totalUsers: 150,
    activeUsers: 45,
    totalTemplates: 25,
    totalExams: 120,
    systemLoad: {
      cpu: Math.round(Math.random() * 100),
      memory: Math.round(Math.random() * 100),
      disk: Math.round(Math.random() * 100)
    },
    responseTime: Math.round(Math.random() * 500) + 50,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };

  return NextResponse.json({
    success: true,
    data: metrics
  });
}

export async function POST(request: NextRequest) {
  try {
    await request.json();
    // In a real app, you'd store metrics
    
    return NextResponse.json({
      success: true,
      message: 'Metrics recorded successfully'
    });
  } catch {
    return NextResponse.json({
      success: false,
      message: 'Failed to record metrics'
    }, { status: 500 });
  }
}
