import { MongoClient, Db, Collection } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.DB_NAME || 'credence';

if (!uri) {
  console.warn('MONGODB_URI not set. Database operations will fail.');
} else {
  console.log('MongoDB URI configured:', uri.substring(0, 20) + '...');
}

let client: MongoClient | null = null;
let db: Db | null = null;
let connectionAttempts = 0;
const MAX_RETRIES = 3;

export async function getDb(): Promise<{ db: Db; chats: Collection } | null> {
  try {
    if (!uri) {
      console.error('MongoDB URI is not configured');
      return null;
    }

    // If we already have a connection, verify it's still alive
    if (client && db) {
      try {
        await client.db().admin().ping();
        const chats = db.collection('chat_messages');
        return { db, chats };
      } catch (pingError) {
        console.warn('Existing MongoDB connection lost, reconnecting...');
        client = null;
        db = null;
      }
    }

    // Create new connection with retry logic
    while (connectionAttempts < MAX_RETRIES) {
      try {
        console.log(`MongoDB connection attempt ${connectionAttempts + 1}/${MAX_RETRIES}...`);
        client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000,
        });
        await client.connect();
        db = client.db(dbName);
        
        // Verify connection
        await db.admin().ping();
        console.log('MongoDB connected successfully to database:', dbName);
        
        connectionAttempts = 0; // Reset on success
        const chats = db.collection('chat_messages');
        return { db, chats };
      } catch (err) {
        connectionAttempts++;
        console.error(`MongoDB connection attempt ${connectionAttempts} failed:`, err);
        
        if (connectionAttempts >= MAX_RETRIES) {
          console.error('Max MongoDB connection retries reached');
          client = null;
          db = null;
          return null;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * connectionAttempts));
      }
    }
    
    return null;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    client = null;
    db = null;
    return null;
  }
}
