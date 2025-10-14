import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 10, 50) : 20;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const dbCtx = await getDb();
    if (!dbCtx) {
      return NextResponse.json({ success: true, history: [], persisted: false });
    }

    const cursor = dbCtx.chats
      .find({ userId }, { projection: { userMessage: 1, aiResponse: 1, timestamp: 1, userEmail: 1, userName: 1 } })
      .sort({ timestamp: -1 })
      .limit(limit);

    const docs = await cursor.toArray();
    // Return chronological order (oldest first)
    const history = docs
      .map(d => ({
        id: d._id.toString(),
        userMessage: d.userMessage,
        aiResponse: d.aiResponse,
        timestamp: d.timestamp,
        userEmail: d.userEmail || null,
        userName: d.userName || null,
      }))
      .reverse();

    return NextResponse.json({ success: true, history, count: history.length });
  } catch (err) {
    console.error('History fetch error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}
