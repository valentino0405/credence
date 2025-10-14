import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { getDb } from '@/lib/mongo';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('Missing svix headers');
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // Get the body
  const payload = await req.text();

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(webhookSecret);

  let evt: any;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as any;
  } catch (err: any) {
    console.error('Webhook verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log('Clerk webhook event:', eventType);

  if (eventType === 'user.created' || eventType === 'user.updated') {
    try {
      const { id, email_addresses, first_name, last_name } = evt.data;
      
      const primaryEmail = email_addresses?.find((email: any) => email.id === evt.data.primary_email_address_id);
      const email = primaryEmail?.email_address || '';
      const name = `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown User';

      console.log('Processing user:', { id, email, name });

      // Save/update user in database
      const dbCtx = await getDb();
      if (dbCtx) {
        await dbCtx.db.collection('users').updateOne(
          { userId: id },
          {
            $set: {
              userId: id,
              email: email,
              name: name,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            }
          },
          { upsert: true }
        );
        console.log('User saved to database successfully');
      } else {
        console.error('Database connection failed');
      }
    } catch (error) {
      console.error('Error processing user webhook:', error);
      return NextResponse.json({ error: 'Failed to process user data' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}