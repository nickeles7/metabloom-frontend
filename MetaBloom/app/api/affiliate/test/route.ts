import { NextRequest, NextResponse } from 'next/server';
import { generateAffiliateCode, isValidAffiliateCode } from '@/lib/affiliate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const code = searchParams.get('code');

    switch (action) {
      case 'generate':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId parameter is required for generate action' },
            { status: 400 }
          );
        }

        const affiliateCode = generateAffiliateCode(userId);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://metabloom.com';
        const affiliateLink = `${baseUrl}?ref=${affiliateCode}`;

        return NextResponse.json({
          success: true,
          affiliateCode,
          affiliateLink,
          userId,
          message: 'Affiliate code generated successfully'
        });

      case 'validate':
        if (!code) {
          return NextResponse.json(
            { error: 'code parameter is required for validate action' },
            { status: 400 }
          );
        }

        const isValid = isValidAffiliateCode(code);
        return NextResponse.json({
          success: true,
          code,
          isValid,
          message: isValid ? 'Valid affiliate code format' : 'Invalid affiliate code format'
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'Affiliate system test endpoint',
          availableActions: [
            'generate - Generate affiliate code and link for a user',
            'validate - Validate affiliate code format'
          ],
          examples: [
            '/api/affiliate/test?action=generate&userId=test-user-123',
            '/api/affiliate/test?action=validate&code=ABC123DEF456'
          ]
        });
    }
  } catch (error) {
    console.error('Error in affiliate test endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
