import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { UserProfile, AffiliateData } from '@/lib/subscription';

/**
 * Utility API endpoint to fix affiliate link domains for existing users
 * This endpoint finds all users with affiliate links pointing to metabloom.com
 * and updates them to use metabloom.io
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header for security
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.ADMIN_API_TOKEN;
    if (!expectedToken) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔧 Starting affiliate domain fix process...');

    // Query all users with affiliate data
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('affiliateData', '!=', null));
    const querySnapshot = await getDocs(q);

    let updatedCount = 0;
    let totalCount = 0;
    const errors: string[] = [];

    for (const userDoc of querySnapshot.docs) {
      totalCount++;
      const userData = userDoc.data() as UserProfile;
      const affiliateData = userData.affiliateData;

      if (!affiliateData) continue;

      // Check if the affiliate link needs updating
      if (affiliateData.affiliateLink.includes('metabloom.com')) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://metabloom.io';
          const updatedAffiliateLink = `${baseUrl}?ref=${affiliateData.affiliateCode}`;
          
          const updatedAffiliateData: AffiliateData = {
            ...affiliateData,
            affiliateLink: updatedAffiliateLink,
          };

          // Update the user document
          const userRef = doc(db, 'users', userDoc.id);
          await updateDoc(userRef, {
            affiliateData: updatedAffiliateData,
            updatedAt: Date.now(),
          });

          console.log(`✅ Updated affiliate link for user ${userDoc.id}: ${updatedAffiliateLink}`);
          updatedCount++;
        } catch (error) {
          const errorMsg = `Failed to update user ${userDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }

    console.log(`🎉 Domain fix complete: ${updatedCount}/${totalCount} users updated`);

    return NextResponse.json({
      success: true,
      message: 'Affiliate domain fix completed',
      stats: {
        totalUsersWithAffiliateData: totalCount,
        usersUpdated: updatedCount,
        usersSkipped: totalCount - updatedCount,
      },
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('❌ Error fixing affiliate domains:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check how many users need domain fixes
 */
export async function GET(request: NextRequest) {
  try {
    // Get authorization header for security
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.ADMIN_API_TOKEN;
    if (!expectedToken) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔍 Checking affiliate domain status...');

    // Query all users with affiliate data
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('affiliateData', '!=', null));
    const querySnapshot = await getDocs(q);

    let needsFixCount = 0;
    let totalCount = 0;
    const usersNeedingFix: string[] = [];

    for (const userDoc of querySnapshot.docs) {
      totalCount++;
      const userData = userDoc.data() as UserProfile;
      const affiliateData = userData.affiliateData;

      if (!affiliateData) continue;

      // Check if the affiliate link needs updating
      if (affiliateData.affiliateLink.includes('metabloom.com')) {
        needsFixCount++;
        usersNeedingFix.push(userDoc.id);
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalUsersWithAffiliateData: totalCount,
        usersNeedingFix: needsFixCount,
        usersAlreadyFixed: totalCount - needsFixCount,
      },
      usersNeedingFix: usersNeedingFix.slice(0, 10), // Show first 10 for preview
      message: needsFixCount > 0 
        ? `${needsFixCount} users need affiliate domain fixes`
        : 'All affiliate domains are already correct'
    });

  } catch (error) {
    console.error('❌ Error checking affiliate domains:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}
