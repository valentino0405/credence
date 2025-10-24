import { GoogleGenAI } from '@google/genai';

// Initialize Gemini AI client
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Post-process to a maximum of 5 lines, each trimmed, remove markdown artifacts
function formatToFiveLines(raw: string): string {
  if (!raw) return 'No response.';
  // Replace multiple spaces, remove leading bullets, asterisks
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\r/g, '')
    .replace(/[•*\-]+\s*/g, '')
    .trim();
  const lines = cleaned.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
  const limited = lines.slice(0, 5);
  // Ensure educational disclaimer present
  if (!limited.some(l => /educational/i.test(l))) {
    limited.push('Note: This information is for educational purposes only.');
  }
  return limited.join('\n');
}

export async function sendMessageToGemini(message: string): Promise<string> {
  try {
    const prompt = `You are Credence AI, a financial trading assistant.
Provide a clear helpful answer in 4-5 short lines (each line <= 140 characters).
Focus only on finance context: stocks, trading strategies, risk, portfolio, market trends.
Do NOT add introductions or conclusions beyond the 5 lines. Avoid headings.
Always include a disclaimer about educational purpose if user asks for advice.
User question: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
    });

    const rawText = response.text || 'Sorry, I could not generate a response.';
    return formatToFiveLines(rawText);
  } catch (error) {
    console.error('Gemini AI error:', error);
    throw new Error('Failed to get response from AI assistant');
  }
}

export async function saveChatToDatabase(
  userId: string,
  userMessage: string,
  aiResponse: string,
  userEmail?: string,
  userName?: string
) {
  try {
    const response = await fetch('/api/chat/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        userMessage,
        aiResponse,
        userEmail,
        userName,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.error('Failed to save chat to database');
    }
  } catch (error) {
    console.error('Database save error:', error);
  }
}