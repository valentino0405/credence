import { MongoClient, Db, Collection } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.DB_NAME || 'credence';

if (!uri) {
  console.warn('⚠️ MONGODB_URI not set. Chat persistence will fail.');
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<{ db: Db; chats: Collection } | null> {
  try {
    if (!uri) return null;
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
      db = client.db(dbName);
    }
    const chats = db!.collection('chat_messages');
    return { db: db!, chats };
  } catch (err) {
    console.error('Mongo connection error:', err);
    return null;
  }
}
