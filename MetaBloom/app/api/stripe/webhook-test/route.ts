import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook test endpoint called!');
  console.log('📋 Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    const body = await request.text();
    console.log('📝 Body length:', body.length);
    console.log('📝 Body preview:', body.substring(0, 200));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook test endpoint working!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Webhook test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Webhook test endpoint is live!',
    timestamp: new Date().toISOString()
  });
}
