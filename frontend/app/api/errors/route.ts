import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Error API endpoint' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Log error or handle error reporting
    console.error('Client error:', body);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Error logged successfully' 
    });
  } catch {
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to log error' 
    }, { status: 500 });
  }
}
