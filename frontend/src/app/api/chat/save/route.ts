import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo';

interface ChatDoc {
  userId: string;
  userEmail?: string;
  userName?: string;
  userMessage: string;
  aiResponse: string;
  timestamp: Date;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
  const { userId, userMessage, aiResponse, timestamp, userEmail, userName } = body;

    if (!userId || !userMessage || !aiResponse) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const dbCtx = await getDb();
    if (!dbCtx) {
      console.warn('⚠️ No DB connection. Returning success (non-persistent).');
      return NextResponse.json({ success: true, persisted: false });
    }

    const now = timestamp ? new Date(timestamp) : new Date();

    // Upsert user profile if email or name provided
    if (userEmail || userName) {
      const users = dbCtx.db.collection('users');
      await users.updateOne(
        { clerkId: userId },
        {
          $set: {
            clerkId: userId,
            email: userEmail,
            name: userName,
            updatedAt: now
          },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );
    }

    const doc: ChatDoc = {
      userId,
      userEmail,
      userName,
      userMessage,
      aiResponse,
      timestamp: now
    };

    const result = await dbCtx.chats.insertOne(doc as any);

    return NextResponse.json({ success: true, persisted: true, id: result.insertedId });
  } catch (error) {
    console.error('Database save error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save chat' },
      { status: 500 }
    );
  }
}