import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, name } = body;

    console.log('🔥 USER SAVE REQUEST:', { userId, email, name });

    if (!userId || !email) {
      console.error('❌ Missing userId or email');
      return NextResponse.json({ success: false, error: 'userId and email required' }, { status: 400 });
    }

    const dbCtx = await getDb();
    if (!dbCtx) {
      console.error('❌ Database connection failed');
      return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
    }

    console.log('✅ Database connected, saving user...');

    // Upsert user profile
    const result = await dbCtx.db.collection('users').updateOne(
      { userId },
      {
        $set: {
          userId,
          email,
          name: name || 'Unknown User',
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );

    console.log('✅ USER PROFILE SAVED TO DATABASE:', { 
      userId, 
      email, 
      name, 
      result: { 
        matchedCount: result.matchedCount, 
        upsertedCount: result.upsertedCount 
      } 
    });
    
    return NextResponse.json({ 
      success: true, 
      saved: true,
      matched: result.matchedCount,
      upserted: result.upsertedCount
    });
  } catch (error) {
    console.error('❌ USER SAVE ERROR:', error);
    return NextResponse.json({ success: false, error: 'Failed to save user' }, { status: 500 });
  }
}