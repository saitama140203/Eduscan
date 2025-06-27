import { NextRequest, NextResponse } from 'next/server';

// Mock feature flags data
const FEATURE_FLAGS = {
  omrIntegration: true,
  advancedAnalytics: true,
  experimentalFeatures: false,
  betaUI: false,
  aiAssistant: true
};

export async function GET() {
  return NextResponse.json({ 
    success: true,
    data: FEATURE_FLAGS 
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flagName, enabled } = body;
    
    if (flagName && typeof enabled === 'boolean') {
      // In a real app, you'd save this to database
      return NextResponse.json({ 
        success: true, 
        message: `Feature flag ${flagName} ${enabled ? 'enabled' : 'disabled'}` 
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Invalid request body' 
    }, { status: 400 });
  } catch {
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update feature flag' 
    }, { status: 500 });
  }
}
