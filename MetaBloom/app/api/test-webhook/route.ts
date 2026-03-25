import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log('🧪 Test webhook received:', body);
    
    return NextResponse.json({
      received: true,
      timestamp: new Date().toISOString(),
      bodyLength: body.length,
    });
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    return NextResponse.json(
      { error: 'Test webhook failed' },
      { status: 500 }
    );
  }
}
